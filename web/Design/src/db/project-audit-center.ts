import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  brandColor,
  brandFont,
  brandLogo,
  project,
  type ProjectRow,
} from "@/db/schema";
import { parseDesignDocument } from "@/features/editor/document-codec";
import type {
  BrandColorSummary,
  BrandFontRole,
  BrandFontSummary,
  BrandLogoSummary,
  ProjectDetail,
} from "@/features/editor/types";
import { normalizeSharePermission } from "@/features/projects/project-permissions";
import {
  createProjectAuditSummary,
  type ProjectAuditSummary,
} from "@/features/projects/project-audit-center";
import { normalizeApprovalStatus } from "@/features/review/approval-status";

export async function listProjectAuditSummaries(
  userId: string,
): Promise<ProjectAuditSummary[]> {
  const rows = await getDb()
    .select()
    .from(project)
    .where(andProjectOwner(userId))
    .orderBy(desc(project.updatedAt))
    .limit(24);
  const userIds = Array.from(new Set(rows.map((row) => row.userId)));
  const [brandColors, brandFonts, brandLogos] = userIds.length
    ? await Promise.all([
        getDb()
          .select()
          .from(brandColor)
          .where(inArray(brandColor.userId, userIds)),
        getDb()
          .select()
          .from(brandFont)
          .where(inArray(brandFont.userId, userIds)),
        getDb()
          .select()
          .from(brandLogo)
          .where(inArray(brandLogo.userId, userIds)),
      ])
    : [[], [], []];

  return rows.map((row) =>
    createProjectAuditSummary({
      project: toDetail(row),
      brandColors: brandColors
        .filter((item) => item.userId === row.userId)
        .map(toBrandColorSummary),
      brandFonts: brandFonts
        .filter((item) => item.userId === row.userId)
        .map(toBrandFontSummary),
      brandLogos: brandLogos
        .filter((item) => item.userId === row.userId)
        .map(toBrandLogoSummary),
    }),
  );
}

function andProjectOwner(userId: string) {
  return and(eq(project.userId, userId), isNull(project.deletedAt));
}

function toDetail(row: ProjectRow): ProjectDetail {
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

function toBrandColorSummary(row: typeof brandColor.$inferSelect): BrandColorSummary {
  return {
    id: row.id,
    color: row.color,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toBrandFontSummary(row: typeof brandFont.$inferSelect): BrandFontSummary {
  return {
    id: row.id,
    role: row.role as BrandFontRole,
    fontFamily: row.fontFamily,
    fontSize: row.fontSize,
    fontWeight: row.fontWeight,
    letterSpacing: row.letterSpacing,
    lineHeight: row.lineHeight,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toBrandLogoSummary(row: typeof brandLogo.$inferSelect): BrandLogoSummary {
  return {
    id: row.id,
    name: row.name,
    dataUrl: row.dataUrl,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
