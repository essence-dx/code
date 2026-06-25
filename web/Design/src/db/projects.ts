import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import { createProjectVersion } from "@/db/project-versions";
import { project, type ProjectRow } from "@/db/schema";
import {
  parseDesignDocument,
  stringifyDesignDocument,
} from "@/features/editor/document-codec";
import {
  resizeDesignDocument,
  type DesignResizeProfile,
} from "@/features/editor/resize-profiles";
import type {
  DesignDocument,
  ProjectDetail,
  ProjectSummary,
  SharePermission,
} from "@/features/editor/types";
import { normalizeSharePermission } from "@/features/projects/project-permissions";
import { normalizeApprovalStatus } from "@/features/review/approval-status";

function toSummary(row: ProjectRow): ProjectSummary {
  return {
    id: row.id,
    name: row.name,
    width: row.width,
    height: row.height,
    folderId: row.folderId,
    sourceProjectId: row.sourceProjectId,
    variantProfileId: row.variantProfileId,
    variantName: row.variantName,
    thumbnail: row.thumbnail,
    publicShareId: row.publicShareId,
    editShareId: row.editShareId,
    editSharePermission: normalizeSharePermission(row.editSharePermission),
    approvalStatus: normalizeApprovalStatus(row.approvalStatus),
    starred: row.starred,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(row: ProjectRow): ProjectDetail {
  return {
    ...toSummary(row),
    document: parseDesignDocument(row.document),
  };
}

export async function listProjects(userId: string) {
  const rows = await getDb()
    .select()
    .from(project)
    .where(eq(project.userId, userId))
    .orderBy(desc(project.updatedAt))
    .limit(50);

  return rows.map(toSummary);
}

export async function createProject(input: {
  userId: string;
  name: string;
  width: number;
  height: number;
  document: DesignDocument;
  folderId?: string | null;
  thumbnail?: string | null;
  sourceProjectId?: string | null;
  variantProfileId?: string | null;
  variantName?: string | null;
  approvalStatus?: ProjectSummary["approvalStatus"];
}) {
  const now = new Date();
  const id = nanoid();

  const [row] = await getDb()
    .insert(project)
    .values({
      id,
      userId: input.userId,
      name: input.name,
      folderId: input.folderId ?? null,
      thumbnail: input.thumbnail ?? null,
      sourceProjectId: input.sourceProjectId ?? null,
      variantProfileId: input.variantProfileId ?? null,
      variantName: input.variantName ?? null,
      approvalStatus: normalizeApprovalStatus(input.approvalStatus),
      width: input.width,
      height: input.height,
      document: stringifyDesignDocument(input.document),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  await createProjectVersion({
    userId: input.userId,
    projectId: row.id,
    name: row.name,
    document: input.document,
    thumbnail: row.thumbnail,
  });

  return toDetail(row);
}

export async function createResizedProjectVariant(input: {
  userId: string;
  projectId: string;
  profile: DesignResizeProfile;
}) {
  const sourceProject = await getProject({
    userId: input.userId,
    projectId: input.projectId,
  });

  if (!sourceProject) {
    return null;
  }

  const document = resizeDesignDocument({
    document: sourceProject.document,
    profile: input.profile,
    sourceProjectId: sourceProject.id,
    sourceProjectName: sourceProject.name,
  });

  return createProject({
    userId: input.userId,
    name: `${sourceProject.name} - ${input.profile.name}`,
    width: input.profile.width,
    height: input.profile.height,
    document,
    folderId: sourceProject.folderId,
    thumbnail: sourceProject.thumbnail,
    sourceProjectId: sourceProject.id,
    variantProfileId: input.profile.id,
    variantName: input.profile.name,
  });
}

export async function refreshProjectVariantSourceMetadata(input: {
  userId: string;
  projectId: string;
}) {
  const variant = await getProject({
    userId: input.userId,
    projectId: input.projectId,
  });

  if (!variant?.sourceProjectId) {
    return null;
  }

  const source = await getProject({
    userId: input.userId,
    projectId: variant.sourceProjectId,
  });

  if (!source) {
    return null;
  }

  return updateProject({
    userId: input.userId,
    projectId: variant.id,
    document: {
      ...variant.document,
      metadata: {
        ...variant.document.metadata,
        sourceProjectId: source.id,
        sourceProjectName: source.name,
        sourceWidth: source.width,
        sourceHeight: source.height,
      },
    },
  });
}

export async function getProject(input: { userId: string; projectId: string }) {
  const [row] = await getDb()
    .select()
    .from(project)
    .where(
      and(
        eq(project.id, input.projectId),
        eq(project.userId, input.userId),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  return row ? toDetail(row) : null;
}

export async function getProjectSummaryIncludingDeleted(input: {
  userId: string;
  projectId: string;
}) {
  const [row] = await getDb()
    .select()
    .from(project)
    .where(
      and(eq(project.id, input.projectId), eq(project.userId, input.userId)),
    )
    .limit(1);

  return row ? toSummary(row) : null;
}

export async function getProjectById(projectId: string) {
  const [row] = await getDb()
    .select()
    .from(project)
    .where(and(eq(project.id, projectId), isNull(project.deletedAt)))
    .limit(1);

  return row ? toDetail(row) : null;
}

export async function getProjectOwnerUserId(projectId: string) {
  const [row] = await getDb()
    .select({ userId: project.userId })
    .from(project)
    .where(and(eq(project.id, projectId), isNull(project.deletedAt)))
    .limit(1);

  return row?.userId ?? null;
}

export async function getPublicProject(publicShareId: string) {
  const [row] = await getDb()
    .select()
    .from(project)
    .where(
      and(
        eq(project.publicShareId, publicShareId),
        isNotNull(project.publicShareId),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  return row ? toDetail(row) : null;
}

export async function getProjectByEditShare(editShareId: string) {
  const [row] = await getDb()
    .select()
    .from(project)
    .where(
      and(
        eq(project.editShareId, editShareId),
        isNotNull(project.editShareId),
        isNull(project.deletedAt),
      ),
    )
    .limit(1);

  return row ? toDetail(row) : null;
}

export async function updateProject(input: {
  userId: string;
  projectId: string;
  name?: string;
  document?: DesignDocument;
  thumbnail?: string | null;
  starred?: boolean;
  folderId?: string | null;
  approvalStatus?: ProjectSummary["approvalStatus"];
}) {
  const [row] = await getDb()
    .update(project)
    .set({
      ...(input.name ? { name: input.name } : {}),
      ...(input.document
        ? { document: stringifyDesignDocument(input.document) }
        : {}),
      ...(input.thumbnail !== undefined ? { thumbnail: input.thumbnail } : {}),
      ...(input.starred !== undefined ? { starred: input.starred } : {}),
      ...(input.folderId !== undefined ? { folderId: input.folderId } : {}),
      ...(input.approvalStatus !== undefined
        ? { approvalStatus: normalizeApprovalStatus(input.approvalStatus) }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(eq(project.id, input.projectId), eq(project.userId, input.userId)),
    )
    .returning();

  if (row && input.document) {
    await createProjectVersion({
      userId: input.userId,
      projectId: row.id,
      name: row.name,
      document: input.document,
      thumbnail: row.thumbnail,
    });
  }

  return row ? toDetail(row) : null;
}

export async function updateProjectApprovalStatus(input: {
  userId: string;
  projectId: string;
  approvalStatus: ProjectSummary["approvalStatus"];
}) {
  return updateProject({
    userId: input.userId,
    projectId: input.projectId,
    approvalStatus: input.approvalStatus,
  });
}

export async function updateProjectByEditShare(input: {
  editShareId: string;
  projectId: string;
  name?: string;
  document?: DesignDocument;
  thumbnail?: string | null;
}) {
  const [row] = await getDb()
    .update(project)
    .set({
      ...(input.name ? { name: input.name } : {}),
      ...(input.document
        ? { document: stringifyDesignDocument(input.document) }
        : {}),
      ...(input.thumbnail !== undefined ? { thumbnail: input.thumbnail } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(project.id, input.projectId),
        eq(project.editShareId, input.editShareId),
        eq(project.editSharePermission, "edit"),
        isNotNull(project.editShareId),
        isNull(project.deletedAt),
      ),
    )
    .returning();

  if (row && input.document) {
    await createProjectVersion({
      userId: row.userId,
      projectId: row.id,
      name: row.name,
      document: input.document,
      thumbnail: row.thumbnail,
    });
  }

  return row ? toDetail(row) : null;
}

export type ProjectSyncResult =
  | {
      status: "updated" | "conflict";
      project: ProjectDetail;
    }
  | {
      status: "missing";
      project: null;
    };

export async function syncProject(input: {
  userId: string;
  projectId: string;
  baseUpdatedAt: string | null;
  name?: string;
  document: DesignDocument;
}) {
  const existing = await getProject({
    userId: input.userId,
    projectId: input.projectId,
  });

  if (!existing) {
    return { status: "missing", project: null } satisfies ProjectSyncResult;
  }

  if (input.baseUpdatedAt && existing.updatedAt !== input.baseUpdatedAt) {
    return {
      status: "conflict",
      project: existing,
    } satisfies ProjectSyncResult;
  }

  const synced = await updateProjectDocumentWithoutVersion({
    projectId: input.projectId,
    name: input.name,
    document: input.document,
    ownerUserId: input.userId,
  });

  return synced
    ? ({ status: "updated", project: synced } satisfies ProjectSyncResult)
    : ({ status: "missing", project: null } satisfies ProjectSyncResult);
}

export async function syncProjectByEditShare(input: {
  editShareId: string;
  projectId: string;
  baseUpdatedAt: string | null;
  name?: string;
  document: DesignDocument;
}) {
  const existing = await getProjectByEditShare(input.editShareId);

  if (
    !existing ||
    existing.id !== input.projectId ||
    existing.editSharePermission !== "edit"
  ) {
    return { status: "missing", project: null } satisfies ProjectSyncResult;
  }

  if (input.baseUpdatedAt && existing.updatedAt !== input.baseUpdatedAt) {
    return {
      status: "conflict",
      project: existing,
    } satisfies ProjectSyncResult;
  }

  const synced = await updateProjectDocumentWithoutVersion({
    projectId: input.projectId,
    editShareId: input.editShareId,
    name: input.name,
    document: input.document,
  });

  return synced
    ? ({ status: "updated", project: synced } satisfies ProjectSyncResult)
    : ({ status: "missing", project: null } satisfies ProjectSyncResult);
}

async function updateProjectDocumentWithoutVersion(input: {
  projectId: string;
  ownerUserId?: string;
  editShareId?: string;
  name?: string;
  document: DesignDocument;
}) {
  const [row] = await getDb()
    .update(project)
    .set({
      ...(input.name ? { name: input.name } : {}),
      document: stringifyDesignDocument(input.document),
      updatedAt: new Date(),
    })
    .where(
      input.editShareId
        ? and(
            eq(project.id, input.projectId),
            eq(project.editShareId, input.editShareId),
            eq(project.editSharePermission, "edit"),
            isNotNull(project.editShareId),
            isNull(project.deletedAt),
          )
        : and(
            eq(project.id, input.projectId),
            eq(project.userId, input.ownerUserId ?? ""),
            isNull(project.deletedAt),
          ),
    )
    .returning();

  return row ? toDetail(row) : null;
}

export async function setProjectPublicShare(input: {
  userId: string;
  projectId: string;
  enabled: boolean;
}) {
  const existing = await getProject({
    userId: input.userId,
    projectId: input.projectId,
  });

  if (!existing) return null;

  const [row] = await getDb()
    .update(project)
    .set({
      publicShareId: input.enabled
        ? (existing.publicShareId ?? nanoid(24))
        : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(project.id, input.projectId),
        eq(project.userId, input.userId),
        isNull(project.deletedAt),
      ),
    )
    .returning();

  return row ? toDetail(row) : null;
}

export async function setProjectEditShare(input: {
  userId: string;
  projectId: string;
  enabled: boolean;
  permission?: SharePermission;
}) {
  const existing = await getProject({
    userId: input.userId,
    projectId: input.projectId,
  });

  if (!existing) return null;

  const [row] = await getDb()
    .update(project)
    .set({
      editShareId: input.enabled ? (existing.editShareId ?? nanoid(32)) : null,
      editSharePermission: input.permission ?? existing.editSharePermission,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(project.id, input.projectId),
        eq(project.userId, input.userId),
        isNull(project.deletedAt),
      ),
    )
    .returning();

  return row ? toDetail(row) : null;
}

export async function deleteProject(input: {
  userId: string;
  projectId: string;
}) {
  await getDb()
    .delete(project)
    .where(
      and(eq(project.id, input.projectId), eq(project.userId, input.userId)),
    );
}

export async function trashProject(input: {
  userId: string;
  projectId: string;
}) {
  const now = new Date();

  await getDb()
    .update(project)
    .set({
      deletedAt: now,
      updatedAt: now,
    })
    .where(
      and(eq(project.id, input.projectId), eq(project.userId, input.userId)),
    );
}

export async function restoreProject(input: {
  userId: string;
  projectId: string;
}) {
  await getDb()
    .update(project)
    .set({
      deletedAt: null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(project.id, input.projectId), eq(project.userId, input.userId)),
    );
}
