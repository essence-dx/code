import { getLayerAssetReport } from "@/features/editor/layer-codegen";
import {
  exportBatchPresets,
  type ExportBatchPreset,
} from "@/features/editor/exporters/export-settings";
import type { DesignDocument, DesignLayer } from "@/features/editor/types";

export type ExportPreflightStatus = "ready" | "review" | "blocked";

export type ExportPreflightSeverity = "high" | "medium" | "low";

export type ExportPreflightRow = {
  id: string;
  pageId: string;
  pageName: string;
  layerId?: string;
  layerName?: string;
  status: ExportPreflightStatus;
  severity: ExportPreflightSeverity;
  label: string;
  detail: string;
};

export type ExportPresetReadiness = {
  id: string;
  label: string;
  detail: string;
  status: ExportPreflightStatus;
  fileCount: number;
};

export type ExportPreflightReview = {
  score: number;
  pageCount: number;
  layerCount: number;
  visibleLayerCount: number;
  hiddenLayerCount: number;
  exportableLayerCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  fontReviewCount: number;
  rasterRiskCount: number;
  presetReadiness: ExportPresetReadiness[];
  rows: ExportPreflightRow[];
};

type LayerIssue = {
  label: string;
  detail: string;
  severity: ExportPreflightSeverity;
};

export function getExportPreflightReview({
  document,
  selectedLayerIds = [],
}: {
  document: DesignDocument;
  selectedLayerIds?: string[];
}): ExportPreflightReview {
  const rows = [
    ...getDocumentRows(document, selectedLayerIds),
    ...document.pages.flatMap((page) =>
      page.layers.flatMap((layer) => getLayerRows(page.id, page.name, layer)),
    ),
  ];
  const layerCount = document.pages.reduce(
    (total, page) => total + page.layers.length,
    0,
  );
  const visibleLayerCount = document.pages.reduce(
    (total, page) => total + page.layers.filter((layer) => layer.visible).length,
    0,
  );
  const hiddenLayerCount = layerCount - visibleLayerCount;
  const exportableLayerCount = document.pages.reduce(
    (total, page) =>
      total +
      page.layers.filter((layer) => layer.visible && getLayerAssetReport(layer).exportable)
        .length,
    0,
  );
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = Math.max(0, visibleLayerCount - blockedCount - reviewCount);

  return {
    score:
      visibleLayerCount === 0
        ? 0
        : Math.max(0, 100 - blockedCount * 16 - reviewCount * 6),
    pageCount: document.pages.length,
    layerCount,
    visibleLayerCount,
    hiddenLayerCount,
    exportableLayerCount,
    blockedCount,
    reviewCount,
    readyCount,
    fontReviewCount: rows.filter((row) => row.label === "Font not embedded").length,
    rasterRiskCount: rows.filter((row) => isRasterRisk(row)).length,
    presetReadiness: exportBatchPresets.map((preset) =>
      getPresetReadiness(preset, selectedLayerIds, blockedCount, reviewCount),
    ),
    rows: rows.sort((left, right) => {
      if (left.status !== right.status) {
        return getStatusRank(left.status) - getStatusRank(right.status);
      }

      if (left.severity !== right.severity) {
        return getSeverityRank(left.severity) - getSeverityRank(right.severity);
      }

      return `${left.pageName}:${left.layerName ?? left.label}`.localeCompare(
        `${right.pageName}:${right.layerName ?? right.label}`,
      );
    }),
  };
}

export function getExportPreflightCsv(
  review: ExportPreflightReview,
  rows: ExportPreflightRow[] = review.rows,
) {
  return [
    ["status", "severity", "page", "layer", "label", "detail"],
    ...rows.map((row) => [
      row.status,
      row.severity,
      row.pageName,
      row.layerName ?? "",
      row.label,
      row.detail,
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getExportPreflightMarkdown(
  review: ExportPreflightReview,
  rows: ExportPreflightRow[] = review.rows,
) {
  const lines = [
    "# Export Preflight Review",
    "",
    `Score: ${review.score}`,
    `Pages: ${review.pageCount}`,
    `Layers: ${review.layerCount}`,
    `Visible layers: ${review.visibleLayerCount}`,
    `Hidden layers: ${review.hiddenLayerCount}`,
    `Exportable layers: ${review.exportableLayerCount}`,
    `Blocked: ${review.blockedCount}`,
    `Needs review: ${review.reviewCount}`,
    `Raster risks: ${review.rasterRiskCount}`,
    `Font reviews: ${review.fontReviewCount}`,
    "",
    "## Presets",
    "",
    ...review.presetReadiness.map(
      (preset) =>
        `- ${preset.label}: ${preset.status} / ${preset.fileCount} files. ${preset.detail}`,
    ),
    "",
    "## Issues",
    "",
  ];

  if (rows.length === 0) {
    lines.push("- No export preflight issues found.");
  }

  for (const row of rows) {
    const layer = row.layerName ? ` / ${row.layerName}` : "";
    lines.push(
      `- ${row.status.toUpperCase()} / ${row.severity.toUpperCase()} - ${row.pageName}${layer}: ${row.label}. ${row.detail}`,
    );
  }

  return lines.join("\n");
}

function getDocumentRows(
  document: DesignDocument,
  selectedLayerIds: string[],
): ExportPreflightRow[] {
  const activePage =
    document.pages.find((page) => page.id === document.activePageId) ??
    document.pages[0];
  const rows: ExportPreflightRow[] = [];

  if (!activePage) {
    return [
      {
        id: "document:no-pages",
        pageId: "document",
        pageName: "Document",
        status: "blocked",
        severity: "high",
        label: "No exportable pages",
        detail: "The document has no pages to export.",
      },
    ];
  }

  if (activePage.layers.every((layer) => !layer.visible)) {
    rows.push({
      id: `${activePage.id}:no-visible-layers`,
      pageId: activePage.id,
      pageName: activePage.name,
      status: "blocked",
      severity: "high",
      label: "No visible export layers",
      detail: "The active page has no visible layers for page export.",
    });
  }

  if (selectedLayerIds.length === 0) {
    rows.push({
      id: `${activePage.id}:empty-selection-export`,
      pageId: activePage.id,
      pageName: activePage.name,
      status: "review",
      severity: "medium",
      label: "Selection export empty",
      detail: "Selection-based presets will fall back to page export until layers are selected.",
    });
  }

  return rows;
}

function getLayerRows(
  pageId: string,
  pageName: string,
  layer: DesignLayer,
): ExportPreflightRow[] {
  if (!layer.visible) {
    return [];
  }

  const issues = getLayerIssues(layer);

  return issues.map((issue, index) => ({
    id: `${pageId}:${layer.id}:${index}`,
    pageId,
    pageName,
    layerId: layer.id,
    layerName: layer.name,
    status: issue.severity === "high" ? "blocked" : "review",
    severity: issue.severity,
    label: issue.label,
    detail: issue.detail,
  }));
}

function getLayerIssues(layer: DesignLayer) {
  const asset = getLayerAssetReport(layer);
  const issues: LayerIssue[] = [];

  if (!asset.exportable) {
    issues.push({
      label: "Asset export blocked",
      detail: asset.notes[0] ?? "Layer needs source data before export.",
      severity: "high",
    });
  }

  if (layer.type === "image" && !layer.imageSrc?.trim()) {
    issues.push({
      label: "Image source missing",
      detail: "Image export will use a placeholder until source image data is attached.",
      severity: "medium",
    });
  }

  if (layer.type === "image" && !layer.imageAlt?.trim()) {
    issues.push({
      label: "Image alt text missing",
      detail: "Add alt text so exported handoff bundles stay accessible.",
      severity: "medium",
    });
  }

  if (layer.text !== undefined && !isEmbeddedSafeFont(layer.fontFamily)) {
    issues.push({
      label: "Font not embedded",
      detail: `${layer.fontFamily ?? "Unknown font"} may not render consistently in SVG, PDF, or raster exports.`,
      severity: "medium",
    });
  }

  if (layer.blendMode && layer.blendMode !== "normal") {
    issues.push({
      label: "Blend mode raster risk",
      detail: `${layer.blendMode} needs visual review across SVG, PNG, JPG, and PDF exports.`,
      severity: "low",
    });
  }

  if ((layer.layerBlur ?? 0) > 0 || (layer.backgroundBlur ?? 0) > 0) {
    issues.push({
      label: "Blur raster risk",
      detail: "Blur effects should be checked in raster and PDF exports.",
      severity: "low",
    });
  }

  if (layer.width * layer.height > 16_000_000) {
    issues.push({
      label: "Large raster surface",
      detail: `${Math.round(layer.width)} x ${Math.round(layer.height)} can be expensive at 2x or 3x scale.`,
      severity: "medium",
    });
  }

  return issues;
}

function getPresetReadiness(
  preset: ExportBatchPreset,
  selectedLayerIds: string[],
  blockedCount: number,
  reviewCount: number,
): ExportPresetReadiness {
  const selectionNeedsLayers =
    preset.settings.scope === "selection" && selectedLayerIds.length === 0;
  const status: ExportPreflightStatus =
    blockedCount > 0
      ? "blocked"
      : selectionNeedsLayers || reviewCount > 0
        ? "review"
        : "ready";
  const formatCount = preset.settings.formats.length;
  const fileCount = formatCount + (preset.settings.includeManifest ? 1 : 0);

  return {
    id: preset.id,
    label: preset.label,
    detail: selectionNeedsLayers
      ? "Select layers before using this selection preset."
      : preset.detail,
    status,
    fileCount,
  };
}

function isEmbeddedSafeFont(fontFamily?: string) {
  if (!fontFamily?.trim()) {
    return true;
  }

  return /inter|arial|system|sans-serif|serif|monospace/i.test(fontFamily);
}

function isRasterRisk(row: ExportPreflightRow) {
  return /raster|blend|blur|large/i.test(`${row.label} ${row.detail}`);
}

function getStatusRank(status: ExportPreflightStatus) {
  if (status === "blocked") {
    return 0;
  }

  if (status === "review") {
    return 1;
  }

  return 2;
}

function getSeverityRank(severity: ExportPreflightSeverity) {
  if (severity === "high") {
    return 0;
  }

  if (severity === "medium") {
    return 1;
  }

  return 2;
}

function formatCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
