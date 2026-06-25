import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import { designTemplate, user, type DesignTemplateRow } from "@/db/schema";
import {
  parseDesignDocument,
  stringifyDesignDocument,
} from "@/features/editor/document-codec";
import type {
  DesignDocument,
  DesignTemplateDetail,
  DesignTemplateSummary,
} from "@/features/editor/types";
import { normalizeApprovalStatus } from "@/features/review/approval-status";
import {
  normalizeTemplateMarketplaceCollection,
  normalizeTemplateMarketplaceReviewNote,
  normalizeTemplateMarketplaceSeason,
  normalizeTemplateMarketplaceStatus,
  shouldStampMarketplacePublishedAt,
  type TemplateMarketplaceStatus,
} from "@/features/templates/template-marketplace";

function toSummary(
  row: DesignTemplateRow,
  creator?: { name: string | null; email: string | null },
): DesignTemplateSummary {
  return {
    id: row.id,
    name: row.name,
    creatorName: creator?.name ?? null,
    creatorEmail: creator?.email ?? null,
    width: row.width,
    height: row.height,
    thumbnail: row.thumbnail,
    isBrandTemplate: row.isBrandTemplate,
    isTeamTemplate: row.isTeamTemplate,
    approvalStatus: normalizeApprovalStatus(row.approvalStatus),
    marketplaceStatus: normalizeTemplateMarketplaceStatus(
      row.marketplaceStatus,
    ),
    marketplaceCollection: row.marketplaceCollection,
    marketplaceSeason: row.marketplaceSeason,
    marketplaceReviewNote: row.marketplaceReviewNote,
    marketplacePublishedAt: row.marketplacePublishedAt?.toISOString() ?? null,
    marketplaceUseCount: row.marketplaceUseCount,
    marketplaceViewCount: row.marketplaceViewCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(row: DesignTemplateRow): DesignTemplateDetail {
  return {
    ...toSummary(row),
    document: parseDesignDocument(row.document),
  };
}

export async function listDesignTemplates(userId: string) {
  const rows = await getDb()
    .select({
      template: designTemplate,
      creatorName: user.name,
      creatorEmail: user.email,
    })
    .from(designTemplate)
    .leftJoin(user, eq(designTemplate.userId, user.id))
    .where(
      or(
        eq(designTemplate.userId, userId),
        eq(designTemplate.isTeamTemplate, true),
      ),
    )
    .orderBy(desc(designTemplate.updatedAt))
    .limit(36);

  return rows.map((row) =>
    toSummary(row.template, {
      name: row.creatorName,
      email: row.creatorEmail,
    }),
  );
}

export async function getDesignTemplate(input: {
  userId: string;
  templateId: string;
}) {
  const [row] = await getDb()
    .select()
    .from(designTemplate)
    .where(
      and(
        eq(designTemplate.id, input.templateId),
        or(
          eq(designTemplate.userId, input.userId),
          eq(designTemplate.isTeamTemplate, true),
        ),
      ),
    )
    .limit(1);

  return row ? toDetail(row) : null;
}

export async function createDesignTemplate(input: {
  userId: string;
  name: string;
  width: number;
  height: number;
  document: DesignDocument;
  thumbnail?: string | null;
  isBrandTemplate?: boolean;
  isTeamTemplate?: boolean;
  approvalStatus?: DesignTemplateSummary["approvalStatus"];
}) {
  const now = new Date();

  const [row] = await getDb()
    .insert(designTemplate)
    .values({
      id: nanoid(),
      userId: input.userId,
      name: input.name.trim() || "Untitled template",
      width: input.width,
      height: input.height,
      document: stringifyDesignDocument(input.document),
      thumbnail: input.thumbnail ?? null,
      isBrandTemplate: input.isBrandTemplate ?? false,
      isTeamTemplate: input.isTeamTemplate ?? false,
      approvalStatus: normalizeApprovalStatus(input.approvalStatus),
      marketplaceStatus: "draft",
      marketplaceReviewNote: "",
      marketplaceUseCount: 0,
      marketplaceViewCount: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return toDetail(row);
}

export async function updateDesignTemplateApprovalStatus(input: {
  userId: string;
  templateId: string;
  approvalStatus: DesignTemplateSummary["approvalStatus"];
}) {
  const [row] = await getDb()
    .update(designTemplate)
    .set({
      approvalStatus: normalizeApprovalStatus(input.approvalStatus),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(designTemplate.id, input.templateId),
        eq(designTemplate.userId, input.userId),
      ),
    )
    .returning();

  return row ? toDetail(row) : null;
}

export async function updateDesignTemplateMarketplaceListing(input: {
  templateId: string;
  status: TemplateMarketplaceStatus;
  collection?: string | null;
  season?: string | null;
  reviewNote?: string | null;
}) {
  const [existing] = await getDb()
    .select()
    .from(designTemplate)
    .where(eq(designTemplate.id, input.templateId))
    .limit(1);

  if (!existing) {
    return null;
  }

  const status = normalizeTemplateMarketplaceStatus(input.status);
  const publishedAt = shouldStampMarketplacePublishedAt({
    nextStatus: status,
    previousPublishedAt: existing.marketplacePublishedAt,
  })
    ? new Date()
    : status === "published"
      ? existing.marketplacePublishedAt
      : null;
  const [row] = await getDb()
    .update(designTemplate)
    .set({
      marketplaceStatus: status,
      marketplaceCollection: normalizeTemplateMarketplaceCollection(
        input.collection,
      ),
      marketplaceSeason: normalizeTemplateMarketplaceSeason(input.season),
      marketplaceReviewNote: normalizeTemplateMarketplaceReviewNote(
        input.reviewNote,
      ),
      marketplacePublishedAt: publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(designTemplate.id, input.templateId))
    .returning();

  return row ? toDetail(row) : null;
}

export async function incrementDesignTemplateUse(input: {
  userId: string;
  templateId: string;
}) {
  await getDb()
    .update(designTemplate)
    .set({
      marketplaceUseCount: sql`${designTemplate.marketplaceUseCount} + 1`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(designTemplate.id, input.templateId),
        or(
          eq(designTemplate.userId, input.userId),
          eq(designTemplate.isTeamTemplate, true),
        ),
      ),
    );
}

export async function incrementDesignTemplateViews(input: {
  userId: string;
  templateIds: string[];
}) {
  const templateIds = Array.from(new Set(input.templateIds))
    .map((templateId) => templateId.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (!templateIds.length) {
    return 0;
  }

  const rows = await getDb()
    .update(designTemplate)
    .set({
      marketplaceViewCount: sql`${designTemplate.marketplaceViewCount} + 1`,
    })
    .where(
      and(
        inArray(designTemplate.id, templateIds),
        eq(designTemplate.marketplaceStatus, "published"),
        or(
          eq(designTemplate.userId, input.userId),
          eq(designTemplate.isTeamTemplate, true),
        ),
      ),
    )
    .returning({ id: designTemplate.id });

  return rows.length;
}
