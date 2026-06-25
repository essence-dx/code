import { readFileSync } from "node:fs";
import type { OfflineSaveQueueReport } from "../src/features/editor/offline-mutation-queue";
import type { CollaborationPeer } from "../src/features/editor/collaboration-presence";
import type { DesignDocument } from "../src/features/editor/types";
import type {
  CollaborationSyncReplayReport,
  CollaborationSyncReplayRow,
} from "../src/features/editor/collaboration-sync-replay";
import type { MultiplayerFollowSpotlightReport } from "../src/features/editor/multiplayer-follow-spotlight";
import {
  getDesktopCollaborationRecoveryBridgeCsv,
  getDesktopCollaborationRecoveryBridgeJson,
  getDesktopCollaborationRecoveryBridgeMarkdown,
  getDesktopCollaborationRecoveryBridgeReport,
} from "../src/features/editor/desktop-collaboration-recovery-bridge";

const generatedAt = "2026-05-19T22:00:00.000Z";
const now = Date.parse(generatedAt);
const syncRows: CollaborationSyncReplayRow[] = [
  {
    id: "collaboration-offline-replay-queue",
    status: "blocked",
    kind: "offline-queue",
    label: "Offline replay queue has unresolved items",
    detail: "Three duplicate or unrecovered replay items need review.",
    eventCount: 3,
    recommendation: "Confirm offline collaborators reconnected cleanly.",
  },
  {
    id: "collaboration-event-drift",
    status: "review",
    kind: "event-drift",
    label: "Presence event drift detected",
    detail: "Two presence events arrived out of order.",
    eventCount: 2,
    recommendation: "Export the replay evidence.",
  },
];
const collaborationSyncReplay: CollaborationSyncReplayReport = {
  status: "blocked",
  score: 55,
  roomCaptured: true,
  roomUpdatedAt: "2026-05-19T21:45:00.000Z",
  roomAgeMinutes: 15,
  chatMessageCount: 4,
  presenceEventCount: 8,
  duplicateMessageCount: 1,
  duplicatePresenceEventCount: 1,
  disconnectCount: 2,
  recoveredPeerCount: 1,
  unrecoveredPeerCount: 1,
  offlineReplayQueueCount: 3,
  eventDriftCount: 2,
  reconnectQualityScore: 54,
  roomLatencyStatus: "ready",
  conflictScore: 72,
  operationConflictCount: 1,
  targetConflictCount: 1,
  blockedCount: 1,
  reviewCount: 1,
  readyCount: 0,
  rows: syncRows,
};
const peers: CollaborationPeer[] = [
  {
    id: "peer-ada",
    name: "Ada Reviewer",
    email: "ada@example.com",
    color: "#14b8a6",
    activePageId: "page-1",
    cursor: { x: 120, y: 160, pageId: "page-1" },
    spotlight: true,
    updatedAt: now - 90 * 1000,
    view: { x: 0, y: 0, zoom: 1 },
  },
  {
    id: "peer-lee",
    name: "Lee Offline",
    email: "lee@example.com",
    color: "#f59e0b",
    activePageId: "page-1",
    cursor: { x: 900, y: 620, pageId: "page-1" },
    spotlight: true,
    updatedAt: now - 15 * 60 * 1000,
    view: { x: 260, y: 180, zoom: 0.65 },
  },
];
const multiplayerFollowSpotlight: MultiplayerFollowSpotlightReport = {
  generatedAt,
  status: "blocked",
  score: 64,
  activePeerCount: 2,
  activePresenterCount: 2,
  presenterStatus: "conflict",
  presenterConflictCount: 2,
  ownerPeerId: null,
  ownerName: null,
  followedPeerId: "peer-lee",
  followedPeerName: "Lee Offline",
  spotlightEventCount: 3,
  followEventCount: 2,
  handoffTimerSeconds: 4200,
  handoffTimerStatus: "blocked",
  viewportSyncStatus: "blocked",
  viewportPanDelta: 320,
  viewportZoomDelta: 0.35,
  adminExportEvidenceCount: 4,
  adminExportEvidence: [
    "Export multiplayer presence JSON.",
    "Export multiplayer presence CSV.",
    "Export multiplayer presence Markdown.",
    "Attach presenter handoff notes.",
  ],
  blockedCount: 2,
  reviewCount: 0,
  readyCount: 1,
  rows: [],
};
const minimalDocument: DesignDocument = {
  version: 1,
  activePageId: "page-1",
  pages: [
    {
      id: "page-1",
      name: "Canvas",
      background: "#ffffff",
      layers: [],
      comments: [],
      guides: [],
      grid: {
        visible: true,
        size: 20,
        snap: false,
      },
    },
  ],
  variables: {},
  components: {},
  updatedAt: "2026-05-19T21:00:00.000Z",
};
const offlineQueue: OfflineSaveQueueReport = {
  fileId: "file-desktop-recovery",
  currentDocumentHash: "hash-current",
  entries: [
    {
      id: "offline-save-failed",
      fileId: "file-desktop-recovery",
      fileName: "Desktop recovery board",
      operation: "save-design-file",
      status: "failed",
      attemptCount: 3,
      document: minimalDocument,
      documentHash: "hash-failed",
      baseUpdatedAt: "2026-05-19T20:00:00.000Z",
      createdAt: "2026-05-19T20:05:00.000Z",
      updatedAt: "2026-05-19T20:15:00.000Z",
      lastAttemptAt: "2026-05-19T20:15:00.000Z",
      lastError: "Network unavailable while saving collaboration replay.",
      isCurrentSnapshot: false,
    },
    {
      id: "offline-save-queued",
      fileId: "file-desktop-recovery",
      fileName: "Desktop recovery board",
      operation: "save-design-file",
      status: "queued",
      attemptCount: 0,
      document: minimalDocument,
      documentHash: "hash-current",
      baseUpdatedAt: "2026-05-19T21:00:00.000Z",
      createdAt: "2026-05-19T21:30:00.000Z",
      updatedAt: "2026-05-19T21:30:00.000Z",
      isCurrentSnapshot: true,
    },
  ],
  totalCount: 2,
  retryableCount: 2,
  pendingCount: 1,
  failedCount: 1,
  syncedCount: 0,
  staleCount: 1,
  latestRetryableEntry: null,
  latestError: "Network unavailable while saving collaboration replay.",
};

const blockedReport = getDesktopCollaborationRecoveryBridgeReport({
  activeFileId: "file-desktop-recovery",
  activeFileName: "Desktop recovery board",
  activePageId: "page-1",
  collaborationPresence: {
    followedPeerId: "peer-lee",
    peers,
    presenceEvents: [
      {
        id: "evt-chat-1",
        kind: "chat",
        peerId: "peer-lee",
        peerName: "Lee Offline",
        detail: "Can you still see my cursor?",
        createdAt: now - 14 * 60 * 1000,
      },
      {
        id: "evt-left-1",
        kind: "left",
        peerId: "peer-lee",
        peerName: "Lee Offline",
        createdAt: now - 13 * 60 * 1000,
      },
      {
        id: "evt-spotlight-1",
        kind: "spotlight-on",
        peerId: "peer-ada",
        peerName: "Ada Reviewer",
        createdAt: now - 12 * 60 * 1000,
      },
      {
        id: "evt-spotlight-2",
        kind: "spotlight-on",
        peerId: "peer-lee",
        peerName: "Lee Offline",
        createdAt: now - 11 * 60 * 1000,
      },
    ],
    selfId: "self",
    spotlight: false,
    view: { x: 0, y: 0, zoom: 1 },
  },
  collaborationSyncReplay,
  generatedAt,
  multiplayerFollowSpotlight,
  now,
  offlineQueue,
});

const readyReport = getDesktopCollaborationRecoveryBridgeReport({
  activeFileId: "file-ready-recovery",
  activeFileName: "Ready recovery board",
  activePageId: "page-1",
  collaborationPresence: {
    followedPeerId: "peer-ada",
    peers: [peers[0]],
    presenceEvents: [
      {
        id: "evt-follow-ready",
        kind: "followed",
        peerId: "peer-ada",
        peerName: "Ada Reviewer",
        createdAt: now - 4 * 60 * 1000,
      },
      {
        id: "evt-chat-ready",
        kind: "chat",
        peerId: "peer-ada",
        peerName: "Ada Reviewer",
        detail: "Recovered and synced.",
        createdAt: now - 3 * 60 * 1000,
      },
    ],
    selfId: "self",
    spotlight: false,
    view: { x: 0, y: 0, zoom: 1 },
  },
  collaborationSyncReplay: {
    ...collaborationSyncReplay,
    status: "ready",
    score: 100,
    duplicateMessageCount: 0,
    duplicatePresenceEventCount: 0,
    disconnectCount: 0,
    recoveredPeerCount: 1,
    unrecoveredPeerCount: 0,
    offlineReplayQueueCount: 0,
    eventDriftCount: 0,
    reconnectQualityScore: 100,
    operationConflictCount: 0,
    targetConflictCount: 0,
    blockedCount: 0,
    reviewCount: 0,
    readyCount: 2,
    rows: [],
  },
  generatedAt,
  multiplayerFollowSpotlight: {
    ...multiplayerFollowSpotlight,
    status: "ready",
    score: 100,
    activePeerCount: 1,
    activePresenterCount: 1,
    presenterStatus: "owned",
    presenterConflictCount: 0,
    ownerPeerId: "peer-ada",
    ownerName: "Ada Reviewer",
    handoffTimerSeconds: 120,
    handoffTimerStatus: "ready",
    viewportSyncStatus: "ready",
    viewportPanDelta: 8,
    viewportZoomDelta: 0.01,
    blockedCount: 0,
    reviewCount: 0,
    readyCount: 3,
  },
  now,
  offlineQueue: {
    ...offlineQueue,
    entries: [],
    totalCount: 0,
    retryableCount: 0,
    pendingCount: 0,
    failedCount: 0,
    syncedCount: 0,
    staleCount: 0,
    latestError: null,
  },
});

const markdown = getDesktopCollaborationRecoveryBridgeMarkdown(blockedReport);
const csv = getDesktopCollaborationRecoveryBridgeCsv(blockedReport);
const json = JSON.parse(
  getDesktopCollaborationRecoveryBridgeJson(blockedReport),
) as {
  recoveryPackets: unknown[];
  rows: unknown[];
  summary: {
    adminEvidenceCount: number;
    cursorChatBlockedCount: number;
    offlineReplayQueueCount: number;
    reconnectHandoffBlockedCount: number;
    status: string;
  };
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const extensionsSource = readFileSync(
  "src/features/editor/components/extensions-panel.tsx",
  "utf8",
);

assert(blockedReport.status === "blocked", "Unsafe reconnect and replay state should block desktop recovery.");
assert(blockedReport.reconnectHandoffBlockedCount >= 1, "Presenter conflicts or old handoff timers should block reconnect handoff.");
assert(blockedReport.offlineReplayQueueCount >= 5, "Offline replay queue should join sync replay and local save queue counts.");
assert(blockedReport.failedOfflineSaveCount === 1, "Failed offline save queue entries should be surfaced.");
assert(blockedReport.cursorChatBlockedCount >= 1, "Stale cursor or chat queue signals should block cursor/chat safety.");
assert(blockedReport.adminEvidenceCount >= 6, "Admin evidence exports should include multiple operator artifacts.");
assert(blockedReport.recoveryPackets.length >= 5, "Recovery packets should cover all desktop recovery bridge categories.");
assert(blockedReport.rows.some((row) => row.category === "reconnect-handoff"), "Rows should include reconnect handoff.");
assert(blockedReport.rows.some((row) => row.category === "offline-event-replay"), "Rows should include offline replay.");
assert(blockedReport.rows.some((row) => row.category === "cursor-chat-queue"), "Rows should include cursor/chat queue safety.");
assert(blockedReport.rows.some((row) => row.category === "admin-evidence"), "Rows should include admin evidence.");
assert(readyReport.status === "ready", "Ready recovery fixture should pass.");
assert(readyReport.score === 100, "Ready recovery fixture should score 100.");
assert(readyReport.reconnectHandoffBlockedCount === 0, "Ready fixture should not block handoff.");
assert(readyReport.offlineReplayQueueCount === 0, "Ready fixture should not carry replay queue items.");
assert(readyReport.cursorChatBlockedCount === 0, "Ready fixture should not block cursor/chat safety.");
assert(markdown.includes("Desktop Collaboration Recovery Bridge"), "Markdown should include a clear title.");
assert(markdown.includes("reconnect handoff"), "Markdown should include reconnect handoff.");
assert(markdown.includes("offline event replay"), "Markdown should include offline event replay.");
assert(markdown.includes("cursor/chat queue"), "Markdown should include cursor/chat queue safety.");
assert(csv.includes("offline-event-replay"), "CSV should include offline replay rows.");
assert(json.rows.length === blockedReport.rows.length, "JSON should preserve rows.");
assert(json.recoveryPackets.length === blockedReport.recoveryPackets.length, "JSON should preserve recovery packets.");
assert(json.summary.status === blockedReport.status, "JSON summary should preserve status.");
assert(json.summary.reconnectHandoffBlockedCount === blockedReport.reconnectHandoffBlockedCount, "JSON should preserve handoff blockers.");
assert(json.summary.offlineReplayQueueCount === blockedReport.offlineReplayQueueCount, "JSON should preserve offline replay queue.");
assert(json.summary.cursorChatBlockedCount === blockedReport.cursorChatBlockedCount, "JSON should preserve cursor/chat blockers.");
assert(json.summary.adminEvidenceCount === blockedReport.adminEvidenceCount, "JSON should preserve admin evidence count.");
assert(
  /DesktopCollaborationRecoveryBridgePanel/.test(extensionsSource) &&
    /getDesktopCollaborationRecoveryBridgeReport/.test(extensionsSource),
  "Extensions should wire the desktop collaboration recovery bridge panel and report.",
);
assert(
  packageJson.scripts["editor:desktop-collaboration-recovery-bridge-smoke"]?.includes(
    "desktop-collaboration-recovery-bridge-smoke",
  ),
  "Targeted desktop collaboration recovery bridge smoke command should be listed.",
);

console.log(
  `Desktop collaboration recovery bridge smoke passed: ${blockedReport.status}, ${blockedReport.recoveryPackets.length} packets.`,
);

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}
