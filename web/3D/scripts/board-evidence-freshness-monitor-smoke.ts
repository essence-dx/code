import assert from "node:assert/strict";
import { createBoardEvidenceFreshnessMonitor } from "@/features/projects/board-evidence-freshness-monitor";

const generatedAt = "2026-05-17T12:00:00.000Z";

const monitor = createBoardEvidenceFreshnessMonitor({
  generatedAt,
  notificationHistory: {
    records: [
      {
        contentHash: "sha256:routes",
        createdAt: "2026-05-15T12:00:00.000Z",
        historyId: "notification-history-1",
        pendingAcknowledgementCount: 2,
        retryNeededCount: 1,
        routeCount: 4,
        routes: [
          {
            acknowledgementState: "pending",
            acknowledgedAt: null,
            deliveryState: "ready",
            route: {
              channel: "in-app",
              dedupeKey: "route-1",
              recipientEmail: "board@example.com",
              status: "eligible",
              topic: "release",
            },
          },
        ],
        status: "warning",
      },
    ],
    summary: {
      latestContentHash: "sha256:routes",
      latestRetryNeededCount: 1,
      latestSavedAt: "2026-05-15T12:00:00.000Z",
      pendingAcknowledgementCount: 2,
      totalRecordCount: 1,
    },
  },
  packetHistory: {
    records: [
      {
        approvalStatus: "blocked",
        contentHash: "sha256:packet-old",
        createdAt: "2026-05-05T12:00:00.000Z",
        packetId: "packet-old",
        recipientPurpose: "Aging launch packet",
        status: "active",
        updatedAt: "2026-05-05T12:00:00.000Z",
      },
      {
        approvalStatus: "ready",
        contentHash: "sha256:packet-new",
        createdAt: "2026-05-17T08:00:00.000Z",
        packetId: "packet-new",
        recipientPurpose: "Fresh launch packet",
        status: "active",
        updatedAt: "2026-05-17T08:00:00.000Z",
      },
    ],
  },
  replaySnapshotHistory: {
    records: [
      {
        contentHash: "sha256:snapshot-old",
        createdAt: "2026-05-10T12:00:00.000Z",
        replayScore: 58,
        snapshotId: "snapshot-old",
        status: "blocked",
      },
    ],
    summary: {
      latestContentHash: "sha256:snapshot-old",
      latestSavedAt: "2026-05-10T12:00:00.000Z",
      latestScore: 58,
      totalSnapshotCount: 1,
    },
  },
  routing: {
    generatedAt: "2026-05-17T11:00:00.000Z",
    routes: [
      {
        channel: "in-app",
        dedupeKey: "route-1",
        recipientEmail: "board@example.com",
        status: "eligible",
        topic: "release",
      },
    ],
    summary: {
      eligibleRouteCount: 1,
      latestRetryNeededCount: 1,
      notificationCount: 1,
      routeCount: 1,
      routingScore: 75,
      status: "warning",
    },
  },
  workspaceId: "workspace-board",
});

assert.equal(monitor.summary.status, "blocked");
assert.equal(monitor.summary.freshnessScore, 42);
assert.equal(monitor.summary.rowCount, 4);
assert.equal(monitor.summary.staleCount, 2);
assert.equal(monitor.summary.expiredCount, 1);
assert.equal(monitor.summary.watchCount, 1);
assert.equal(monitor.rows[0]?.id, "packet:packet-old");
assert.equal(monitor.rows.find((row) => row.id === "acknowledgement:notification-history-1")?.status, "expired");
assert.equal(monitor.rows.find((row) => row.id === "route-evidence:notification-history-1")?.sourceHash, "sha256:routes");
assert.match(monitor.summary.nextAction, /Refresh stale board packet/);
assert.match(monitor.csvContent, /evidence_id,kind,status,age_days,owner,source_hash,next_action/);
assert.equal(monitor.csvFileName, "workspace-board-board-evidence-freshness-20260517.csv");

console.log("board evidence freshness monitor smoke passed");
