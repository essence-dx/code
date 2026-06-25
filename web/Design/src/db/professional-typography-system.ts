import { and, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/db/client";
import { listBrandFonts } from "@/db/brand-fonts";
import { project, type ProjectRow } from "@/db/schema";
import { createProfessionalTypographySystemCenter } from "@/features/creation/professional-typography-system";
import type { ProfessionalTypographySystemCenter } from "@/features/creation/professional-typography-system";
import { parseDesignDocument } from "@/features/editor/document-codec";
import type { ProjectDetail } from "@/features/editor/types";
import { normalizeSharePermission } from "@/features/projects/project-permissions";
import { normalizeApprovalStatus } from "@/features/review/approval-status";

export async function listProfessionalTypographySystemCenter(
  userId: string,
): Promise<ProfessionalTypographySystemCenter> {
  const [rows, brandFonts] = await Promise.all([
    getDb()
      .select()
      .from(project)
      .where(and(eq(project.userId, userId), isNull(project.deletedAt)))
      .orderBy(desc(project.updatedAt))
      .limit(24),
    listBrandFonts(userId),
  ]);

  return createProfessionalTypographySystemCenter({
    projects: rows.map(toProjectDetail),
    brandFonts,
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
