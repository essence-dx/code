import assert from "node:assert/strict";
import type { BoardReleaseArchiveIntelligenceApprovalWorkflowReport } from "@/features/projects/board-release-archive-intelligence-approval-workflow";
import { createBoardReleaseArchiveIntelligenceCommandCenterReport } from "@/features/projects/board-release-archive-intelligence-command-center";
import type { BoardReleaseArchiveIntelligenceNotificationRoutingReport } from "@/features/projects/board-release-archive-intelligence-notification-routing";
import type { BoardReleaseArchiveIntelligencePacketReport } from "@/features/projects/board-release-archive-intelligence-packet";
import { createBoardReleaseArchiveIntelligencePacketHistoryRecord, createBoardReleaseArchiveIntelligencePacketHistoryReport } from "@/features/projects/board-release-archive-intelligence-packet-history";

const generatedAt = "2026-05-29T10:00:00.000Z";
const packetHash = "sha256:packet";

const packet = {
  csvContent: "record_type,id,kind,title,status,score_or_priority,evidence_hash,record_hash,next_action\n",
  csvDataUri: "data:text/csv;charset=utf-8,record_type",
  csvFileName: "workspace-board-board-release-archive-intelligence-packet-20260529.csv",
  executiveMemo: "BLOCKED archive intelligence packet: 5 evidence sections.",
  generatedAt,
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "workspace-board-board-release-archive-intelligence-packet-20260529.json",
  recommendations: [
    {
      action: "Assign owners to critical archive anomaly findings.",
      evidenceHash: "sha256:anomaly",
      priority: "high",
      recommendationHash: "sha256:recommendation-anomaly",
      recommendationId: "recommendation-anomaly",
      recommendationKind: "remediate-anomaly",
      status: "blocked",
      title: "Critical anomaly remediation",
      workspaceId: "workspace-board",
    },
    {
      action: "Package hashes into one immutable archive intelligence packet.",
      evidenceHash: "sha256:packet",
      priority: "medium",
      recommendationHash: "sha256:recommendation-governance",
      recommendationId: "recommendation-governance",
      recommendationKind: "governance-update",
      status: "watch",
      title: "Immutable intelligence packet",
      workspaceId: "workspace-board",
    },
  ],
  sections: [],
  summary: {
    blockedRecommendationCount: 1,
    blockedSectionCount: 5,
    governanceUpdateCount: 1,
    nextAction: "Assign owners to critical archive anomaly findings.",
    packetHash,
    packetScore: 34,
    recommendationCount: 2,
    sectionCount: 5,
    status: "blocked",
    watchRecommendationCount: 1,
    watchSectionCount: 0,
  },
  workspaceId: "workspace-board",
} as BoardReleaseArchiveIntelligencePacketReport;

const packetHistory = createBoardReleaseArchiveIntelligencePacketHistoryReport([
  createBoardReleaseArchiveIntelligencePacketHistoryRecord({
    actor: {
      email: "owner@example.com",
      name: "Owner",
      userId: "user-owner",
    },
    createdAt: generatedAt,
    id: "history-1",
    packet,
  }),
]);

const notificationRouting = {
  summary: {
    criticalCount: 1,
    eligibleRouteCount: 6,
    emailEligibleCount: 3,
    inAppEligibleCount: 3,
    nextAction: "Route critical archive intelligence recommendations before board archive approval.",
    notificationCount: 2,
    routeCount: 8,
    routingScore: 75,
    status: "critical",
    suppressedByPreferenceCount: 1,
    suppressedByRoleCount: 1,
    warningCount: 1,
  },
} as BoardReleaseArchiveIntelligenceNotificationRoutingReport;

const approvalWorkflow = {
  summary: {
    approvedCount: 0,
    exceptionNeededCount: 1,
    hashMismatchCount: 0,
    nextAction: "Attach exception notes for blocked archive intelligence recommendations before sign-off can close.",
    packetHash,
    pendingCount: 1,
    rejectedCount: 0,
    status: "exception-needed",
    totalCount: 2,
    workflowScore: 50,
  },
} as BoardReleaseArchiveIntelligenceApprovalWorkflowReport;

const report = createBoardReleaseArchiveIntelligenceCommandCenterReport({
  approvalWorkflow,
  generatedAt,
  notificationRouting,
  packet,
  packetHistory,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.rowCount, 4);
assert.equal(report.summary.blockedCount, 3);
assert.equal(report.summary.watchCount, 0);
assert.equal(report.summary.readyCount, 1);
assert.equal(report.summary.remediationWorkCount, 2);
assert.equal(report.summary.commandScore, 71);
assert.equal(report.rows[0]?.id, "approval-workflow");
assert.equal(report.rows.find((row) => row.id === "packet-history")?.status, "ready");
assert.equal(report.csvFileName, "workspace-board-board-release-archive-intelligence-command-center-20260529.csv");
assert.match(report.csvContent, /row_id,label,status,score,owner,next_action/);

console.log("board release archive intelligence command center smoke passed");
