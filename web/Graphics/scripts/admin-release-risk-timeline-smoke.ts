import {
  filterAdminReleaseRiskTimelineEvents,
  getAdminReleaseRiskTimelineMarkdown,
  getAdminReleaseRiskTimelineReport,
} from "../src/features/admin/admin-release-risk-timeline";

const report = getAdminReleaseRiskTimelineReport({
  generatedAt: "2026-05-18T02:00:00.000Z",
  dataLossPrevention: {
    generatedAt: "2026-05-18T01:00:00.000Z",
    status: "blocked",
    score: 54,
    blockedCount: 2,
    reviewCount: 3,
    sensitiveFindingCount: 6,
    downloadExposureCount: 2,
    publicRouteRiskCount: 1,
    commands: ["Export data-loss prevention evidence."],
  },
  selfHostedSyncDiagnostics: {
    generatedAt: "2026-05-18T01:10:00.000Z",
    status: "review",
    score: 79,
    blockedCount: 0,
    reviewCount: 2,
    repairCommandCount: 3,
    routeSmokeScore: 82,
    realtimeScore: 70,
    repairCommands: [
      {
        id: "sync-command",
        category: "browser",
        command: "Verify browser route smoke parity.",
        reason: "Route smoke score is below release target.",
      },
    ],
  },
  scopedPublicationApprovals: {
    generatedAt: "2026-05-18T01:20:00.000Z",
    status: "blocked",
    score: 62,
    scopeCount: 4,
    missingApprovalCount: 2,
    staleApprovalCount: 1,
    overdueScopeCount: 1,
    releaseEvidenceDiffCount: 3,
    commands: ["Review scoped publication approvals."],
  },
  realtimeHealth: {
    generatedAt: "2026-05-18T01:30:00.000Z",
    status: "review",
    score: 73,
    monitoredRoomCount: 5,
    offlineReplayQueueCount: 4,
    eventDriftCount: 7,
    pendingSaveSignalCount: 2,
    failedNotificationDeliveryCount: 1,
    commands: ["Export realtime health report."],
  },
  productionDeploySmoke: {
    generatedAt: "2026-05-18T01:40:00.000Z",
    baseUrl: "https://example.vercel.app",
    status: "review",
    score: 76,
    routeCount: 8,
    requiredRouteCount: 6,
    readyCount: 5,
    reviewCount: 3,
    blockedCount: 0,
    commands: ["Run post deploy smoke."],
  },
  collaborationEventIngestion: {
    generatedAt: "2026-05-18T01:50:00.000Z",
    status: "blocked",
    score: 50,
    incidentCount: 3,
    purgeCandidateCount: 2,
    durableEventCount: 30,
    redactedEventCount: 28,
    latestPurgeAt: null,
    incidents: [
      {
        id: "incident-replay",
        fileId: "file-1",
        fileName: "Checkout review",
        status: "blocked",
        category: "replay-window",
        label: "Replay window backlog",
        value: "3 rooms",
        detail: "Offline replay queues are older than the release window.",
        recommendation: "Archive replay evidence before release approval.",
        latestAt: "2026-05-18T01:48:00.000Z",
      },
    ],
    commands: ["Export collaboration ingestion incidents."],
  },
});

assert(report.eventCount >= 6, "Timeline should include all release risk sources.");
assert(report.blockedCount >= 2, "Blocked source signals should be counted.");
assert(
  report.correlationCount >= 2,
  "Timeline should create cross-source risk correlations.",
);
assert(
  filterAdminReleaseRiskTimelineEvents(report.events, "approval").some(
    (event) => event.dimension === "publication-approval",
  ),
  "Publication approval risk should be searchable.",
);
assert(
  filterAdminReleaseRiskTimelineEvents(report.events, "replay window").some(
    (event) => event.dimension === "collaboration-incident",
  ),
  "Collaboration incident details should be searchable.",
);

const markdown = getAdminReleaseRiskTimelineMarkdown(report);

assert(
  markdown.includes("Release Risk Timeline"),
  "Markdown export should include a clear title.",
);
assert(
  markdown.includes("publication-safety"),
  "Markdown export should include cross-source correlation ids.",
);

console.log(
  `Admin release risk timeline smoke passed: ${report.eventCount} events, ${report.correlationCount} correlations.`,
);

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}
