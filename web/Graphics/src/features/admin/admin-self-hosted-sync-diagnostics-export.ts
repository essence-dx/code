import type {
  SelfHostedSyncDiagnosticReport,
  SelfHostedSyncDiagnosticRow,
  SelfHostedSyncRepairCommand,
} from "@/features/admin/admin-self-hosted-sync-diagnostics";

export function getSelfHostedSyncDiagnosticJson(
  report: SelfHostedSyncDiagnosticReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getSelfHostedSyncDiagnosticCsv(
  report: SelfHostedSyncDiagnosticReport,
) {
  const rowHeader: Array<keyof SelfHostedSyncDiagnosticRow> = [
    "id",
    "category",
    "status",
    "label",
    "value",
    "detail",
    "recommendation",
    "repairCommand",
    "latestAt",
  ];
  const commandHeader: Array<keyof SelfHostedSyncRepairCommand> = [
    "id",
    "category",
    "command",
    "reason",
  ];

  return [
    [
      "generated_at",
      "status",
      "score",
      "database_kind",
      "database_auth_ready",
      "desktop_channel",
      "desktop_version_parity",
      "browser_base_url",
      "vercel_env",
      "runtime",
      "realtime_score",
      "route_smoke_score",
      "repair_command_count",
    ].join(","),
    [
      report.generatedAt,
      report.status,
      report.score,
      report.databaseKind,
      report.databaseAuthReady,
      report.desktopChannel,
      report.desktopVersionParity,
      report.browserBaseUrl,
      report.vercelEnv,
      report.runtime,
      report.realtimeScore,
      report.routeSmokeScore,
      report.repairCommandCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    ["section", ...rowHeader].join(","),
    ...report.rows.map((row) =>
      ["row", ...rowHeader.map((key) => row[key])]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    ["section", ...commandHeader].join(","),
    ...report.repairCommands.map((command) =>
      ["command", ...commandHeader.map((key) => command[key])]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getSelfHostedSyncDiagnosticMarkdown(
  report: SelfHostedSyncDiagnosticReport,
) {
  return [
    "# Self-Hosted Sync Diagnostics",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,
    "",
    "## Runtime Parity",
    "",
    `- Database: ${report.databaseKind}`,
    `- Database auth ready: ${formatBoolean(report.databaseAuthReady)}`,
    `- Desktop channel: ${report.desktopChannel}`,
    `- Desktop version parity: ${report.desktopVersionParity}`,
    `- Browser base URL: ${report.browserBaseUrl}`,
    `- Vercel environment: ${report.vercelEnv}`,
    `- Runtime: ${report.runtime}`,
    `- Realtime score: ${report.realtimeScore}`,
    `- Route smoke score: ${report.routeSmokeScore}`,
    "",
    "## Diagnostics",
    "",
    ...report.rows.map((row) =>
      [
        `- [${row.status}] ${row.label}`,
        `  - Category: ${row.category}`,
        `  - Value: ${row.value}`,
        `  - Detail: ${row.detail}`,
        `  - Recommendation: ${row.recommendation}`,
        `  - Repair: \`${row.repairCommand}\``,
      ].join("\n"),
    ),
    "",
    "## Repair Commands",
    "",
    ...report.repairCommands.map((command) =>
      [
        `- \`${command.command}\``,
        `  - Category: ${command.category}`,
        `  - Reason: ${command.reason}`,
      ].join("\n"),
    ),
  ].join("\n");
}

function formatBoolean(value: boolean) {
  return value ? "yes" : "no";
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "");

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
