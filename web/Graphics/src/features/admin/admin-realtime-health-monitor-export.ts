import type {
  AdminRealtimeHealthReport,
  AdminRealtimeHealthRow,
} from "@/features/admin/admin-realtime-health-monitor";

export function getAdminRealtimeHealthJson(report: AdminRealtimeHealthReport) {
  return JSON.stringify(report, null, 2);
}

export function getAdminRealtimeHealthCsv(report: AdminRealtimeHealthReport) {
  const header: Array<keyof AdminRealtimeHealthRow> = [
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

export function getAdminRealtimeHealthMarkdown(
  report: AdminRealtimeHealthReport,
) {
  return [
    "# Workspace Realtime Health Monitor",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Active files: ${report.activeFileCount}`,
    `Monitored rooms: ${report.monitoredRoomCount}`,
    `Stale rooms: ${report.staleRoomCount}`,
    `Average room age: ${report.averageRoomAgeMinutes ?? "none"}`,
    `Max room age: ${report.maxRoomAgeMinutes ?? "none"}`,
    `Reconnect quality: ${report.reconnectQualityScore}`,
    `Pending save signals: ${report.pendingSaveSignalCount}`,
    `Failed notifications: ${report.failedNotificationDeliveryCount}`,
    `Route analytics anomalies: ${report.routeAnalyticsAnomalyCount}`,
    "",
    "## Health Rows",
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
