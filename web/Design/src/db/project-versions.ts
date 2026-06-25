import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import { project, projectVersion, type ProjectVersionRow } from "@/db/schema";
import {
  parseDesignDocument,
  stringifyDesignDocument,
} from "@/features/editor/document-codec";
import type {
  DesignDocument,
  ProjectDetail,
  ProjectVersionSummary,
} from "@/features/editor/types";
import { normalizeSharePermission } from "@/features/projects/project-permissions";
import { normalizeApprovalStatus } from "@/features/review/approval-status";

function toSummary(row: ProjectVersionRow): ProjectVersionSummary {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    thumbnail: row.thumbnail,
    createdAt: row.createdAt.toISOString(),
  };
}

function toProjectDetail(row: typeof project.$inferSelect): ProjectDetail {
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
    document: parseDesignDocument(row.document),
  };
}

export async function createProjectVersion(input: {
  userId: string;
  projectId: string;
  name: string;
  document: DesignDocument;
  thumbnail?: string | null;
}) {
  const [row] = await getDb()
    .insert(projectVersion)
    .values({
      id: nanoid(),
      userId: input.userId,
      projectId: input.projectId,
      name: input.name,
      document: stringifyDesignDocument(input.document),
      thumbnail: input.thumbnail ?? null,
      createdAt: new Date(),
    })
    .returning();

  return toSummary(row);
}

export async function listProjectVersions(input: {
  userId: string;
  projectId: string;
}) {
  const rows = await getDb()
    .select()
    .from(projectVersion)
    .where(
      and(
        eq(projectVersion.userId, input.userId),
        eq(projectVersion.projectId, input.projectId),
      ),
    )
    .orderBy(desc(projectVersion.createdAt))
    .limit(30);

  return rows.map(toSummary);
}

export async function listWorkspaceProjectVersions(userId: string) {
  const rows = await getDb()
    .select()
    .from(projectVersion)
    .where(eq(projectVersion.userId, userId))
    .orderBy(desc(projectVersion.createdAt))
    .limit(120);

  return rows.map(toSummary);
}

export async function restoreProjectVersion(input: {
  userId: string;
  projectId: string;
  versionId: string;
}) {
  const [version] = await getDb()
    .select()
    .from(projectVersion)
    .where(
      and(
        eq(projectVersion.id, input.versionId),
        eq(projectVersion.projectId, input.projectId),
        eq(projectVersion.userId, input.userId),
      ),
    )
    .limit(1);

  if (!version) return null;

  const document = parseDesignDocument(version.document);
  const [row] = await getDb()
    .update(project)
    .set({
      name: version.name,
      document: stringifyDesignDocument(document),
      thumbnail: version.thumbnail,
      updatedAt: new Date(),
    })
    .where(
      and(eq(project.id, input.projectId), eq(project.userId, input.userId)),
    )
    .returning();

  if (!row) return null;

  await createProjectVersion({
    userId: input.userId,
    projectId: input.projectId,
    name: version.name,
    document,
    thumbnail: version.thumbnail,
  });

  return toProjectDetail(row);
}
