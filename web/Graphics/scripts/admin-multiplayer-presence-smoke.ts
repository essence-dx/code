import {
  getAdminMultiplayerPresenceMarkdown,
  getAdminMultiplayerPresenceReport,
} from "../src/features/admin/admin-multiplayer-presence";

const report = getAdminMultiplayerPresenceReport({
  generatedAt: "2026-05-18T07:00:00.000Z",
  collaborationHandoffOperations: {
    generatedAt: "2026-05-18T06:55:00.000Z",
    roomCount: 2,
    activeRoomCount: 2,
    capturedRoomCount: 2,
    staleRoomCount: 1,
    presenterConflictCount: 1,
    presenterOwnedCount: 1,
    conflictQueueCount: 2,
    commands: ["Export collaboration handoff rooms."],
    rooms: [
      {
        id: "room-checkout",
        status: "blocked",
        fileId: "file-checkout",
        fileName: "Checkout live review",
        ownerEmail: "sam@example.com",
        roomCaptured: true,
        roomAgeMinutes: 60 * 72,
        chatMessageCount: 3,
        presenceEventCount: 6,
        presenter: {
          status: "conflict",
          ownerName: null,
          ownerEmail: null,
          activePresenterCount: 2,
          spotlightEventCount: 4,
          followEventCount: 2,
          replayEventCount: 6,
          lastHandoffAt: "2026-05-18T06:30:00.000Z",
          summary: "Two presenters are competing for spotlight ownership.",
        },
        operationConflictCount: 1,
        targetConflictCount: 1,
        eventDriftCount: 2,
        offlineReplayQueueCount: 3,
        latestAt: "2026-05-18T06:45:00.000Z",
      },
      {
        id: "room-mobile",
        status: "ready",
        fileId: "file-mobile",
        fileName: "Mobile account settings",
        ownerEmail: "lee@example.com",
        roomCaptured: true,
        roomAgeMinutes: 12,
        chatMessageCount: 1,
        presenceEventCount: 2,
        presenter: {
          status: "owned",
          ownerName: "Lee Editor",
          ownerEmail: "lee@example.com",
          activePresenterCount: 1,
          spotlightEventCount: 1,
          followEventCount: 3,
          replayEventCount: 4,
          lastHandoffAt: "2026-05-18T06:42:00.000Z",
          summary: "Lee owns the current walkthrough.",
        },
        operationConflictCount: 0,
        targetConflictCount: 0,
        eventDriftCount: 0,
        offlineReplayQueueCount: 0,
        latestAt: "2026-05-18T06:50:00.000Z",
      },
    ],
  },
  collaborationEventIngestion: {
    generatedAt: "2026-05-18T06:56:00.000Z",
    status: "review",
    score: 82,
    durableEventCount: 18,
    presenceEventCount: 8,
    chatEventCount: 4,
    purgeCandidateCount: 1,
    recentEvents: [
      {
        id: "event-1",
        fileId: "file-checkout",
        fileName: "Checkout live review",
        ownerEmail: "sam@example.com",
        kind: "presence",
        signal: "presence:spotlight-on",
        actorRef: "user:[redacted]",
        privacy: "redacted",
        detail: "Spotlight was turned on.",
        createdAt: "2026-05-18T06:45:00.000Z",
        retentionExpiresAt: "2026-05-25T06:45:00.000Z",
      },
      {
        id: "event-2",
        fileId: "file-checkout",
        fileName: "Checkout live review",
        ownerEmail: "sam@example.com",
        kind: "presence",
        signal: "presence:followed",
        actorRef: "user:[redacted]",
        privacy: "redacted",
        detail: "A reviewer followed the presenter.",
        createdAt: "2026-05-18T06:44:00.000Z",
        retentionExpiresAt: "2026-05-25T06:44:00.000Z",
      },
    ],
    replayWindows: [
      {
        fileId: "file-checkout",
        fileName: "Checkout live review",
        ownerEmail: "sam@example.com",
        status: "review",
        firstEventAt: "2026-05-18T06:20:00.000Z",
        latestEventAt: "2026-05-18T06:45:00.000Z",
        retentionExpiresAt: "2026-05-25T06:45:00.000Z",
        eventCount: 12,
        chatCount: 3,
        presenceCount: 8,
        activityCount: 1,
        roomActionCount: 0,
        purgeCandidate: true,
        recommendation: "Purge stale replay after handoff evidence is archived.",
      },
    ],
    commands: ["Export collaboration event ingestion."],
  },
  realtimeHealth: {
    generatedAt: "2026-05-18T06:57:00.000Z",
    status: "blocked",
    score: 64,
    monitoredRoomCount: 2,
    staleRoomCount: 1,
    reconnectQualityScore: 62,
    offlineReplayQueueCount: 3,
    eventDriftCount: 2,
    pendingSaveSignalCount: 2,
    failedSaveTelemetryCount: 1,
    commands: ["Export realtime health JSON."],
  },
});

assert(report.status === "blocked", "Presence conflicts and save failures should block the report.");
assert(report.roomCount === 2, "All handoff rooms should be represented.");
assert(report.cursorEvidenceCount >= 2, "Presence snapshots should count as cursor evidence.");
assert(report.spotlightEventCount === 5, "Spotlight replay should be counted across rooms.");
assert(report.followEventCount === 5, "Follow replay should be counted across rooms.");
assert(report.staleRecoveryQueueCount >= 1, "Stale room recovery should create review work.");
assert(report.saveConflictCount >= 5, "Save conflicts should combine room and realtime evidence.");
assert(
  report.rows.some((row) => row.category === "follow-spotlight"),
  "Follow and spotlight ownership row should be present.",
);
assert(
  report.commands.some((command) => command.includes("admin:multiplayer-presence-smoke")),
  "Targeted smoke command should be listed.",
);

const markdown = getAdminMultiplayerPresenceMarkdown(report);

assert(
  markdown.includes("Multiplayer Presence Operations"),
  "Markdown export should include a clear title.",
);
assert(
  markdown.includes("Checkout live review"),
  "Markdown export should include room evidence.",
);
assert(!markdown.includes("sam@example.com"), "Markdown export should redact owner emails.");

console.log(
  `Admin multiplayer presence smoke passed: ${report.roomCount} rooms, ${report.saveConflictCount} save conflicts.`,
);

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}
