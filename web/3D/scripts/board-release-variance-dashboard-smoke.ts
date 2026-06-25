import { strict as assert } from "node:assert";
import type { BoardAssuranceEvidenceBundleReport } from "@/features/projects/board-assurance-evidence-bundle";
import type { BoardApprovalPacketHistoryReport } from "@/features/projects/board-approval-packet-history";
import type { BoardDecisionReplayAuditReport } from "@/features/projects/board-decision-replay-audit";
import type { BoardDecisionReplaySnapshotHistoryReport } from "@/features/projects/board-decision-replay-snapshots";
import { createBoardReleaseVarianceDashboard } from "@/features/projects/board-release-variance-dashboard";
import type { ProjectIncidentPostmortemReport } from "@/features/projects/project-incident-postmortem";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";

const generatedAt = "2026-01-15T12:00:00.000Z";

const approvalHistory = {
  csvContent: "packet_id,status\n",
  csvDataUri: "data:text/csv;charset=utf-8,packet_id",
  csvFileName: "approval-history.csv",
  records: [
    {
      approvalScore: 88,
      approvalStatus: "watch",
      blockedSignOffCount: 1,
      createdAt: "2026-01-11T09:00:00.000Z",
      id: "approval-latest",
      packetId: "packet-latest",
      readySignOffCount: 3,
      recipientPurpose: "board launch approval",
      revokedAt: null,
      status: "active",
      watchSignOffCount: 2,
    },
    {
      approvalScore: 95,
      approvalStatus: "ready",
      blockedSignOffCount: 0,
      createdAt: "2026-01-01T09:00:00.000Z",
      id: "approval-previous",
      packetId: "packet-previous",
      readySignOffCount: 5,
      recipientPurpose: "board approval baseline",
      revokedAt: null,
      status: "active",
      watchSignOffCount: 0,
    },
  ],
  summary: {
    activeCount: 2,
    blockedPacketCount: 0,
    downloadCount: 0,
    latestSavedAt: "2026-01-11T09:00:00.000Z",
    readyPacketCount: 1,
    revokedCount: 0,
    totalCount: 2,
    watchPacketCount: 1,
  },
} as BoardApprovalPacketHistoryReport;

const replayAudit: BoardDecisionReplayAuditReport = {
  csvContent: "approval_id,packet_id,recipient_purpose,kind,status\n",
  csvDataUri: "data:text/csv;charset=utf-8,approval_id",
  csvFileName: "replay.csv",
  generatedAt,
  rows: [
    {
      approvalId: "approval-latest",
      approvedAt: "2026-01-11T09:00:00.000Z",
      baselineValue: "88/100 approval",
      currentValue: "critical post-deploy-failure",
      delta: 1,
      detail: "Viewer failed after approval.",
      id: "incident:approval-latest:project-1",
      kind: "incident",
      nextAction: "Attach remediation to the replay packet.",
      occurredAt: "2026-01-13T10:00:00.000Z",
      packetId: "packet-latest",
      recipientPurpose: "board launch approval",
      status: "blocked",
      title: "Viewer smoke failed",
    },
  ],
  summary: {
    activeApprovalCount: 2,
    blockedRowCount: 2,
    latestApprovalAt: "2026-01-11T09:00:00.000Z",
    laterIncidentCount: 3,
    nextAction: "Re-open board approval before release.",
    readyApprovalCount: 1,
    releaseEvidenceDriftCount: 1,
    replayScore: 70,
    rowCount: 4,
    runbookBlockedCount: 1,
    runbookIncompleteCount: 2,
    status: "blocked",
    watchRowCount: 1,
  },
  workspaceId: "workspace-1",
};

const replaySnapshotHistory = {
  csvContent: "created_at,status,replay_score\n",
  csvDataUri: "data:text/csv;charset=utf-8,created_at",
  csvFileName: "snapshots.csv",
  records: [
    {
      activeApprovalCount: 2,
      blockedRowCount: 2,
      createdAt: generatedAt,
      laterIncidentCount: 3,
      releaseEvidenceDriftCount: 1,
      replayScore: 70,
      rowCount: 4,
      runbookBlockedCount: 1,
      runbookIncompleteCount: 2,
      snapshotId: "snapshot-current",
      status: "blocked",
      topAction: "Re-open board approval before release.",
      watchRowCount: 1,
      workspaceId: "workspace-1",
    },
    {
      activeApprovalCount: 2,
      blockedRowCount: 1,
      createdAt: "2026-01-08T12:00:00.000Z",
      laterIncidentCount: 1,
      releaseEvidenceDriftCount: 0,
      replayScore: 82,
      rowCount: 3,
      runbookBlockedCount: 0,
      runbookIncompleteCount: 1,
      snapshotId: "snapshot-previous",
      status: "watch",
      topAction: "Watch incident follow-up.",
      watchRowCount: 1,
      workspaceId: "workspace-1",
    },
  ],
  summary: {
    actorCount: 1,
    blockedRowDelta: 1,
    latestContentHash: "sha256:latest",
    latestSavedAt: generatedAt,
    latestScore: 70,
    previousScore: 82,
    scoreDelta: -12,
    statusTrend: "declining",
    totalSnapshotCount: 2,
  },
  trends: [],
} as unknown as BoardDecisionReplaySnapshotHistoryReport;

const incidentPostmortemReport = {
  generatedAt,
  summary: {
    blockedCount: 1,
    completedRemediationCount: 2,
    criticalTemplateCount: 2,
    failedSmokeCheckCount: 2,
    linkedDrillCount: 1,
    readyCount: 1,
    templateCount: 3,
    watchCount: 1,
  },
  templates: [],
} as ProjectIncidentPostmortemReport;

const runbookReport = {
  generatedAt,
  history: {
    batchCount: 1,
    recordCount: 4,
  },
  records: [],
  summary: {
    blockedCount: 1,
    completeCount: 2,
    inProgressCount: 1,
    nextDueAt: "2026-01-16T09:00:00.000Z",
    ownerCount: 2,
    scheduledCount: 0,
    totalCount: 4,
  },
} as WorkspaceReleaseRunbookReport;

const evidenceBundle = {
  bundleId: "board-assurance-evidence-workspace-1-20260115",
  csvContent: "kind,label,status\n",
  csvDataUri: "data:text/csv;charset=utf-8,kind",
  csvFileName: "evidence.csv",
  files: [],
  generatedAt,
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "evidence.json",
  schemaVersion: 1,
  summary: {
    approvalRecordCount: 2,
    blockedEvidenceCount: 2,
    completedRunbookCount: 2,
    evidenceScore: 65,
    exceptionCount: 1,
    fileCount: 7,
    incidentPostmortemCount: 3,
    readyEvidenceCount: 3,
    replayRowCount: 4,
    replaySnapshotCount: 2,
    status: "blocked",
    totalByteSize: 8192,
    totalRunbookCount: 4,
    watchEvidenceCount: 2,
    nextAction: "Clear blocked runbook rows and attach completion evidence before board closure.",
  },
  workspaceId: "workspace-1",
} as BoardAssuranceEvidenceBundleReport;

const dashboard = createBoardReleaseVarianceDashboard({
  approvalHistory,
  evidenceBundle,
  generatedAt,
  incidentPostmortemReport,
  replayAudit,
  replaySnapshotHistory,
  runbookReport,
  workspaceId: "workspace-1",
});

assert.equal(dashboard.summary.status, "blocked");
assert.equal(dashboard.summary.rowCount, 4);
assert.equal(dashboard.summary.blockedCount, 3);
assert.equal(dashboard.summary.trendPointCount, 2);
assert.ok(dashboard.summary.varianceScore < 80);
assert.match(dashboard.summary.nextAction, /Resolve blocker drift/);

const approvalScoreRow = dashboard.rows.find((row) => row.id === "approval-score");
assert.equal(approvalScoreRow?.currentValue, 70);
assert.equal(approvalScoreRow?.previousValue, 88);
assert.equal(approvalScoreRow?.delta, -18);
assert.equal(approvalScoreRow?.direction, "declining");

const blockerRow = dashboard.rows.find((row) => row.id === "blocker-drift");
assert.equal(blockerRow?.currentValue, 4);
assert.equal(blockerRow?.previousValue, 1);
assert.equal(blockerRow?.delta, 3);
assert.equal(blockerRow?.status, "blocked");

const incidentRow = dashboard.rows.find((row) => row.id === "incident-recurrence");
assert.equal(incidentRow?.currentValue, 3);
assert.equal(incidentRow?.delta, 3);
assert.equal(incidentRow?.status, "blocked");

const runbookRow = dashboard.rows.find((row) => row.id === "runbook-follow-through");
assert.equal(runbookRow?.currentValue, 50);
assert.equal(runbookRow?.previousValue, 100);
assert.equal(runbookRow?.delta, -50);
assert.equal(runbookRow?.status, "blocked");

assert.deepEqual(
  dashboard.trendPoints.map((point) => point.replayScore),
  [82, 70],
);
assert.match(dashboard.csvContent, /metric,status,current,previous,delta,direction,next_action/);
assert.match(dashboard.csvDataUri, /^data:text\/csv/);

console.log("board release variance dashboard smoke passed");
