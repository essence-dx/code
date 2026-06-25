import { and, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db/client";
import { project, type ProjectRow } from "@/db/schema";
import { parseDesignDocument } from "@/features/editor/document-codec";
import type { ProjectDetail } from "@/features/editor/types";
import { normalizeSharePermission } from "@/features/projects/project-permissions";
import { normalizeApprovalStatus } from "@/features/review/approval-status";
import {
  createMixedFormatWorkspaceOrchestration,
  type MixedFormatWorkspaceOrchestration,
} from "@/features/visual-suite/mixed-format-orchestration";

export async function listMixedFormatProjectOrchestration(
  userId: string,
): Promise<MixedFormatWorkspaceOrchestration> {
  const rows = await getDb()
    .select()
    .from(project)
    .where(and(eq(project.userId, userId), isNull(project.deletedAt)))
    .orderBy(desc(project.updatedAt))
    .limit(24);

  return createMixedFormatWorkspaceOrchestration(rows.map(toProjectDetail));
}

function toProjectDetail(row: ProjectRow): ProjectDetail {
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
