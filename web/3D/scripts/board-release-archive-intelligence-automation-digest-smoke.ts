import assert from "node:assert/strict";
import { createBoardReleaseArchiveIntelligenceAutomationDigestReport } from "@/features/projects/board-release-archive-intelligence-automation-digest";
import type { BoardReleaseArchiveIntelligenceApprovalWorkflowReport } from "@/features/projects/board-release-archive-intelligence-approval-workflow";
import type { BoardReleaseArchiveIntelligenceCommandCenterReport } from "@/features/projects/board-release-archive-intelligence-command-center";
import type { BoardReleaseArchiveIntelligenceNotificationRoutingReport } from "@/features/projects/board-release-archive-intelligence-notification-routing";
import type { BoardReleaseArchiveIntelligencePacketReport } from "@/features/projects/board-release-archive-intelligence-packet";
import type { BoardReleaseArchiveTrendDigestReport } from "@/features/projects/board-release-archive-trend-digest";

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

const trendDigest = {
  summary: {
    blockedCount: 1,
    closeoutScoreMovement: -44,
    digestHash: "sha256:trend",
    nextAction: "Investigate closeout score decline before relying on archived release intelligence.",
    recurringBlockerCategoryCount: 1,
    rowCount: 3,
    status: "blocked",
    trendScore: 58,
    watchCount: 1,
  },
} as BoardReleaseArchiveTrendDigestReport;

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

const commandCenter = {
  summary: {
    blockedCount: 3,
    commandScore: 71,
    nextAction: "Attach exception notes for blocked archive intelligence recommendations before sign-off can close.",
    packetHash,
    readyCount: 1,
    remediationWorkCount: 2,
    rowCount: 4,
    status: "blocked",
    watchCount: 0,
  },
} as BoardReleaseArchiveIntelligenceCommandCenterReport;

const report = createBoardReleaseArchiveIntelligenceAutomationDigestReport({
  approvalWorkflow,
  commandCenter,
  generatedAt,
  notificationRouting,
  packet,
  trendDigest,
  workspaceId: "workspace-board",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.rowCount, 4);
assert.equal(report.summary.blockedCount, 4);
assert.equal(report.summary.watchCount, 0);
assert.equal(report.summary.readyCount, 0);
assert.equal(report.summary.followThroughCount, 2);
assert.equal(report.summary.digestScore, 64);
assert.equal(report.rows[0]?.id, "automation-digest:approval");
assert.equal(report.rows[1]?.id, "automation-digest:trend");
assert.equal(report.csvFileName, "workspace-board-board-release-archive-intelligence-automation-digest-20260529.csv");
assert.equal(report.jsonFileName, "workspace-board-board-release-archive-intelligence-automation-digest-20260529.json");
assert.match(report.csvContent, /digest_id,kind,title,status,score,metric,digest_hash,next_action/);
assert.match(report.jsonContent, /"followThroughCount": 2/);

console.log("board release archive intelligence automation digest smoke passed");
