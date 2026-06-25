import type {
  AdminCollaborationNotificationPreferenceCenterReport,
  AdminCollaborationNotificationPreferenceGap,
  AdminCollaborationNotificationPreferenceRow,
  AdminCollaborationNotificationPreferenceScope,
} from "@/features/admin/admin-collaboration-notification-preference-center-types";

export function getAdminCollaborationNotificationPreferenceCenterJson(
  report: AdminCollaborationNotificationPreferenceCenterReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminCollaborationNotificationPreferenceCenterCsv(
  report: AdminCollaborationNotificationPreferenceCenterReport,
) {
  return [
    toCsvRow([
      "kind",
      "id",
      "category",
      "status",
      "state",
      "label",
      "target",
      "fileName",
      "ownerRef",
      "signalCount",
      "blockedSignalCount",
      "suppressed",
      "exportReady",
      "latestAt",
      "recommendation",
    ]),
    ...report.rows.map((row) => rowToCsv(row)),
    ...report.preferences.map((preference) => preferenceToCsv(preference)),
    ...report.alertGaps.map((gap) => gapToCsv(gap)),
  ].join("\n");
}

export function getAdminCollaborationNotificationPreferenceCenterMarkdown(
  report: AdminCollaborationNotificationPreferenceCenterReport,
) {
  return [
    "# Collaboration Notification Preference Center",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Categories: ${report.categoryCount}`,
    `Preference scopes: ${report.preferenceScopeCount}`,
    `Alert gaps: ${report.alertGapCount}`,
    `Digest recipients: ${report.digestRecipientCount}`,
    "",
    "## Rows",
    ...report.rows.flatMap((row) => [
      `- ${row.label}: ${row.status} (${row.value})`,
      `  - Detail: ${row.detail}`,
      `  - Recommendation: ${row.recommendation}`,
    ]),
    "",
    "## Preference Scopes",
    ...report.preferences.slice(0, 12).flatMap((preference) => [
      `- ${preference.label}: ${preference.status}`,
      `  - Category: ${formatCategory(preference.category)}`,
      `  - State: ${preference.state}`,
      `  - Signals: ${preference.signalCount} total / ${preference.blockedSignalCount} blocked`,
      `  - Target: ${preference.target}`,
      `  - Owner: ${preference.ownerRef}`,
      `  - Recommendation: ${preference.recommendation}`,
    ]),
    "",
    "## Alert Gaps",
    ...(report.alertGaps.length > 0
      ? report.alertGaps.slice(0, 12).flatMap((gap) => [
          `- ${gap.label}: ${gap.status}`,
          `  - Category: ${formatCategory(gap.category)}`,
          `  - Target: ${gap.target}`,
          `  - Detail: ${gap.detail}`,
          `  - Command: ${gap.command}`,
        ])
      : ["No collaboration notification preference gaps are open."]),
    "",
    "## Commands",
    ...report.commands.map((command) => `- ${command}`),
  ].join("\n");
}

function rowToCsv(row: AdminCollaborationNotificationPreferenceRow) {
  return toCsvRow([
    "row",
    row.id,
    row.category,
    row.status,
    "",
    row.label,
    row.target ?? "",
    "",
    "",
    row.count,
    "",
    "",
    "",
    row.latestAt ?? "",
    row.recommendation,
  ]);
}

function preferenceToCsv(
  preference: AdminCollaborationNotificationPreferenceScope,
) {
  return toCsvRow([
    "preference",
    preference.id,
    preference.category,
    preference.status,
    preference.state,
    preference.label,
    preference.target,
    preference.fileName ?? "",
    preference.ownerRef,
    preference.signalCount,
    preference.blockedSignalCount,
    preference.suppressed,
    preference.exportReady,
    preference.latestAt ?? "",
    preference.recommendation,
  ]);
}

function gapToCsv(gap: AdminCollaborationNotificationPreferenceGap) {
  return toCsvRow([
    "gap",
    gap.id,
    gap.category,
    gap.status,
    "",
    gap.label,
    gap.target,
    "",
    "",
    "",
    "",
    "",
    "",
    gap.latestAt ?? "",
    `${gap.detail} ${gap.command}`,
  ]);
}

function toCsvRow(values: Array<boolean | number | string>) {
  return values
    .map((value) => {
      const text = String(value);

      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }

      return text;
    })
    .join(",");
}

function formatCategory(value: string) {
  return value.replace(/-/g, " ");
}
