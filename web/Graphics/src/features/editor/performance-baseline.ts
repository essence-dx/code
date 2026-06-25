import { nanoid } from "nanoid";
import {
  getCanvasRenderBudgetTelemetry,
} from "@/features/editor/canvas-render-budget";
import {
  getDocumentPerformanceReview,
} from "@/features/editor/document-performance-review";
import {
  getLargeDocumentSafeModeReport,
} from "@/features/editor/large-document-safe-mode";
import type {
  DesignDocument,
  DesignPage,
  DesignPerformanceBaselineMetrics,
  DesignPerformanceBaselineSnapshot,
} from "@/features/editor/types";

export type PerformanceBaselineStatus = "ready" | "review" | "blocked";

export type PerformanceBaselineComparisonRow = {
  id: string;
  status: PerformanceBaselineStatus;
  label: string;
  detail: string;
  baselineValue: number;
  currentValue: number;
  delta: number;
  percentChange: number;
  recommendation: string;
};

export type PerformanceBaselineReport = {
  status: PerformanceBaselineStatus;
  score: number;
  baselineCount: number;
  baseline: DesignPerformanceBaselineSnapshot | null;
  current: DesignPerformanceBaselineSnapshot;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: PerformanceBaselineComparisonRow[];
};

type MetricThreshold = {
  key: keyof DesignPerformanceBaselineMetrics;
  label: string;
  reviewDelta: number;
  blockedDelta: number;
  reviewPercent?: number;
  blockedPercent?: number;
  lowerIsBetter?: boolean;
  recommendation: string;
};

const maxBaselineSnapshots = 12;

const metricThresholds = [
  {
    key: "documentScore",
    label: "Document score",
    reviewDelta: 5,
    blockedDelta: 15,
    lowerIsBetter: false,
    recommendation:
      "Review the new performance budget rows before accepting the release baseline.",
  },
  {
    key: "documentLayerCount",
    label: "Document layers",
    reviewDelta: 50,
    blockedDelta: 160,
    reviewPercent: 15,
    blockedPercent: 35,
    lowerIsBetter: true,
    recommendation:
      "Split inactive explorations or group stale layers before recording a new baseline.",
  },
  {
    key: "serializedBytes",
    label: "Serialized bytes",
    reviewDelta: 150_000,
    blockedDelta: 500_000,
    reviewPercent: 15,
    blockedPercent: 35,
    lowerIsBetter: true,
    recommendation:
      "Audit embedded image data, activity history, and oversized metadata before release.",
  },
  {
    key: "activeVisibleLayerCount",
    label: "Active visible layers",
    reviewDelta: 25,
    blockedDelta: 80,
    reviewPercent: 15,
    blockedPercent: 35,
    lowerIsBetter: true,
    recommendation:
      "Hide or archive inactive layers on the active page before visual QA updates.",
  },
  {
    key: "activeRenderCost",
    label: "Active render cost",
    reviewDelta: 25,
    blockedDelta: 75,
    reviewPercent: 15,
    blockedPercent: 35,
    lowerIsBetter: true,
    recommendation:
      "Check compositing, effects, images, and dense vectors before shipping this page.",
  },
  {
    key: "activeEffectLayerCount",
    label: "Active effect layers",
    reviewDelta: 3,
    blockedDelta: 8,
    reviewPercent: 20,
    blockedPercent: 50,
    lowerIsBetter: true,
    recommendation:
      "Reduce live shadows, layer blur, or background blur before mobile captures.",
  },
  {
    key: "activeCompositedLayerCount",
    label: "Active composited layers",
    reviewDelta: 4,
    blockedDelta: 12,
    reviewPercent: 20,
    blockedPercent: 50,
    lowerIsBetter: true,
    recommendation:
      "Flatten decorative blend or mask stacks once the visual direction is stable.",
  },
  {
    key: "activeVectorCommandCount",
    label: "Active vector commands",
    reviewDelta: 120,
    blockedDelta: 400,
    reviewPercent: 20,
    blockedPercent: 60,
    lowerIsBetter: true,
    recommendation:
      "Simplify dense vectors or convert static artwork into optimized image assets.",
  },
  {
    key: "activeLargeLayerCount",
    label: "Active large layers",
    reviewDelta: 2,
    blockedDelta: 6,
    reviewPercent: 25,
    blockedPercent: 60,
    lowerIsBetter: true,
    recommendation:
      "Resize oversized bounds and lock static large layers before continued editing.",
  },
  {
    key: "safeModeHiddenLayerCount",
    label: "Hidden layer inventory",
    reviewDelta: 40,
    blockedDelta: 120,
    reviewPercent: 20,
    blockedPercent: 50,
    lowerIsBetter: true,
    recommendation:
      "Review hidden layers and branch stale explorations before release handoff.",
  },
] satisfies MetricThreshold[];

export function createPerformanceBaselineSnapshot({
  document,
  activePage,
  name,
  createdAt = new Date().toISOString(),
}: {
  document: DesignDocument;
  activePage: DesignPage;
  name?: string;
  createdAt?: string;
}): DesignPerformanceBaselineSnapshot {
  const baselineName =
    name?.trim() ||
    `${activePage.name} baseline ${new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(createdAt))}`;

  return {
    id: nanoid(),
    name: baselineName,
    activePageId: activePage.id,
    activePageName: activePage.name,
    documentHash: getDocumentHash(document),
    metrics: getPerformanceBaselineMetrics(document, activePage),
    createdAt,
    updatedAt: createdAt,
  };
}

export function getPerformanceBaselineReport(
  document: DesignDocument,
  activePage: DesignPage,
): PerformanceBaselineReport {
  const baselines = getSortedPerformanceBaselines(document.performanceBaselines);
  const current = createPerformanceBaselineSnapshot({
    document,
    activePage,
    name: "Current file",
  });
  const baseline = baselines[0] ?? null;
  const rows = baseline
    ? getComparisonRows(baseline.metrics, current.metrics)
    : [getMissingBaselineRow()];
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const score = Math.max(0, 100 - blockedCount * 22 - reviewCount * 7);

  return {
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score,
    baselineCount: baselines.length,
    baseline,
    current,
    blockedCount,
    reviewCount,
    readyCount,
    rows,
  };
}

export function getNextPerformanceBaselines(
  baselines: DesignPerformanceBaselineSnapshot[] | undefined,
  snapshot: DesignPerformanceBaselineSnapshot,
) {
  return [snapshot, ...(baselines ?? []).filter((item) => item.id !== snapshot.id)]
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
    .slice(0, maxBaselineSnapshots);
}

export function removePerformanceBaseline(
  baselines: DesignPerformanceBaselineSnapshot[] | undefined,
  baselineId: string,
) {
  return (baselines ?? []).filter((baseline) => baseline.id !== baselineId);
}

export function getPerformanceBaselineJson(report: PerformanceBaselineReport) {
  return JSON.stringify(report, null, 2);
}

export function getPerformanceBaselineCsv(report: PerformanceBaselineReport) {
  return [
    [
      "metric",
      "status",
      "baseline",
      "current",
      "delta",
      "percent_change",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.label,
        row.status,
        row.baselineValue,
        row.currentValue,
        row.delta,
        row.percentChange,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getPerformanceBaselineMarkdown(
  report: PerformanceBaselineReport,
) {
  return [
    "# Performance Baseline Comparison",
    "",
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Saved baselines: ${report.baselineCount}`,
    `Baseline: ${report.baseline?.name ?? "none"}`,
    `Current page: ${report.current.activePageName}`,
    `Blocked: ${report.blockedCount}`,
    `Review: ${report.reviewCount}`,
    "",
    "## Metrics",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label}: ${formatNumber(row.baselineValue)} -> ${formatNumber(row.currentValue)} (${formatSigned(row.delta)}, ${formatSigned(row.percentChange)}%). Recommendation: ${row.recommendation}`,
    ),
  ].join("\n");
}

function getPerformanceBaselineMetrics(
  document: DesignDocument,
  activePage: DesignPage,
): DesignPerformanceBaselineMetrics {
  const documentPerformance = getDocumentPerformanceReview(document);
  const renderBudget = getCanvasRenderBudgetTelemetry(activePage);
  const safeMode = getLargeDocumentSafeModeReport(document, activePage);

  return {
    documentScore: documentPerformance.score,
    pageCount: documentPerformance.pageCount,
    documentLayerCount: documentPerformance.layerCount,
    hiddenLayerCount: documentPerformance.hiddenLayerCount,
    effectLayerCount: documentPerformance.effectLayerCount,
    imageLayerCount: documentPerformance.imageLayerCount,
    vectorLayerCount: documentPerformance.vectorLayerCount,
    indexedLayerCount: documentPerformance.indexCoverageCount,
    serializedBytes: documentPerformance.serializedBytes,
    activePageScore: renderBudget.score,
    activeVisibleLayerCount: renderBudget.visibleLayerCount,
    activeSelectableLayerCount: renderBudget.selectableLayerCount,
    activeRenderCost: renderBudget.estimatedRenderCost,
    activeEffectLayerCount: renderBudget.effectLayerCount,
    activeCompositedLayerCount: renderBudget.compositedLayerCount,
    activeMaskedLayerCount: renderBudget.maskedLayerCount,
    activeVectorCommandCount: renderBudget.vectorCommandCount,
    activeLargeLayerCount: renderBudget.largeLayerCount,
    safeModeScore: safeMode.score,
    safeModeHiddenLayerCount: safeMode.hiddenLayerCount,
  };
}

function getSortedPerformanceBaselines(
  baselines: DesignPerformanceBaselineSnapshot[] | undefined,
) {
  return [...(baselines ?? [])].sort((first, second) =>
    second.createdAt.localeCompare(first.createdAt),
  );
}

function getComparisonRows(
  baseline: DesignPerformanceBaselineMetrics,
  current: DesignPerformanceBaselineMetrics,
) {
  return metricThresholds.map((threshold) =>
    getComparisonRow(threshold, baseline, current),
  );
}

function getComparisonRow(
  threshold: MetricThreshold,
  baseline: DesignPerformanceBaselineMetrics,
  current: DesignPerformanceBaselineMetrics,
): PerformanceBaselineComparisonRow {
  const baselineValue = baseline[threshold.key];
  const currentValue = current[threshold.key];
  const delta = currentValue - baselineValue;
  const percentChange =
    baselineValue === 0 ? (currentValue > 0 ? 100 : 0) : (delta / baselineValue) * 100;
  const riskDelta = threshold.lowerIsBetter ? delta : -delta;
  const riskPercent = threshold.lowerIsBetter ? percentChange : -percentChange;
  const blocked =
    riskDelta >= threshold.blockedDelta ||
    riskPercent >= (threshold.blockedPercent ?? Number.POSITIVE_INFINITY);
  const review =
    riskDelta >= threshold.reviewDelta ||
    riskPercent >= (threshold.reviewPercent ?? Number.POSITIVE_INFINITY);

  return {
    id: `performance-baseline-${threshold.key}`,
    status: blocked ? "blocked" : review ? "review" : "ready",
    label: threshold.label,
    detail: `${formatNumber(baselineValue)} changed to ${formatNumber(currentValue)} (${formatSigned(delta)}, ${formatSigned(Math.round(percentChange * 10) / 10)}%).`,
    baselineValue,
    currentValue,
    delta,
    percentChange: Math.round(percentChange * 10) / 10,
    recommendation: threshold.recommendation,
  };
}

function getMissingBaselineRow(): PerformanceBaselineComparisonRow {
  return {
    id: "performance-baseline-missing",
    status: "review",
    label: "Saved baseline missing",
    detail: "No saved baseline is available for this file.",
    baselineValue: 0,
    currentValue: 0,
    delta: 0,
    percentChange: 0,
    recommendation:
      "Save a baseline before release handoff so future edits can be compared against this file state.",
  };
}

function getDocumentHash(document: DesignDocument) {
  const stableDocument = {
    activePageId: document.activePageId,
    pages: document.pages,
    variables: document.variables,
    variableModes: document.variableModes,
    activeVariableModeId: document.activeVariableModeId,
    variableDefinitions: document.variableDefinitions,
    variableCollections: document.variableCollections,
    components: document.components,
    layoutGridStyles: document.layoutGridStyles,
    paintStyles: document.paintStyles,
    textStyles: document.textStyles,
    effectStyles: document.effectStyles,
    layoutPresetStyles: document.layoutPresetStyles,
    exportPresets: document.exportPresets,
  };
  const source = JSON.stringify(stableDocument);
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
}

function formatSigned(value: number) {
  const rounded = Math.round(value * 10) / 10;

  return `${rounded > 0 ? "+" : ""}${formatNumber(rounded)}`;
}

function escapeCsvCell(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
