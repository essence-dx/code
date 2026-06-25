import type { AdminWorkspaceOperationsReport } from "@/features/admin/admin-workspace-operations";

export function getAdminWorkspaceOperationsJson(
  report: AdminWorkspaceOperationsReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminWorkspaceOperationsCsv(
  report: AdminWorkspaceOperationsReport,
) {
  return [
    [
      "id",
      "category",
      "status",
      "label",
      "value",
      "detail",
      "recommendation",
      "target",
      "latest_at",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.category,
        row.status,
        row.label,
        row.value,
        row.detail,
        row.recommendation,
        row.target ?? "",
        row.latestAt ?? "",
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminWorkspaceOperationsMarkdown(
  report: AdminWorkspaceOperationsReport,
) {
  return [
    "# Workspace Operations Dashboard",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Storage: ${report.storageUsedPercent}%`,
    `Database: ${report.databaseKind} (${report.databaseStatus})`,
    `Failed email deliveries: ${report.failedEmailDeliveryCount}`,
    `Deploy smoke age: ${
      report.deploySmokeAgeHours === null
        ? "no release approval"
        : `${Math.round(report.deploySmokeAgeHours)} hours`
    }`,
    `Automation review count: ${report.automationReviewCount}`,
    `Admin action queue: ${report.adminActionQueueCount}`,
    "",
    "## Metrics",
    "",
    ...report.metrics.map(
      (metric) =>
        `- [${metric.status}] ${metric.label}: ${metric.value} - ${metric.detail}`,
    ),
    "",
    "## Review Rows",
    "",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label} (${row.category}) - ${row.value}. ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- \`${command}\``),
  ].join("\n");
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}
