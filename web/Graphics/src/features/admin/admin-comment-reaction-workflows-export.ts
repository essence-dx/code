import type {
  AdminCommentReactionModerationItem,
  AdminCommentReactionWorkflowComment,
  AdminCommentReactionWorkflowRow,
  AdminCommentReactionWorkflowsReport,
} from "@/features/admin/admin-comment-reaction-workflows-types";

export function getAdminCommentReactionWorkflowsJson(
  report: AdminCommentReactionWorkflowsReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getAdminCommentReactionWorkflowsCsv(
  report: AdminCommentReactionWorkflowsReport,
) {
  const rowHeader: Array<keyof AdminCommentReactionWorkflowRow> = [
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
  const commentHeader: Array<keyof AdminCommentReactionWorkflowComment> = [
    "id",
    "status",
    "fileName",
    "pageName",
    "commentId",
    "resolved",
    "assigneeEmail",
    "reactionCount",
    "acknowledgementCount",
    "reactionNotificationCount",
    "failedNotificationCount",
    "moderationReviewCount",
    "latestAt",
    "recommendation",
  ];
  const moderationHeader: Array<keyof AdminCommentReactionModerationItem> = [
    "id",
    "status",
    "fileName",
    "pageName",
    "commentId",
    "reactionKind",
    "actorName",
    "actorEmail",
    "reason",
    "latestAt",
  ];

  return [
    ["section", ...rowHeader].join(","),
    ...report.rows.map((row) =>
      ["review-row", ...rowHeader.map((key) => row[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
    ["section", ...commentHeader].join(","),
    ...report.comments.map((comment) =>
      ["comment", ...commentHeader.map((key) => comment[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
    ["section", ...moderationHeader].join(","),
    ...report.moderationQueue.map((item) =>
      ["moderation", ...moderationHeader.map((key) => item[key])]
        .map((value) => escapeCsvCell(redactSensitive(String(value ?? ""))))
        .join(","),
    ),
  ].join("\n");
}

export function getAdminCommentReactionWorkflowsMarkdown(
  report: AdminCommentReactionWorkflowsReport,
) {
  return [
    "# Comment Reaction Workflows",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Comments: ${report.commentCount}`,
    `Reactions: ${report.reactionCount}`,
    `Acknowledgements: ${report.acknowledgementCount}`,
    `Unacknowledged open comments: ${report.unacknowledgedOpenCommentCount}`,
    `Notification routes: ${report.reactionNotificationRouteCount}`,
    `Unrouted reaction notifications: ${report.unroutedReactionNotificationCount}`,
    `Moderation review: ${report.moderationReviewCount}`,
    "",
    "## Review Rows",
    "",
    ...report.rows.map((row) =>
      [
        `- [${row.status}] ${row.label}`,
        `  - Category: ${row.category}`,
        `  - Value: ${row.value}`,
        `  - Detail: ${row.detail}`,
        `  - Target: ${row.target ?? "none"}`,
        `  - Recommendation: ${row.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Comments",
    "",
    ...report.comments.map((comment) =>
      [
        `- [${comment.status}] ${comment.fileName} / ${comment.pageName}`,
        `  - Acknowledgement: ${comment.acknowledgementCount}`,
        `  - Reactions: ${comment.reactionCount}`,
        `  - Notifications: ${comment.reactionNotificationCount} total / ${comment.failedNotificationCount} failed`,
        `  - Moderation: ${comment.moderationReviewCount}`,
        `  - Recommendation: ${comment.recommendation}`,
      ].join("\n"),
    ),
    "",
    "## Moderation Queue",
    "",
    ...report.moderationQueue.map((item) =>
      [
        `- [${item.status}] ${item.fileName}`,
        `  - Reaction: ${item.reactionKind}`,
        `  - Actor: ${item.actorName} (${item.actorEmail ?? "unknown"})`,
        `  - Reason: ${item.reason}`,
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
