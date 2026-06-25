import { and, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db/client";
import { project, type ProjectRow } from "@/db/schema";
import { parseDesignDocument } from "@/features/editor/document-codec";
import type { ProjectDetail } from "@/features/editor/types";
import { createRuleBasedLayoutIntelligenceCenter } from "@/features/creation/rule-based-layout-intelligence";
import type { RuleBasedLayoutIntelligenceCenter } from "@/features/creation/rule-based-layout-intelligence";
import { normalizeSharePermission } from "@/features/projects/project-permissions";
import { normalizeApprovalStatus } from "@/features/review/approval-status";

export async function listRuleBasedLayoutIntelligenceCenter(
  userId: string,
): Promise<RuleBasedLayoutIntelligenceCenter> {
  const rows = await getDb()
    .select()
    .from(project)
    .where(and(eq(project.userId, userId), isNull(project.deletedAt)))
    .orderBy(desc(project.updatedAt))
    .limit(24);

  return createRuleBasedLayoutIntelligenceCenter({
    projects: rows.map(toProjectDetail),
  });
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
