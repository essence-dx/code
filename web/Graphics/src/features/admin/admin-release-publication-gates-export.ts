import type {
  AdminReleasePublicationGateReport,
  AdminReleasePublicationGateRow,
} from "@/features/admin/admin-release-publication-gates";

export function getAdminReleasePublicationGateJson(
  report: AdminReleasePublicationGateReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminReleasePublicationGateCsv(
  report: AdminReleasePublicationGateReport,
) {
  const header: Array<keyof AdminReleasePublicationGateRow> = [
    "id",
    "category",
    "status",
    "label",
    "value",
    "detail",
    "recommendation",
    "target",
    "latestAt",
  ];

  return [header, ...report.rows.map((row) => header.map((key) => row[key]))]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
}

export function getAdminReleasePublicationGateMarkdown(
  report: AdminReleasePublicationGateReport,
) {
  return [
    "# Release Publication Gates",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Can publish: ${report.canPublish ? "yes" : "no"}`,
    `Deploy smoke score: ${report.deploySmokeScore}`,
    `Publish channel score: ${report.publishChannelScore}`,
    `Public link score: ${report.publicLinkScore}`,
    `Access budget score: ${report.accessBudgetScore}`,
    `Collaboration score: ${report.collaborationScore}`,
    `Latest approval: ${report.latestApprovalAt ?? "none"}`,
    "",
    "## Gate Rows",
    "",
    ...report.rows.map((row) =>
      [
        `- [${row.status}] ${row.label}`,
        `  - Category: ${row.category}`,
        `  - Value: ${row.value}`,
        `  - Detail: ${row.detail}`,
        `  - Recommendation: ${row.recommendation}`,
        `  - Target: ${row.target ?? "none"}`,
      ].join("\n"),
    ),
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- ${command}`),
  ].join("\n");
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
