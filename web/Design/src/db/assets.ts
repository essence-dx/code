import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getDb } from "@/db/client";
import {
  brandLogo,
  project,
  userAsset,
  type BrandLogoRow,
  type ProjectRow,
  type UserAssetRow,
} from "@/db/schema";
import {
  createAssetLibraryAudit,
  type ProjectAssetManifestAuditInput,
  type StoredAssetAuditInput,
} from "@/features/assets/asset-library-audit";
import { parseDesignDocument } from "@/features/editor/document-codec";
import type { UserAssetSummary } from "@/features/assets/types";

function toSummary(row: UserAssetRow): UserAssetSummary {
  return {
    id: row.id,
    name: row.name,
    mimeType: row.mimeType,
    dataUrl: row.dataUrl,
    sizeBytes: row.sizeBytes,
    width: row.width,
    height: row.height,
    sourceProvider: row.sourceProvider,
    sourceUrl: row.sourceUrl,
    authorName: row.authorName,
    licenseName: row.licenseName,
    licenseUrl: row.licenseUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listUserAssets(userId: string) {
  const rows = await getDb()
    .select()
    .from(userAsset)
    .where(eq(userAsset.userId, userId))
    .orderBy(desc(userAsset.createdAt))
    .limit(36);

  return rows.map(toSummary);
}

export async function getUserAssetLibraryAudit(userId: string) {
  const [uploadRows, brandRows, projectRows] = await Promise.all([
    getDb()
      .select()
      .from(userAsset)
      .where(eq(userAsset.userId, userId))
      .orderBy(desc(userAsset.updatedAt))
      .limit(500),
    getDb()
      .select()
      .from(brandLogo)
      .where(eq(brandLogo.userId, userId))
      .orderBy(desc(brandLogo.updatedAt))
      .limit(500),
    getDb()
      .select()
      .from(project)
      .where(and(eq(project.userId, userId), isNull(project.deletedAt)))
      .orderBy(desc(project.updatedAt))
      .limit(250),
  ]);

  return createAssetLibraryAudit({
    uploads: uploadRows.map(toAuditInput),
    brandLogos: brandRows.map(toBrandAuditInput),
    projectManifests: projectRows.map(toProjectManifestAuditInput),
  });
}

export async function deleteUserAsset(input: {
  userId: string;
  assetId: string;
}) {
  const [row] = await getDb()
    .delete(userAsset)
    .where(
      and(eq(userAsset.userId, input.userId), eq(userAsset.id, input.assetId)),
    )
    .returning();

  return row ? toSummary(row) : null;
}

export async function deleteUserAssets(input: {
  userId: string;
  assetIds: string[];
}) {
  const assetIds = Array.from(new Set(input.assetIds)).slice(0, 100);

  if (!assetIds.length) {
    return [];
  }

  const rows = await getDb()
    .delete(userAsset)
    .where(
      and(eq(userAsset.userId, input.userId), inArray(userAsset.id, assetIds)),
    )
    .returning();

  return rows.map(toSummary);
}

export async function deleteDuplicateUserAssets(userId: string) {
  const rows = await getDb()
    .select()
    .from(userAsset)
    .where(eq(userAsset.userId, userId))
    .orderBy(desc(userAsset.updatedAt))
    .limit(500);
  const cleanup = createDuplicateCleanupPlan(rows.map(toAuditInput));
  const deletedRows = await deleteUserAssets({
    userId,
    assetIds: cleanup.assetIds,
  });

  return {
    deletedCount: deletedRows.length,
    recoveredBytes: deletedRows.reduce(
      (total, asset) => total + asset.sizeBytes,
      0,
    ),
  };
}

export async function createUserAsset(input: {
  userId: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  sourceProvider?: string | null;
  sourceUrl?: string | null;
  authorName?: string | null;
  licenseName?: string | null;
  licenseUrl?: string | null;
}) {
  const now = new Date();

  const [row] = await getDb()
    .insert(userAsset)
    .values({
      id: nanoid(),
      userId: input.userId,
      name: input.name,
      mimeType: input.mimeType,
      dataUrl: input.dataUrl,
      sizeBytes: input.sizeBytes,
      width: input.width ?? null,
      height: input.height ?? null,
      sourceProvider: input.sourceProvider ?? null,
      sourceUrl: input.sourceUrl ?? null,
      authorName: input.authorName ?? null,
      licenseName: input.licenseName ?? null,
      licenseUrl: input.licenseUrl ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return toSummary(row);
}

function toAuditInput(row: UserAssetRow): StoredAssetAuditInput {
  return {
    id: row.id,
    name: row.name,
    mimeType: row.mimeType,
    dataUrl: row.dataUrl,
    sizeBytes: row.sizeBytes,
    sourceProvider: row.sourceProvider,
    sourceUrl: row.sourceUrl,
    authorName: row.authorName,
    licenseName: row.licenseName,
    licenseUrl: row.licenseUrl,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toBrandAuditInput(row: BrandLogoRow): StoredAssetAuditInput {
  return {
    id: row.id,
    name: row.name,
    mimeType: row.mimeType,
    dataUrl: row.dataUrl,
    sizeBytes: row.sizeBytes,
    sourceProvider: "Brand library",
    sourceUrl: null,
    authorName: null,
    licenseName: "Internal workspace asset",
    licenseUrl: null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toProjectManifestAuditInput(
  row: ProjectRow,
): ProjectAssetManifestAuditInput {
  try {
    const manifest = parseDesignDocument(row.document).metadata
      ?.projectAssetManifest;

    return {
      projectId: row.id,
      projectName: row.name,
      totalBytes: manifest?.totalBytes ?? 0,
      entryCount: manifest?.entryCount ?? 0,
      skippedReferenceCount: manifest?.skippedReferences.length ?? 0,
      updatedAt: row.updatedAt.toISOString(),
    };
  } catch {
    return {
      projectId: row.id,
      projectName: row.name,
      totalBytes: 0,
      entryCount: 0,
      skippedReferenceCount: 0,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

function createDuplicateCleanupPlan(assets: StoredAssetAuditInput[]) {
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

  return { assetIds };
}
