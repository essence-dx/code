import type {
  DesignDocument,
  DesignLayer,
} from "@/features/editor/types";
import {
  createDocumentLayerIndex,
  type LayerIndexEntry,
} from "@/features/editor/layer-index";

export type DocumentPerformanceStatus = "ready" | "review" | "blocked";

export type DocumentPerformanceReviewRow = {
  id: string;
  status: DocumentPerformanceStatus;
  label: string;
  detail: string;
  pageName?: string;
  layerIds: string[];
  metric: number;
  recommendation: string;
};

export type DocumentPerformanceReview = {
  score: number;
  status: DocumentPerformanceStatus;
  pageCount: number;
  layerCount: number;
  hiddenLayerCount: number;
  effectLayerCount: number;
  imageLayerCount: number;
  vectorLayerCount: number;
  indexCoverageCount: number;
  serializedBytes: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: DocumentPerformanceReviewRow[];
};

const reviewLayerCount = 350;
const blockedLayerCount = 800;
const reviewPageCount = 12;
const blockedPageCount = 28;
const reviewDocumentBytes = 1_500_000;
const blockedDocumentBytes = 4_500_000;
const reviewLayerArea = 1_200_000;
const blockedLayerArea = 3_000_000;
const reviewPathCommands = 80;
const blockedPathCommands = 180;
const reviewImageBytes = 500_000;
const blockedImageBytes = 2_000_000;

export function getDocumentPerformanceReview(
  document: DesignDocument,
): DocumentPerformanceReview {
  const layerIndex = createDocumentLayerIndex(document);
  const pageLayers = layerIndex.entries;
  const layers = pageLayers.map((item) => item.layer);
  const rows: DocumentPerformanceReviewRow[] = [
    ...getDocumentScaleRows(document, layers),
    ...getHeavyLayerRows(pageLayers),
    ...getImageRows(pageLayers),
    ...getVectorRows(pageLayers),
    ...getEffectRows(pageLayers),
  ];
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const score = Math.max(0, 100 - blockedCount * 18 - reviewCount * 6);

  return {
    score,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    pageCount: document.pages.length,
    layerCount: layers.length,
    hiddenLayerCount: layers.filter((layer) => !layer.visible).length,
    effectLayerCount: layers.filter(hasExpensiveEffect).length,
    imageLayerCount: layers.filter((layer) => layer.type === "image").length,
    vectorLayerCount: layers.filter((layer) => layer.type === "path").length,
    indexCoverageCount: layerIndex.entries.length,
    serializedBytes: getSerializedBytes(document),
    blockedCount,
    reviewCount,
    readyCount,
    rows:
      rows.length > 0
        ? rows
        : [
            {
              id: "performance-ready",
              status: "ready",
              label: "Performance budget ready",
              detail: "The document is inside the current page, layer, image, vector, and effects budgets.",
              layerIds: [],
              metric: score,
              recommendation: "Keep using deterministic visual snapshots before large layout or asset changes.",
            },
          ],
  };
}

export function getDocumentPerformanceReviewCsv(
  report: DocumentPerformanceReview,
  rows: DocumentPerformanceReviewRow[] = report.rows,
) {
  const header: Array<keyof DocumentPerformanceReviewRow> = [
    "id",
    "status",
    "label",
    "detail",
    "pageName",
    "layerIds",
    "metric",
    "recommendation",
  ];

  return [
    [
      "score",
      "status",
      "pages",
      "layers",
      "hidden_layers",
      "effect_layers",
      "image_layers",
      "vector_layers",
      "indexed_layers",
      "serialized_bytes",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.status,
      report.pageCount,
      report.layerCount,
      report.hiddenLayerCount,
      report.effectLayerCount,
      report.imageLayerCount,
      report.vectorLayerCount,
      report.indexCoverageCount,
      report.serializedBytes,
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

export function getDocumentPerformanceReviewMarkdown(
  report: DocumentPerformanceReview,
  rows: DocumentPerformanceReviewRow[] = report.rows,
) {
  return [
    "# Document Performance Review",
    "",
    `Score: ${report.score}`,
    `Status: ${report.status}`,
    `Pages: ${report.pageCount}`,
    `Layers: ${report.layerCount}`,
    `Indexed layers: ${report.indexCoverageCount}`,
    `Serialized bytes: ${report.serializedBytes}`,
    `Blocked: ${report.blockedCount}`,
    `Review: ${report.reviewCount}`,
    "",
    "## Review Queue",
    ...(rows.length > 0
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
        )
      : ["- No performance review rows."]),
  ].join("\n");
}

function getDocumentScaleRows(
  document: DesignDocument,
  layers: DesignLayer[],
) {
  const rows: DocumentPerformanceReviewRow[] = [];
  const serializedBytes = getSerializedBytes(document);

  if (document.pages.length >= reviewPageCount) {
    rows.push({
      id: "page-count-budget",
      status: document.pages.length >= blockedPageCount ? "blocked" : "review",
      label: "Page count budget",
      detail: `${document.pages.length} pages are present in this file.`,
      layerIds: [],
      metric: document.pages.length,
      recommendation: "Split stale explorations into branch files before visual QA baseline updates.",
    });
  }

  if (layers.length >= reviewLayerCount) {
    rows.push({
      id: "layer-count-budget",
      status: layers.length >= blockedLayerCount ? "blocked" : "review",
      label: "Layer count budget",
      detail: `${layers.length} layers are present across ${document.pages.length} pages.`,
      layerIds: [],
      metric: layers.length,
      recommendation: "Group or archive inactive layers before adding new interaction-heavy features.",
    });
  }

  if (serializedBytes >= reviewDocumentBytes) {
    rows.push({
      id: "document-size-budget",
      status:
        serializedBytes >= blockedDocumentBytes ? "blocked" : "review",
      label: "Document payload budget",
      detail: `The serialized design document is ${formatBytes(serializedBytes)}.`,
      layerIds: [],
      metric: serializedBytes,
      recommendation: "Move oversized embedded assets into image references or split the file.",
    });
  }

  return rows;
}

function getHeavyLayerRows(pageLayers: LayerIndexEntry[]) {
  return pageLayers
    .filter((entry) => entry.bounds.area >= reviewLayerArea)
    .slice(0, 8)
    .map((entry) => {
      const area = entry.bounds.area;

      return {
        id: `heavy-layer-${entry.layer.id}`,
        status: area >= blockedLayerArea ? "blocked" : "review",
        label: "Large layer bounds",
        detail: `${entry.layer.name} covers ${Math.round(area).toLocaleString()} square pixels.`,
        pageName: entry.pageName,
        layerIds: [entry.layer.id],
        metric: area,
        recommendation: "Reduce oversized bounds or split this layer before capturing new visual baselines.",
      } satisfies DocumentPerformanceReviewRow;
    });
}

function getImageRows(pageLayers: LayerIndexEntry[]) {
  return pageLayers
    .filter((entry) => getImageSourceBytes(entry.layer) >= reviewImageBytes)
    .slice(0, 8)
    .map((entry) => {
      const bytes = getImageSourceBytes(entry.layer);

      return {
        id: `image-budget-${entry.layer.id}`,
        status: bytes >= blockedImageBytes ? "blocked" : "review",
        label: "Embedded image budget",
        detail: `${entry.layer.name} embeds ${formatBytes(bytes)} of image data.`,
        pageName: entry.pageName,
        layerIds: [entry.layer.id],
        metric: bytes,
        recommendation: "Use compressed referenced assets for heavy image layers.",
      } satisfies DocumentPerformanceReviewRow;
    });
}

function getVectorRows(pageLayers: LayerIndexEntry[]) {
  return pageLayers
    .filter((entry) => getPathCommandCount(entry.layer) >= reviewPathCommands)
    .slice(0, 8)
    .map((entry) => {
      const commandCount = getPathCommandCount(entry.layer);

      return {
        id: `path-budget-${entry.layer.id}`,
        status: commandCount >= blockedPathCommands ? "blocked" : "review",
        label: "Complex vector path",
        detail: `${entry.layer.name} contains ${commandCount} path commands.`,
        pageName: entry.pageName,
        layerIds: [entry.layer.id],
        metric: commandCount,
        recommendation: "Simplify dense vector paths or convert static artwork to an optimized asset.",
      } satisfies DocumentPerformanceReviewRow;
    });
}

function getEffectRows(pageLayers: LayerIndexEntry[]) {
  return pageLayers
    .filter((entry) => hasExpensiveEffect(entry.layer))
    .slice(0, 8)
    .map(
      (entry) =>
        ({
          id: `effect-budget-${entry.layer.id}`,
          status: "review",
          label: "Expensive effect layer",
          detail: `${entry.layer.name} uses blur, shadow, or background blur effects.`,
          pageName: entry.pageName,
          layerIds: [entry.layer.id],
          metric:
            (entry.layer.shadowBlur ?? 0) +
            (entry.layer.layerBlur ?? 0) +
            (entry.layer.backgroundBlur ?? 0),
          recommendation:
            "Audit effect-heavy layers before mobile visual captures and exports.",
        }) satisfies DocumentPerformanceReviewRow,
    );
}

function getSerializedBytes(document: DesignDocument) {
  return new TextEncoder().encode(JSON.stringify(document)).byteLength;
}

function getImageSourceBytes(layer: DesignLayer) {
  return layer.imageSrc ? new TextEncoder().encode(layer.imageSrc).byteLength : 0;
}

function getPathCommandCount(layer: DesignLayer) {
  return layer.pathData?.match(/[a-z]/gi)?.length ?? 0;
}

function hasExpensiveEffect(layer: DesignLayer) {
  return Boolean(
    layer.effectsVisible !== false &&
      ((layer.shadowEnabled && (layer.shadowBlur ?? 0) > 0) ||
        (layer.layerBlur ?? 0) > 0 ||
        (layer.backgroundBlur ?? 0) > 0),
  );
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
