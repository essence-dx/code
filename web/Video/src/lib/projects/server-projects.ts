import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { mediaAssets, projectAuditEvents, projects, projectVersions, workspaces } from "@/lib/db/schema";
import { getServerSession } from "@/lib/auth/server";
import { createProjectReviewSummary } from "@/lib/editor/project-review-summary";
import { sanitizeMediaAssets, syncedProjectPayloadSchema, type SyncedProjectPayload } from "@/lib/projects/project-sync-schema";
import { detectProjectSyncConflict, ProjectSyncConflictError } from "@/lib/projects/project-sync-conflicts";
import { restoreSyncedProjectVersionInputSchema, type SyncedProjectAuditEvent, type SyncedProjectVersionSummary } from "@/lib/projects/project-version-contracts";

export async function requireProjectUser() {
  const session = await getServerSession();
  const userId = session?.user?.id;

  if (!userId) {
    throw new ProjectAuthError();
  }

  return { userId };
}

export async function listSyncedProjects() {
  const { userId } = await requireProjectUser();
  const db = getDb();
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.ownerId, userId))
    .orderBy(desc(projects.updatedAt));

  return rows.flatMap((row) => {
    const payload = safeParseProjectPayload(row.projectJson);
    if (!payload) return [];

    return [
      {
        id: row.id,
        title: row.title,
        aspectRatio: row.aspectRatio,
        duration: row.duration,
        layerCount: payload.project.layers.length,
        mediaCount: payload.mediaAssets.length,
        reviewSummary: createProjectReviewSummary(payload.project),
        updatedAt: row.updatedAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
      },
    ];
  });
}

export async function getSyncedProject(projectId: string) {
  const { userId } = await requireProjectUser();
  const db = getDb();
  const [row] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)))
    .limit(1);

  if (!row) return null;

  return parseProjectPayload(row.projectJson);
}

export async function upsertSyncedProject(input: unknown) {
  const { userId } = await requireProjectUser();
  const payload = syncedProjectPayloadSchema.parse(input);
  const workspace = await ensureDefaultWorkspace(userId);
  const db = getDb();
  const now = new Date();
  const [existingProject] = await db
    .select({ ownerId: projects.ownerId, updatedAt: projects.updatedAt })
    .from(projects)
    .where(eq(projects.id, payload.project.id))
    .limit(1);

  if (existingProject && existingProject.ownerId !== userId) {
    throw new ProjectAccessError();
  }

  if (existingProject) {
    const conflict = detectProjectSyncConflict({
      baseUpdatedAt: payload.sync?.baseUpdatedAt,
      remoteUpdatedAt: existingProject.updatedAt,
      localUpdatedAt: payload.project.updatedAt,
      mode: payload.sync?.mode,
    });
    if (conflict) {
      throw new ProjectSyncConflictError(conflict);
    }
  }

  const projectJson = JSON.stringify({
    project: payload.project,
    mediaAssets: sanitizeMediaAssets(payload.mediaAssets),
  });

  if (existingProject) {
    await db
      .update(projects)
      .set({
        title: payload.project.title,
        aspectRatio: payload.project.aspectRatio,
        duration: Math.round(payload.project.duration),
        projectJson,
        updatedAt: now,
      })
      .where(and(eq(projects.id, payload.project.id), eq(projects.ownerId, userId)));
  } else {
    await db.insert(projects).values({
      id: payload.project.id,
      workspaceId: workspace.id,
      ownerId: userId,
      title: payload.project.title,
      status: "draft",
      aspectRatio: payload.project.aspectRatio,
      duration: Math.round(payload.project.duration),
      projectJson,
      createdAt: now,
      updatedAt: now,
    });
  }

  await replaceMediaMetadata(payload, workspace.id, userId);
  await recordProjectVersion({
    payload,
    userId,
    projectId: payload.project.id,
    action: "sync",
    label: existingProject ? syncVersionLabel(payload.sync?.mode) : "Initial cloud sync",
  });
  await recordProjectAuditEvent({
    userId,
    projectId: payload.project.id,
    action: "sync",
    detail: `${payload.project.title} ${payload.sync?.mode === "force" ? "force synced" : "synced"} with ${payload.project.layers.length} layers and ${payload.mediaAssets.length} media records.`,
  });
  await pruneProjectVersions(payload.project.id, userId);

  return {
    id: payload.project.id,
    updatedAt: now.toISOString(),
  };
}

function syncVersionLabel(mode: string | undefined) {
  return mode === "force" ? "Force cloud sync" : "Cloud sync";
}

export async function deleteSyncedProject(projectId: string) {
  const { userId } = await requireProjectUser();
  const [project] = await getDb()
    .select({ id: projects.id, title: projects.title })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)))
    .limit(1);
  if (!project) return;

  await recordProjectAuditEvent({
    userId,
    projectId,
    action: "delete",
    detail: `${project.title} deleted from signed-in library.`,
  });
  await getDb().delete(projects).where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)));
}

export async function listSyncedProjectVersions(projectId: string) {
  const { userId } = await requireProjectUser();
  await assertProjectOwner(projectId, userId);

  const [versions, auditEvents] = await Promise.all([
    getDb()
      .select()
      .from(projectVersions)
      .where(and(eq(projectVersions.projectId, projectId), eq(projectVersions.ownerId, userId)))
      .orderBy(desc(projectVersions.createdAt)),
    getDb()
      .select()
      .from(projectAuditEvents)
      .where(and(eq(projectAuditEvents.projectId, projectId), eq(projectAuditEvents.ownerId, userId)))
      .orderBy(desc(projectAuditEvents.createdAt)),
  ]);

  return {
    versions: versions.map(projectVersionSummary),
    auditEvents: auditEvents.map(projectAuditEventSummary),
  };
}

export async function restoreSyncedProjectVersion(projectId: string, input: unknown) {
  const { userId } = await requireProjectUser();
  const payload = restoreSyncedProjectVersionInputSchema.parse(input);
  const db = getDb();
  const [version] = await db
    .select()
    .from(projectVersions)
    .where(and(eq(projectVersions.id, payload.versionId), eq(projectVersions.projectId, projectId), eq(projectVersions.ownerId, userId)))
    .limit(1);

  if (!version) {
    throw new ProjectVersionNotFoundError();
  }

  const versionPayload = parseProjectPayload(version.versionJson);
  const now = new Date();
  await db
    .update(projects)
    .set({
      title: versionPayload.project.title,
      aspectRatio: versionPayload.project.aspectRatio,
      duration: Math.round(versionPayload.project.duration),
      projectJson: version.versionJson,
      updatedAt: now,
    })
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)));

  const [project] = await db
    .select({ workspaceId: projects.workspaceId })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)))
    .limit(1);

  if (!project) {
    throw new ProjectAccessError();
  }

  await replaceMediaMetadata(versionPayload, project.workspaceId, userId);
  await recordProjectVersion({
    payload: versionPayload,
    userId,
    projectId,
    action: "restore",
    label: `Restored ${version.label}`,
  });
  await recordProjectAuditEvent({
    userId,
    projectId,
    action: "restore",
    detail: `${versionPayload.project.title} restored from ${version.label}.`,
  });
  await pruneProjectVersions(projectId, userId);

  return {
    id: projectId,
    updatedAt: now.toISOString(),
  };
}

async function ensureDefaultWorkspace(userId: string) {
  const db = getDb();
  const [existing] = await db.select().from(workspaces).where(eq(workspaces.ownerId, userId)).limit(1);
  if (existing) return existing;

  const now = new Date();
  const [workspace] = await db
    .insert(workspaces)
    .values({
      id: `workspace_${crypto.randomUUID()}`,
      ownerId: userId,
      name: "Personal workspace",
      slug: `personal-${userId}`,
      plan: "free-local",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return workspace;
}

async function replaceMediaMetadata(payload: SyncedProjectPayload, workspaceId: string, ownerId: string) {
  const db = getDb();
  await db.delete(mediaAssets).where(and(eq(mediaAssets.projectId, payload.project.id), eq(mediaAssets.ownerId, ownerId)));

  if (!payload.mediaAssets.length) return;

  const now = new Date();
  await db.insert(mediaAssets).values(
    payload.mediaAssets.map((asset) => ({
      id: asset.id,
      workspaceId,
      projectId: payload.project.id,
      ownerId,
      name: asset.name,
      mediaType: asset.type,
      mimeType: asset.mimeType,
      size: asset.size,
      duration: Math.round(asset.duration || 0),
      width: asset.width,
      height: asset.height,
      storageAdapter: asset.source,
      storageKey: asset.storageKey,
      createdAt: now,
      updatedAt: now,
    })),
  );
}

async function assertProjectOwner(projectId: string, userId: string) {
  const [project] = await getDb()
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.ownerId, userId)))
    .limit(1);

  if (!project) {
    throw new ProjectAccessError();
  }
}

async function recordProjectVersion({
  payload,
  userId,
  projectId,
  action,
  label,
}: {
  payload: SyncedProjectPayload;
  userId: string;
  projectId: string;
  action: "sync" | "restore";
  label: string;
}) {
  await getDb().insert(projectVersions).values({
    id: `project_version_${crypto.randomUUID()}`,
    projectId,
    ownerId: userId,
    label,
    action,
    layerCount: payload.project.layers.length,
    mediaCount: payload.mediaAssets.length,
    duration: Math.round(payload.project.duration),
    versionJson: JSON.stringify({
      project: payload.project,
      mediaAssets: sanitizeMediaAssets(payload.mediaAssets),
    }),
    createdAt: new Date(),
  });
}

async function recordProjectAuditEvent({
  userId,
  projectId,
  action,
  detail,
}: {
  userId: string;
  projectId: string;
  action: "sync" | "restore" | "delete";
  detail: string;
}) {
  await getDb().insert(projectAuditEvents).values({
    id: `project_audit_${crypto.randomUUID()}`,
    projectId,
    ownerId: userId,
    action,
    detail,
    createdAt: new Date(),
  });
}

async function pruneProjectVersions(projectId: string, userId: string, keep = 24) {
  const versions = await getDb()
    .select({ id: projectVersions.id })
    .from(projectVersions)
    .where(and(eq(projectVersions.projectId, projectId), eq(projectVersions.ownerId, userId)))
    .orderBy(desc(projectVersions.createdAt));
  const staleVersions = versions.slice(keep);
  if (staleVersions.length) {
    await Promise.all(staleVersions.map((version) => getDb().delete(projectVersions).where(eq(projectVersions.id, version.id))));
  }
}

function parseProjectPayload(projectJson: string): SyncedProjectPayload {
  const payload = safeParseProjectPayload(projectJson);
  if (!payload) {
    throw new ProjectDataError();
  }

  return payload;
}

function safeParseProjectPayload(projectJson: string): SyncedProjectPayload | null {
  try {
    const parsed = syncedProjectPayloadSchema.safeParse(JSON.parse(projectJson));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function projectVersionSummary(row: typeof projectVersions.$inferSelect): SyncedProjectVersionSummary {
  return {
    id: row.id,
    projectId: row.projectId,
    label: row.label,
    action: row.action,
    layerCount: row.layerCount,
    mediaCount: row.mediaCount,
    duration: row.duration,
    createdAt: row.createdAt.toISOString(),
  };
}

function projectAuditEventSummary(row: typeof projectAuditEvents.$inferSelect): SyncedProjectAuditEvent {
  return {
    id: row.id,
    projectId: row.projectId,
    action: row.action,
    detail: row.detail,
    createdAt: row.createdAt.toISOString(),
  };
}

export class ProjectAuthError extends Error {
  constructor() {
    super("You must be signed in to sync projects.");
    this.name = "ProjectAuthError";
  }
}

export class ProjectAccessError extends Error {
  constructor() {
    super("You do not have access to this project.");
    this.name = "ProjectAccessError";
  }
}

export class ProjectDataError extends Error {
  constructor() {
    super("Saved project data could not be loaded.");
    this.name = "ProjectDataError";
  }
}

export class ProjectVersionNotFoundError extends Error {
  constructor() {
    super("Saved project version could not be found.");
    this.name = "ProjectVersionNotFoundError";
  }
}

export { ProjectSyncConflictError };
