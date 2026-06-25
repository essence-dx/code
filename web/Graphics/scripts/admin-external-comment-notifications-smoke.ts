import {
  getAdminExternalCommentNotificationWorkflowsMarkdown,
  getAdminExternalCommentNotificationWorkflowsReport,
} from "../src/features/admin/admin-external-comment-notification-workflows";

const report = getAdminExternalCommentNotificationWorkflowsReport({
  generatedAt: "2026-05-18T08:00:00.000Z",
  files: [
    {
      fileId: "file-checkout",
      fileName: "Checkout review",
      ownerEmail: "sam@example.com",
      updatedAt: "2026-05-18T07:50:00.000Z",
      trashedAt: null,
      document: {
        updatedAt: "2026-05-18T07:50:00.000Z",
        commentNotificationPreferences: {
          enabled: true,
          newComments: true,
          replies: true,
          assignments: true,
          mentions: true,
          reactions: true,
          acknowledgements: true,
          mutedEmails: ["quiet@example.com"],
          updatedAt: "2026-05-18T07:40:00.000Z",
        },
        notificationDeliveries: [],
        pages: [
          {
            id: "page-1",
            name: "Checkout",
            background: "#ffffff",
            layers: [],
            comments: [
              {
                id: "comment-1",
                x: 120,
                y: 160,
                text: "Please review @designer@example.com and @quiet@example.com.",
                mentions: ["designer@example.com", "quiet@example.com"],
                assigneeEmail: null,
                resolved: false,
                createdAt: "2026-05-18T07:10:00.000Z",
                updatedAt: "2026-05-18T07:20:00.000Z",
                replies: [
                  {
                    id: "reply-1",
                    text: "Blocked on @blocked@example.com for copy approval.",
                    mentions: ["blocked@example.com"],
                    authorName: "Sam",
                    createdAt: "2026-05-18T07:25:00.000Z",
                    updatedAt: "2026-05-18T07:25:00.000Z",
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
  notificationDeliveries: [
    {
      id: "delivery-1",
      fileId: "file-checkout",
      fileName: "Checkout review",
      ownerEmail: "sam@example.com",
      kind: "mention",
      recipientEmail: "blocked@example.com",
      actorName: "Sam",
      pageName: "Checkout",
      status: "failed",
      reason: "Brevo sender rejected the message.",
      createdAt: "2026-05-18T07:30:00.000Z",
      commentId: "comment-1",
      replyId: "reply-1",
      eventId: "mention:comment-1:reply-1:blocked@example.com",
    },
    {
      id: "delivery-2",
      fileId: "file-checkout",
      fileName: "Checkout review",
      ownerEmail: "sam@example.com",
      kind: "mention",
      recipientEmail: "blocked@example.com",
      actorName: "Sam",
      pageName: "Checkout",
      status: "failed",
      reason: "SMTP retry window exhausted.",
      createdAt: "2026-05-18T07:35:00.000Z",
      commentId: "comment-1",
      replyId: "reply-1",
      eventId: "mention:comment-1:reply-1:blocked@example.com",
    },
    {
      id: "delivery-3",
      fileId: "file-checkout",
      fileName: "Checkout review",
      ownerEmail: "sam@example.com",
      kind: "mention",
      recipientEmail: "designer@example.com",
      actorName: "Sam",
      pageName: "Checkout",
      status: "sent",
      reason: null,
      createdAt: "2026-05-18T07:21:00.000Z",
      commentId: "comment-1",
      eventId: "mention:comment-1:designer@example.com",
    },
  ],
  notificationDigestSubscriptions: {
    generatedAt: "2026-05-18T07:55:00.000Z",
    status: "ready",
    score: 92,
    settings: {
      recipients: ["ops@example.com"],
      frequency: "daily",
      channel: "email",
      minimumSeverity: "review",
      includeResolved: false,
      topics: {
        "failed-auth": false,
        "email-delivery": true,
        "deploy-smoke": false,
        rollback: false,
        "risky-shares": false,
      },
      updatedAt: "2026-05-18T07:45:00.000Z",
      updatedBy: "admin@example.com",
    },
    subscribedTopicCount: 1,
    recipientCount: 1,
    activeSignalCount: 1,
    blockedSignalCount: 0,
    unroutedActiveSignalCount: 0,
    readyCount: 2,
    reviewCount: 0,
    blockedCount: 0,
    rows: [],
  },
});

assert(report.status === "blocked", "Failed mention delivery should block the workflow.");
assert(report.retryQueueCount === 1, "Latest failed delivery should create one retry queue item.");
assert(report.retryQueue[0]?.attemptCount === 2, "Retry item should count prior failed attempts.");
assert(report.digestPreviewCount === 1, "Subscribed digest recipient should receive a preview.");
assert(report.digestPreviews[0]?.lines.some((line) => line.includes("blocked@example.com")), "Digest preview should include failed recipient context.");
assert(report.mentionRouteCount === 3, "All mention recipients should be routed or suppressed.");
assert(report.unroutedMentionCount === 1, "Failed mention should remain an unrouted mention signal.");
assert(report.suppressedRecipientCount === 1, "Muted mention recipient should appear in suppression controls.");
assert(
  report.commands.some((command) =>
    command.includes("admin:external-comment-notifications-smoke"),
  ),
  "Targeted smoke command should be listed.",
);

const markdown = getAdminExternalCommentNotificationWorkflowsMarkdown(report);

assert(
  markdown.includes("External Comment Notification Workflows"),
  "Markdown export should include a clear title.",
);
assert(markdown.includes("Checkout review"), "Markdown should include file evidence.");
assert(!markdown.includes("sam@example.com"), "Markdown should redact owner emails.");

console.log(
  `Admin external comment notification workflow smoke passed: ${report.retryQueueCount} retries, ${report.digestPreviewCount} previews.`,
);

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}
