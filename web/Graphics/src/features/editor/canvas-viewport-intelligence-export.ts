import {
  getCanvasViewportIntelligence,
} from "@/features/editor/canvas-viewport-intelligence";
import type {
  CanvasViewportIntelligenceReport,
  CanvasViewportIntelligenceRow,
} from "@/features/editor/canvas-viewport-intelligence-types";
import type { DesignDocument } from "@/features/editor/types";

export function getCanvasViewportIntelligenceCsv(
  report: CanvasViewportIntelligenceReport,
  rows: CanvasViewportIntelligenceRow[] = report.rows,
) {
  const header: Array<keyof CanvasViewportIntelligenceRow> = [
    "id",
    "pageName",
    "status",
    "category",
    "label",
    "detail",
    "layerIds",
    "layerNames",
    "action",
    "metric",
    "renderWindowLabel",
    "estimatedRenderCost",
    "interactionCost",
    "hitTestPairCount",
    "stackDepth",
    "offscreenLayerCount",
    "recommendation",
  ];

  return [
    [
      "score",
      "status",
      "pages",
      "reviewed_layers",
      "render_windows",
      "render_window_layers",
      "offscreen_layers",
      "expensive_layers",
      "hit_test_pairs",
      "stack_depth",
      "interaction_cost",
      "render_cost",
      "safe_mode_thresholds",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.status,
      report.pageCount,
      report.reviewedLayerCount,
      report.renderWindowCount,
      report.renderWindowLayerCount,
      report.offscreenLayerCount,
      report.expensiveLayerCount,
      report.deepHitTestPairCount,
      report.deepHitTestStackDepth,
      report.interactionCost,
      report.estimatedRenderCost,
      report.safeModeThresholdCount,
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

export function getCanvasViewportIntelligenceMarkdown(
  report: CanvasViewportIntelligenceReport,
  rows: CanvasViewportIntelligenceRow[] = report.rows,
) {
  return [
    "# Canvas Viewport Intelligence",
    "",
    `Score: ${report.score}`,
    `Status: ${report.status}`,
    `Pages: ${report.pageCount}`,
    `Reviewed layers: ${report.reviewedLayerCount}`,
    `Render windows: ${report.renderWindowCount}`,
    `Render-window layers: ${report.renderWindowLayerCount}`,
    `Off-window visible layers: ${report.offscreenLayerCount}`,
    `Expensive layers: ${report.expensiveLayerCount}`,
    `Deep hit-test pairs: ${report.deepHitTestPairCount}`,
    `Deep hit-test stack depth: ${report.deepHitTestStackDepth}`,
    `Interaction cost: ${report.interactionCost}`,
    `Estimated render cost: ${report.estimatedRenderCost}`,
    `Safe-mode thresholds: ${report.safeModeThresholdCount}`,
    `Blocked: ${report.blockedCount}`,
    `Review: ${report.reviewCount}`,
    "",
    "## Review Queue",
    ...(rows.length > 0
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.pageName} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
        )
      : ["- No viewport intelligence rows."]),
  ].join("\n");
}

export function getCanvasViewportIntelligenceBundleJson(
  document: DesignDocument,
  report: CanvasViewportIntelligenceReport,
  rows: CanvasViewportIntelligenceRow[] = report.rows,
) {
  const rowKeys = new Set(rows.map((row) => `${row.pageId}:${row.id}`));

  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      summary: {
        fileVersion: document.version,
        score: report.score,
        status: report.status,
        pageCount: report.pageCount,
        reviewedLayerCount: report.reviewedLayerCount,
        renderWindowCount: report.renderWindowCount,
        offscreenLayerCount: report.offscreenLayerCount,
        deepHitTestPairCount: report.deepHitTestPairCount,
        interactionCost: report.interactionCost,
      },
      rows: report.rows.filter((row) => rowKeys.has(`${row.pageId}:${row.id}`)),
    },
    null,
    2,
  );
}

export function createCanvasViewportIntelligenceExport(
  document: DesignDocument,
) {
  return getCanvasViewportIntelligence(document);
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
