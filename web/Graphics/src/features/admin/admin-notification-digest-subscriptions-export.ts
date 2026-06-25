import type { AdminNotificationDigestSubscriptionsReport } from "@/features/admin/admin-notification-digest-subscriptions";

export function getAdminNotificationDigestSubscriptionsJson(
  report: AdminNotificationDigestSubscriptionsReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminNotificationDigestSubscriptionsCsv(
  report: AdminNotificationDigestSubscriptionsReport,
) {
  return [
    [
      "id",
      "status",
      "kind",
      "label",
      "value",
      "subscribed",
      "routed",
      "active_signal",
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
        row.value,
        row.subscribed,
        row.routed,
        row.activeSignal,
        row.latestAt,
        row.target,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    [
      "recipient_count",
      "subscribed_topics",
      "frequency",
      "channel",
      "minimum_severity",
      "include_resolved",
      "active_signals",
      "blocked_signals",
      "unrouted_active_signals",
      "updated_at",
      "updated_by",
    ].join(","),
    [
      report.recipientCount,
      report.subscribedTopicCount,
      report.settings.frequency,
      report.settings.channel,
      report.settings.minimumSeverity,
      report.settings.includeResolved,
      report.activeSignalCount,
      report.blockedSignalCount,
      report.unroutedActiveSignalCount,
      report.settings.updatedAt,
      report.settings.updatedBy,
    ]
      .map(escapeCsvCell)
      .join(","),
  ].join("\n");
}

export function getAdminNotificationDigestSubscriptionsMarkdown(
  report: AdminNotificationDigestSubscriptionsReport,
) {
  return [
    "# Admin Notification Digest Subscriptions",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,
    "",
    "## Settings",
    "",
    `- Recipients: ${report.settings.recipients.join(", ") || "none"}`,
    `- Channel: ${report.settings.channel}`,
    `- Frequency: ${report.settings.frequency}`,
    `- Minimum severity: ${report.settings.minimumSeverity}`,
    `- Include resolved: ${formatBoolean(report.settings.includeResolved)}`,
    `- Updated at: ${report.settings.updatedAt ?? "not saved"}`,
    `- Updated by: ${report.settings.updatedBy ?? "not saved"}`,
    "",
    "## Signals",
    "",
    `- Subscribed topics: ${report.subscribedTopicCount}`,
    `- Active signals: ${report.activeSignalCount}`,
    `- Blocked signals: ${report.blockedSignalCount}`,
    `- Unrouted active signals: ${report.unroutedActiveSignalCount}`,
    "",
    "## Review Rows",
    "",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label} (${row.value}): ${row.detail} Recommendation: ${row.recommendation}`,
    ),
  ].join("\n");
}

function formatBoolean(value: boolean) {
  return value ? "yes" : "no";
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
