import assert from "node:assert/strict";
import { createBoardOperationsControlCenter } from "@/features/projects/board-operations-control-center";

const generatedAt = "2026-05-17T10:00:00.000Z";

const report = createBoardOperationsControlCenter({
  agenda: {
    summary: {
      blockedItemCount: 2,
      estimatedDurationMinutes: 75,
      readyItemCount: 3,
      status: "blocked",
      totalItemCount: 6,
      watchItemCount: 1,
    },
  },
  auditExport: {
    auditId: "audit-1",
    summary: {
      auditScore: 55,
      blockedSectionCount: 4,
      pendingAcknowledgementCount: 2,
      retryNeededCount: 1,
      sectionCount: 5,
      status: "blocked",
      watchSectionCount: 1,
    },
  },
  generatedAt,
  packetHistory: {
    summary: {
      activeCount: 1,
      blockedPacketCount: 1,
      latestSavedAt: "2026-05-17T08:00:00.000Z",
      readyPacketCount: 0,
      revokedCount: 0,
      totalCount: 1,
      watchPacketCount: 0,
    },
  },
  reviewCycles: [
    {
      id: "board-cycle-2026-05",
      label: "May board closeout",
      owner: "Release chair",
      savedAt: "2026-05-17T09:30:00.000Z",
      status: "blocked",
    },
  ],
  routing: {
    summary: {
      eligibleRouteCount: 3,
      notificationCount: 2,
      routingScore: 70,
      status: "critical",
      suppressedByPreferenceCount: 1,
      suppressedByRoleCount: 0,
    },
  },
  scenarioForecast: {
    summary: {
      blockedCount: 3,
      forecastScore: 38,
      highestRiskPercent: 90,
      readyCount: 0,
      rowCount: 4,
      status: "blocked",
      watchCount: 1,
    },
  },
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.controlScore, 54);
assert.equal(report.summary.rowCount, 5);
assert.equal(report.summary.blockedCount, 5);
assert.equal(report.summary.savedReviewCycleCount, 1);
assert.equal(report.rows[0]?.id, "closeout-report");
assert.equal(report.rows.find((row) => row.id === "agenda-readiness")?.score, 58);
assert.equal(report.rows.find((row) => row.id === "packet-status")?.score, 45);
assert.equal(report.rows.find((row) => row.id === "route-health")?.status, "blocked");
assert.match(report.summary.nextAction, /Close blocked audit export sections/);
assert.match(report.closeoutReport, /May board closeout/);
assert.match(report.csvContent, /control,status,score,owner,next_action/);
assert.equal(report.csvFileName, "workspace-board-board-operations-control-center-20260517.csv");

console.log("board operations control center smoke passed");
