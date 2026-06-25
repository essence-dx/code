import {
  getAdminCommentReactionWorkflowsMarkdown,
  getAdminCommentReactionWorkflowsReport,
} from "../src/features/admin/admin-comment-reaction-workflows";
import { getCommentNotificationEvents } from "../src/features/editor/comment-notifications";
import type { DesignDocument } from "../src/features/editor/types";

const previousDocument: DesignDocument = {
  version: 1,
  activePageId: "page-1",
  pages: [
    {
      id: "page-1",
      name: "Checkout review",
      background: "#ffffff",
      layers: [],
      comments: [
        {
          id: "comment-1",
          x: 120,
          y: 80,
          text: "Please confirm this checkout edge case.",
          mentions: ["reviewer@example.com"],
          assigneeName: "Reviewer",
          assigneeEmail: "reviewer@example.com",
          dueDate: "2026-05-20",
          resolved: false,
          createdAt: "2026-05-18T08:00:00.000Z",
          updatedAt: "2026-05-18T08:00:00.000Z",
          reactions: [
            {
              id: "reaction-old",
              kind: "eyes",
              actorName: "Reviewer",
              actorEmail: "reviewer@example.com",
              createdAt: "2026-05-18T08:10:00.000Z",
            },
          ],
        },
      ],
    },
  ],
  variables: {},
  components: {},
  commentNotificationPreferences: {
    enabled: true,
    newComments: true,
    replies: true,
    assignments: true,
    mentions: true,
    reactions: true,
    acknowledgements: true,
    mutedEmails: [],
    updatedAt: "2026-05-18T08:00:00.000Z",
  },
  updatedAt: "2026-05-18T08:00:00.000Z",
};

const nextDocument: DesignDocument = {
  ...previousDocument,
  pages: [
    {
      ...previousDocument.pages[0],
      comments: [
        {
          ...previousDocument.pages[0].comments![0],
          updatedAt: "2026-05-18T08:30:00.000Z",
          reactions: [
            ...previousDocument.pages[0].comments![0].reactions!,
            {
              id: "reaction-heart",
              kind: "heart",
              actorName: "Design Lead",
              actorEmail: "lead@example.com",
              createdAt: "2026-05-18T08:25:00.000Z",
            },
            {
              id: "reaction-check",
              kind: "check",
              actorName: "Reviewer",
              actorEmail: "reviewer@example.com",
              createdAt: "2026-05-18T08:30:00.000Z",
            },
          ],
        },
        {
          id: "comment-2",
          x: 240,
          y: 160,
          text: "External vendor should not approve this yet.",
          mentions: ["vendor@external.dev"],
          assigneeName: "Vendor",
          assigneeEmail: "vendor@external.dev",
          dueDate: "2026-05-18",
          resolved: false,
          createdAt: "2026-05-18T08:05:00.000Z",
          updatedAt: "2026-05-18T08:40:00.000Z",
          reactions: [
            {
              id: "reaction-vendor-check",
              kind: "check",
              actorName: "Vendor",
              actorEmail: "vendor@external.dev",
              createdAt: "2026-05-18T08:40:00.000Z",
            },
          ],
        },
      ],
    },
  ],
  updatedAt: "2026-05-18T08:40:00.000Z",
};

const notificationEvents = getCommentNotificationEvents({
  previousDocument,
  nextDocument,
  actorName: "Design Lead",
  actorEmail: "lead@example.com",
  fileName: "Checkout launch",
  fileUrl: "https://example.test/files/file-1",
});

assert(
  notificationEvents.some((event) => event.kind === "reaction"),
  "New non-check reactions should route notification events.",
);
assert(
  notificationEvents.some((event) => event.kind === "acknowledgement"),
  "New check reactions should route acknowledgement notification events.",
);

const report = getAdminCommentReactionWorkflowsReport({
  generatedAt: "2026-05-18T09:00:00.000Z",
  files: [
    {
      fileId: "file-1",
      fileName: "Checkout launch",
      ownerEmail: "sam@example.com",
      document: nextDocument,
      updatedAt: "2026-05-18T08:45:00.000Z",
      trashedAt: null,
    },
  ],
  notificationDeliveries: [
    {
      id: "delivery-reaction",
      eventId: "reaction:comment-1:reaction-heart:reviewer@example.com",
      kind: "reaction",
      recipientEmail: "reviewer@example.com",
      actorName: "Design Lead",
      fileName: "Checkout launch",
      pageName: "Checkout review",
      commentId: "comment-1",
      status: "sent",
      createdAt: "2026-05-18T08:26:00.000Z",
      deliveredAt: "2026-05-18T08:26:05.000Z",
    },
    {
      id: "delivery-ack",
      eventId: "acknowledgement:comment-1:reaction-check:lead@example.com",
      kind: "acknowledgement",
      recipientEmail: "lead@example.com",
      actorName: "Reviewer",
      fileName: "Checkout launch",
      pageName: "Checkout review",
      commentId: "comment-1",
      status: "sent",
      createdAt: "2026-05-18T08:31:00.000Z",
      deliveredAt: "2026-05-18T08:31:05.000Z",
    },
    {
      id: "delivery-vendor-ack",
      eventId: "acknowledgement:comment-2:reaction-vendor-check:sam@example.com",
      kind: "acknowledgement",
      recipientEmail: "sam@example.com",
      actorName: "Vendor",
      fileName: "Checkout launch",
      pageName: "Checkout review",
      commentId: "comment-2",
      status: "failed",
      reason: "External acknowledgement requires moderation review.",
      createdAt: "2026-05-18T08:41:00.000Z",
    },
  ],
});

assert(report.status === "blocked", "Failed acknowledgement and external approval should block the workflow.");
assert(report.commentCount === 2, "All comments should be inspected.");
assert(report.reactionCount === 4, "Persistent reaction state should be counted.");
assert(report.acknowledgementCount === 2, "Check reactions should count as acknowledgements.");
assert(report.unacknowledgedOpenCommentCount === 0, "Every open comment has an acknowledgement reaction.");
assert(report.reactionNotificationRouteCount >= 3, "Reaction notification routes should be tracked.");
assert(report.unroutedReactionNotificationCount >= 1, "Failed or missing reaction routes should be visible.");
assert(report.moderationReviewCount >= 1, "External acknowledgement should create moderation review.");
assert(
  report.rows.some((row) => row.category === "notification-routing"),
  "Notification routing row should be present.",
);
assert(
  report.commands.some((command) =>
    command.includes("admin:comment-reaction-workflows-smoke"),
  ),
  "Targeted smoke command should be listed.",
);

const markdown = getAdminCommentReactionWorkflowsMarkdown(report);

assert(
  markdown.includes("Comment Reaction Workflows"),
  "Markdown export should include a clear title.",
);
assert(markdown.includes("acknowledgement"), "Markdown should include acknowledgement workflow evidence.");
assert(markdown.includes("moderation"), "Markdown should include moderation review evidence.");
assert(!markdown.includes("sam@example.com"), "Markdown export should redact owner emails.");

console.log(
  `Admin comment reaction workflows smoke passed: ${report.reactionCount} reactions, ${report.moderationReviewCount} moderation rows.`,
);

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}
