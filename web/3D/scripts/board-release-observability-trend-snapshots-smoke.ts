import assert from "node:assert/strict";
import type { BoardReleaseDistributionAuditTimelineReport } from "@/features/projects/board-release-distribution-audit-timeline";
import type { BoardReleaseDistributionReadinessDashboardReport } from "@/features/projects/board-release-distribution-readiness-dashboard";
import type { BoardReleaseDistributionRetryPlanningReport } from "@/features/projects/board-release-distribution-retry-planning";
import { createBoardReleaseObservabilityTrendSnapshotReport } from "@/features/projects/board-release-observability-trend-snapshots";
import type { BoardReleaseOperationsDashboardFilterReport } from "@/features/projects/board-release-operations-dashboard-filters";

const generatedAt = "2026-05-29T10:00:00.000Z";

const readinessDashboard = {
  generatedAt,
  summary: {
    blockedCount: 2,
    filterCount: 5,
    nextAction: "Resolve blocked delivery routes before distribution closeout.",
    readyCount: 8,
    readinessScore: 72,
    status: "blocked",
    watchCount: 3,
  },
  workspaceId: "workspace-board",
} as BoardReleaseDistributionReadinessDashboardReport;

const dashboardFilters = {
  generatedAt,
  summary: {
    archivedCount: 1,
    blockedCount: 2,
    entryCount: 8,
    nextAction: "Resolve blocked release operations before promotion or packet distribution.",
    readyCount: 3,
    status: "blocked",
    watchCount: 2,
  },
  workspaceId: "workspace-board",
} as BoardReleaseOperationsDashboardFilterReport;

const retries = {
  generatedAt,
  summary: {
    blockedCount: 1,
    expiredAcknowledgementCount: 1,
    missingRecipientCount: 1,
    nextAction: "Add recipient contact details before retrying distribution.",
    readyCount: 0,
    retryCount: 3,
    scheduledCount: 2,
    status: "blocked",
    suppressedRouteCount: 1,
  },
  workspaceId: "workspace-board",
} as BoardReleaseDistributionRetryPlanningReport;

const auditTimeline = {
  generatedAt,
  summary: {
    acknowledgementEventCount: 2,
    blockedCount: 2,
    closedCount: 6,
    deliveryRouteCount: 3,
    eventCount: 12,
    exportPacketCount: 1,
    nextAction: "Resolve blocked variance closure before observability closeout.",
    openCount: 2,
    retryEventCount: 3,
    status: "blocked",
    varianceClosureCount: 3,
    watchCount: 2,
  },
  workspaceId: "workspace-board",
} as BoardReleaseDistributionAuditTimelineReport;

const report = createBoardReleaseObservabilityTrendSnapshotReport({
  auditTimeline,
  dashboardFilters,
  generatedAt,
  readinessDashboard,
  retries,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.snapshotCount, 4);
assert.equal(report.summary.blockedCount, 3);
assert.equal(report.summary.decliningCount, 3);
assert.equal(report.summary.improvingCount, 1);
assert.equal(report.summary.readinessScoreDelta, -14);
assert.equal(report.snapshots[0]?.metric, "readiness-score");
assert.equal(report.snapshots.find((snapshot) => snapshot.metric === "blocked-filters")?.currentValue, 4);
assert.equal(report.snapshots.find((snapshot) => snapshot.metric === "retry-load")?.delta, 2);
assert.equal(report.snapshots.find((snapshot) => snapshot.metric === "timeline-closure")?.direction, "improving");
assert.match(report.snapshots[0]?.snapshotHash ?? "", /^sha256:/);
assert.match(report.csvContent, /metric,title,status,direction,previous_value,current_value,delta,snapshot_hash,next_action/);
assert.match(report.jsonContent, /"metric": "timeline-closure"/);
assert.equal(report.csvFileName, "workspace-board-board-release-observability-trend-snapshots-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-observability-trend-snapshots-20260529.json");

console.log("board release observability trend snapshots smoke passed");
