import type {
  ResponsiveConstraintsReviewReport,
  ResponsiveConstraintsReviewRow,
} from "@/features/editor/responsive-constraints-review-types";

export function getResponsiveConstraintsReviewCsv(
  report: ResponsiveConstraintsReviewReport,
  rows: ResponsiveConstraintsReviewRow[] = report.rows,
) {
  const header: Array<keyof ResponsiveConstraintsReviewRow> = [
    "id",
    "pageName",
    "frameName",
    "status",
    "category",
    "label",
    "detail",
    "layerIds",
    "layerNames",
    "action",
    "metric",
    "previewLabel",
    "overflowCount",
    "unstableCount",
    "recommendation",
  ];

  return [
    [
      "score",
      "status",
      "pages",
      "frames",
      "resize_scenarios",
      "overflow",
      "unstable",
      "missing_constraints",
      "nested",
      "groups",
      "components",
      "masks",
      "grids",
      "cross_page",
      "blocked",
      "review",
    ].join(","),
    [
      report.score,
      report.status,
      report.pageCount,
      report.frameCount,
      report.resizeScenarioCount,
      report.overflowCount,
      report.unstableCount,
      report.missingConstraintCount,
      report.nestedFrameCount,
      report.groupIssueCount,
      report.componentIssueCount,
      report.maskIssueCount,
      report.gridIssueCount,
      report.crossPageIssueCount,
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

export function getResponsiveConstraintsReviewMarkdown(
  report: ResponsiveConstraintsReviewReport,
  rows: ResponsiveConstraintsReviewRow[] = report.rows,
) {
  return [
    "# Responsive Constraints Review",
    "",
    `Score: ${report.score}`,
    `Status: ${report.status}`,
    `Pages: ${report.pageCount}`,
    `Frames: ${report.frameCount}`,
    `Resize scenarios: ${report.resizeScenarioCount}`,
    `Overflow issues: ${report.overflowCount}`,
    `Unstable previews: ${report.unstableCount}`,
    `Missing constraints: ${report.missingConstraintCount}`,
    `Nested frame issues: ${report.nestedFrameCount}`,
    `Group issues: ${report.groupIssueCount}`,
    `Component issues: ${report.componentIssueCount}`,
    `Mask issues: ${report.maskIssueCount}`,
    `Grid issues: ${report.gridIssueCount}`,
    `Cross-page issues: ${report.crossPageIssueCount}`,
    `Blocked: ${report.blockedCount}`,
    `Review: ${report.reviewCount}`,
    "",
    "## Review Queue",
    ...(rows.length > 0
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.pageName} / ${row.frameName ?? "Page"} / ${row.label}: ${row.detail} Action: ${row.actionLabel}. Recommendation: ${row.recommendation}`,
        )
      : ["- No responsive constraint rows."]),
  ].join("\n");
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
