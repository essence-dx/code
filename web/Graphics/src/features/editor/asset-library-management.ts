import { isExportSafeFont } from "@/features/editor/asset-media-governance";
import {
  getAssetLibraryFormat,
  getAssetLibrarySourceBytes,
  getAssetLibrarySourceHash,
  getAssetLibrarySourcePreview,
  getAssetLibrarySourceType,
  isAssetLibraryVideoLikeSource,
  formatAssetLibraryBytes,
} from "@/features/editor/asset-library-management-source";
import type {
  AssetLibraryCategory,
  AssetLibraryFontAsset,
  AssetLibraryManagementReport,
  AssetLibraryManagementRow,
  AssetLibraryMediaAsset,
  AssetLibraryStatus,
} from "@/features/editor/asset-library-management-types";
import { createDocumentLayerIndex } from "@/features/editor/layer-index";
import type {
  DesignAssetMetadata,
  DesignDocument,
  DesignLayer,
} from "@/features/editor/types";

export type {
  AssetLibraryCategory,
  AssetLibraryFontAsset,
  AssetLibraryManagementReport,
  AssetLibraryManagementRow,
  AssetLibraryMediaAsset,
  AssetLibrarySourceType,
  AssetLibraryStatus,
} from "@/features/editor/asset-library-management-types";
export {
  formatAssetLibraryBytes,
  getAssetLibrarySourceHash,
} from "@/features/editor/asset-library-management-source";

type DocumentLayerIndexEntry = ReturnType<
  typeof createDocumentLayerIndex
>["entries"][number];

const largeEmbeddedAssetBytes = 650_000;
const blockedEmbeddedAssetBytes = 2_250_000;

export function getAssetLibraryManagementReport(
  document: DesignDocument,
): AssetLibraryManagementReport {
  const entries = createDocumentLayerIndex(document).entries;
  const mediaAssets = getMediaAssets(entries);
  const fontAssets = getFontAssets(entries);
  const rows = [
    ...getMediaRows(mediaAssets),
    ...getFontRows(fontAssets),
  ].sort(sortRows);
  const readyRows =
    rows.length > 0
      ? rows
      : [
          {
            id: "asset-library-ready",
            status: "ready",
            category: "ready",
            assetKind: "document",
            label: "Asset library ready",
            detail:
              "Media sources, reusable registry keys, source metadata, replacement queues, and font usage are ready for release.",
            layerIds: [],
            metric: 100,
            recommendation:
              "Keep reviewing this registry before major export, library, or marketplace handoff work.",
          } satisfies AssetLibraryManagementRow,
        ];
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const replacementQueueCount = mediaAssets.filter(
    (asset) => asset.needsReplacement,
  ).length;
  const missingMetadataCount = mediaAssets.filter(
    (asset) => asset.needsMetadata,
  ).length;
  const duplicateSourceCount = mediaAssets.filter(
    (asset) => asset.layerIds.length > 1,
  ).length;
  const unsafeFontCount = fontAssets.filter((font) => !font.exportSafe).length;
  const score = Math.max(
    0,
    100 -
      blockedCount * 20 -
      reviewCount * 7 -
      missingMetadataCount * 3 -
      unsafeFontCount * 4,
  );

  return {
    score,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    layerCount: entries.length,
    mediaAssetCount: mediaAssets.length,
    reusableMediaCount: mediaAssets.filter((asset) => asset.reusable).length,
    duplicateSourceCount,
    missingMetadataCount,
    replacementQueueCount,
    fontFamilyCount: fontAssets.length,
    unsafeFontCount,
    blockedCount,
    reviewCount,
    readyCount: readyRows.filter((row) => row.status === "ready").length,
    mediaAssets,
    fontAssets,
    rows: readyRows,
  };
}

function getMediaAssets(entries: DocumentLayerIndexEntry[]) {
  const assets = new Map<string, AssetLibraryMediaAsset>();

  for (const entry of entries) {
    if (entry.layer.type !== "image") {
      continue;
    }

    const source = entry.layer.imageSrc?.trim();
    const sourceHash = source
      ? getAssetLibrarySourceHash(source)
      : `missing_${entry.layer.id}`;
    const metadata = entry.layer.assetMetadata;
    const existing =
      assets.get(sourceHash) ??
      createMediaAsset(entry.layer, sourceHash, source, metadata);

    existing.layerIds.push(entry.layer.id);
    existing.layerNames.push(entry.layer.name);
    addUnique(existing.pageNames, entry.pageName);

    if (metadata?.libraryId) {
      addUnique(existing.libraryIds, metadata.libraryId);
    }

    if (metadata?.sourceName && !existing.sourceName) {
      existing.sourceName = metadata.sourceName;
    }

    if (metadata?.sourceUrl && !existing.sourceUrl) {
      existing.sourceUrl = metadata.sourceUrl;
    }

    if (metadata?.license && !existing.license) {
      existing.license = metadata.license;
    }

    if (entry.layer.imageAlt?.trim()) {
      existing.altTextCount += 1;
    }

    assets.set(sourceHash, existing);
  }

  return Array.from(assets.values())
    .map((asset) => ({
      ...asset,
      reusable: asset.layerIds.length > 1 || asset.libraryIds.length > 0,
      needsMetadata: !asset.sourceName || !asset.license,
      needsReplacement:
        asset.sourceType === "missing" ||
        asset.isVideoLike ||
        (asset.sourceType === "data-uri" && asset.bytes >= largeEmbeddedAssetBytes),
    }))
    .sort((a, b) => b.layerIds.length - a.layerIds.length || a.id.localeCompare(b.id));
}

function createMediaAsset(
  layer: DesignLayer,
  sourceHash: string,
  source: string | undefined,
  metadata: DesignAssetMetadata | undefined,
): AssetLibraryMediaAsset {
  const sourceType = getAssetLibrarySourceType(source);
  const bytes = getAssetLibrarySourceBytes(source);
  const format = source ? getAssetLibraryFormat(source) : undefined;

  return {
    id: metadata?.libraryId?.trim() || sourceHash,
    sourceHash,
    sourcePreview: getAssetLibrarySourcePreview(source),
    sourceType,
    format,
    bytes,
    layerIds: [],
    pageNames: [],
    layerNames: [],
    libraryIds: [],
    sourceName: metadata?.sourceName,
    sourceUrl: metadata?.sourceUrl,
    license: metadata?.license,
    altTextCount: 0,
    reusable: false,
    needsMetadata: false,
    needsReplacement: false,
    isVideoLike: isAssetLibraryVideoLikeSource(source),
  };
}

function getMediaRows(
  mediaAssets: AssetLibraryMediaAsset[],
): AssetLibraryManagementRow[] {
  const rows: AssetLibraryManagementRow[] = [];

  for (const asset of mediaAssets) {
    if (asset.sourceType === "missing") {
      rows.push({
        id: `asset-library-source-${asset.sourceHash}`,
        status: "blocked",
        category: "replacement",
        assetKind: "media",
        label: "Image source missing",
        detail: `${asset.layerNames.join(", ")} needs a replacement source before it can be reused or exported.`,
        pageName: asset.pageNames.join(", "),
        layerIds: asset.layerIds,
        metric: asset.layerIds.length,
        recommendation:
          "Paste a durable URL or uploaded data URI into the replacement workflow, then register the asset key.",
        mediaAssetId: asset.id,
      });
      continue;
    }

    if (asset.layerIds.length > 1 && asset.libraryIds.length === 0) {
      rows.push({
        id: `asset-library-dedupe-${asset.sourceHash}`,
        status: "review",
        category: "duplicate",
        assetKind: "media",
        label: "Reusable asset not registered",
        detail: `${asset.layerIds.length} layers use the same ${asset.format ?? "media"} source without a shared library key.`,
        pageName: asset.pageNames.join(", "),
        layerIds: asset.layerIds,
        metric: asset.layerIds.length,
        recommendation:
          "Adopt the generated registry key so duplicate uses can be replaced, audited, and exported as one asset.",
        mediaAssetId: asset.id,
      });
    }

    if (asset.needsMetadata) {
      rows.push({
        id: `asset-library-metadata-${asset.sourceHash}`,
        status: "review",
        category: "metadata",
        assetKind: "media",
        label: "Source metadata incomplete",
        detail: `${asset.layerNames.slice(0, 3).join(", ")} needs source name and license metadata for professional handoff.`,
        pageName: asset.pageNames.join(", "),
        layerIds: asset.layerIds,
        metric: asset.layerIds.length,
        recommendation:
          "Add source name, license, and optional source URL in the asset manager before release or marketplace packaging.",
        mediaAssetId: asset.id,
      });
    }

    if (asset.isVideoLike) {
      rows.push({
        id: `asset-library-video-${asset.sourceHash}`,
        status: "review",
        category: "replacement",
        assetKind: "media",
        label: "Video-like media needs explicit replacement",
        detail: `${asset.sourcePreview} is referenced through an image layer and needs a poster/source workflow.`,
        pageName: asset.pageNames.join(", "),
        layerIds: asset.layerIds,
        metric: asset.bytes,
        recommendation:
          "Replace the source with a poster image or add a dedicated media model before export.",
        mediaAssetId: asset.id,
      });
    }

    if (asset.sourceType === "data-uri" && asset.bytes >= largeEmbeddedAssetBytes) {
      rows.push({
        id: `asset-library-replace-${asset.sourceHash}`,
        status: asset.bytes >= blockedEmbeddedAssetBytes ? "blocked" : "review",
        category: "replacement",
        assetKind: "media",
        label: "Embedded asset replacement queue",
        detail: `${asset.layerIds.length} layer${asset.layerIds.length === 1 ? "" : "s"} embed ${formatAssetLibraryBytes(asset.bytes)} of image data.`,
        pageName: asset.pageNames.join(", "),
        layerIds: asset.layerIds,
        metric: asset.bytes,
        recommendation:
          "Replace heavy embedded data with a durable uploaded media URL or optimized source asset.",
        mediaAssetId: asset.id,
      });
    }
  }

  return rows;
}

function getFontAssets(entries: DocumentLayerIndexEntry[]) {
  const fonts = new Map<string, AssetLibraryFontAsset>();

  for (const entry of entries) {
    if (entry.layer.text === undefined) {
      continue;
    }

    const fontFamily = entry.layer.fontFamily?.trim() || "Unknown font";
    const key = fontFamily.toLowerCase();
    const existing =
      fonts.get(key) ??
      {
        id: `font_${slugify(fontFamily)}`,
        fontFamily,
        layerIds: [],
        pageNames: [],
        exportSafe: isExportSafeFont(fontFamily),
      };

    existing.layerIds.push(entry.layer.id);
    addUnique(existing.pageNames, entry.pageName);
    fonts.set(key, existing);
  }

  return Array.from(fonts.values()).sort(
    (a, b) => b.layerIds.length - a.layerIds.length || a.fontFamily.localeCompare(b.fontFamily),
  );
}

function getFontRows(
  fontAssets: AssetLibraryFontAsset[],
): AssetLibraryManagementRow[] {
  return fontAssets
    .filter((font) => !font.exportSafe)
    .map((font) => ({
      id: `asset-library-font-${font.id}`,
      status: "review",
      category: "font",
      assetKind: "font",
      label: "Font registry needs export fallback",
      detail: `${font.fontFamily} appears on ${font.layerIds.length} text layer${font.layerIds.length === 1 ? "" : "s"} and is not in the export-safe registry.`,
      pageName: font.pageNames.join(", "),
      layerIds: font.layerIds,
      metric: font.layerIds.length,
      recommendation:
        "Replace with an approved fallback or attach a verified font package before handoff.",
      fontFamily: font.fontFamily,
    }));
}

function sortRows(
  a: AssetLibraryManagementRow,
  b: AssetLibraryManagementRow,
) {
  const statusWeight: Record<AssetLibraryStatus, number> = {
    blocked: 0,
    review: 1,
    ready: 2,
  };
  const categoryWeight: Record<AssetLibraryCategory, number> = {
    replacement: 0,
    duplicate: 1,
    metadata: 2,
    font: 3,
    media: 4,
    ready: 5,
  };

  return (
    statusWeight[a.status] - statusWeight[b.status] ||
    categoryWeight[a.category] - categoryWeight[b.category] ||
    b.metric - a.metric ||
    a.label.localeCompare(b.label)
  );
}

function addUnique(values: string[], value: string) {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "asset"
  );
}
