import { strict as assert } from "node:assert";
import type { BoardAssuranceEvidenceBundleReport } from "@/features/projects/board-assurance-evidence-bundle";
import type { BoardAssuranceExceptionWorkflowReport } from "@/features/projects/board-assurance-exceptions";
import { createBoardEvidenceAcceptanceCampaign } from "@/features/projects/board-evidence-acceptance-campaign";
import type { BoardDecisionReplayAuditReport } from "@/features/projects/board-decision-replay-audit";

const generatedAt = "2026-01-15T12:00:00.000Z";

const evidenceBundle = {
  bundleId: "board-assurance-evidence-workspace-1-20260115",
  csvContent: "kind,label,status\n",
  csvDataUri: "data:text/csv;charset=utf-8,kind",
  csvFileName: "evidence.csv",
  files: [
    {
      byteSize: 2048,
      contentHash: "sha256:approval",
      kind: "approval-history",
      label: "Board approval packet history",
      nextAction: "Archive active packet approvals.",
      path: "approvals/history.json",
      recordCount: 2,
      status: "ready",
    },
    {
      byteSize: 4096,
      contentHash: "sha256:replay",
      kind: "replay-audit",
      label: "Board decision replay audit",
      nextAction: "Resolve blocked replay rows.",
      path: "replay/audit.json",
      recordCount: 3,
      status: "blocked",
    },
    {
      byteSize: 1024,
      contentHash: "sha256:runbook",
      kind: "runbook-proof",
      label: "Release runbook proof",
      nextAction: "Finish open runbook rows.",
      path: "runbook/proof.json",
      recordCount: 1,
      status: "watch",
    },
    {
      byteSize: 512,
      contentHash: "sha256:postmortem",
      kind: "incident-postmortems",
      label: "Incident postmortems",
      nextAction: "Archive completed postmortems.",
      path: "incidents/postmortems.json",
      recordCount: 1,
      status: "ready",
    },
  ],
  generatedAt,
  jsonContent: "{}",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "evidence.json",
  schemaVersion: 1,
  summary: {
    approvalRecordCount: 2,
    blockedEvidenceCount: 1,
    completedRunbookCount: 1,
    evidenceScore: 70,
    exceptionCount: 1,
    fileCount: 4,
    incidentPostmortemCount: 1,
    nextAction: "Clear blocked evidence before board closure.",
    readyEvidenceCount: 2,
    replayRowCount: 3,
    replaySnapshotCount: 1,
    status: "blocked",
    totalByteSize: 7680,
    totalRunbookCount: 2,
    watchEvidenceCount: 1,
  },
  workspaceId: "workspace-1",
} as BoardAssuranceEvidenceBundleReport;

const replayAudit = {
  csvContent: "approval_id,packet_id,recipient_purpose,kind,status\n",
  csvDataUri: "data:text/csv;charset=utf-8,approval_id",
  csvFileName: "replay.csv",
  generatedAt,
  rows: [
    {
      approvalId: "approval-1",
      approvedAt: "2026-01-10T09:00:00.000Z",
      baselineValue: "92/100 approval",
      currentValue: "critical post-deploy-failure",
      delta: 1,
      detail: "Viewer failed after board approval.",
      id: "incident:approval-1:project-1",
      kind: "incident",
      nextAction: "Attach remediation to the replay packet.",
      occurredAt: "2026-01-14T10:00:00.000Z",
      packetId: "packet-approval-1",
      recipientPurpose: "board launch approval",
      status: "blocked",
      title: "Viewer smoke failed",
    },
    {
      approvalId: "approval-1",
      approvedAt: "2026-01-10T09:00:00.000Z",
      baselineValue: "0 blocked runbook rows",
      currentValue: "1 incomplete runbook row",
      delta: 1,
      detail: "Runbook follow-through still needs proof.",
      id: "runbook:approval-1",
      kind: "runbook-outcome",
      nextAction: "Finish or exception open runbook rows before release closure.",
      occurredAt: generatedAt,
      packetId: "packet-approval-1",
      recipientPurpose: "board launch approval",
      status: "watch",
      title: "Release runbook outcome",
    },
  ],
  summary: {
    activeApprovalCount: 1,
    blockedRowCount: 1,
    latestApprovalAt: "2026-01-10T09:00:00.000Z",
    laterIncidentCount: 1,
    nextAction: "Attach remediation to the replay packet.",
    readyApprovalCount: 1,
    releaseEvidenceDriftCount: 0,
    replayScore: 72,
    rowCount: 2,
    runbookBlockedCount: 0,
    runbookIncompleteCount: 1,
    status: "blocked",
    watchRowCount: 1,
  },
  workspaceId: "workspace-1",
} as BoardDecisionReplayAuditReport;

const exceptionWorkflow = {
  csvContent: "scope_id,replay_status,exception_status\n",
  csvDataUri: "data:text/csv;charset=utf-8,scope_id",
  csvFileName: "exceptions.csv",
  generatedAt,
  rows: [
    {
      approverNote: "Accepted after smoke proof is attached.",
      approverSignoff: "approved",
      blockedReleaseGateCount: 0,
      checkedReleaseGateCount: 1,
      dueReleaseGateCount: 0,
      evidence: "Viewer failed after board approval.",
      exceptionId: "exception-1",
      expiresAt: "2026-01-17T12:00:00.000Z",
      expiresInDays: 2,
      id: "exception:incident:approval-1:project-1",
      nextAction: "Keep the signed exception with the assurance packet.",
      ownerNote: "Accept launch while smoke recovery is verified.",
      releaseGateLabels: ["Post-deploy synthetic checks"],
      releaseGateSourceKeys: ["post-deploy:synthetic-smoke"],
      releaseGateStatus: "clear",
      replayKind: "incident",
      replayStatus: "blocked",
      requestedAt: "2026-01-15T10:00:00.000Z",
      requestedBy: "Release Owner",
      scopeId: "incident:approval-1:project-1",
      signedOffAt: "2026-01-15T11:00:00.000Z",
      signedOffBy: "Board Reviewer",
      status: "approved",
      title: "Viewer smoke failed",
    },
  ],
  summary: {
    approvedCount: 1,
    expiredCount: 0,
    expiringSoonCount: 1,
    nextAction: "Keep the signed exception with the assurance packet.",
    pendingCount: 0,
    rejectedCount: 0,
    releaseGateBlockedCount: 0,
    requestNeededCount: 0,
    status: "approved",
    totalCount: 1,
    workflowScore: 100,
  },
  workspaceId: "workspace-1",
} as BoardAssuranceExceptionWorkflowReport;

const report = createBoardEvidenceAcceptanceCampaign({
  attestations: [
    {
      acceptedAt: "2026-01-15T13:00:00.000Z",
      acceptedBy: "Release Owner",
      note: "Approval history archived.",
      scopeId: "file:approval-history:approvals/history.json",
      status: "accepted",
    },
    {
      acceptedAt: null,
      acceptedBy: null,
      note: "Waiting for remediation proof.",
      scopeId: "replay:incident:approval-1:project-1",
      status: "blocked",
    },
  ],
  evidenceBundle,
  exceptionWorkflow,
  generatedAt,
  replayAudit,
  workspaceId: "workspace-1",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.scopeCount, 7);
assert.equal(report.summary.acceptedCount, 2);
assert.equal(report.summary.blockedCount, 2);
assert.equal(report.summary.pendingCount, 1);
assert.equal(report.summary.watchCount, 2);
assert.equal(report.summary.acceptanceScore, 56);
assert.match(report.summary.nextAction, /Collect owner attestation/);
assert.equal(report.rows[0]?.scopeId, "file:replay-audit:replay/audit.json");
assert.equal(report.rows.find((row) => row.scopeId === "file:approval-history:approvals/history.json")?.attestationStatus, "accepted");
assert.equal(report.rows.find((row) => row.scopeId === "replay:incident:approval-1:project-1")?.attestationStatus, "blocked");
assert.equal(report.rows.find((row) => row.scopeId === "exception:incident:approval-1:project-1")?.attestationStatus, "accepted");
assert.match(report.csvContent, /scope_id,kind,status,attestation_status,title,owner,next_action/);
assert.match(report.csvDataUri, /^data:text\/csv/);

console.log("board evidence acceptance campaign smoke passed");
