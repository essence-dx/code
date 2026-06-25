import { strict as assert } from "node:assert";
import { createBoardAssuranceExceptionWorkflow } from "@/features/projects/board-assurance-exceptions";
import type { BoardDecisionReplayAuditReport } from "@/features/projects/board-decision-replay-audit";
import type { WorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";

const generatedAt = "2026-01-15T12:00:00.000Z";

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
      baselineValue: "92/100 approval, 0 blockers",
      currentValue: "68/100 risk score, 3 blockers",
      delta: 3,
      detail: "Release evidence drift introduced blockers.",
      id: "evidence-drift:approval-1",
      kind: "release-evidence-drift",
      nextAction: "Re-open board approval before release.",
      occurredAt: generatedAt,
      packetId: "packet-approval-1",
      recipientPurpose: "board approval",
      status: "blocked",
      title: "Release evidence drift",
    },
    {
      approvalId: "approval-1",
      approvedAt: "2026-01-01T10:00:00.000Z",
      baselineValue: "No later incident",
      currentValue: "No later incident",
      delta: 0,
      detail: "No later incident occurred.",
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
    blockedRowCount: 2,
    latestApprovalAt: "2026-01-01T10:00:00.000Z",
    laterIncidentCount: 1,
    nextAction: "Re-open board approval before release.",
    readyApprovalCount: 1,
    releaseEvidenceDriftCount: 1,
    replayScore: 63,
    rowCount: 3,
    runbookBlockedCount: 1,
    runbookIncompleteCount: 1,
    status: "blocked",
    watchRowCount: 0,
  },
  workspaceId: "workspace-1",
};

const releaseCalendar: WorkspaceReleaseCalendarReport = {
  generatedAt,
  milestones: [
    {
      actionLabel: "Inspect failed checks",
      blockerCount: 2,
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
    {
      actionLabel: "Approved",
      blockerCount: 0,
      completedAt: "2026-01-14T09:00:00.000Z",
      detail: "Public link approval is clear.",
      dueAt: "2026-01-14T09:00:00.000Z",
      id: "review-workflow:project-1:review-gate:publicLink",
      kind: "review-gate",
      projectId: "project-1",
      projectName: "Launch scene",
      source: "review-workflow",
      sourceKey: "project-1:review-gate:publicLink",
      status: "done",
      title: "Public link review",
    },
  ],
  summary: {
    appPackageCount: 0,
    blockedCount: 1,
    desktopChannelCount: 0,
    doneCount: 1,
    dueCount: 0,
    nextMilestoneAt: "2026-01-15T09:00:00.000Z",
    postDeployCount: 1,
    reviewGateCount: 1,
    scheduledCount: 0,
    totalCount: 2,
  },
};

const workflow = createBoardAssuranceExceptionWorkflow({
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
    {
      approverNote: "Evidence drift is too broad.",
      approverSignoff: "changes-requested",
      expiresAt: "2026-01-20T12:00:00.000Z",
      id: "exception-drift",
      ownerNote: "Ask board to accept evidence drift.",
      releaseGateSourceKeys: [],
      requestedAt: "2026-01-15T10:30:00.000Z",
      requestedBy: "Evidence Owner",
      scopeId: "evidence-drift:approval-1",
      signedOffAt: null,
      signedOffBy: null,
    },
  ],
  generatedAt,
  releaseCalendar,
  replayAudit,
});

assert.equal(workflow.summary.totalCount, 2);
assert.equal(workflow.summary.releaseGateBlockedCount, 1);
assert.equal(workflow.summary.rejectedCount, 1);
assert.equal(workflow.summary.requestNeededCount, 0);
assert.equal(workflow.summary.workflowScore, 25);
assert.equal(workflow.rows[0]?.status, "release-gate-blocked");
assert.equal(workflow.rows.find((row) => row.scopeId === "evidence-drift:approval-1")?.status, "rejected");
assert.match(workflow.csvContent, /scope_id,replay_status,exception_status,expires_at,release_gate_status/);
assert.match(workflow.csvDataUri, /^data:text\/csv/);
assert.match(workflow.summary.nextAction, /Clear blocked release gates/);

const clearWorkflow = createBoardAssuranceExceptionWorkflow({
  exceptionRequests: [
    {
      approverNote: "Accepted for two days.",
      approverSignoff: "approved",
      expiresAt: "2026-01-17T12:00:00.000Z",
      id: "exception-incident-clear",
      ownerNote: "Accept launch after smoke recovery.",
      releaseGateSourceKeys: ["post-deploy:synthetic-smoke"],
      requestedAt: "2026-01-15T10:00:00.000Z",
      requestedBy: "Release Owner",
      scopeId: "incident:approval-1:project-1",
      signedOffAt: "2026-01-15T11:00:00.000Z",
      signedOffBy: "Board Reviewer",
    },
    {
      approverNote: "Accepted after evidence recheck.",
      approverSignoff: "approved",
      expiresAt: "2026-01-17T12:00:00.000Z",
      id: "exception-drift-clear",
      ownerNote: "Accept evidence drift after recheck.",
      releaseGateSourceKeys: [],
      requestedAt: "2026-01-15T10:00:00.000Z",
      requestedBy: "Evidence Owner",
      scopeId: "evidence-drift:approval-1",
      signedOffAt: "2026-01-15T11:00:00.000Z",
      signedOffBy: "Board Reviewer",
    },
  ],
  generatedAt,
  releaseCalendar: {
    ...releaseCalendar,
    milestones: releaseCalendar.milestones.map((milestone) => ({ ...milestone, blockerCount: 0, completedAt: generatedAt, status: "done" })),
    summary: {
      ...releaseCalendar.summary,
      blockedCount: 0,
      doneCount: 2,
      nextMilestoneAt: null,
    },
  },
  replayAudit,
});

assert.equal(clearWorkflow.summary.approvedCount, 2);
assert.equal(clearWorkflow.summary.releaseGateBlockedCount, 0);
assert.equal(clearWorkflow.summary.workflowScore, 100);
assert.equal(clearWorkflow.summary.status, "approved");

console.log("board assurance exceptions smoke passed");
