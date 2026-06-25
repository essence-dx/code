import type {
  AssetAuditRecord,
  AssetLibraryAudit,
  AssetAuditScope,
} from "@/features/assets/asset-library-audit";
import type {
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";

export type AssetOperationStatus = "ready" | "review" | "blocked";

export type AssetCollectionKind =
  | "uploads"
  | "brand"
  | "project-assets"
  | "web-ready"
  | "media"
  | "documents";

export type AssetLicenseStatus = "tracked" | "internal" | "needs-review";

export type AssetLibraryCollection = {
  id: AssetCollectionKind;
  label: string;
  description: string;
  status: AssetOperationStatus;
  count: number;
  totalBytes: number;
  referenceCount: number;
  licenseCoverage: number;
  assets: AssetLibraryOperationAsset[];
};

export type AssetLibraryOperationAsset = {
  id: string;
  name: string;
  scope: AssetAuditScope;
  scopeLabel: string;
  mimeType: string;
  sizeBytes: number;
  updatedAt: string;
  previewUrl: string | null;
  href: string | null;
  referenceCount: number;
  licenseStatus: AssetLicenseStatus;
  collectionIds: AssetCollectionKind[];
};

export type AssetBulkMoveGroup = {
  id: string;
  label: string;
  description: string;
  status: AssetOperationStatus;
  assetIds: string[];
  totalBytes: number;
};

export type AssetReusableShelf = {
  id: string;
  label: string;
  description: string;
  status: AssetOperationStatus;
  items: AssetLibraryOperationAsset[];
};

export type AssetLibraryOperationCenter = {
  status: AssetOperationStatus;
  score: number;
  collections: AssetLibraryCollection[];
  licenseQueue: AssetLibraryOperationAsset[];
  referenceHotspots: AssetLibraryOperationAsset[];
  bulkMoveGroups: AssetBulkMoveGroup[];
  reusableShelves: AssetReusableShelf[];
  nextActions: string[];
  totals: {
    collections: number;
    assets: number;
    licensedAssets: number;
    referencedAssets: number;
    reusableShelfItems: number;
  };
};

export function createAssetLibraryOperationCenter(input: {
  audit: AssetLibraryAudit;
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
}): AssetLibraryOperationCenter {
  const assets = input.audit.records.map(toOperationAsset);
  const collections = createAssetCollections(assets);
  const licenseQueue = assets
    .filter((asset) => asset.licenseStatus === "needs-review")
    .sort(compareAssetsBySize)
    .slice(0, 8);
  const referenceHotspots = assets
    .filter((asset) => asset.referenceCount > 0 || asset.scope === "projects")
    .sort(
      (first, second) =>
        second.referenceCount - first.referenceCount ||
        second.sizeBytes - first.sizeBytes,
    )
    .slice(0, 8);
  const bulkMoveGroups = createBulkMoveGroups(assets);
  const reusableShelves = createReusableShelves({
    assets,
    projects: input.projects,
    templates: input.templates,
  });
  const licensedAssets = assets.filter(
    (asset) => asset.licenseStatus !== "needs-review",
  ).length;
  const referencedAssets = assets.filter(
    (asset) => asset.referenceCount > 0 || asset.scope === "projects",
  ).length;
  const reusableShelfItems = reusableShelves.reduce(
    (total, shelf) => total + shelf.items.length,
    0,
  );
  const score = createOperationScore({
    assets,
    collections,
    licenseQueue,
    bulkMoveGroups,
    reusableShelves,
  });

  return {
    status: scoreToStatus(score),
    score,
    collections,
    licenseQueue,
    referenceHotspots,
    bulkMoveGroups,
    reusableShelves,
    nextActions: createNextActions({
      collections,
      licenseQueue,
      bulkMoveGroups,
      reusableShelves,
    }),
    totals: {
      collections: collections.filter((collection) => collection.count > 0)
        .length,
      assets: assets.length,
      licensedAssets,
      referencedAssets,
      reusableShelfItems,
    },
  };
}

function toOperationAsset(record: AssetAuditRecord): AssetLibraryOperationAsset {
  const collectionIds = getCollectionIds(record);

  return {
    id: record.id,
    name: record.name,
    scope: record.scope,
    scopeLabel: record.scopeLabel,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    updatedAt: record.updatedAt,
    previewUrl: record.previewUrl,
    href: record.href,
    referenceCount: record.referenceCount ?? 0,
    licenseStatus: getLicenseStatus(record),
    collectionIds,
  };
}

function createAssetCollections(
  assets: AssetLibraryOperationAsset[],
): AssetLibraryCollection[] {
  return collectionDefinitions.map((definition) => {
    const collectionAssets = assets.filter((asset) =>
      asset.collectionIds.includes(definition.id),
    );
    const licensedCount = collectionAssets.filter(
      (asset) => asset.licenseStatus !== "needs-review",
    ).length;
    const licenseCoverage = collectionAssets.length
      ? Math.round((licensedCount / collectionAssets.length) * 100)
      : 0;
    const totalBytes = collectionAssets.reduce(
      (total, asset) => total + asset.sizeBytes,
      0,
    );
    const referenceCount = collectionAssets.reduce(
      (total, asset) => total + asset.referenceCount,
      0,
    );

    return {
      ...definition,
      status: getCollectionStatus(collectionAssets, licenseCoverage),
      count: collectionAssets.length,
      totalBytes,
      referenceCount,
      licenseCoverage,
      assets: collectionAssets.sort(compareAssetsBySize).slice(0, 4),
    };
  });
}

function createBulkMoveGroups(
  assets: AssetLibraryOperationAsset[],
): AssetBulkMoveGroup[] {
  const staleUploads = assets.filter(
    (asset) =>
      asset.scope === "uploads" &&
      asset.referenceCount === 0 &&
      asset.sizeBytes > 0,
  );
  const licenseReview = assets.filter(
    (asset) => asset.licenseStatus === "needs-review",
  );
  const projectManifests = assets.filter((asset) => asset.scope === "projects");

  return [
    {
      id: "stale-uploads",
      label: "Unreferenced uploads",
      description: "Move loose uploads into a review collection before cleanup.",
      status: staleUploads.length ? "review" : "ready",
      assetIds: staleUploads.map((asset) => asset.id),
      totalBytes: sumAssetBytes(staleUploads),
    },
    {
      id: "license-review",
      label: "License review",
      description: "Group assets that need source or usage confirmation.",
      status: licenseReview.length ? "review" : "ready",
      assetIds: licenseReview.map((asset) => asset.id),
      totalBytes: sumAssetBytes(licenseReview),
    },
    {
      id: "project-manifests",
      label: "Project manifest shelves",
      description: "Keep generated project assets grouped by source project.",
      status: projectManifests.length ? "ready" : "review",
      assetIds: projectManifests.map((asset) => asset.id),
      totalBytes: sumAssetBytes(projectManifests),
    },
  ];
}

function createReusableShelves(input: {
  assets: AssetLibraryOperationAsset[];
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
}): AssetReusableShelf[] {
  const brandAssets = input.assets.filter((asset) => asset.scope === "brand");
  const templateBackedAssets = input.assets.filter(
    (asset) =>
      asset.scope === "projects" &&
      input.templates.some((template) => template.name === asset.name),
  );
  const publishedProjectAssets = input.assets.filter(
    (asset) =>
      asset.scope === "projects" &&
      input.projects.some(
        (project) => project.id === asset.id && Boolean(project.publicShareId),
      ),
  );

  return [
    {
      id: "brand-assets",
      label: "Brand shelf",
      description: "Logos and brand visuals ready for reuse.",
      status: brandAssets.length ? "ready" : "review",
      items: brandAssets.slice(0, 6),
    },
    {
      id: "template-assets",
      label: "Template shelf",
      description: "Project asset bundles connected to reusable templates.",
      status: templateBackedAssets.length ? "ready" : "review",
      items: templateBackedAssets.slice(0, 6),
    },
    {
      id: "published-assets",
      label: "Published shelf",
      description: "Assets already referenced by public or share-ready work.",
      status: publishedProjectAssets.length ? "ready" : "review",
      items: publishedProjectAssets.slice(0, 6),
    },
  ];
}

function createNextActions(input: {
  collections: AssetLibraryCollection[];
  licenseQueue: AssetLibraryOperationAsset[];
  bulkMoveGroups: AssetBulkMoveGroup[];
  reusableShelves: AssetReusableShelf[];
}) {
  const actions: string[] = [];
  const emptyCollection = input.collections.find(
    (collection) => collection.count === 0,
  );
  const pendingMoveGroup = input.bulkMoveGroups.find(
    (group) => group.status === "review" && group.assetIds.length > 0,
  );
  const emptyShelf = input.reusableShelves.find(
    (shelf) => shelf.status !== "ready",
  );

  if (input.licenseQueue.length) {
    actions.push(
      `Review license metadata for ${input.licenseQueue[0].name}.`,
    );
  }

  if (pendingMoveGroup) {
    actions.push(
      `${pendingMoveGroup.label}: organize ${pendingMoveGroup.assetIds.length} assets.`,
    );
  }

  if (emptyShelf) {
    actions.push(`${emptyShelf.label}: ${emptyShelf.description}`);
  }

  if (emptyCollection) {
    actions.push(`${emptyCollection.label}: add matching assets.`);
  }

  return actions.slice(0, 3);
}

function createOperationScore(input: {
  assets: AssetLibraryOperationAsset[];
  collections: AssetLibraryCollection[];
  licenseQueue: AssetLibraryOperationAsset[];
  bulkMoveGroups: AssetBulkMoveGroup[];
  reusableShelves: AssetReusableShelf[];
}) {
  if (!input.assets.length) return 0;

  const collectionScore =
    (input.collections.filter((collection) => collection.count > 0).length /
      input.collections.length) *
    30;
  const licenseScore =
    ((input.assets.length - input.licenseQueue.length) / input.assets.length) *
    30;
  const bulkScore =
    (input.bulkMoveGroups.filter((group) => group.status === "ready").length /
      input.bulkMoveGroups.length) *
    20;
  const shelfScore =
    (input.reusableShelves.filter((shelf) => shelf.status === "ready").length /
      input.reusableShelves.length) *
    20;

  return Math.round(collectionScore + licenseScore + bulkScore + shelfScore);
}

function getCollectionIds(record: AssetAuditRecord): AssetCollectionKind[] {
  const collections: AssetCollectionKind[] = [];

  if (record.scope === "uploads") collections.push("uploads");
  if (record.scope === "brand") collections.push("brand");
  if (record.scope === "projects") collections.push("project-assets");
  if (isWebReadyMimeType(record.mimeType)) collections.push("web-ready");
  if (isMediaMimeType(record.mimeType)) collections.push("media");
  if (isDocumentMimeType(record.mimeType)) collections.push("documents");

  return collections;
}

function getLicenseStatus(record: AssetAuditRecord): AssetLicenseStatus {
  if (record.scope === "brand") return "internal";
  if (record.scope === "projects") return "tracked";
  if (isDocumentMimeType(record.mimeType)) return "tracked";
  if (
    (record.sourceProvider || record.sourceUrl) &&
    (record.licenseName || record.licenseUrl)
  ) {
    return "tracked";
  }

  return "needs-review";
}

function getCollectionStatus(
  assets: AssetLibraryOperationAsset[],
  licenseCoverage: number,
): AssetOperationStatus {
  if (!assets.length) return "review";
  if (licenseCoverage < 50) return "blocked";
  if (licenseCoverage < 85) return "review";

  return "ready";
}

function scoreToStatus(score: number): AssetOperationStatus {
  if (score >= 85) return "ready";
  if (score >= 50) return "review";

  return "blocked";
}

function isWebReadyMimeType(mimeType: string) {
  return (
    mimeType === "image/png" ||
    mimeType === "image/jpeg" ||
    mimeType === "image/webp" ||
    mimeType === "image/svg+xml"
  );
}

function isMediaMimeType(mimeType: string) {
  return mimeType.startsWith("video/") || mimeType.startsWith("audio/");
}

function isDocumentMimeType(mimeType: string) {
  return (
    mimeType === "application/pdf" ||
    mimeType.includes("document") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation")
  );
}

function compareAssetsBySize(
  first: AssetLibraryOperationAsset,
  second: AssetLibraryOperationAsset,
) {
  return (
    second.sizeBytes - first.sizeBytes ||
    second.updatedAt.localeCompare(first.updatedAt) ||
    first.name.localeCompare(second.name)
  );
}

function sumAssetBytes(assets: AssetLibraryOperationAsset[]) {
  return assets.reduce((total, asset) => total + asset.sizeBytes, 0);
}

const collectionDefinitions: Array<
  Pick<AssetLibraryCollection, "id" | "label" | "description">
> = [
  {
    id: "uploads",
    label: "Uploads",
    description: "User-uploaded source assets that need organization.",
  },
  {
    id: "brand",
    label: "Brand",
    description: "Brand logos and identity assets.",
  },
  {
    id: "project-assets",
    label: "Project assets",
    description: "Manifest-backed assets already referenced by projects.",
  },
  {
    id: "web-ready",
    label: "Web ready",
    description: "Optimized image assets suitable for websites and email.",
  },
  {
    id: "media",
    label: "Media",
    description: "Audio and video files for motion projects.",
  },
  {
    id: "documents",
    label: "Documents",
    description: "PDF, office, and handoff document assets.",
  },
];
