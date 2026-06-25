import type {
  VariableGovernanceReviewReport,
  VariableGovernanceReviewRow,
} from "@/features/editor/variable-governance-review-types";

const csvHeaders: Array<keyof VariableGovernanceReviewRow> = [
  "status",
  "category",
  "label",
  "detail",
  "variableNames",
  "modeIds",
  "collectionIds",
  "aliasPath",
  "actionLabel",
  "metric",
  "recommendation",
];

export function getVariableGovernanceReviewCsv(
  report: VariableGovernanceReviewReport,
  rows = report.rows,
) {
  return [
    ["score", report.score].map(escapeCsvCell).join(","),
    ["status", report.status].map(escapeCsvCell).join(","),
    ["variables", report.variableCount].map(escapeCsvCell).join(","),
    ["modes", report.modeCount].map(escapeCsvCell).join(","),
    ["aliases", report.aliasCount].map(escapeCsvCell).join(","),
    ["orphans", report.orphanTokenCount].map(escapeCsvCell).join(","),
    "",
    csvHeaders.join(","),
    ...rows.map((row) =>
      csvHeaders.map((header) => escapeCsvCell(row[header])).join(","),
    ),
  ].join("\n");
}

export function getVariableGovernanceReviewMarkdown(
  report: VariableGovernanceReviewReport,
  rows = report.rows,
) {
  return [
    "# Variable Governance Review",
    "",
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Variables: ${report.variableCount}`,
    `Modes: ${report.modeCount}`,
    `Collections: ${report.collectionCount}`,
    `Aliases: ${report.aliasCount}`,
    `Alias cycles: ${report.aliasCycleCount}`,
    `Broken aliases: ${report.brokenAliasCount}`,
    `Missing mode values: ${report.missingModeValueCount}`,
    `Orphaned variables: ${report.orphanTokenCount}`,
    `Duplicate names: ${report.duplicateNameCount}`,
    `Collection mismatches: ${report.collectionMismatchCount}`,
    "",
    "## Review Rows",
    ...(rows.length
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
        )
      : ["- No variable governance review rows."]),
  ].join("\n");
}

function escapeCsvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join(" / ") : String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}
