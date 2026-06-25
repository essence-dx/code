import type { RetentionPrivacyReport } from "@/features/admin/admin-retention-privacy";

export function getRetentionPrivacyJson(report: RetentionPrivacyReport) {
  return JSON.stringify(report, null, 2);
}

export function getRetentionPrivacyCsv(report: RetentionPrivacyReport) {
  return [
    [
      "id",
      "status",
      "kind",
      "label",
      "value",
      "retained_count",
      "eligible_for_cleanup",
      "latest_at",
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
        row.retainedCount,
        row.eligibleForCleanupCount,
        row.latestAt,
        row.detail,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
    "",
    [
      "audit_retention_days",
      "collaboration_retention_days",
      "notification_retention_days",
      "support_bundle_retention_days",
      "support_bundle_privacy_mode",
      "include_network_details",
      "include_notification_reasons",
      "include_audit_metadata",
    ].join(","),
    [
      report.settings.auditLogRetentionDays,
      report.settings.collaborationPresenceRetentionDays,
      report.settings.notificationDeliveryRetentionDays,
      report.settings.supportBundleRetentionDays,
      report.settings.supportBundlePrivacyMode,
      report.settings.includeSupportBundleNetworkDetails,
      report.settings.includeSupportBundleNotificationReasons,
      report.settings.includeSupportBundleAuditMetadata,
    ]
      .map(escapeCsvCell)
      .join(","),
  ].join("\n");
}

export function getRetentionPrivacyMarkdown(report: RetentionPrivacyReport) {
  return [
    "# Retention And Privacy Controls",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Rows: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,
    "",
    "## Settings",
    "",
    `- Audit log retention: ${report.settings.auditLogRetentionDays} days`,
    `- Collaboration presence retention: ${report.settings.collaborationPresenceRetentionDays} days`,
    `- Notification delivery retention: ${report.settings.notificationDeliveryRetentionDays} days`,
    `- Support bundle retention: ${report.settings.supportBundleRetentionDays} days`,
    `- Support bundle privacy mode: ${report.settings.supportBundlePrivacyMode}`,
    `- Include support bundle network details: ${formatBoolean(report.settings.includeSupportBundleNetworkDetails)}`,
    `- Include support bundle notification reasons: ${formatBoolean(report.settings.includeSupportBundleNotificationReasons)}`,
    `- Include support bundle audit metadata: ${formatBoolean(report.settings.includeSupportBundleAuditMetadata)}`,
    `- Updated at: ${report.settings.updatedAt ?? "not saved"}`,
    `- Updated by: ${report.settings.updatedBy ?? "not saved"}`,
    "",
    "## Signals",
    "",
    `- Audit events retained: ${report.retainedAuditEventCount}`,
    `- Audit events eligible for cleanup: ${report.auditEventsEligibleForCleanup}`,
    `- Collaboration presence events retained: ${report.retainedCollaborationPresenceEventCount}`,
    `- Collaboration chat messages retained: ${report.retainedCollaborationChatMessageCount}`,
    `- Collaboration records eligible for cleanup: ${report.collaborationRecordsEligibleForCleanup}`,
    `- Notification deliveries retained: ${report.retainedNotificationDeliveryCount}`,
    `- Notification deliveries eligible for cleanup: ${report.notificationDeliveriesEligibleForCleanup}`,
    `- Sensitive session records in support scope: ${report.supportBundleSensitiveSessionCount}`,
    `- Sensitive audit metadata rows in support scope: ${report.supportBundleSensitiveAuditMetadataCount}`,
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
