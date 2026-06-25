import { and, desc, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import { brandLogo, type BrandLogoRow } from "@/db/schema";
import type { StoredAssetAuditInput } from "@/features/assets/asset-library-audit";
import type { BrandLogoSummary } from "@/features/editor/types";

function toSummary(row: BrandLogoRow): BrandLogoSummary {
  return {
    id: row.id,
    name: row.name,
    mimeType: row.mimeType,
    dataUrl: row.dataUrl,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listBrandLogos(userId: string) {
  const rows = await getDb()
    .select()
    .from(brandLogo)
    .where(eq(brandLogo.userId, userId))
    .orderBy(desc(brandLogo.updatedAt))
    .limit(24);

  return rows.map(toSummary);
}

export async function createBrandLogo(input: {
  userId: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
}) {
  const now = new Date();

  const [row] = await getDb()
    .insert(brandLogo)
    .values({
      id: nanoid(),
      userId: input.userId,
      name: input.name.trim() || "Brand logo",
      mimeType: input.mimeType,
      dataUrl: input.dataUrl,
      sizeBytes: input.sizeBytes,
      width: input.width ?? null,
      height: input.height ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return toSummary(row);
}

export async function deleteBrandLogo(input: {
  userId: string;
  logoId: string;
}) {
  const [row] = await getDb()
    .delete(brandLogo)
    .where(
      and(eq(brandLogo.userId, input.userId), eq(brandLogo.id, input.logoId)),
    )
    .returning();

  return row ? toSummary(row) : null;
}

export async function deleteBrandLogos(input: {
  userId: string;
  logoIds: string[];
}) {
  const logoIds = Array.from(new Set(input.logoIds)).slice(0, 100);

  if (!logoIds.length) {
    return [];
  }

  const rows = await getDb()
    .delete(brandLogo)
    .where(
      and(eq(brandLogo.userId, input.userId), inArray(brandLogo.id, logoIds)),
    )
    .returning();

  return rows.map(toSummary);
}

export async function deleteDuplicateBrandLogos(userId: string) {
  const rows = await getDb()
    .select()
    .from(brandLogo)
    .where(eq(brandLogo.userId, userId))
    .orderBy(desc(brandLogo.updatedAt))
    .limit(500);
  const logoIds = createDuplicateCleanupIds(rows.map(toAuditInput));
  const deletedRows = await deleteBrandLogos({ userId, logoIds });

  return {
    deletedCount: deletedRows.length,
    recoveredBytes: deletedRows.reduce((total, logo) => total + logo.sizeBytes, 0),
  };
}

function toAuditInput(row: BrandLogoRow): StoredAssetAuditInput {
  return {
    id: row.id,
    name: row.name,
    mimeType: row.mimeType,
    dataUrl: row.dataUrl,
    sizeBytes: row.sizeBytes,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function createDuplicateCleanupIds(assets: StoredAssetAuditInput[]) {
  const grouped = new Map<string, StoredAssetAuditInput[]>();

  for (const asset of assets) {
    const key = `${asset.mimeType}:${asset.sizeBytes}:${asset.dataUrl}`;
    const group = grouped.get(key) ?? [];

    group.push(asset);
    grouped.set(key, group);
  }

  const assetIds: string[] = [];

  for (const group of grouped.values()) {
    if (group.length <= 1) continue;

    assetIds.push(...group.slice(1).map((asset) => asset.id));
  }

  return assetIds;
}
