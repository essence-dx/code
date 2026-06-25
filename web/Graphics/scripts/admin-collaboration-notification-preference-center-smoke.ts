import {
  getAdminCollaborationNotificationPreferenceCenterMarkdown,
  getAdminCollaborationNotificationPreferenceCenterReport,
} from "../src/features/admin/admin-collaboration-notification-preference-center";

const report = getAdminCollaborationNotificationPreferenceCenterReport({
  generatedAt: "2026-05-18T14:00:00.000Z",
  files: [
    {
      fileId: "file-checkout",
      fileName: "Checkout review",
      ownerEmail: "sam@example.com",
      updatedAt: "2026-05-18T13:40:00.000Z",
      trashedAt: null,
      document: {
        updatedAt: "2026-05-18T13:40:00.000Z",
        commentNotificationPreferences: {
          enabled: true,
          newComments: true,
          replies: true,
          assignments: true,
          mentions: false,
          reactions: true,
          acknowledgements: false,
          mutedEmails: ["blocked@example.com"],
          updatedAt: "2026-05-18T13:20:00.000Z",
        },
        pages: [
          {
            id: "page-checkout",
            name: "Checkout",
            comments: [
              {
                id: "comment-checkout",
                x: 24,
                y: 32,
                text: "Please confirm @blocked@example.com before release.",
                mentions: ["blocked@example.com"],
                reactions: [
                  {
                    id: "reaction-checkout",
                    kind: "eyes",
                    actorName: "External reviewer",
                    actorEmail: "vendor@outside.test",
                    createdAt: "2026-05-18T13:25:00.000Z",
                  },
                ],
                resolved: false,
                createdAt: "2026-05-18T13:00:00.000Z",
                updatedAt: "2026-05-18T13:30:00.000Z",
              },
            ],
          },
        ],
      },
    },
    {
      fileId: "file-mobile",
      fileName: "Mobile settings",
      ownerEmail: "lee@example.com",
      updatedAt: "2026-05-18T13:45:00.000Z",
      trashedAt: null,
      document: {
        updatedAt: "2026-05-18T13:45:00.000Z",
        commentNotificationPreferences: {
          enabled: true,
          newComments: true,
          replies: true,
          assignments: true,
          mentions: true,
          reactions: true,
          acknowledgements: true,
          mutedEmails: [],
          updatedAt: "2026-05-18T13:45:00.000Z",
        },
        pages: [
          {
            id: "page-mobile",
            name: "Mobile",
            comments: [],
          },
        ],
      },
    },
  ],
  commentReactionWorkflows: {
    generatedAt: "2026-05-18T13:50:00.000Z",
    status: "blocked",
    score: 70,
    reactionCount: 2,
    acknowledgementCount: 1,
    unacknowledgedOpenCommentCount: 1,
    failedReactionNotificationCount: 1,
    comments: [
      {
        id: "comment-reaction-workflow-file-checkout-comment-checkout",
        status: "blocked",
        fileId: "file-checkout",
        fileName: "Checkout review",
        ownerEmail: "sam@example.com",
        pageName: "Checkout",
        commentId: "comment-checkout",
        textPreview: "Please confirm release.",
        resolved: false,
        assigneeEmail: "blocked@example.com",
        reactionCount: 1,
        acknowledgementCount: 0,
        reactionNotificationCount: 1,
        failedNotificationCount: 1,
        moderationReviewCount: 1,
        latestAt: "2026-05-18T13:30:00.000Z",
        recommendation: "Retry failed reaction route.",
      },
      {
        id: "comment-reaction-workflow-file-mobile-comment-ready",
        status: "ready",
        fileId: "file-mobile",
        fileName: "Mobile settings",
        ownerEmail: "lee@example.com",
        pageName: "Mobile",
        commentId: "comment-ready",
        textPreview: "Looks good.",
        resolved: true,
        assigneeEmail: null,
        reactionCount: 1,
        acknowledgementCount: 1,
        reactionNotificationCount: 1,
        failedNotificationCount: 0,
        moderationReviewCount: 0,
        latestAt: "2026-05-18T13:44:00.000Z",
        recommendation: "Ready.",
      },
    ],
    commands: ["Export reaction workflows."],
  },
  cursorChatRoomMessages: {
    generatedAt: "2026-05-18T13:51:00.000Z",
    status: "blocked",
    score: 74,
    roomCount: 2,
    messageCount: 5,
    mentionCount: 2,
    expiredMessageCount: 1,
    rooms: [
      {
        id: "cursor-chat-room-file-checkout",
        status: "blocked",
        fileId: "file-checkout",
        fileName: "Checkout review",
        ownerRef: "participant:sam-secret-token",
        roomCaptured: true,
        roomUpdatedAt: "2026-05-18T13:34:00.000Z",
        roomAgeMinutes: 26,
        messageCount: 4,
        retainedMessageCount: 3,
        expiredMessageCount: 1,
        mentionCount: 2,
        participantCount: 4,
        externalParticipantCount: 1,
        presenceEventCount: 3,
        privacyReplayEvidenceCount: 3,
        replayWindowStatus: "review",
        replayWindowEventCount: 4,
        replayWindowPurgeCandidate: true,
        recoveryPacketStatus: "blocked",
        recoveryPacketExportReady: false,
        recoveryPacketEvidenceCount: 3,
        exportReady: false,
        latestAt: "2026-05-18T13:34:00.000Z",
        recommendation: "Archive expired chat replay.",
      },
      {
        id: "cursor-chat-room-file-mobile",
        status: "ready",
        fileId: "file-mobile",
        fileName: "Mobile settings",
        ownerRef: "participant:lee",
        roomCaptured: true,
        roomUpdatedAt: "2026-05-18T13:45:00.000Z",
        roomAgeMinutes: 15,
        messageCount: 1,
        retainedMessageCount: 1,
        expiredMessageCount: 0,
        mentionCount: 0,
        participantCount: 1,
        externalParticipantCount: 0,
        presenceEventCount: 2,
        privacyReplayEvidenceCount: 1,
        replayWindowStatus: "ready",
        replayWindowEventCount: 2,
        replayWindowPurgeCandidate: false,
        recoveryPacketStatus: "ready",
        recoveryPacketExportReady: true,
        recoveryPacketEvidenceCount: 2,
        exportReady: true,
        latestAt: "2026-05-18T13:45:00.000Z",
        recommendation: "Ready.",
      },
    ],
    commands: ["Export cursor chat rooms."],
  },
  liveReviewSessions: {
    generatedAt: "2026-05-18T13:52:00.000Z",
    status: "blocked",
    score: 75,
    sessionCount: 2,
    actionItemCount: 3,
    blockedActionItemCount: 1,
    sessions: [
      {
        id: "live-review-session-file-checkout-branch-checkout",
        status: "blocked",
        fileId: "file-checkout",
        fileName: "Checkout review",
        branchName: "checkout-release",
        branchId: "branch-checkout",
        ownerRef: "participant:sam-secret-token",
        reviewerCount: 2,
        openCommentCount: 1,
        acknowledgementCount: 0,
        approvalScopeCount: 1,
        approvedScopeCount: 0,
        publicShareCount: 1,
        releaseSafeShareCount: 0,
        agendaItemCount: 4,
        minutesItemCount: 1,
        actionItemCount: 2,
        blockerCount: 3,
        latestAt: "2026-05-18T13:36:00.000Z",
        recommendation: "Resolve blocked review action items.",
      },
      {
        id: "live-review-session-file-mobile-branch-mobile",
        status: "ready",
        fileId: "file-mobile",
        fileName: "Mobile settings",
        branchName: "mobile-polish",
        branchId: "branch-mobile",
        ownerRef: "participant:lee",
        reviewerCount: 1,
        openCommentCount: 0,
        acknowledgementCount: 1,
        approvalScopeCount: 1,
        approvedScopeCount: 1,
        publicShareCount: 1,
        releaseSafeShareCount: 1,
        agendaItemCount: 2,
        minutesItemCount: 2,
        actionItemCount: 0,
        blockerCount: 0,
        latestAt: "2026-05-18T13:45:00.000Z",
        recommendation: "Ready.",
      },
    ],
    actionItems: [
      {
        id: "action-checkout-notify",
        sessionId: "live-review-session-file-checkout-branch-checkout",
        source: "comment",
        status: "blocked",
        label: "Notify release reviewer",
        detail: "Mention and review-session alert must route before handoff.",
        ownerRef: "participant:sam-secret-token",
        dueAt: "2026-05-18",
        linkedId: "comment-checkout",
      },
    ],
    commands: ["Export live review sessions."],
  },
  externalCommentNotificationWorkflows: {
    generatedAt: "2026-05-18T13:53:00.000Z",
    status: "blocked",
    score: 68,
    mentionRouteCount: 2,
    unroutedMentionCount: 1,
    suppressedRecipientCount: 1,
    disabledFileCount: 1,
    mentionRoutes: [
      {
        id: "mention-file-checkout-comment-checkout",
        status: "blocked",
        fileId: "file-checkout",
        fileName: "Checkout review",
        ownerEmail: "sam@example.com",
        pageName: "Checkout",
        commentId: "comment-checkout",
        replyId: null,
        mentionedEmail: "blocked@example.com",
        deliveryStatus: "failed",
        deliveryId: "delivery-mention-checkout",
        suppressed: false,
        suppressionReason: null,
        latestAt: "2026-05-18T13:28:00.000Z",
        recommendation: "Retry failed mention delivery.",
      },
    ],
    suppressionControls: [
      {
        id: "suppression-file-checkout-notifications",
        status: "review",
        fileId: "file-checkout",
        fileName: "Checkout review",
        ownerEmail: "sam@example.com",
        mutedEmail: "blocked@example.com",
        enabled: true,
        mentionsEnabled: false,
        reason: "Mention notifications are disabled for this file.",
        command: "Review notification preferences.",
        latestAt: "2026-05-18T13:20:00.000Z",
      },
    ],
    digestPreviews: [
      {
        id: "digest-preview-ops",
        status: "blocked",
        recipientEmail: "ops@example.com",
        subject: "Open notification signals",
        signalCount: 4,
        blockedSignalCount: 2,
        reviewSignalCount: 1,
        lines: ["Checkout review: retry mention route."],
      },
    ],
    commands: ["Export external comment notifications."],
  },
  notificationDigestSubscriptions: {
    generatedAt: "2026-05-18T13:54:00.000Z",
    status: "review",
    score: 82,
    settings: {
      recipients: ["ops@example.com"],
      frequency: "daily",
      channel: "email",
      minimumSeverity: "review",
      includeResolved: false,
      topics: {
        "failed-auth": false,
        "email-delivery": true,
        "deploy-smoke": true,
        rollback: true,
        "risky-shares": false,
      },
      updatedAt: "2026-05-18T13:10:00.000Z",
      updatedBy: "admin@example.com",
    },
    subscribedTopicCount: 3,
    recipientCount: 1,
    activeSignalCount: 4,
    unroutedActiveSignalCount: 1,
    rows: [],
  },
  collaborationRecoveryPackets: {
    generatedAt: "2026-05-18T13:55:00.000Z",
    status: "blocked",
    score: 64,
    packetCount: 2,
    blockedPacketCount: 1,
    reviewPacketCount: 0,
    exportReadyPacketCount: 1,
    missingOwnershipCount: 1,
    conflictSummaryCount: 2,
    packets: [
      {
        id: "collaboration-recovery-packet-file-checkout",
        status: "blocked",
        fileId: "file-checkout",
        fileName: "Checkout review",
        ownerEmail: "sam@example.com",
        ownerHandoffStatus: "missing",
        ownerHandoffLabel: "No recovery owner",
        activityReplayEvidenceCount: 4,
        replayWindowStatus: "review",
        replayWindowLatestAt: "2026-05-18T13:31:00.000Z",
        roomCaptured: true,
        evidenceArchived: false,
        exportReady: false,
        conflictSummaryCount: 2,
        operationConflictCount: 1,
        targetConflictCount: 0,
        eventDriftCount: 0,
        offlineReplayQueueCount: 0,
        saveConflictCount: 1,
        unresolvedMentionCount: 1,
        escalationCount: 0,
        recoverySteps: ["Assign recovery owner."],
        latestAt: "2026-05-18T13:31:00.000Z",
        recommendation: "Assign a recovery owner before export.",
      },
    ],
    commands: ["Export recovery packets."],
  },
});

assert(report.status === "blocked", "Blocked preference routes should block the center.");
assert(report.categoryCount === 6, "The center should cover six collaboration notification categories.");
assert(report.preferenceScopeCount >= 8, "Preference scopes should be created across files and collaboration reports.");
assert(report.blockedPreferenceCount >= 3, "Blocked signals should surface as blocked preferences.");
assert(report.suppressedPreferenceCount >= 1, "Muted or disabled notification preferences should be counted.");
assert(report.digestRecipientCount === 1, "Digest recipients should be represented.");
assert(report.alertGapCount >= 5, "Alert gaps should combine reactions, chat, reviews, mentions, digests, and recovery packets.");
assert(report.exportReadyPreferenceCount > 0, "At least one ready preference scope should be export-ready.");
assert(
  report.rows.some((row) => row.category === "reactions" && row.status === "blocked"),
  "Reaction preference row should reflect failed reaction routing.",
);
assert(
  report.rows.some((row) => row.category === "cursor-chat" && row.status === "blocked"),
  "Cursor chat alert row should reflect blocked chat rooms.",
);
assert(
  report.rows.some((row) => row.category === "review-sessions" && row.status === "blocked"),
  "Review session alert row should reflect blocked action items.",
);
assert(
  report.rows.some((row) => row.category === "mentions" && row.status === "blocked"),
  "Mention row should reflect unrouted mention delivery.",
);
assert(
  report.rows.some((row) => row.category === "digests" && row.status === "review"),
  "Digest row should reflect digest preference review state.",
);
assert(
  report.rows.some((row) => row.category === "recovery-packets" && row.status === "blocked"),
  "Recovery packet alert row should reflect blocked recovery packets.",
);
assert(
  report.commands.some((command) =>
    command.includes("admin:collaboration-notification-preference-center-smoke"),
  ),
  "Targeted smoke command should be listed.",
);

const markdown = getAdminCollaborationNotificationPreferenceCenterMarkdown(report);

assert(
  markdown.includes("Collaboration Notification Preference Center"),
  "Markdown export should include a clear title.",
);
assert(markdown.includes("reactions"), "Markdown should include reaction preferences.");
assert(markdown.includes("cursor chat"), "Markdown should include cursor chat alerts.");
assert(markdown.includes("review sessions"), "Markdown should include review session alerts.");
assert(markdown.includes("recovery packet"), "Markdown should include recovery packet alerts.");
assert(!markdown.includes("sam@example.com"), "Markdown should redact owner emails.");
assert(!markdown.includes("secret-token"), "Markdown should redact token-like owner refs.");

console.log(
  `Admin collaboration notification preference center smoke passed: ${report.preferenceScopeCount} scopes, ${report.alertGapCount} gaps.`,
);

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}
