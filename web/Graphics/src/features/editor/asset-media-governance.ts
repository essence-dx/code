import { createDocumentLayerIndex } from "@/features/editor/layer-index";
import type { DesignDocument, DesignLayer } from "@/features/editor/types";

type DocumentLayerIndexEntry = ReturnType<
  typeof createDocumentLayerIndex
>["entries"][number];

export type AssetMediaGovernanceStatus = "ready" | "review" | "blocked";

export type AssetMediaGovernanceCategory =
  | "payload"
  | "image"
  | "video"
  | "font"
  | "source"
  | "optimization"
  | "ready";

export type AssetMediaGovernanceRow = {
  id: string;
  status: AssetMediaGovernanceStatus;
  category: AssetMediaGovernanceCategory;
  assetKind: "document" | "image" | "video" | "font";
  label: string;
  detail: string;
  pageName?: string;
  layerIds: string[];
  metric: number;
  recommendation: string;
};

export type AssetMediaGovernanceReport = {
  score: number;
  status: AssetMediaGovernanceStatus;
  pageCount: number;
  layerCount: number;
  imageLayerCount: number;
  referencedImageCount: number;
  embeddedImageCount: number;
  embeddedImageBytes: number;
  missingAltCount: number;
  sourceAttributionIssueCount: number;
  videoPlaceholderCount: number;
  fontFamilyCount: number;
  fontReviewCount: number;
  serializedBytes: number;
  optimizationQueueCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: AssetMediaGovernanceRow[];
};

const reviewDocumentBytes = 1_500_000;
const blockedDocumentBytes = 4_500_000;
const reviewEmbeddedImageBytes = 500_000;
const blockedEmbeddedImageBytes = 2_000_000;
const reviewFontFamilyCount = 6;
const blockedVideoBytes = 4_000_000;

const supportedImageFormats = new Set([
  "avif",
  "gif",
  "jpg",
  "jpeg",
  "png",
  "svg",
  "webp",
]);

const videoExtensions = new Set(["avi", "m4v", "mov", "mp4", "webm"]);

export function getAssetMediaGovernanceReport(
  document: DesignDocument,
): AssetMediaGovernanceReport {
  const index = createDocumentLayerIndex(document);
  const entries = index.entries;
  const layers = entries.map((entry) => entry.layer);
  const imageLayers = entries.filter((entry) => entry.layer.type === "image");
  const embeddedImageEntries = imageLayers.filter((entry) =>
    isEmbeddedImageSource(entry.layer.imageSrc),
  );
  const videoEntries = imageLayers.filter((entry) =>
    isVideoLikeSource(entry.layer.imageSrc),
  );
  const fontFamilies = getFontFamilyIndex(entries);
  const rows = [
    ...getDocumentRows(document, layers),
    ...getImageRows(imageLayers),
    ...getFontRows(fontFamilies),
  ].sort(sortRows);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyRows =
    rows.length > 0
      ? rows
      : [
          {
            id: "asset-media-governance-ready",
            status: "ready",
            category: "ready",
            assetKind: "document",
            label: "Asset governance ready",
            detail:
              "Images, fonts, payload budgets, and source notes are inside the current export-safe thresholds.",
            layerIds: [],
            metric: 100,
            recommendation:
              "Keep exporting governance bundles before adding heavy media or non-system fonts.",
          } satisfies AssetMediaGovernanceRow,
        ];
  const embeddedImageBytes = embeddedImageEntries.reduce(
    (total, entry) => total + getSourceBytes(entry.layer.imageSrc),
    0,
  );
  const sourceAttributionIssueCount = imageLayers.filter((entry) =>
    hasSourceAttributionIssue(entry.layer),
  ).length;
  const fontReviewCount = Array.from(fontFamilies.values()).filter(
    (font) => !isExportSafeFont(font.fontFamily),
  ).length;
  const optimizationQueueCount = rows.filter(
    (row) =>
      row.layerIds.length > 0 &&
      (row.category === "optimization" ||
        row.category === "payload" ||
        row.category === "source" ||
        row.category === "video" ||
        row.category === "font"),
  ).length;
  const score = Math.max(
    0,
    100 -
      blockedCount * 18 -
      reviewCount * 7 -
      Math.min(10, Math.floor(embeddedImageBytes / reviewEmbeddedImageBytes)),
  );

  return {
    score,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    pageCount: document.pages.length,
    layerCount: layers.length,
    imageLayerCount: imageLayers.length,
    referencedImageCount: imageLayers.filter(
      (entry) =>
        entry.layer.imageSrc?.trim() &&
        !isEmbeddedImageSource(entry.layer.imageSrc) &&
        !isVideoLikeSource(entry.layer.imageSrc),
    ).length,
    embeddedImageCount: embeddedImageEntries.length,
    embeddedImageBytes,
    missingAltCount: imageLayers.filter(
      (entry) => !entry.layer.imageAlt?.trim(),
    ).length,
    sourceAttributionIssueCount,
    videoPlaceholderCount: videoEntries.length,
    fontFamilyCount: fontFamilies.size,
    fontReviewCount,
    serializedBytes: getSerializedBytes(document),
    optimizationQueueCount,
    blockedCount,
    reviewCount,
    readyCount: readyRows.filter((row) => row.status === "ready").length,
    rows: readyRows,
  };
}

function getDocumentRows(document: DesignDocument, layers: DesignLayer[]) {
  const serializedBytes = getSerializedBytes(document);
  const rows: AssetMediaGovernanceRow[] = [];

  if (serializedBytes >= reviewDocumentBytes) {
    rows.push({
      id: "asset-document-payload-budget",
      status:
        serializedBytes >= blockedDocumentBytes ? "blocked" : "review",
      category: "payload",
      assetKind: "document",
      label: "Document payload budget",
      detail: `The serialized design document is ${formatBytes(serializedBytes)} before export manifests are attached.`,
      layerIds: [],
      metric: serializedBytes,
      recommendation:
        "Move large embedded media into referenced assets or split stale explorations into branch files.",
    });
  }

  if (layers.length === 0) {
    rows.push({
      id: "asset-document-empty",
      status: "review",
      category: "payload",
      assetKind: "document",
      label: "No design layers",
      detail: "This document has no layers to govern for asset export.",
      layerIds: [],
      metric: 0,
      recommendation:
        "Add real layers before producing an asset governance signoff bundle.",
    });
  }

  return rows;
}

function getImageRows(
  imageEntries: DocumentLayerIndexEntry[],
) {
  const rows: AssetMediaGovernanceRow[] = [];

  for (const entry of imageEntries) {
    const src = entry.layer.imageSrc?.trim();
    const sourceBytes = getSourceBytes(src);

    if (!src) {
      rows.push({
        id: `asset-image-source-${entry.layer.id}`,
        status: "blocked",
        category: "source",
        assetKind: "image",
        label: "Image source missing",
        detail: `${entry.layer.name} has no image source attached.`,
        pageName: entry.pageName,
        layerIds: [entry.layer.id],
        metric: 0,
        recommendation:
          "Attach a source image before export, share handoff, or marketplace packaging.",
      });
      continue;
    }

    if (isVideoLikeSource(src)) {
      rows.push({
        id: `asset-video-placeholder-${entry.layer.id}`,
        status: sourceBytes >= blockedVideoBytes ? "blocked" : "review",
        category: "video",
        assetKind: "video",
        label: "Video payload uses image layer",
        detail: `${entry.layer.name} references a video-like source (${getAssetFormat(src) ?? "unknown format"}) through the image layer model.`,
        pageName: entry.pageName,
        layerIds: [entry.layer.id],
        metric: sourceBytes,
        recommendation:
          "Model video assets explicitly before export so poster frames, duration, captions, and payload budgets are governed.",
      });
    }

    if (hasSourceAttributionIssue(entry.layer)) {
      rows.push({
        id: `asset-image-attribution-${entry.layer.id}`,
        status: "review",
        category: "source",
        assetKind: "image",
        label: "Source note missing",
        detail: `${entry.layer.name} needs useful alt text or provenance notes for accessible and reviewable handoff.`,
        pageName: entry.pageName,
        layerIds: [entry.layer.id],
        metric: entry.layer.imageAlt?.trim().length ?? 0,
        recommendation:
          "Add concise alt text and include licensing/source context in the layer note until first-class provenance fields exist.",
      });
    }

    if (
      isEmbeddedImageSource(src) &&
      sourceBytes >= reviewEmbeddedImageBytes
    ) {
      rows.push({
        id: `asset-image-optimization-${entry.layer.id}`,
        status:
          sourceBytes >= blockedEmbeddedImageBytes ? "blocked" : "review",
        category: "optimization",
        assetKind: "image",
        label: "Embedded image optimization",
        detail: `${entry.layer.name} embeds ${formatBytes(sourceBytes)} of image data.`,
        pageName: entry.pageName,
        layerIds: [entry.layer.id],
        metric: sourceBytes,
        recommendation:
          "Compress the image, convert it to WebP or AVIF when appropriate, or replace the data URI with a referenced asset.",
      });
    }

    const format = getAssetFormat(src);
    if (format && !isVideoLikeSource(src) && !supportedImageFormats.has(format)) {
      rows.push({
        id: `asset-image-format-${entry.layer.id}`,
        status: "review",
        category: "image",
        assetKind: "image",
        label: "Image format review",
        detail: `${entry.layer.name} uses ${format.toUpperCase()}, which may not be export-safe across SVG, PDF, PNG, and JPG pipelines.`,
        pageName: entry.pageName,
        layerIds: [entry.layer.id],
        metric: sourceBytes,
        recommendation:
          "Convert the asset to PNG, JPG, WebP, AVIF, SVG, or GIF before release packaging.",
      });
    }
  }

  return rows;
}

function getFontRows(fontFamilies: FontFamilyIndex) {
  const rows: AssetMediaGovernanceRow[] = [];

  if (fontFamilies.size >= reviewFontFamilyCount) {
    rows.push({
      id: "asset-font-family-count",
      status: "review",
      category: "font",
      assetKind: "font",
      label: "Font family spread",
      detail: `${fontFamilies.size} font families are used across editable text layers.`,
      layerIds: Array.from(fontFamilies.values()).flatMap((font) =>
        font.layerIds.slice(0, 4),
      ),
      metric: fontFamilies.size,
      recommendation:
        "Consolidate fonts into published text styles before marketplace or release exports.",
    });
  }

  for (const font of fontFamilies.values()) {
    if (isExportSafeFont(font.fontFamily)) {
      continue;
    }

    rows.push({
      id: `asset-font-${slugify(font.fontFamily)}`,
      status: "review",
      category: "font",
      assetKind: "font",
      label: "Font export review",
      detail: `${font.fontFamily} appears on ${font.layerIds.length} text layer${font.layerIds.length === 1 ? "" : "s"} and may not render consistently on export machines.`,
      pageName: font.pageNames.join(", "),
      layerIds: font.layerIds,
      metric: font.layerIds.length,
      recommendation:
        "Use a system/export-safe fallback or include a verified font package before handoff.",
    });
  }

  return rows;
}

type FontFamilyIndex = Map<
  string,
  FontFamilyRecord
>;

type FontFamilyRecord = {
  fontFamily: string;
  layerIds: string[];
  pageNames: string[];
};

function getFontFamilyIndex(entries: DocumentLayerIndexEntry[]) {
  const fonts: FontFamilyIndex = new Map();

  for (const entry of entries) {
    if (entry.layer.text === undefined) {
      continue;
    }

    const fontFamily = entry.layer.fontFamily?.trim() || "Unknown font";
    const key = fontFamily.toLowerCase();
    const existing =
      fonts.get(key) ??
      {
        fontFamily,
        layerIds: [],
        pageNames: [],
      };

    existing.layerIds.push(entry.layer.id);
    if (!existing.pageNames.includes(entry.pageName)) {
      existing.pageNames.push(entry.pageName);
    }
    fonts.set(key, existing);
  }

  return fonts;
}

function hasSourceAttributionIssue(layer: DesignLayer) {
  const alt = layer.imageAlt?.trim().toLowerCase();

  if (!alt) {
    return true;
  }

  return ["image", "photo", "picture", "asset", "media"].includes(alt);
}

export function isExportSafeFont(fontFamily?: string) {
  if (!fontFamily?.trim()) {
    return true;
  }

  return /inter|arial|system|sans-serif|serif|monospace/i.test(fontFamily);
}

function isEmbeddedImageSource(src?: string) {
  return Boolean(src?.trim().toLowerCase().startsWith("data:image/"));
}

function isVideoLikeSource(src?: string) {
  const text = src?.trim().toLowerCase();

  if (!text) {
    return false;
  }

  if (text.startsWith("data:video/")) {
    return true;
  }

  const format = getAssetFormat(text);

  return Boolean(format && videoExtensions.has(format));
}

function getAssetFormat(src: string) {
  const dataMatch = src.match(/^data:(image|video)\/([^;,]+)/i);

  if (dataMatch?.[2]) {
    return normalizeAssetFormat(dataMatch[2]);
  }

  try {
    const url = new URL(src);
    return getPathExtension(url.pathname);
  } catch {
    return getPathExtension(src);
  }
}

function getPathExtension(path: string) {
  const clean = path.split("?")[0]?.split("#")[0] ?? "";
  const match = clean.match(/\.([a-z0-9]+)$/i);

  return match?.[1] ? normalizeAssetFormat(match[1]) : undefined;
}

function normalizeAssetFormat(format: string) {
  return format.toLowerCase().replace("svg+xml", "svg");
}

function getSerializedBytes(document: DesignDocument) {
  return new TextEncoder().encode(JSON.stringify(document)).byteLength;
}

function getSourceBytes(src?: string) {
  return src ? new TextEncoder().encode(src).byteLength : 0;
}

export function formatAssetMediaBytes(value: number) {
  return formatBytes(value);
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

function sortRows(
  left: AssetMediaGovernanceRow,
  right: AssetMediaGovernanceRow,
) {
  if (left.status !== right.status) {
    return getStatusRank(left.status) - getStatusRank(right.status);
  }

  if (left.category !== right.category) {
    return left.category.localeCompare(right.category);
  }

  return `${left.pageName ?? ""}:${left.label}`.localeCompare(
    `${right.pageName ?? ""}:${right.label}`,
  );
}

function getStatusRank(status: AssetMediaGovernanceStatus) {
  if (status === "blocked") {
    return 0;
  }

  if (status === "review") {
    return 1;
  }

  return 2;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "unknown"
  );
}
