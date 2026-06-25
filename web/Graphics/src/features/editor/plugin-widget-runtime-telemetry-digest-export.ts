import type {
  PluginWidgetAdminEscalationQueueItem,
  PluginWidgetTelemetryDigestReport,
  PluginWidgetTelemetryDigestRow,
} from "@/features/editor/plugin-widget-runtime-telemetry-digest-types";

export function getPluginWidgetRuntimeTelemetryDigestCsv(
  report: PluginWidgetTelemetryDigestReport,
  rows: PluginWidgetTelemetryDigestRow[] = report.rows,
) {
  const rowHeader: Array<keyof PluginWidgetTelemetryDigestRow> = [
    "id",
    "status",
    "category",
    "label",
    "detail",
    "metric",
    "threshold",
    "pluginIds",
    "escalationIds",
    "recommendation",
  ];
  const queueHeader: Array<keyof PluginWidgetAdminEscalationQueueItem> = [
    "id",
    "status",
    "category",
    "pluginId",
    "pluginName",
    "reason",
    "detail",
    "recommendation",
  ];

  return [
    [
      "score",
      "status",
      "permission_prompts",
      "permission_blockers",
      "blocked_runs",
      "replay_mismatches",
      "crash_isolation_blockers",
      "crash_like_runs",
      "admin_escalations",
      "widget_runtimes",
      "manifests",
    ].join(","),
    [
      report.score,
      report.status,
      report.permissionPromptCount,
      report.permissionPromptBlockedCount,
      report.blockedRunCount,
      report.replayMismatchCount,
      report.crashIsolationBlockedCount,
      report.crashLikeRunCount,
      report.adminEscalationQueueCount,
      report.widgetRuntimeCount,
      report.manifestCount,
    ]
      .map(escapeCsvCell)
      .join(","),
    "",
    rowHeader.join(","),
    ...rows.map((row) =>
      rowHeader
        .map((key) =>
          escapeCsvCell(
            Array.isArray(row[key]) ? row[key].join("; ") : row[key],
          ),
        )
        .join(","),
    ),
    "",
    queueHeader.join(","),
    ...report.adminEscalationQueue.map((item) =>
      queueHeader.map((key) => escapeCsvCell(item[key])).join(","),
    ),
  ].join("\n");
}

export function getPluginWidgetRuntimeTelemetryDigestMarkdown(
  report: PluginWidgetTelemetryDigestReport,
  rows: PluginWidgetTelemetryDigestRow[] = report.rows,
) {
  return [
    "# Plugin Widget Runtime Telemetry Digest",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Permission prompts: ${report.permissionPromptCount}`,
    `Blocked runs: ${report.blockedRunCount}`,
    `Replay mismatches: ${report.replayMismatchCount}`,
    `Crash isolation blockers: ${report.crashIsolationBlockedCount}`,
    `Admin escalation queue: ${report.adminEscalationQueueCount}`,
    "",
    "This digest joins permission prompts, blocked runs, replay mismatches, crash isolation, and admin escalation queues for plugin and widget runtimes.",
    "",
    "## Review Queue",
    ...rows.map(
      (row) =>
        `- [${row.status}] ${row.category} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
    ),
    "",
    "## Admin Escalations",
    ...(report.adminEscalationQueue.length > 0
      ? report.adminEscalationQueue.map(
          (item) =>
            `- [${item.status}] ${item.pluginName} / ${item.reason}: ${item.detail} Recommendation: ${item.recommendation}`,
        )
      : ["- No admin escalation queue items."]),
  ].join("\n");
}

export function getPluginWidgetRuntimeTelemetryDigestJson(
  report: PluginWidgetTelemetryDigestReport,
  rows: PluginWidgetTelemetryDigestRow[] = report.rows,
) {
  return JSON.stringify(
    {
      type: "essence.plugin-widget-runtime-telemetry-digest",
      version: 1,
      generatedAt: report.generatedAt,
      summary: {
        status: report.status,
        score: report.score,
        permissionPromptCount: report.permissionPromptCount,
        permissionPromptBlockedCount: report.permissionPromptBlockedCount,
        blockedRunCount: report.blockedRunCount,
        replayMismatchCount: report.replayMismatchCount,
        crashIsolationBlockedCount: report.crashIsolationBlockedCount,
        crashLikeRunCount: report.crashLikeRunCount,
        adminEscalationQueueCount: report.adminEscalationQueueCount,
        widgetRuntimeCount: report.widgetRuntimeCount,
        manifestCount: report.manifestCount,
        readyCount: report.readyCount,
        reviewCount: report.reviewCount,
        blockedCount: report.blockedCount,
      },
      rows,
      adminEscalationQueue: report.adminEscalationQueue,
      sourceScores: {
        pluginWidgetRuntimeOperations:
          report.pluginWidgetRuntimeOperations.score,
        nativePluginSandbox: report.nativePluginSandbox.score,
      },
    },
    null,
    2,
  );
}

function escapeCsvCell(
  value: boolean | number | string | string[] | null | undefined,
) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = Array.isArray(value) ? value.join("; ") : String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
