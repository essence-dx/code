export const defaultAssetQuotaBytes = 250 * 1024 * 1024;

export type StoredAssetAuditInput = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  sizeBytes: number;
  sourceProvider?: string | null;
  sourceUrl?: string | null;
  authorName?: string | null;
  licenseName?: string | null;
  licenseUrl?: string | null;
  updatedAt: string;
};

export type ProjectAssetManifestAuditInput = {
  projectId: string;
  projectName: string;
  totalBytes: number;
  entryCount: number;
  skippedReferenceCount: number;
  updatedAt: string;
};

export type AssetAuditScope = "uploads" | "brand" | "projects";

export type AssetAuditRecord = {
  id: string;
  name: string;
  scope: AssetAuditScope;
  scopeLabel: string;
  mimeType: string;
  sizeBytes: number;
  updatedAt: string;
  previewUrl: string | null;
  href: string | null;
  referenceCount: number | null;
  skippedReferenceCount: number | null;
  duplicateKey: string | null;
  sourceProvider: string | null;
  sourceUrl: string | null;
  authorName: string | null;
  licenseName: string | null;
  licenseUrl: string | null;
};

export type AssetScopeUsage = {
  scope: AssetAuditScope;
  label: string;
  count: number;
  totalBytes: number;
};

export type AssetDuplicateGroup = {
  key: string;
  mimeType: string;
  sizeBytes: number;
  duplicateBytes: number;
  assets: AssetAuditRecord[];
};

export type AssetLibraryAudit = {
  quotaBytes: number;
  totalBytes: number;
  usagePercent: number;
  assetCount: number;
  duplicateCount: number;
  duplicateBytes: number;
  projectManifestCount: number;
  skippedProjectReferenceCount: number;
  scopes: AssetScopeUsage[];
  records: AssetAuditRecord[];
  largestAssets: AssetAuditRecord[];
  duplicateGroups: AssetDuplicateGroup[];
};

export function createAssetLibraryAudit(input: {
  uploads: StoredAssetAuditInput[];
  brandLogos: StoredAssetAuditInput[];
  projectManifests: ProjectAssetManifestAuditInput[];
  quotaBytes?: number;
}): AssetLibraryAudit {
  const quotaBytes = input.quotaBytes ?? defaultAssetQuotaBytes;
  const uploadRecords = input.uploads.map((asset) =>
    createStoredAssetRecord(asset, "uploads", "Uploads"),
  );
  const brandRecords = input.brandLogos.map((asset) =>
    createStoredAssetRecord(asset, "brand", "Brand"),
  );
  const projectRecords = input.projectManifests.map(createProjectRecord);
  const records = [...uploadRecords, ...brandRecords, ...projectRecords];
  const duplicateGroups = createDuplicateGroups([...uploadRecords, ...brandRecords]);
  const totalBytes = records.reduce((total, record) => total + record.sizeBytes, 0);
  const assetCount = records.reduce(
    (total, record) => total + (record.scope === "projects" ? 0 : 1),
    0,
  );

  return {
    quotaBytes,
    totalBytes,
    usagePercent: quotaBytes > 0 ? Math.min((totalBytes / quotaBytes) * 100, 100) : 0,
    assetCount,
    duplicateCount: duplicateGroups.reduce(
      (total, group) => total + Math.max(group.assets.length - 1, 0),
      0,
    ),
    duplicateBytes: duplicateGroups.reduce(
      (total, group) => total + group.duplicateBytes,
      0,
    ),
    projectManifestCount: input.projectManifests.reduce(
      (total, manifest) => total + manifest.entryCount,
      0,
    ),
    skippedProjectReferenceCount: input.projectManifests.reduce(
      (total, manifest) => total + manifest.skippedReferenceCount,
      0,
    ),
    scopes: [
      createScopeUsage("uploads", "Uploads", uploadRecords),
      createScopeUsage("brand", "Brand", brandRecords),
      createScopeUsage("projects", "Project assets", projectRecords),
    ],
    records,
    largestAssets: [...records]
      .sort((first, second) => second.sizeBytes - first.sizeBytes)
      .slice(0, 8),
    duplicateGroups,
  };
}

export function formatAssetBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 1 ? 1 : 2;

  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function createStoredAssetRecord(
  asset: StoredAssetAuditInput,
  scope: Extract<AssetAuditScope, "uploads" | "brand">,
  scopeLabel: string,
): AssetAuditRecord {
  return {
    id: asset.id,
    name: asset.name,
    scope,
    scopeLabel,
    mimeType: asset.mimeType,
    sizeBytes: Math.max(asset.sizeBytes, 0),
    updatedAt: asset.updatedAt,
    previewUrl: asset.dataUrl,
    href: null,
    referenceCount: null,
    skippedReferenceCount: null,
    duplicateKey: createDuplicateKey(asset),
    sourceProvider:
      asset.sourceProvider ?? (scope === "brand" ? "Brand library" : null),
    sourceUrl: asset.sourceUrl ?? null,
    authorName: asset.authorName ?? null,
    licenseName:
      asset.licenseName ??
      (scope === "brand" ? "Internal workspace asset" : null),
    licenseUrl: asset.licenseUrl ?? null,
  };
}

function createProjectRecord(
  manifest: ProjectAssetManifestAuditInput,
): AssetAuditRecord {
  return {
    id: manifest.projectId,
    name: manifest.projectName,
    scope: "projects",
    scopeLabel: "Project assets",
    mimeType: "project/manifest",
    sizeBytes: Math.max(manifest.totalBytes, 0),
    updatedAt: manifest.updatedAt,
    previewUrl: null,
    href: `/editor/${manifest.projectId}`,
    referenceCount: manifest.entryCount,
    skippedReferenceCount: manifest.skippedReferenceCount,
    duplicateKey: null,
    sourceProvider: "Project manifest",
    sourceUrl: `/editor/${manifest.projectId}`,
    authorName: null,
    licenseName: "Internal project asset manifest",
    licenseUrl: null,
  };
}

function createScopeUsage(
  scope: AssetAuditScope,
  label: string,
  records: AssetAuditRecord[],
): AssetScopeUsage {
  return {
    scope,
    label,
    count: records.reduce(
      (total, record) => total + (record.scope === "projects" ? record.referenceCount ?? 0 : 1),
      0,
    ),
    totalBytes: records.reduce((total, record) => total + record.sizeBytes, 0),
  };
}

function createDuplicateGroups(records: AssetAuditRecord[]) {
  const grouped = new Map<string, AssetAuditRecord[]>();

  for (const record of records) {
    if (!record.duplicateKey) continue;

    const assets = grouped.get(record.duplicateKey) ?? [];
    assets.push(record);
    grouped.set(record.duplicateKey, assets);
  }

  return Array.from(grouped.entries())
    .map(([key, assets]) => ({
      key,
      mimeType: assets[0]?.mimeType ?? "asset",
      sizeBytes: assets[0]?.sizeBytes ?? 0,
      duplicateBytes:
        assets
          .slice(1)
          .reduce((total, asset) => total + asset.sizeBytes, 0) ?? 0,
      assets: assets.sort((first, second) =>
        second.updatedAt.localeCompare(first.updatedAt),
      ),
    }))
    .filter((group) => group.assets.length > 1)
    .sort((first, second) => second.duplicateBytes - first.duplicateBytes);
}

function createDuplicateKey(asset: StoredAssetAuditInput) {
  return `${asset.mimeType}:${asset.sizeBytes}:${hashString(asset.dataUrl)}`;
}

function hashString(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(16);
}
