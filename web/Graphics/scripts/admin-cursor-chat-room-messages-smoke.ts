import {
  getAdminCursorChatRoomMessagesMarkdown,
  getAdminCursorChatRoomMessagesReport,
} from "../src/features/admin/admin-cursor-chat-room-messages";
import type { DesignDocument } from "../src/features/editor/types";

const now = Date.parse("2026-05-18T11:00:00.000Z");
const staleChatAt = Date.parse("2026-05-08T10:00:00.000Z");
const recentChatAt = Date.parse("2026-05-18T10:30:00.000Z");

const checkoutDocument: DesignDocument = {
  version: 1,
  activePageId: "page-1",
  pages: [
    {
      id: "page-1",
      name: "Checkout review",
      background: "#ffffff",
      layers: [],
      comments: [],
    },
  ],
  variables: {},
  components: {},
  collaborationRoom: {
    version: 1,
    updatedAt: "2026-05-18T10:40:00.000Z",
    chatMessages: [
      {
        id: "chat-recent",
        peerId: "peer-lead",
        name: "Design Lead",
        email: "lead@example.com",
        color: "#2563eb",
        text: "Please review the checkout CTA alignment before release.",
        createdAt: recentChatAt,
      },
      {
        id: "chat-stale",
        peerId: "peer-vendor",
        name: "External Vendor",
        email: "vendor@external.dev",
        color: "#dc2626",
        text: "Stale room note includes secret-token-123 and should never appear in exports.",
        createdAt: staleChatAt,
      },
    ],
    presenceEvents: [
      {
        id: "presence-1",
        kind: "joined",
        peerId: "peer-lead",
        peerName: "Design Lead",
        peerEmail: "lead@example.com",
        color: "#2563eb",
        createdAt: recentChatAt - 60_000,
      },
      {
        id: "presence-2",
        kind: "spotlight-on",
        peerId: "peer-lead",
        peerName: "Design Lead",
        peerEmail: "lead@example.com",
        color: "#2563eb",
        detail: "Presenter started checkout walkthrough.",
        createdAt: recentChatAt,
      },
    ],
  },
  updatedAt: "2026-05-18T10:40:00.000Z",
};

const mobileDocument: DesignDocument = {
  ...checkoutDocument,
  activePageId: "page-mobile",
  pages: [
    {
      id: "page-mobile",
      name: "Mobile review",
      background: "#ffffff",
      layers: [],
      comments: [],
    },
  ],
  collaborationRoom: {
    version: 1,
    updatedAt: "2026-05-18T10:45:00.000Z",
    chatMessages: [
      {
        id: "chat-mobile",
        peerId: "peer-lee",
        name: "Lee Editor",
        email: "lee@example.com",
        color: "#16a34a",
        text: "@Sam mobile copy is ready for handoff.",
        createdAt: Date.parse("2026-05-18T10:44:00.000Z"),
      },
    ],
    presenceEvents: [],
  },
  updatedAt: "2026-05-18T10:45:00.000Z",
};

const report = getAdminCursorChatRoomMessagesReport({
  generatedAt: "2026-05-18T11:00:00.000Z",
  now,
  retentionDays: 7,
  replayWindowDays: 3,
  files: [
    {
      fileId: "file-checkout",
      fileName: "Checkout live review",
      ownerEmail: "sam@example.com",
      document: checkoutDocument,
      updatedAt: "2026-05-18T10:40:00.000Z",
      trashedAt: null,
    },
    {
      fileId: "file-mobile",
      fileName: "Mobile account settings",
      ownerEmail: "lee@example.com",
      document: mobileDocument,
      updatedAt: "2026-05-18T10:45:00.000Z",
      trashedAt: null,
    },
  ],
  collaborationEventIngestion: {
    generatedAt: "2026-05-18T10:55:00.000Z",
    status: "review",
    score: 82,
    retentionDays: 7,
    replayWindowDays: 3,
    durableEventCount: 6,
    redactedEventCount: 6,
    chatEventCount: 3,
    presenceEventCount: 2,
    replayWindows: [
      {
        fileId: "file-checkout",
        fileName: "Checkout live review",
        ownerEmail: "sam@example.com",
        status: "review",
        firstEventAt: "2026-05-08T10:00:00.000Z",
        latestEventAt: "2026-05-18T10:40:00.000Z",
        retentionExpiresAt: "2026-05-15T10:00:00.000Z",
        eventCount: 4,
        chatCount: 2,
        presenceCount: 2,
        activityCount: 0,
        roomActionCount: 0,
        purgeCandidate: true,
        recommendation: "Archive checkout replay before purge.",
      },
      {
        fileId: "file-mobile",
        fileName: "Mobile account settings",
        ownerEmail: "lee@example.com",
        status: "ready",
        firstEventAt: "2026-05-18T10:44:00.000Z",
        latestEventAt: "2026-05-18T10:45:00.000Z",
        retentionExpiresAt: "2026-05-25T10:44:00.000Z",
        eventCount: 2,
        chatCount: 1,
        presenceCount: 0,
        activityCount: 1,
        roomActionCount: 0,
        purgeCandidate: false,
        recommendation: "Replay window is fresh.",
      },
    ],
    recentEvents: [],
  },
  collaborationRecoveryPackets: {
    generatedAt: "2026-05-18T10:56:00.000Z",
    status: "blocked",
    score: 70,
    packetCount: 2,
    exportReadyPacketCount: 1,
    replayEvidenceCount: 6,
    packets: [
      {
        id: "packet-checkout",
        status: "blocked",
        fileId: "file-checkout",
        fileName: "Checkout live review",
        ownerEmail: "sam@example.com",
        ownerHandoffStatus: "missing",
        ownerHandoffLabel: "Missing handoff owner",
        activityReplayEvidenceCount: 4,
        replayWindowStatus: "review",
        replayWindowLatestAt: "2026-05-18T10:40:00.000Z",
        roomCaptured: true,
        evidenceArchived: false,
        exportReady: false,
        conflictSummaryCount: 2,
        operationConflictCount: 1,
        targetConflictCount: 1,
        eventDriftCount: 0,
        offlineReplayQueueCount: 0,
        saveConflictCount: 0,
        unresolvedMentionCount: 1,
        escalationCount: 1,
        recoverySteps: ["Assign owner", "Archive evidence"],
        latestAt: "2026-05-18T10:40:00.000Z",
        recommendation: "Assign owner before export.",
      },
      {
        id: "packet-mobile",
        status: "ready",
        fileId: "file-mobile",
        fileName: "Mobile account settings",
        ownerEmail: "lee@example.com",
        ownerHandoffStatus: "assigned",
        ownerHandoffLabel: "Lee Editor",
        activityReplayEvidenceCount: 2,
        replayWindowStatus: "ready",
        replayWindowLatestAt: "2026-05-18T10:45:00.000Z",
        roomCaptured: true,
        evidenceArchived: true,
        exportReady: true,
        conflictSummaryCount: 0,
        operationConflictCount: 0,
        targetConflictCount: 0,
        eventDriftCount: 0,
        offlineReplayQueueCount: 0,
        saveConflictCount: 0,
        unresolvedMentionCount: 0,
        escalationCount: 0,
        recoverySteps: ["Export packet"],
        latestAt: "2026-05-18T10:45:00.000Z",
        recommendation: "Ready for export.",
      },
    ],
  },
});

assert(report.status === "blocked", "Expired retention and blocked recovery packet should block room messages.");
assert(report.roomCount === 2, "Every active room should be inspected.");
assert(report.messageCount === 3, "All cursor chat messages should be counted.");
assert(report.expiredMessageCount === 1, "Expired chat messages should be surfaced.");
assert(report.mentionCount === 1, "Mention-style room messages should be counted.");
assert(report.privacyReplayEvidenceCount === 3, "Every chat message should get privacy-safe replay evidence.");
assert(report.recoveryPacketLinkedCount === 2, "Room messages should link to recovery packets.");
assert(report.exportReadyRoomCount === 1, "Only the clean room should be export-ready.");
assert(
  report.replayEvidence.every(
    (item) =>
      item.privacy === "redacted" &&
      !("text" in item) &&
      !item.detail.includes("checkout CTA") &&
      !item.detail.includes("secret-token-123"),
  ),
  "Replay evidence should not expose raw cursor chat text.",
);
assert(
  report.rows.some((row) => row.category === "retention-control"),
  "Retention control row should be present.",
);
assert(
  report.rows.some((row) => row.category === "recovery-packet"),
  "Recovery packet integration row should be present.",
);
assert(
  report.commands.some((command) =>
    command.includes("admin:cursor-chat-room-messages-smoke"),
  ),
  "Targeted smoke command should be listed.",
);

const markdown = getAdminCursorChatRoomMessagesMarkdown(report);

assert(
  markdown.includes("Cursor Chat Room Messages"),
  "Markdown export should include a clear title.",
);
assert(markdown.includes("retention"), "Markdown should include retention evidence.");
assert(markdown.includes("privacy-safe replay"), "Markdown should include privacy-safe replay evidence.");
assert(markdown.includes("recovery packet"), "Markdown should include recovery packet integration.");
assert(!markdown.includes("sam@example.com"), "Markdown export should redact owner emails.");
assert(!markdown.includes("secret-token-123"), "Markdown export should redact raw secrets.");
assert(!markdown.includes("checkout CTA"), "Markdown export should not include raw room message text.");

console.log(
  `Admin cursor chat room messages smoke passed: ${report.messageCount} messages, ${report.expiredMessageCount} expired.`,
);

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}
