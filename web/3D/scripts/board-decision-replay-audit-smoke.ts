import { strict as assert } from "node:assert";
import { createBoardDecisionReplayAuditReport } from "@/features/projects/board-decision-replay-audit";
import type { BoardApprovalPacketDiffReport } from "@/features/projects/board-approval-diff";
import { createBoardApprovalPacketHistoryRecord, createBoardApprovalPacketHistoryReport } from "@/features/projects/board-approval-packet-history";
import type { BoardApprovalPacketReport } from "@/features/projects/board-approval-packet";
import type { ProjectIncidentHistory } from "@/features/projects/project-incident-history";
import type { ReleaseEvidenceBundleSummary } from "@/features/projects/release-evidence-bundle";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";

const generatedAt = "2026-01-15T12:00:00.000Z";

const packet: BoardApprovalPacketReport = {
  checksums: {
    packetHash: "sha256:approval-packet",
    sources: [
      {
        contentHash: "sha256:risk",
        id: "risk",
        label: "Risk digest",
        sourceRecordCount: 2,
        verified: true,
      },
    ],
  },
  criticalPath: [],
  csvContent: "role,status\nlaunch,ready\n",
  csvDataUri: "data:text/csv;charset=utf-8,role%2Cstatus",
  csvFileName: "board.csv",
  executiveMemo: "Approval was signed with no launch blockers.",
  generatedAt: "2026-01-01T09:00:00.000Z",
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "board.json",
  packetId: "packet-approval-1",
  redactedSummary: "Ready for board approval.",
  signOffs: [
    {
      action: "Release approved",
      dueAt: "2026-01-03T09:00:00.000Z",
      evidenceHash: "sha256:launch",
      evidenceLinks: ["/projects?workspaceId=workspace-1#release-runbook"],
      ownerEmail: "release@example.com",
      ownerName: "Release Owner",
      required: true,
      role: "launch",
      status: "ready",
    },
  ],
  summary: {
    approvalScore: 92,
    blockedSignOffCount: 0,
    checksumCount: 1,
    criticalPathCount: 0,
    nextAction: "Archive the signed approval.",
    readySignOffCount: 1,
    redactionCount: 0,
    status: "ready",
    watchSignOffCount: 0,
  },
};

const packetHistory = createBoardApprovalPacketHistoryReport([
  createBoardApprovalPacketHistoryRecord({
    actor: {
      email: "board@example.com",
      name: "Board Secretary",
      userId: "user-board",
    },
    createdAt: "2026-01-01T10:00:00.000Z",
    id: "approval-1",
    packet,
    recipientEmail: "board@example.com",
    recipientName: "Board",
    recipientPurpose: "board approval",
    workspaceId: "workspace-1",
  }),
]);

const incidentHistory: ProjectIncidentHistory = {
  generatedAt,
  incidents: [
    {
      actionLabel: "Repair deploy smoke",
      count: 1,
      details: ["Viewer returned 500 after board approval."],
      id: "project-1:post-deploy-failure:2026-01-05",
      kind: "post-deploy-failure",
      message: "Viewer failed after approval.",
      occurredAt: "2026-01-05T08:00:00.000Z",
      projectId: "project-1",
      projectName: "Launch scene",
      severity: "critical",
      source: "post-deploy-smoke",
      title: "Post-deploy smoke failed",
    },
    {
      actionLabel: "Old incident",
      count: 1,
      details: ["This happened before approval and should not replay."],
      id: "project-1:failed-export:2025-12-15",
      kind: "failed-export",
      message: "Old export issue.",
      occurredAt: "2025-12-15T08:00:00.000Z",
      projectId: "project-1",
      projectName: "Launch scene",
      severity: "warning",
      source: "export-manifest",
      title: "Old export issue",
    },
  ],
  summary: {
    blockedReviewCount: 0,
    criticalCount: 1,
    failedExportCount: 1,
    impactedProjectCount: 1,
    postDeployFailureCount: 1,
    totalCount: 2,
    warningCount: 1,
  },
};

const releaseEvidenceSummary: ReleaseEvidenceBundleSummary = {
  auditEventCount: 10,
  cadJobCount: 0,
  certificateRecordCount: 2,
  complianceReportCount: 1,
  fileCount: 7,
  highPriorityActionCount: 1,
  projectCount: 1,
  publicSurfaceSnapshotCount: 2,
  releaseBlockerCount: 3,
  riskLevel: "critical",
  riskScore: 68,
  runbookRecordCount: 2,
  totalByteSize: 4096,
};

const releaseRunbook: WorkspaceReleaseRunbookReport = {
  generatedAt,
  history: {
    batchCount: 1,
    recordCount: 2,
  },
  records: [
    {
      attachments: [],
      auditLogHref: "/projects?workspaceId=workspace-1#audit",
      batchId: "runbook-1",
      blockerCount: 1,
      checklistEvidence: ["Viewer smoke failed after approval."],
      comments: [],
      completedAt: null,
      detail: "Repair post-approval public viewer failure.",
      dueAt: "2026-01-06T09:00:00.000Z",
      milestoneId: "milestone-1",
      ownerEmail: "release@example.com",
      ownerName: "Release Owner",
      ownerUserId: "user-release",
      projectId: "project-1",
      projectName: "Launch scene",
      sourceKey: "board-approval-signoff:launch",
      status: "blocked",
      title: "Repair viewer failure",
      transitionHistory: [],
      workspaceId: "workspace-1",
    },
    {
      attachments: [],
      auditLogHref: "/projects?workspaceId=workspace-1#audit",
      batchId: "runbook-1",
      blockerCount: 0,
      checklistEvidence: ["Risk digest archived."],
      comments: [],
      completedAt: "2026-01-04T09:00:00.000Z",
      detail: "Archive evidence after approval.",
      dueAt: "2026-01-04T09:00:00.000Z",
      milestoneId: "milestone-2",
      ownerEmail: "governance@example.com",
      ownerName: "Governance Owner",
      ownerUserId: "user-governance",
      projectId: null,
      projectName: null,
      sourceKey: "governance:evidence-archive",
      status: "complete",
      title: "Archive evidence",
      transitionHistory: [],
      workspaceId: "workspace-1",
    },
  ],
  summary: {
    blockedCount: 1,
    completeCount: 1,
    inProgressCount: 0,
    nextDueAt: "2026-01-06T09:00:00.000Z",
    ownerCount: 2,
    scheduledCount: 0,
    totalCount: 2,
  },
};

const boardApprovalDiff: BoardApprovalPacketDiffReport = {
  csvContent: "kind,metric\n",
  csvDataUri: "data:text/csv;charset=utf-8,kind%2Cmetric",
  csvFileName: "diff.csv",
  generatedAt,
  rows: [],
  summary: {
    baselinePacketId: "packet-approval-1",
    baselineSavedAt: "2026-01-01T10:00:00.000Z",
    blockerDelta: 2,
    changeCount: 3,
    checksumChanged: true,
    criticalChangeCount: 1,
    currentPacketId: "packet-current",
    improvementCount: 0,
    latestSnapshotId: null,
    nextAction: "Re-open board approval before release.",
    regressionCount: 2,
    scoreDelta: -24,
    status: "blocked",
    warningChangeCount: 1,
  },
};

const report = createBoardDecisionReplayAuditReport({
  boardApprovalDiff,
  generatedAt,
  incidentHistory,
  packetHistory,
  releaseEvidenceSummary,
  releaseRunbook,
  workspaceId: "workspace-1",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.activeApprovalCount, 1);
assert.equal(report.summary.laterIncidentCount, 1);
assert.equal(report.summary.releaseEvidenceDriftCount, 1);
assert.equal(report.summary.runbookBlockedCount, 1);
assert.ok(report.summary.replayScore < 80);
assert.ok(report.rows.some((row) => row.kind === "incident" && row.status === "blocked"));
assert.ok(report.rows.some((row) => row.kind === "release-evidence-drift" && row.delta === 3));
assert.ok(report.rows.some((row) => row.kind === "runbook-outcome" && row.currentValue === "1/2 complete"));
assert.match(report.csvContent, /approval_id,packet_id,recipient_purpose,kind,status/);
assert.match(report.summary.nextAction, /Re-open board approval/);

console.log("board decision replay audit smoke passed");
