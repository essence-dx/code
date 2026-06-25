import assert from "node:assert/strict";
import type { BoardReleaseObservabilityAlertRoutingReport } from "@/features/projects/board-release-observability-alert-routing";
import type { BoardReleaseObservabilityEventHealthReport } from "@/features/projects/board-release-observability-event-health";
import { createBoardReleaseObservabilityExecutiveDigest } from "@/features/projects/board-release-observability-executive-digest";
import type { BoardReleaseObservabilityIncidentNotesReport } from "@/features/projects/board-release-observability-incident-notes";
import type { BoardReleaseObservabilityTrendSnapshotReport } from "@/features/projects/board-release-observability-trend-snapshots";

const generatedAt = "2026-05-29T10:00:00.000Z";

const eventHealth = {
  generatedAt,
  summary: {
    blockedCount: 2,
    criticalCount: 2,
    healthyCount: 0,
    monitorCount: 4,
    nextAction: "Repair blocked acknowledgement routes before release observability closeout.",
    status: "blocked",
    warningCount: 2,
    watchCount: 2,
  },
  workspaceId: "workspace-board",
} as BoardReleaseObservabilityEventHealthReport;

const incidentNotes = {
  generatedAt,
  summary: {
    blockedCount: 2,
    criticalCount: 2,
    dueSoonCount: 2,
    nextAction: "Board secretary: Repair blocked acknowledgement routes before closeout.",
    noteCount: 3,
    openCount: 0,
    status: "blocked",
    watchCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseObservabilityIncidentNotesReport;

const trendSnapshots = {
  generatedAt,
  summary: {
    blockedCount: 3,
    decliningCount: 3,
    improvingCount: 1,
    nextAction: "Resolve blocked delivery routes before distribution closeout.",
    readinessScoreDelta: -14,
    snapshotCount: 4,
    status: "blocked",
    watchCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardReleaseObservabilityTrendSnapshotReport;

const alertRouting = {
  generatedAt,
  summary: {
    criticalCount: 2,
    eligibleRouteCount: 12,
    emailEligibleCount: 5,
    inAppEligibleCount: 7,
    nextAction: "Route critical board release observability alerts before release closeout.",
    notificationCount: 3,
    routeCount: 24,
    routingScore: 50,
    status: "critical",
    suppressedByPreferenceCount: 2,
    suppressedByRoleCount: 10,
    warningCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseObservabilityAlertRoutingReport;

const digest = createBoardReleaseObservabilityExecutiveDigest({
  alertRouting,
  eventHealth,
  generatedAt,
  incidentNotes,
  trendSnapshots,
  workspaceId: "workspace-board",
});

assert.equal(digest.summary.status, "blocked");
assert.equal(digest.summary.blockedCount, 5);
assert.equal(digest.summary.watchCount, 0);
assert.equal(digest.summary.digestScore, 27);
assert.equal(digest.summary.closeoutScore, 0);
assert.equal(digest.summary.incidentCount, 3);
assert.equal(digest.summary.trendDeclineCount, 3);
assert.equal(digest.summary.alertCount, 3);
assert.equal(digest.summary.criticalAlertCount, 2);
assert.equal(digest.rows[0]?.id, "event-health");
assert.equal(digest.rows.at(-1)?.id, "closeout");
assert.match(digest.executiveMemo, /Release observability is blocked/);
assert.match(digest.csvContent, /digest_id,kind,status,score,metric,next_action/);
assert.match(digest.jsonContent, /"schemaVersion": 1/);
assert.equal(digest.csvFileName, "workspace-board-board-release-observability-executive-digest-20260529.csv");
assert.equal(digest.jsonFileName, "workspace-board-board-release-observability-executive-digest-20260529.json");

console.log("board release observability executive digest smoke passed");
