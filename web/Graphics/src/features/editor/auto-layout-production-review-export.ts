import type {
  AutoLayoutProductionReviewReport,
  AutoLayoutProductionReviewRow,
} from "@/features/editor/auto-layout-production-review-types";

export function getAutoLayoutProductionReviewCsv(
  report: AutoLayoutProductionReviewReport,
  rows: AutoLayoutProductionReviewRow[] = report.rows,
) {
  return [
    [
      "status",
      "category",
      "page",
      "frame",
      "mode",
      "wrap",
      "children",
      "grids",
      "visibleGrids",
      "hiddenGrids",
      "nestedAutoLayouts",
      "nestedDepth",
      "containedUnowned",
      "overflow",
      "fillChildren",
      "hugChildren",
      "absoluteChildren",
      "frameSizing",
      "responsiveScore",
      "regressionPatches",
      "action",
      "detail",
      "regressionEvidence",
    ],
    ...rows.map((row) => [
      row.status,
      row.category,
      row.pageName,
      row.frameName,
      row.mode,
      row.wrap,
      row.childCount,
      row.gridCount,
      row.visibleGridCount,
      row.hiddenGridCount,
      row.nestedAutoLayoutCount,
      row.nestedDepth,
      row.containedUnownedCount,
      row.overflowCount,
      row.fillChildCount,
      row.hugChildCount,
      row.absoluteChildCount,
      row.frameSizing,
      row.responsiveScore,
      row.regressionPatchCount,
      row.action,
      row.detail,
      row.regressionEvidence,
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getAutoLayoutProductionReviewMarkdown(
  report: AutoLayoutProductionReviewReport,
  rows: AutoLayoutProductionReviewRow[] = report.rows,
) {
  const lines = [
    "# Auto Layout Production Review",
    "",
    `Score: ${report.score}`,
    `Pages: ${report.pageCount}`,
    `Frames: ${report.frameCount}`,
    `Auto layout frames: ${report.autoLayoutFrameCount}`,
    `Manual frames: ${report.manualFrameCount}`,
    `Wrap frames: ${report.wrapFrameCount}`,
    `Grid frames: ${report.gridFrameCount}`,
    `Nested auto layout rows: ${report.nestedAutoLayoutCount}`,
    `Ready rows: ${report.readyCount}`,
    `Review rows: ${report.reviewCount}`,
    `Blocked rows: ${report.blockedCount}`,
    `Repairable rows: ${report.repairableCount}`,
    `Migration candidates: ${report.migrationCount}`,
    `Regression evidence rows: ${report.regressionEvidenceCount}`,
    "",
    "## Review Queue",
    "",
  ];

  if (rows.length === 0) {
    lines.push("- No auto-layout production rows match this queue.");
  }

  for (const row of rows) {
    lines.push(
      `- ${row.pageName} / ${row.frameName} (${row.status}, ${row.category}) - ${row.detail} Action: ${row.actionLabel}. Evidence: ${row.regressionEvidence}`,
    );
  }

  return lines.join("\n");
}

function formatCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
