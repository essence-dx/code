import {
  getAdminReviewRoomAudioReadinessMarkdown,
  getAdminReviewRoomAudioReadinessReport,
} from "../src/features/admin/admin-review-room-audio-readiness";

const report = getAdminReviewRoomAudioReadinessReport({
  generatedAt: "2026-05-18T13:00:00.000Z",
  liveReviewSessions: {
    generatedAt: "2026-05-18T12:50:00.000Z",
    status: "blocked",
    score: 72,
    sessionCount: 2,
    actionItemCount: 4,
    blockedActionItemCount: 2,
    missingOwnerCount: 1,
    commands: ["Export live review sessions."],
    minutes: [
      {
        id: "minute-mobile-consent",
        sessionId: "live-review-session-file-mobile-branch-mobile",
        category: "branch-evidence",
        status: "ready",
        label: "Audio consent captured",
        detail: "Participants confirmed audio consent in review minutes.",
        ownerRef: "participant:lee",
        createdAt: "2026-05-18T12:40:00.000Z",
        linkedId: "branch-mobile",
      },
      {
        id: "minute-mobile-fallback",
        sessionId: "live-review-session-file-mobile-branch-mobile",
        category: "comment",
        status: "ready",
        label: "Fallback handoff note",
        detail: "Use cursor chat notes if audio fails.",
        ownerRef: "participant:lee",
        createdAt: "2026-05-18T12:42:00.000Z",
        linkedId: "comment-mobile",
      },
    ],
    actionItems: [
      {
        id: "action-checkout-consent",
        sessionId: "live-review-session-file-checkout-branch-checkout",
        source: "approval",
        status: "blocked",
        label: "Capture audio consent",
        detail: "External participant must consent before review-room audio.",
        ownerRef: "unassigned",
        dueAt: "2026-05-18",
        linkedId: "growth/checkout",
      },
      {
        id: "action-checkout-fallback",
        sessionId: "live-review-session-file-checkout-branch-checkout",
        source: "public-share",
        status: "review",
        label: "Write fallback handoff note",
        detail: "Audio fallback note should cover unsafe public share handoff.",
        ownerRef: "participant:lead",
        dueAt: null,
        linkedId: "share-checkout",
      },
    ],
    sessions: [
      {
        id: "live-review-session-file-checkout-branch-checkout",
        status: "blocked",
        fileId: "file-checkout",
        fileName: "Checkout live review",
        branchName: "checkout-release-candidate",
        branchId: "branch-checkout",
        ownerRef: "participant:sam-secret-token",
        reviewerCount: 2,
        openCommentCount: 2,
        acknowledgementCount: 1,
        approvalScopeCount: 1,
        approvedScopeCount: 0,
        publicShareCount: 1,
        releaseSafeShareCount: 0,
        agendaItemCount: 5,
        minutesItemCount: 1,
        actionItemCount: 3,
        blockerCount: 4,
        latestAt: "2026-05-18T12:35:00.000Z",
        recommendation: "Resolve blocked agenda items.",
      },
      {
        id: "live-review-session-file-mobile-branch-mobile",
        status: "ready",
        fileId: "file-mobile",
        fileName: "Mobile account settings",
        branchName: "mobile-settings-polish",
        branchId: "branch-mobile",
        ownerRef: "participant:lee",
        reviewerCount: 1,
        openCommentCount: 0,
        acknowledgementCount: 2,
        approvalScopeCount: 1,
        approvedScopeCount: 1,
        publicShareCount: 1,
        releaseSafeShareCount: 1,
        agendaItemCount: 3,
        minutesItemCount: 4,
        actionItemCount: 0,
        blockerCount: 0,
        latestAt: "2026-05-18T12:45:00.000Z",
        recommendation: "Ready.",
      },
    ],
  },
  cursorChatRoomMessages: {
    generatedAt: "2026-05-18T12:51:00.000Z",
    status: "blocked",
    score: 76,
    messageCount: 4,
    expiredMessageCount: 1,
    participantCount: 5,
    externalParticipantCount: 1,
    presenceEventCount: 5,
    commands: ["Export cursor chat room messages."],
    rooms: [
      {
        id: "cursor-chat-room-file-checkout",
        status: "blocked",
        fileId: "file-checkout",
        fileName: "Checkout live review",
        ownerRef: "participant:sam-secret-token",
        roomCaptured: true,
        roomUpdatedAt: "2026-05-18T12:35:00.000Z",
        roomAgeMinutes: 25,
        messageCount: 3,
        retainedMessageCount: 2,
        expiredMessageCount: 1,
        mentionCount: 1,
        participantCount: 4,
        externalParticipantCount: 1,
        presenceEventCount: 3,
        privacyReplayEvidenceCount: 3,
        replayWindowStatus: "review",
        replayWindowEventCount: 4,
        replayWindowPurgeCandidate: true,
        recoveryPacketStatus: "blocked",
        recoveryPacketExportReady: false,
        recoveryPacketEvidenceCount: 4,
        exportReady: false,
        latestAt: "2026-05-18T12:35:00.000Z",
        recommendation: "Archive expired chat replay before export.",
      },
      {
        id: "cursor-chat-room-file-mobile",
        status: "ready",
        fileId: "file-mobile",
        fileName: "Mobile account settings",
        ownerRef: "participant:lee",
        roomCaptured: true,
        roomUpdatedAt: "2026-05-18T12:45:00.000Z",
        roomAgeMinutes: 10,
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
        latestAt: "2026-05-18T12:45:00.000Z",
        recommendation: "Ready.",
      },
    ],
  },
});

assert(report.status === "blocked", "Missing consent and expired fallback evidence should block audio readiness.");
assert(report.roomCount === 2, "Every live review session should get an audio readiness room.");
assert(report.consentCapturedCount === 1, "Only the mobile room should have captured consent.");
assert(report.missingConsentCount === 1, "Checkout room should need consent capture.");
assert(report.participantCheckCount === 2, "Both rooms should receive participant checks.");
assert(report.failedParticipantCheckCount >= 1, "External or stale participants should fail checks.");
assert(report.fallbackHandoffNoteCount >= 2, "Fallback handoff notes should be generated from minutes and blockers.");
assert(report.adminSafeEvidenceCount >= 2, "Every room should get admin-safe evidence.");
assert(report.exportReadyRoomCount === 1, "Only clean audio rooms should be export-ready.");
assert(
  report.rooms.some(
    (room) =>
      room.fileId === "file-checkout" &&
      room.consentState === "missing" &&
      room.externalParticipantCount === 1 &&
      room.fallbackHandoffNoteCount >= 1,
  ),
  "Checkout audio room should surface consent, participant, and fallback blockers.",
);
assert(
  report.evidence.every(
    (item) =>
      item.privacy === "redacted" &&
      !item.detail.includes("sam@example.com") &&
      !item.detail.includes("secret-token"),
  ),
  "Admin-safe audio evidence should redact direct emails and tokens.",
);
assert(
  report.rows.some((row) => row.category === "consent"),
  "Consent row should be present.",
);
assert(
  report.rows.some((row) => row.category === "fallback-handoff"),
  "Fallback handoff row should be present.",
);
assert(
  report.commands.some((command) =>
    command.includes("admin:review-room-audio-readiness-smoke"),
  ),
  "Targeted smoke command should be listed.",
);

const markdown = getAdminReviewRoomAudioReadinessMarkdown(report);

assert(
  markdown.includes("Review Room Audio Readiness"),
  "Markdown export should include a clear title.",
);
assert(markdown.includes("consent"), "Markdown should include consent evidence.");
assert(markdown.includes("participant checks"), "Markdown should include participant checks.");
assert(markdown.includes("fallback handoff"), "Markdown should include fallback handoff notes.");
assert(!markdown.includes("sam@example.com"), "Markdown export should redact owner emails.");
assert(!markdown.includes("secret-token"), "Markdown export should redact token-like values.");

console.log(
  `Admin review-room audio readiness smoke passed: ${report.roomCount} rooms, ${report.missingConsentCount} missing consent.`,
);

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}
