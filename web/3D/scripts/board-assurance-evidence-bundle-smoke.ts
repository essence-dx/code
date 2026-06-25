import { strict as assert } from "node:assert";
import { createBoardAssuranceExceptionWorkflow } from "@/features/projects/board-assurance-exceptions";
import { createBoardAssuranceEvidenceBundleReport } from "@/features/projects/board-assurance-evidence-bundle";
import { createBoardApprovalPacketHistoryRecord, createBoardApprovalPacketHistoryReport } from "@/features/projects/board-approval-packet-history";
import type { BoardApprovalPacketReport } from "@/features/projects/board-approval-packet";
import type { BoardDecisionReplayAuditReport } from "@/features/projects/board-decision-replay-audit";
import { createBoardDecisionReplaySnapshotHistoryReport, createBoardDecisionReplaySnapshotRecord } from "@/features/projects/board-decision-replay-snapshots";
import type { ProjectIncidentPostmortemReport } from "@/features/projects/project-incident-postmortem";
import type { WorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";

const generatedAt = "2026-01-15T12:00:00.000Z";

const packet: BoardApprovalPacketReport = {
  checksums: {
    packetHash: "sha256:approval-packet",
    sources: [
      {
        contentHash: "sha256:launch",
        id: "launch",
        label: "Launch evidence",
        sourceRecordCount: 2,
        verified: true,
      },
    ],
  },
  criticalPath: [],
  csvContent: "role,status\nlaunch,ready\n",
  csvDataUri: "data:text/csv;charset=utf-8,role%2Cstatus",
  csvFileName: "board.csv",
  executiveMemo: "Approval was signed with a follow-up viewer recovery note.",
  generatedAt: "2026-01-01T09:00:00.000Z",
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "board.json",
  packetId: "packet-approval-1",
  redactedSummary: "Ready for board approval with launch evidence attached.",
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

const approvalHistory = createBoardApprovalPacketHistoryReport([
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

const replayAudit: BoardDecisionReplayAuditReport = {
  csvContent: "approval_id,packet_id,recipient_purpose,kind,status\n",
  csvDataUri: "data:text/csv;charset=utf-8,approval_id",
  csvFileName: "workspace-board-decision-replay-audit.csv",
  generatedAt,
  rows: [
    {
      approvalId: "approval-1",
      approvedAt: "2026-01-01T10:00:00.000Z",
      baselineValue: "92/100 approval, 0 blockers",
      currentValue: "critical post-deploy-failure",
      delta: 1,
      detail: "Viewer failed after approval.",
      id: "incident:approval-1:project-1",
      kind: "incident",
      nextAction: "Re-open board approval and attach the incident remediation before release.",
      occurredAt: "2026-01-05T08:00:00.000Z",
      packetId: "packet-approval-1",
      recipientPurpose: "board approval",
      status: "blocked",
      title: "Post-deploy smoke failed",
    },
    {
      approvalId: "approval-1",
      approvedAt: "2026-01-01T10:00:00.000Z",
      baselineValue: "No later incident",
      currentValue: "No later incident",
      delta: 0,
      detail: "No other later incident occurred.",
      id: "incident:none:approval-1",
      kind: "incident",
      nextAction: "Keep monitoring incidents until release closure.",
      occurredAt: null,
      packetId: "packet-approval-1",
      recipientPurpose: "board approval",
      status: "ready",
      title: "No later incidents",
    },
  ],
  summary: {
    activeApprovalCount: 1,
    blockedRowCount: 1,
    latestApprovalAt: "2026-01-01T10:00:00.000Z",
    laterIncidentCount: 1,
    nextAction: "Re-open board approval and attach the incident remediation before release.",
    readyApprovalCount: 1,
    releaseEvidenceDriftCount: 0,
    replayScore: 70,
    rowCount: 2,
    runbookBlockedCount: 1,
    runbookIncompleteCount: 1,
    status: "blocked",
    watchRowCount: 0,
  },
  workspaceId: "workspace-1",
};

const replaySnapshotHistory = createBoardDecisionReplaySnapshotHistoryReport([
  createBoardDecisionReplaySnapshotRecord({
    actor: {
      email: "board@example.com",
      name: "Board Secretary",
      userId: "user-board",
    },
    createdAt: "2026-01-15T12:00:00.000Z",
    id: "snapshot-1",
    report: replayAudit,
    workspaceId: "workspace-1",
  }),
]);

const incidentPostmortemReport: ProjectIncidentPostmortemReport = {
  generatedAt,
  summary: {
    blockedCount: 0,
    completedRemediationCount: 1,
    criticalTemplateCount: 1,
    failedSmokeCheckCount: 1,
    linkedDrillCount: 1,
    readyCount: 1,
    templateCount: 1,
    watchCount: 0,
  },
  templates: [
    {
      completedRemediations: [
        {
          completedAt: "2026-01-07T09:00:00.000Z",
          evidence: ["Viewer smoke passed after rollback."],
          ownerName: "Release Owner",
          title: "Repair viewer failure",
        },
      ],
      failedSmokeChecks: [
        {
          issues: ["Viewer returned 500."],
          label: "Viewer smoke",
          url: "https://example.com/viewer",
        },
      ],
      followUpActions: ["Attach viewer recovery proof to the board packet."],
      generatedAt,
      id: "postmortem:incident-1",
      incident: {
        details: ["Viewer returned 500 after board approval."],
        id: "incident-1",
        kind: "post-deploy-failure",
        message: "Viewer failed after approval.",
        occurredAt: "2026-01-05T08:00:00.000Z",
        projectId: "project-1",
        projectName: "Launch scene",
        severity: "critical",
        source: "post-deploy-smoke",
        title: "Post-deploy smoke failed",
      },
      ownerHint: "Web release owner",
      readinessScore: 100,
      relatedReleaseDrills: [
        {
          dueAt: "2026-01-08T09:00:00.000Z",
          label: "Deploy smoke failure",
          lastRunAt: "2026-01-07T09:00:00.000Z",
          nextAction: "Keep smoke recovery proof attached.",
          outcome: "ready",
        },
      ],
      status: "ready",
      timelinePrompts: ["Incident detected: 2026-01-05T08:00:00.000Z from post-deploy-smoke."],
    },
  ],
};

const runbookReport: WorkspaceReleaseRunbookReport = {
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
      blockerCount: 0,
      checklistEvidence: ["Viewer smoke passed after rollback."],
      comments: [],
      completedAt: "2026-01-07T09:00:00.000Z",
      detail: "Repair post-approval public viewer failure.",
      dueAt: "2026-01-06T09:00:00.000Z",
      milestoneId: "milestone-1",
      ownerEmail: "release@example.com",
      ownerName: "Release Owner",
      ownerUserId: "user-release",
      projectId: "project-1",
      projectName: "Launch scene",
      sourceKey: "post-deploy:synthetic-smoke",
      status: "complete",
      title: "Repair viewer failure",
      transitionHistory: [],
      workspaceId: "workspace-1",
    },
    {
      attachments: [],
      auditLogHref: "/projects?workspaceId=workspace-1#audit",
      batchId: "runbook-1",
      blockerCount: 1,
      checklistEvidence: ["Evidence drift still needs approval."],
      comments: [],
      completedAt: null,
      detail: "Close evidence drift before final board archive.",
      dueAt: "2026-01-10T09:00:00.000Z",
      milestoneId: "milestone-2",
      ownerEmail: "governance@example.com",
      ownerName: "Governance Owner",
      ownerUserId: "user-governance",
      projectId: null,
      projectName: null,
      sourceKey: "governance:evidence-archive",
      status: "blocked",
      title: "Close evidence drift",
      transitionHistory: [],
      workspaceId: "workspace-1",
    },
  ],
  summary: {
    blockedCount: 1,
    completeCount: 1,
    inProgressCount: 0,
    nextDueAt: "2026-01-10T09:00:00.000Z",
    ownerCount: 2,
    scheduledCount: 0,
    totalCount: 2,
  },
};

const releaseCalendar: WorkspaceReleaseCalendarReport = {
  generatedAt,
  milestones: [
    {
      actionLabel: "Inspect failed checks",
      blockerCount: 1,
      completedAt: null,
      detail: "Post-deploy route checks need attention.",
      dueAt: "2026-01-15T09:00:00.000Z",
      id: "post-deploy-smoke:post-deploy:synthetic-smoke",
      kind: "post-deploy",
      projectId: "project-1",
      projectName: "Launch scene",
      source: "post-deploy-smoke",
      sourceKey: "post-deploy:synthetic-smoke",
      status: "blocked",
      title: "Post-deploy synthetic checks",
    },
  ],
  summary: {
    appPackageCount: 0,
    blockedCount: 1,
    desktopChannelCount: 0,
    doneCount: 0,
    dueCount: 0,
    nextMilestoneAt: "2026-01-15T09:00:00.000Z",
    postDeployCount: 1,
    reviewGateCount: 0,
    scheduledCount: 0,
    totalCount: 1,
  },
};

const exceptionWorkflow = createBoardAssuranceExceptionWorkflow({
  exceptionRequests: [
    {
      approverNote: "Allowed only after smoke recovery is attached.",
      approverSignoff: "approved",
      expiresAt: "2026-01-18T12:00:00.000Z",
      id: "exception-incident",
      ownerNote: "Temporarily accept launch while the viewer fix is verified.",
      releaseGateSourceKeys: ["post-deploy:synthetic-smoke"],
      requestedAt: "2026-01-15T10:00:00.000Z",
      requestedBy: "Release Owner",
      scopeId: "incident:approval-1:project-1",
      signedOffAt: "2026-01-15T11:00:00.000Z",
      signedOffBy: "Board Reviewer",
    },
  ],
  generatedAt,
  releaseCalendar,
  replayAudit,
});

const report = createBoardAssuranceEvidenceBundleReport({
  approvalHistory,
  exceptionWorkflow,
  generatedAt,
  incidentPostmortemReport,
  replayAudit,
  replaySnapshotHistory,
  runbookReport,
  workspaceId: "workspace-1",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.approvalRecordCount, 1);
assert.equal(report.summary.replayRowCount, 2);
assert.equal(report.summary.replaySnapshotCount, 1);
assert.equal(report.summary.incidentPostmortemCount, 1);
assert.equal(report.summary.completedRunbookCount, 1);
assert.equal(report.summary.totalRunbookCount, 2);
assert.equal(report.summary.exceptionCount, 1);
assert.ok(report.summary.blockedEvidenceCount >= 2);
assert.ok(report.summary.evidenceScore < 80);
assert.ok(report.files.some((file) => file.kind === "approval-history" && file.contentHash.startsWith("sha256:")));
assert.ok(report.files.some((file) => file.kind === "incident-postmortems" && file.recordCount === 1));
assert.ok(report.files.some((file) => file.kind === "runbook-proof" && file.status === "blocked"));
assert.match(report.csvContent, /kind,label,status,records,content_hash/);
assert.match(report.jsonContent, /"schemaVersion": 1/);
assert.match(report.jsonDataUri, /^data:application\/json/);
assert.match(report.csvDataUri, /^data:text\/csv/);
assert.equal(report.summary.fileCount, report.files.length);
assert.ok(report.summary.totalByteSize > 0);

console.log("board assurance evidence bundle smoke passed");
