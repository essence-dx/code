import type { AdminOperationalIncidentReport } from "@/features/admin/admin-operational-incidents";

export function getAdminOperationalIncidentJson(
  report: AdminOperationalIncidentReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminOperationalIncidentCsv(
  report: AdminOperationalIncidentReport,
) {
  return [
    [
      "id",
      "status",
      "kind",
      "label",
      "count",
      "latest_at",
      "target",
      "detail",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.status,
        row.kind,
        row.label,
        row.count,
        row.latestAt,
        row.target,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getAdminOperationalIncidentMarkdown(
  report: AdminOperationalIncidentReport,
) {
  return [
    "# Admin Operational Incident Review",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,
    "",
    "## Signals",
    "",
    `- Failed auth attempts: ${report.failedAuthAttemptCount}`,
    `- Failed email deliveries: ${report.failedEmailDeliveryCount}`,
    `- Stale sessions: ${report.staleSessionCount}`,
    `- Risky shares: ${report.riskyShareCount}`,
    `- Recent risky share changes: ${report.recentShareChangeCount}`,
    "",
    "## Review Rows",
    "",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
  ].join("\n");
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
