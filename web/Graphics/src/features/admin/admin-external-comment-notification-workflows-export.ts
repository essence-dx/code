import type {
  AdminExternalCommentNotificationWorkflowsReport,
  AdminExternalCommentNotificationWorkflowRow,
} from "@/features/admin/admin-external-comment-notification-workflows-types";

export function getAdminExternalCommentNotificationWorkflowsJson(
  report: AdminExternalCommentNotificationWorkflowsReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminExternalCommentNotificationWorkflowsCsv(
  report: AdminExternalCommentNotificationWorkflowsReport,
) {
  const rowHeader: Array<keyof AdminExternalCommentNotificationWorkflowRow> = [
    "id",
    "category",
    "status",
    "label",
    "value",
    "detail",
    "recommendation",
    "count",
    "target",
    "latestAt",
  ];

  return [
    ["section", ...rowHeader].join(","),
    ...report.rows.map((row) =>
      ["review-row", ...rowHeader.map((key) => row[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
    [
      "retry",
      "status",
      "file",
      "recipient",
      "kind",
      "attempts",
      "last_reason",
      "last_attempt_at",
    ].join(","),
    ...report.retryQueue.map((item) =>
      [
        "retry",
        item.status,
        item.fileName,
        item.recipientEmail,
        item.kind,
        item.attemptCount,
        item.lastReason,
        item.lastAttemptAt,
      ]
        .map((value) => escapeCsvCell(redactSensitive(String(value))))
        .join(","),
    ),
    [
      "mention",
      "status",
      "file",
      "recipient",
      "delivery_status",
      "suppressed",
      "latest_at",
    ].join(","),
    ...report.mentionRoutes.map((route) =>
      [
        "mention",
        route.status,
        route.fileName,
        route.mentionedEmail,
        route.deliveryStatus,
        route.suppressed,
        route.latestAt ?? "",
      ]
        .map((value) => escapeCsvCell(redactSensitive(String(value))))
        .join(","),
    ),
  ].join("\n");
}

export function getAdminExternalCommentNotificationWorkflowsMarkdown(
  report: AdminExternalCommentNotificationWorkflowsReport,
) {
  return [
    "# External Comment Notification Workflows",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Files: ${report.fileCount}`,
    `Deliveries: ${report.deliveryCount}`,
    `Failed deliveries: ${report.failedDeliveryCount}`,
    `Retry queue: ${report.retryQueueCount}`,
    `Digest previews: ${report.digestPreviewCount}`,
    `Mention routes: ${report.mentionRouteCount}`,
    `Unrouted mentions: ${report.unroutedMentionCount}`,
    `Suppressed recipients: ${report.suppressedRecipientCount}`,
    "",
    "## Review Rows",
    "",
    ...report.rows.map((row) =>
      [
        `- [${row.status}] ${row.label}`,
        `  - Category: ${row.category}`,
        `  - Value: ${row.value}`,
        `  - Detail: ${row.detail}`,
        `  - Recommendation: ${row.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Retry Queue",
    "",
    ...report.retryQueue.map((item) =>
      [
        `- [${item.status}] ${item.fileName}`,
        `  - Recipient: ${item.recipientEmail}`,
        `  - Kind: ${item.kind}`,
        `  - Attempts: ${item.attemptCount}`,
        `  - Reason: ${item.lastReason}`,
      ].join("\n"),
    ),
    "",
    "## Digest Previews",
    "",
    ...report.digestPreviews.map((preview) =>
      [
        `- [${preview.status}] ${preview.subject}`,
        `  - Recipient: ${preview.recipientEmail}`,
        `  - Signals: ${preview.signalCount}`,
        ...preview.lines.map((line) => `  - ${line}`),
      ].join("\n"),
    ),
    "",
    "## Suppression Controls",
    "",
    ...report.suppressionControls.map((control) =>
      [
        `- [${control.status}] ${control.fileName}`,
        `  - Muted: ${control.mutedEmail ?? "file-level"}`,
        `  - Enabled: ${control.enabled ? "yes" : "no"}`,
        `  - Mentions: ${control.mentionsEnabled ? "yes" : "no"}`,
        `  - Reason: ${control.reason}`,
      ].join("\n"),
    ),
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- \`${command}\``),
  ]
    .map(redactSensitive)
    .join("\n");
}

function redactSensitive(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/\b[A-Za-z0-9_-]*(?:secret|token)[A-Za-z0-9_-]*\b/gi, "[redacted-token]")
    .replace(/\/share\/[A-Za-z0-9_-]+/g, "/share/[redacted-token]");
}

function escapeCsvCell(value: string) {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }

  return `"${value.replaceAll('"', '""')}"`;
}
