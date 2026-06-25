import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/db/client";
import { project, projectVersion } from "@/db/schema";
import { auth } from "@/lib/auth";
import { sceneDocumentSchema } from "@/features/editor/types";
import { recordProjectAuditEvent } from "@/features/projects/server/project-audit-event-service";
import { requireFolderRole, requireProjectRole } from "@/features/projects/server/project-access-service";
import { createProjectVersionActivityData } from "@/features/projects/server/project-version-activity-service";
import { shareSettingsSchema } from "@/features/projects/share-settings";

const updateProjectSchema = z.object({
  expectedUpdatedAt: z.string().datetime().nullable().optional(),
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(240).optional(),
  folderId: z.string().nullable().optional(),
  sceneData: sceneDocumentSchema.optional(),
  shareSettings: shareSettingsSchema.optional(),
});

async function getSessionUserId() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user.id ?? null;
}

export async function GET(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const access = await requireProjectRole(projectId, userId, "viewer");

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  return Response.json({ project: access.project });
}

export async function PATCH(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const payload = updateProjectSchema.safeParse(await request.json());

  if (!payload.success) {
    return Response.json({ error: "Invalid project payload" }, { status: 400 });
  }

  if (payload.data.folderId) {
    const folderAccess = await requireFolderRole(payload.data.folderId, userId, "editor");

    if ("error" in folderAccess) {
      return Response.json({ error: folderAccess.error }, { status: folderAccess.status });
    }
  }

  const access = await requireProjectRole(projectId, userId, "editor");

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  if (payload.data.sceneData && payload.data.expectedUpdatedAt && access.project.updatedAt.toISOString() !== payload.data.expectedUpdatedAt) {
    return Response.json(
      {
        error: "Project changed since you opened it. Refresh before saving to avoid overwriting another edit.",
        latestUpdatedAt: access.project.updatedAt.toISOString(),
        project: access.project,
      },
      { status: 409 },
    );
  }

  let previousVersionId: string | null = null;

  if (payload.data.sceneData) {
    previousVersionId = nanoid();
    await getDb().insert(projectVersion).values({
      activityData: await createProjectVersionActivityData(projectId, userId),
      id: previousVersionId,
      userId,
      projectId,
      name: access.project.name,
      sceneData: access.project.sceneData,
      createdAt: new Date(),
    });
  }

  const updates = {
    name: payload.data.name,
    description: payload.data.description,
    folderId: payload.data.folderId,
    sceneData: payload.data.sceneData,
    shareSettings: payload.data.shareSettings,
    updatedAt: new Date(),
  };

  const rows = await getDb()
    .update(project)
    .set(updates)
    .where(eq(project.id, projectId))
    .returning();
  const updatedProject = rows[0];

  if (!updatedProject) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const changedFields = [
    payload.data.name !== undefined ? "name" : null,
    payload.data.description !== undefined ? "description" : null,
    payload.data.folderId !== undefined ? "folder" : null,
    payload.data.sceneData ? "scene" : null,
    payload.data.shareSettings ? "shareSettings" : null,
  ].filter(Boolean);

  await recordProjectAuditEvent({
    action: payload.data.sceneData ? "version.created" : payload.data.shareSettings ? "project.share_settings_changed" : "project.updated",
    actorUserId: userId,
    category: payload.data.sceneData ? "versions" : "publishing",
    metadata: {
      changedFields: changedFields.join(","),
      folderId: updatedProject.folderId,
      previousVersionId,
    },
    projectId,
    resourceId: payload.data.sceneData && previousVersionId ? previousVersionId : projectId,
    resourceType: payload.data.sceneData ? "projectVersion" : "project",
    summary: payload.data.sceneData ? `${updatedProject.name} was saved and a previous-version snapshot was captured.` : `${updatedProject.name} project settings were updated.`,
  });

  return Response.json({ project: updatedProject });
}

export async function DELETE(_request: Request, context: { params: Promise<{ projectId: string }> }) {
  const userId = await getSessionUserId();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const access = await requireProjectRole(projectId, userId, "admin");

  if ("error" in access) {
    return Response.json({ error: access.error }, { status: access.status });
  }

  const rows = await getDb()
    .delete(project)
    .where(eq(project.id, projectId))
    .returning({ id: project.id });

  if (!rows[0]) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  await recordProjectAuditEvent({
    action: "project.deleted",
    actorUserId: userId,
    category: "publishing",
    projectId,
    resourceId: projectId,
    resourceType: "project",
    summary: `${access.project.name} was permanently deleted.`,
    tombstone: {
      archivedAt: access.project.archivedAt?.toISOString() ?? null,
      folderId: access.project.folderId,
      name: access.project.name,
      publishedAt: access.project.publishedAt?.toISOString() ?? null,
      shareId: access.project.shareId,
      workspaceId: access.project.workspaceId,
    },
  });

  return Response.json({ deletedProjectId: rows[0].id });
}
