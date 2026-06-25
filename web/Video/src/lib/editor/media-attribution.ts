import type { EditorProject, MediaAsset, MediaAttribution, MediaAttributionItem, MediaAttributionSourceType, MediaAttributionSummary, TimelineLayer } from "@/lib/editor/types";
import type { StockAsset } from "@/lib/stock/stock-assets";

export function createMediaAttributionSummary({
  project,
  mediaAssets,
  generatedAt = new Date().toISOString(),
}: {
  project: EditorProject;
  mediaAssets: MediaAsset[];
  generatedAt?: string;
}): MediaAttributionSummary {
  const assetsById = new Map(mediaAssets.map((asset) => [asset.id, asset]));
  const usedAssetIds = uniqueUsedAssetIds(project.layers);
  const items = usedAssetIds.flatMap((assetId) => {
    const asset = assetsById.get(assetId);
    return asset ? [createMediaAttributionItem(asset)] : [];
  });
  const reviewCount = items.filter((item) => item.status === "review").length;

  return {
    status: reviewCount > 0 ? "review" : "ready",
    itemCount: items.length,
    stockCount: countBySource(items, "stock"),
    selfHostedCount: countBySource(items, "self-hosted"),
    browserCount: countBySource(items, "browser"),
    desktopCount: countBySource(items, "desktop"),
    reviewCount,
    generatedAt,
    items,
  };
}

export function createStockMediaAttribution(asset: StockAsset, capturedAt = new Date().toISOString()): MediaAttribution {
  return {
    sourceType: "stock",
    providerLabel: asset.providerLabel,
    title: asset.title,
    sourceUrl: asset.sourceUrl,
    pageUrl: asset.pageUrl,
    licenseLabel: asset.licenseLabel,
    licenseUrl: asset.licenseUrl,
    attributionText: asset.attribution,
    usageNote: "Stock media attribution captured at import. Confirm final usage against the linked license before publishing.",
    capturedAt,
  };
}

export function createSelfHostedMediaAttribution({ url, title, capturedAt = new Date().toISOString() }: { url: string; title: string; capturedAt?: string }): MediaAttribution {
  return {
    sourceType: "self-hosted",
    providerLabel: "Self-hosted URL",
    title,
    sourceUrl: url,
    pageUrl: url,
    usageNote: "Creator-provided direct media URL. Confirm ownership, license, and public availability before publishing.",
    capturedAt,
  };
}

function createMediaAttributionItem(asset: MediaAsset): MediaAttributionItem {
  const sourceType = asset.attribution?.sourceType ?? sourceTypeForAsset(asset);
  const sourceLabel = sourceLabelForAsset(asset, sourceType);

  if (sourceType === "stock") {
    const ready = Boolean(asset.attribution?.licenseLabel || asset.attribution?.licenseUrl) && Boolean(asset.attribution?.attributionText || asset.attribution?.pageUrl);

    return {
      assetId: asset.id,
      assetName: asset.name,
      sourceType,
      sourceLabel,
      status: ready ? "ready" : "review",
      licenseLabel: asset.attribution?.licenseLabel,
      licenseUrl: asset.attribution?.licenseUrl,
      attributionText: asset.attribution?.attributionText,
      pageUrl: asset.attribution?.pageUrl,
      sourceUrl: asset.attribution?.sourceUrl,
      detail: ready ? "Stock attribution and license link are captured for handoff." : "Stock source is missing a license, attribution text, or source page link.",
    };
  }

  return {
    assetId: asset.id,
    assetName: asset.name,
    sourceType,
    sourceLabel,
    status: "review",
    licenseLabel: asset.attribution?.licenseLabel,
    licenseUrl: asset.attribution?.licenseUrl,
    attributionText: asset.attribution?.attributionText,
    pageUrl: asset.attribution?.pageUrl,
    sourceUrl: asset.attribution?.sourceUrl ?? (asset.source === "self-hosted-url" ? asset.storageKey : undefined),
    detail: asset.attribution?.usageNote ?? reviewDetailForSource(sourceType),
  };
}

function uniqueUsedAssetIds(layers: TimelineLayer[]) {
  return Array.from(
    new Set(
      layers
        .filter((layer) => !layer.hidden && layer.assetId && ["audio", "image", "video"].includes(layer.kind))
        .map((layer) => layer.assetId as string),
    ),
  );
}

function sourceTypeForAsset(asset: MediaAsset): MediaAttributionSourceType {
  if (asset.source === "self-hosted-url") return "self-hosted";
  if (asset.source === "tauri-fs") return "desktop";
  return "browser";
}

function sourceLabelForAsset(asset: MediaAsset, sourceType: MediaAttributionSourceType) {
  if (asset.attribution?.providerLabel) return asset.attribution.providerLabel;
  if (sourceType === "self-hosted") return "Self-hosted URL";
  if (sourceType === "desktop") return "Desktop file";
  return "Browser import";
}

function reviewDetailForSource(sourceType: MediaAttributionSourceType) {
  if (sourceType === "self-hosted") return "Creator-provided URL media. Confirm ownership, license, and public availability before publishing.";
  if (sourceType === "desktop") return "Desktop file import. Confirm the local media can be published or handed off.";
  return "Browser-imported media. Confirm creator ownership or license before publishing.";
}

function countBySource(items: MediaAttributionItem[], sourceType: MediaAttributionSourceType) {
  return items.filter((item) => item.sourceType === sourceType).length;
}
