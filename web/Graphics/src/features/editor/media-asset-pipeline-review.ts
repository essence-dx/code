import { createDocumentLayerIndex } from "@/features/editor/layer-index";
import { getAssetLibrarySourceHash } from "@/features/editor/asset-library-management-source";
import {
  formatAssetMediaBytes,
  getAssetMediaGovernanceReport,
} from "@/features/editor/asset-media-governance";
import type {
  DesignAssetMetadata,
  DesignDocument,
  DesignLayer,
} from "@/features/editor/types";

type DocumentLayerIndexEntry = ReturnType<
  typeof createDocumentLayerIndex
>["entries"][number];

export type MediaAssetPipelineStatus = "ready" | "review" | "blocked";

export type MediaAssetPipelineCategory =
  | "compression-target"
  | "export-manifest"
  | "ready"
  | "replacement-tracking"
  | "source-metadata"
  | "upload-provenance";

export type MediaAssetPipelineKind = "image" | "video";

export type MediaAssetPipelineAsset = {
  id: string;
  pageName: string;
  layerId: string;
  layerName: string;
  kind: MediaAssetPipelineKind;
  source: string;
  sourceType: "data-uri" | "missing" | "remote-url" | "local-path";
  format: string | null;
  mimeType: string | null;
  sourceBytes: number;
  compressionTargetBytes: number;
  metadata?: DesignAssetMetadata;
  exportFileName: string;
};

export type MediaAssetBundleManifestEntry = {
  id: string;
  status: MediaAssetPipelineStatus;
  layerId: string;
  layerName: string;
  pageName: string;
  kind: MediaAssetPipelineKind;
  fileName: string;
  mimeType: string;
  sourceType: MediaAssetPipelineAsset["sourceType"];
  sourceBytes: number;
  compressionTargetBytes: number;
  hash: string;
  replacementOf?: string;
};

export type MediaAssetPipelineRow = {
  id: string;
  status: MediaAssetPipelineStatus;
  category: MediaAssetPipelineCategory;
  label: string;
  detail: string;
  pageName?: string;
  layerIds: string[];
  metric: number;
  threshold: number;
  recommendation: string;
};

export type MediaAssetPipelineReviewReport = {
  generatedAt: string;
  score: number;
  status: MediaAssetPipelineStatus;
  pageCount: number;
  assetCount: number;
  imageAssetCount: number;
  videoAssetCount: number;
  sourceMetadataIssueCount: number;
  uploadProvenanceIssueCount: number;
  compressionCandidateCount: number;
  replacementTrackedCount: number;
  exportManifestEntryCount: number;
  exportManifestBlockedCount: number;
  embeddedSourceBytes: number;
  compressionTargetBytes: number;
  governanceStatus: MediaAssetPipelineStatus;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: MediaAssetPipelineRow[];
  bundleManifest: MediaAssetBundleManifestEntry[];
};

type MediaAssetPipelineReviewInput = {
  document: DesignDocument;
  generatedAt?: string;
};

const reviewImageBytes = 350_000;
const blockedImageBytes = 1_500_000;
const reviewVideoBytes = 900_000;
const blockedVideoBytes = 3_000_000;
const supportedExportFormats = new Set([
  "avif",
  "gif",
  "jpg",
  "jpeg",
  "mp4",
  "png",
  "svg",
  "webm",
  "webp",
]);
const videoFormats = new Set(["avi", "m4v", "mov", "mp4", "webm"]);

export function getMediaAssetPipelineReviewReport({
  document,
  generatedAt = new Date().toISOString(),
}: MediaAssetPipelineReviewInput): MediaAssetPipelineReviewReport {
  const assets = getMediaAssets(document);
  const governance = getAssetMediaGovernanceReport(document);
  const bundleManifest = assets
    .filter((asset) => asset.sourceType !== "missing")
    .map(getBundleManifestEntry);
  const rows = [
    ...getSourceMetadataRows(assets),
    ...getUploadProvenanceRows(assets),
    ...getCompressionRows(assets),
    ...getReplacementRows(assets),
    ...getManifestRows(assets, bundleManifest),
  ];
  const finalRows =
    rows.length > 0
      ? rows
      : [
          {
            id: "media-asset-pipeline-ready",
            status: "ready",
            category: "ready",
            label: "Media asset pipeline ready",
            detail:
              "All media assets have source metadata, upload provenance, compression-safe sources, and export manifest entries.",
            layerIds: [],
            metric: assets.length,
            threshold: 1,
            recommendation:
              "Keep this review packet attached to desktop and web release evidence.",
          } satisfies MediaAssetPipelineRow,
        ];
  const blockedCount = finalRows.filter((row) => row.status === "blocked").length;
  const reviewCount = finalRows.filter((row) => row.status === "review").length;
  const readyCount = finalRows.filter((row) => row.status === "ready").length;
  const embeddedSourceBytes = assets
    .filter((asset) => asset.sourceType === "data-uri")
    .reduce((total, asset) => total + asset.sourceBytes, 0);
  const compressionTargetBytes = assets.reduce(
    (total, asset) => total + asset.compressionTargetBytes,
    0,
  );

  return {
    generatedAt,
    score: Math.max(
      0,
      100 -
        blockedCount * 18 -
        reviewCount * 7 -
        Math.min(10, Math.floor(embeddedSourceBytes / reviewImageBytes)),
    ),
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    pageCount: document.pages.length,
    assetCount: assets.length,
    imageAssetCount: assets.filter((asset) => asset.kind === "image").length,
    videoAssetCount: assets.filter((asset) => asset.kind === "video").length,
    sourceMetadataIssueCount: getSourceMetadataRows(assets).length,
    uploadProvenanceIssueCount: getUploadProvenanceRows(assets).length,
    compressionCandidateCount: getCompressionRows(assets).length,
    replacementTrackedCount: assets.filter((asset) =>
      Boolean(asset.metadata?.replacementOf),
    ).length,
    exportManifestEntryCount: bundleManifest.length,
    exportManifestBlockedCount: bundleManifest.filter(
      (entry) => entry.status === "blocked",
    ).length,
    embeddedSourceBytes,
    compressionTargetBytes,
    governanceStatus: governance.status,
    blockedCount,
    reviewCount,
    readyCount,
    rows: finalRows,
    bundleManifest,
  };
}

export function getMediaAssetPipelineReviewCsv(
  report: MediaAssetPipelineReviewReport,
  rows: MediaAssetPipelineRow[] = report.rows,
) {
  const header: Array<keyof MediaAssetPipelineRow> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "pageName",
    "layerIds",
    "metric",
    "threshold",
    "recommendation",
  ];

  return [
    [
      "score",
      "status",
      "pages",
      "assets",
      "images",
      "videos",
      "source_metadata_issues",
      "upload_provenance_issues",
      "compression_candidates",
      "replacement_tracked",
      "manifest_entries",
      "manifest_blocked",
      "embedded_source_bytes",
      "compression_target_bytes",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.status,
      report.pageCount,
      report.assetCount,
      report.imageAssetCount,
      report.videoAssetCount,
      report.sourceMetadataIssueCount,
      report.uploadProvenanceIssueCount,
      report.compressionCandidateCount,
      report.replacementTrackedCount,
      report.exportManifestEntryCount,
      report.exportManifestBlockedCount,
      report.embeddedSourceBytes,
      report.compressionTargetBytes,
      report.blockedCount,
      report.reviewCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    header.join(","),
    ...rows.map((row) =>
      header
        .map((key) =>
          escapeCsvCell(
            Array.isArray(row[key]) ? row[key].join("; ") : row[key],
          ),
        )
        .join(","),
    ),
  ].join("\n");
}

export function getMediaAssetPipelineReviewMarkdown(
  report: MediaAssetPipelineReviewReport,
  rows: MediaAssetPipelineRow[] = report.rows,
) {
  return [
    "# Media Asset Pipeline Review",
    "",
    `Generated: ${report.generatedAt}`,
    `Score: ${report.score}`,
    `Status: ${report.status}`,
    `Assets: ${report.assetCount}`,
    `Images: ${report.imageAssetCount}`,
    `Videos: ${report.videoAssetCount}`,
    `Source metadata issues: ${report.sourceMetadataIssueCount}`,
    `Upload provenance issues: ${report.uploadProvenanceIssueCount}`,
    `Compression targets: ${report.compressionCandidateCount}`,
    `Replacement tracked: ${report.replacementTrackedCount}`,
    `Export manifest entries: ${report.exportManifestEntryCount}`,
    `Embedded source bytes: ${formatAssetMediaBytes(report.embeddedSourceBytes)}`,
    `Compression target bytes: ${formatAssetMediaBytes(report.compressionTargetBytes)}`,
    "",
    "## Review Queue",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Export Bundle Manifest",
    ...report.bundleManifest.map(
      (entry) =>
        `- [${entry.status}] ${entry.fileName}: ${entry.mimeType}, ${entry.sourceType}, ${formatAssetMediaBytes(entry.sourceBytes)} -> target ${formatAssetMediaBytes(entry.compressionTargetBytes)}`,
    ),
  ].join("\n");
}

export function getMediaAssetPipelineReviewJson(
  report: MediaAssetPipelineReviewReport,
  rows: MediaAssetPipelineRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.media-asset-pipeline-review",
      version: 1,
      generatedAt: report.generatedAt,
      summary: {
        status: report.status,
        score: report.score,
        pageCount: report.pageCount,
        assetCount: report.assetCount,
        imageAssetCount: report.imageAssetCount,
        videoAssetCount: report.videoAssetCount,
        sourceMetadataIssueCount: report.sourceMetadataIssueCount,
        uploadProvenanceIssueCount: report.uploadProvenanceIssueCount,
        compressionCandidateCount: report.compressionCandidateCount,
        replacementTrackedCount: report.replacementTrackedCount,
        exportManifestEntryCount: report.exportManifestEntryCount,
        exportManifestBlockedCount: report.exportManifestBlockedCount,
        embeddedSourceBytes: report.embeddedSourceBytes,
        compressionTargetBytes: report.compressionTargetBytes,
        governanceStatus: report.governanceStatus,
        blockedCount: report.blockedCount,
        reviewCount: report.reviewCount,
        readyCount: report.readyCount,
      },
      bundleManifest: report.bundleManifest,
      rows,
    },
    null,
    2,
  );
}

function getMediaAssets(document: DesignDocument): MediaAssetPipelineAsset[] {
  return createDocumentLayerIndex(document).entries
    .filter((entry) => entry.layer.type === "image")
    .map((entry) => getMediaAsset(entry));
}

function getMediaAsset(entry: DocumentLayerIndexEntry): MediaAssetPipelineAsset {
  const source = entry.layer.imageSrc?.trim() ?? "";
  const metadata = entry.layer.assetMetadata;
  const mimeType = metadata?.mimeType ?? getMimeTypeFromSource(source);
  const format = getAssetFormat(source, mimeType);
  const kind = getAssetKind(source, mimeType);
  const sourceBytes = getSourceBytes(source);
  const compressionTargetBytes = getCompressionTargetBytes({
    kind,
    format,
    sourceBytes,
    layer: entry.layer,
  });
  const fallbackName = `${slugify(entry.layer.name)}.${getDefaultExtension(kind, format)}`;

  return {
    id: `media-pipeline-${entry.layer.id}`,
    pageName: entry.pageName,
    layerId: entry.layer.id,
    layerName: entry.layer.name,
    kind,
    source,
    sourceType: getSourceType(source),
    format,
    mimeType,
    sourceBytes,
    compressionTargetBytes,
    metadata,
    exportFileName: sanitizeFileName(metadata?.sourceName) ?? fallbackName,
  };
}

function getSourceMetadataRows(
  assets: MediaAssetPipelineAsset[],
): MediaAssetPipelineRow[] {
  return assets.flatMap((asset) => {
    const metadata = asset.metadata;
    const missing = [
      !asset.source && "source",
      !asset.layerName.trim() && "layer name",
      !metadata?.sourceName?.trim() && "source name",
      !metadata?.sourceUrl?.trim() && "source URL",
      (!metadata?.license?.trim() ||
        /unverified|unknown|todo/i.test(metadata.license)) &&
        "license",
    ].filter(Boolean) as string[];

    if (missing.length === 0) {
      return [];
    }

    return [
      {
        id: `media-source-metadata-${asset.layerId}`,
        status: missing.includes("source") ? "blocked" : "review",
        category: "source-metadata",
        label: "Source metadata",
        detail: `${asset.layerName} is missing ${missing.join(", ")} for release handoff.`,
        pageName: asset.pageName,
        layerIds: [asset.layerId],
        metric: missing.length,
        threshold: 1,
        recommendation:
          "Attach source name, source URL, verified license, and accessible layer context before export packaging.",
      } satisfies MediaAssetPipelineRow,
    ];
  });
}

function getUploadProvenanceRows(
  assets: MediaAssetPipelineAsset[],
): MediaAssetPipelineRow[] {
  return assets.flatMap((asset) => {
    const metadata = asset.metadata;
    const issues = [
      !metadata?.hash?.trim() && "hash",
      !metadata?.mimeType?.trim() && "MIME type",
      asset.sourceType === "data-uri" && !metadata?.importedAt?.trim() && "import timestamp",
      asset.kind === "video" &&
        !Number.isFinite(metadata?.durationSeconds) &&
        "duration",
    ].filter(Boolean) as string[];

    if (issues.length === 0) {
      return [];
    }

    return [
      {
        id: `media-upload-provenance-${asset.layerId}`,
        status: issues.includes("hash") || !asset.source ? "blocked" : "review",
        category: "upload-provenance",
        label: "Upload provenance",
        detail: `${asset.layerName} needs ${issues.join(", ")} provenance evidence.`,
        pageName: asset.pageName,
        layerIds: [asset.layerId],
        metric: issues.length,
        threshold: 1,
        recommendation:
          "Preserve importer hash, MIME type, import timestamp, and video duration so desktop and web exports can be audited.",
      } satisfies MediaAssetPipelineRow,
    ];
  });
}

function getCompressionRows(
  assets: MediaAssetPipelineAsset[],
): MediaAssetPipelineRow[] {
  return assets
    .filter((asset) => needsCompressionReview(asset))
    .map((asset) => {
      const threshold =
        asset.kind === "video" ? reviewVideoBytes : reviewImageBytes;
      const blockedThreshold =
        asset.kind === "video" ? blockedVideoBytes : blockedImageBytes;

      return {
        id: `media-compression-target-${asset.layerId}`,
        status: asset.sourceBytes >= blockedThreshold ? "blocked" : "review",
        category: "compression-target",
        label: "Compression target",
        detail: `${asset.layerName} is ${formatAssetMediaBytes(asset.sourceBytes)} and targets ${formatAssetMediaBytes(asset.compressionTargetBytes)} for export-safe packaging.`,
        pageName: asset.pageName,
        layerIds: [asset.layerId],
        metric: asset.sourceBytes,
        threshold,
        recommendation:
          asset.kind === "video"
            ? "Transcode oversized video to a web-ready MP4/WebM preset and keep poster frame evidence."
            : "Convert oversized or embedded images to WebP/AVIF or replace data URIs with durable CDN assets.",
      } satisfies MediaAssetPipelineRow;
    });
}

function getReplacementRows(
  assets: MediaAssetPipelineAsset[],
): MediaAssetPipelineRow[] {
  const replacements = assets.filter((asset) =>
    Boolean(asset.metadata?.replacementOf),
  );

  if (replacements.length === 0) {
    return [];
  }

  const missing = replacements.filter(
    (asset) => !asset.metadata?.hash || !asset.metadata?.sourceUrl,
  );

  return [
    {
      id: "media-replacement-tracking",
      status: missing.length > 0 ? "review" : "ready",
      category: "replacement-tracking",
      label: "Replacement tracking",
      detail: `${replacements.length} asset replacement${replacements.length === 1 ? "" : "s"} preserve previous-source lineage.`,
      layerIds: replacements.map((asset) => asset.layerId),
      metric: replacements.length,
      threshold: 1,
      recommendation:
        missing.length > 0
          ? "Attach replacement source URL and new hash for every replacement before handoff."
          : "Keep replacement lineage in the export manifest so reviewers can trace asset swaps.",
    },
  ];
}

function getManifestRows(
  assets: MediaAssetPipelineAsset[],
  manifest: MediaAssetBundleManifestEntry[],
): MediaAssetPipelineRow[] {
  const missingSourceAssets = assets.filter(
    (asset) => asset.sourceType === "missing",
  );
  const blockedManifest = manifest.filter((entry) => entry.status === "blocked");

  if (missingSourceAssets.length === 0 && blockedManifest.length === 0) {
    return [
      {
        id: "media-export-manifest-ready",
        status: "ready",
        category: "export-manifest",
        label: "Export-safe bundle manifest",
        detail: `${manifest.length} media asset${manifest.length === 1 ? "" : "s"} have manifest entries with file, MIME, hash, source, and compression-target evidence.`,
        layerIds: manifest.map((entry) => entry.layerId),
        metric: manifest.length,
        threshold: 1,
        recommendation:
          "Attach this manifest to desktop, web, SVG, and PDF export packets.",
      },
    ];
  }

  return [
    {
      id: "media-export-manifest-blockers",
      status: missingSourceAssets.length > 0 ? "blocked" : "review",
      category: "export-manifest",
      label: "Export-safe bundle manifest",
      detail: `${missingSourceAssets.length} source-less asset(s) and ${blockedManifest.length} manifest entry blocker(s) need cleanup before bundle export.`,
      layerIds: [
        ...missingSourceAssets.map((asset) => asset.layerId),
        ...blockedManifest.map((entry) => entry.layerId),
      ],
      metric: missingSourceAssets.length + blockedManifest.length,
      threshold: 1,
      recommendation:
        "Every exported media layer needs a source, MIME type, file name, hash, and compression target before release packaging.",
    },
  ];
}

function getBundleManifestEntry(
  asset: MediaAssetPipelineAsset,
): MediaAssetBundleManifestEntry {
  const missingRequired = [
    !asset.exportFileName,
    !asset.mimeType,
    !asset.metadata?.hash,
  ].filter(Boolean).length;

  return {
    id: `media-manifest-${asset.layerId}`,
    status: missingRequired > 0 ? "blocked" : "ready",
    layerId: asset.layerId,
    layerName: asset.layerName,
    pageName: asset.pageName,
    kind: asset.kind,
    fileName: asset.exportFileName,
    mimeType: asset.mimeType ?? `${asset.kind}/unknown`,
    sourceType: asset.sourceType,
    sourceBytes: asset.sourceBytes,
    compressionTargetBytes: asset.compressionTargetBytes,
    hash: asset.metadata?.hash ?? getAssetLibrarySourceHash(asset.source),
    replacementOf: asset.metadata?.replacementOf,
  };
}

function needsCompressionReview(asset: MediaAssetPipelineAsset) {
  if (!asset.source) {
    return false;
  }

  if (asset.sourceType === "data-uri") {
    return asset.sourceBytes >= 80_000 || asset.kind === "video";
  }

  if (asset.kind === "video" && asset.sourceBytes >= reviewVideoBytes) {
    return true;
  }

  return Boolean(
    asset.format &&
      asset.kind === "image" &&
      !["avif", "svg", "webp"].includes(asset.format) &&
      asset.sourceBytes >= reviewImageBytes,
  );
}

function getCompressionTargetBytes(input: {
  kind: MediaAssetPipelineKind;
  format: string | null;
  sourceBytes: number;
  layer: DesignLayer;
}) {
  if (input.sourceBytes === 0) {
    return 0;
  }

  const area = Math.max(1, input.layer.width * input.layer.height);
  const areaBudget = input.kind === "video" ? area * 1.8 : area * 0.7;
  const sourceBudget =
    input.kind === "video" ? input.sourceBytes * 0.55 : input.sourceBytes * 0.45;
  const optimizedFormatMultiplier =
    input.format && ["avif", "webp", "svg"].includes(input.format) ? 1 : 0.75;

  return Math.max(
    12_000,
    Math.round(Math.min(sourceBudget, areaBudget) * optimizedFormatMultiplier),
  );
}

function getAssetKind(
  source: string,
  mimeType?: string | null,
): MediaAssetPipelineKind {
  if (mimeType?.startsWith("video/")) {
    return "video";
  }

  const format = getAssetFormat(source, mimeType);

  return format && videoFormats.has(format) ? "video" : "image";
}

function getSourceType(source: string): MediaAssetPipelineAsset["sourceType"] {
  if (!source) {
    return "missing";
  }

  if (source.startsWith("data:")) {
    return "data-uri";
  }

  if (/^https?:\/\//i.test(source)) {
    return "remote-url";
  }

  return "local-path";
}

function getAssetFormat(source: string, mimeType?: string | null) {
  const mimeFormat = mimeType?.split("/")[1]?.toLowerCase();

  if (mimeFormat) {
    return normalizeFormat(mimeFormat);
  }

  const dataMatch = source.match(/^data:(image|video)\/([^;,]+)/i);
  if (dataMatch?.[2]) {
    return normalizeFormat(dataMatch[2]);
  }

  const clean = source.split("?")[0]?.split("#")[0] ?? "";
  const extension = clean.match(/\.([a-z0-9]+)$/i)?.[1];

  return extension ? normalizeFormat(extension) : null;
}

function getMimeTypeFromSource(source: string) {
  const dataMatch = source.match(/^data:(image|video)\/([^;,]+)/i);

  if (dataMatch?.[1] && dataMatch[2]) {
    return `${dataMatch[1].toLowerCase()}/${normalizeFormat(dataMatch[2])}`;
  }

  const format = getAssetFormat(source);

  if (!format) {
    return null;
  }

  return `${videoFormats.has(format) ? "video" : "image"}/${format}`;
}

function normalizeFormat(format: string) {
  return format.toLowerCase().replace("jpeg", "jpg").replace("svg+xml", "svg");
}

function getDefaultExtension(kind: MediaAssetPipelineKind, format: string | null) {
  if (format && supportedExportFormats.has(format)) {
    return format === "jpeg" ? "jpg" : format;
  }

  return kind === "video" ? "mp4" : "webp";
}

function sanitizeFileName(value?: string) {
  const text = value?.trim();

  if (!text) {
    return undefined;
  }

  return text.replace(/[^\w.-]+/g, "-");
}

function getSourceBytes(source: string) {
  return new TextEncoder().encode(source).byteLength;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "asset"
  );
}

function escapeCsvCell(
  value: boolean | number | string | null | undefined,
) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
