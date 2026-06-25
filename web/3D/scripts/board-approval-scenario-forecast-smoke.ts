import assert from "node:assert/strict";
import { createBoardApprovalScenarioForecast } from "@/features/projects/board-approval-scenario-forecast";
import type { BoardAssuranceExceptionWorkflowReport } from "@/features/projects/board-assurance-exceptions";
import type { BoardEvidenceAcceptanceCampaignReport } from "@/features/projects/board-evidence-acceptance-campaign";
import type { BoardReleaseVarianceDashboard } from "@/features/projects/board-release-variance-dashboard";

const generatedAt = "2026-05-17T08:00:00.000Z";

const varianceDashboard: BoardReleaseVarianceDashboard = {
  csvContent: "",
  csvDataUri: "",
  csvFileName: "variance.csv",
  generatedAt,
  rows: [
    {
      currentValue: 78,
      delta: -14,
      detail: "Replay score fell after release evidence drift.",
      direction: "declining",
      id: "approval-score",
      label: "Approval score variance",
      nextAction: "Explain the approval-score decline in the board variance packet before release.",
      previousValue: 92,
      status: "watch",
      unit: "score",
    },
    {
      currentValue: 3,
      delta: 2,
      detail: "Two new blockers were introduced after approval.",
      direction: "declining",
      id: "blocker-drift",
      label: "Blocker drift",
      nextAction: "Resolve blocker drift before release.",
      previousValue: 1,
      status: "blocked",
      unit: "count",
    },
    {
      currentValue: 2,
      delta: 2,
      detail: "Two recurring incidents are linked.",
      direction: "declining",
      id: "incident-recurrence",
      label: "Incident recurrence",
      nextAction: "Attach recurring incident remediation.",
      previousValue: 0,
      status: "blocked",
      unit: "count",
    },
    {
      currentValue: 60,
      delta: -40,
      detail: "Three of five runbook rows are complete.",
      direction: "declining",
      id: "runbook-follow-through",
      label: "Runbook follow-through",
      nextAction: "Complete or exception open runbook rows.",
      previousValue: 100,
      status: "blocked",
      unit: "percent",
    },
  ],
  summary: {
    approvalScoreDelta: -14,
    blockedCount: 3,
    blockerDrift: 2,
    incidentRecurrenceDelta: 2,
    nextAction: "Resolve blocker drift before release.",
    readyCount: 0,
    rowCount: 4,
    runbookFollowThroughDelta: -40,
    status: "blocked",
    trendPointCount: 2,
    varianceScore: 53,
    watchCount: 1,
  },
  trendPoints: [
    {
      at: "2026-05-15T08:00:00.000Z",
      blockedRows: 1,
      laterIncidents: 0,
      replayScore: 92,
      runbookBlocked: 0,
      runbookIncomplete: 1,
      snapshotId: "snapshot-older",
    },
    {
      at: "2026-05-17T08:00:00.000Z",
      blockedRows: 3,
      laterIncidents: 2,
      replayScore: 78,
      runbookBlocked: 1,
      runbookIncomplete: 2,
      snapshotId: "snapshot-current",
    },
  ],
  workspaceId: "workspace-board",
};

const acceptanceCampaign: BoardEvidenceAcceptanceCampaignReport = {
  campaignId: "board-evidence-acceptance-workspace-board-20260517",
  csvContent: "",
  csvDataUri: "",
  csvFileName: "acceptance.csv",
  generatedAt,
  rows: [
    {
      acceptedAt: null,
      acceptedBy: null,
      attestationNote: null,
      attestationStatus: "missing",
      detail: "Replay audit evidence must be accepted.",
      evidenceHash: "sha256:replay",
      kind: "bundle-file",
      nextAction: "Collect owner attestation before closing this board evidence scope.",
      owner: "Evidence owner",
      scopeId: "file:replay-audit:replay/audit.json",
      sourceStatus: "ready",
      status: "pending",
      title: "Replay audit",
    },
    {
      acceptedAt: null,
      acceptedBy: "release-owner@example.com",
      attestationNote: "Incident is not remediated.",
      attestationStatus: "blocked",
      detail: "Incident recurrence remains open.",
      evidenceHash: null,
      kind: "replay-blocker",
      nextAction: "Resolve the owner-blocked attestation before board review closeout.",
      owner: "Release owner",
      scopeId: "replay:incident-recurrence",
      sourceStatus: "blocked",
      status: "blocked",
      title: "Incident recurrence",
    },
  ],
  summary: {
    acceptanceScore: 25,
    acceptedCount: 0,
    blockedCount: 1,
    nextAction: "Resolve the owner-blocked attestation before board review closeout.",
    pendingCount: 1,
    scopeCount: 2,
    status: "blocked",
    watchCount: 0,
  },
  workspaceId: "workspace-board",
};

const exceptionWorkflow: BoardAssuranceExceptionWorkflowReport = {
  csvContent: "",
  csvDataUri: "",
  csvFileName: "exceptions.csv",
  generatedAt,
  rows: [
    {
      approverNote: "Temporary exception expires soon.",
      approverSignoff: "changes-requested",
      blockedReleaseGateCount: 1,
      checkedReleaseGateCount: 1,
      dueReleaseGateCount: 1,
      evidence: "Signed exception expires in two days.",
      exceptionId: "exception-1",
      expiresAt: "2026-05-19T08:00:00.000Z",
      expiresInDays: 2,
      id: "exception-row-1",
      nextAction: "Refresh approval before expiry.",
      ownerNote: "Awaiting reviewer.",
      releaseGateLabels: ["Board assurance gate"],
      releaseGateSourceKeys: ["board:gate"],
      releaseGateStatus: "blocked",
      replayKind: "incident",
      replayStatus: "blocked",
      requestedAt: "2026-05-15T08:00:00.000Z",
      requestedBy: "release-owner@example.com",
      scopeId: "blocker-1",
      signedOffAt: "2026-05-16T08:00:00.000Z",
      signedOffBy: "board@example.com",
      status: "release-gate-blocked",
      title: "Replay blocker exception",
    },
  ],
  summary: {
    approvedCount: 0,
    expiredCount: 0,
    expiringSoonCount: 1,
    nextAction: "Refresh approval before expiry.",
    pendingCount: 0,
    rejectedCount: 0,
    releaseGateBlockedCount: 1,
    requestNeededCount: 0,
    status: "release-gate-blocked",
    totalCount: 1,
    workflowScore: 35,
  },
  workspaceId: "workspace-board",
};

const forecast = createBoardApprovalScenarioForecast({
  acceptanceCampaign,
  exceptionWorkflow,
  generatedAt,
  varianceDashboard,
  workspaceId: "workspace-board",
});

assert.equal(forecast.summary.status, "blocked");
assert.equal(forecast.summary.forecastScore, 38);
assert.equal(forecast.summary.blockedCount, 3);
assert.equal(forecast.summary.watchCount, 1);
assert.equal(forecast.rows.length, 4);

const exceptionExpiry = forecast.rows.find((row) => row.id === "exception-expiry");
assert.equal(exceptionExpiry?.status, "blocked");
assert.equal(exceptionExpiry?.projectedImpactScore, 30);
assert.equal(exceptionExpiry?.riskProbabilityPercent, 90);
assert.match(exceptionExpiry?.nextAction ?? "", /Renew or close expiring board exceptions/);

const runbookCompletion = forecast.rows.find((row) => row.id === "runbook-completion");
assert.equal(runbookCompletion?.status, "blocked");
assert.equal(runbookCompletion?.projectedImpactScore, 25);

const blockerDrift = forecast.rows.find((row) => row.id === "blocker-drift");
assert.equal(blockerDrift?.status, "blocked");
assert.equal(blockerDrift?.riskProbabilityPercent, 85);

const incidentRecurrence = forecast.rows.find((row) => row.id === "incident-recurrence");
assert.equal(incidentRecurrence?.status, "watch");
assert.equal(incidentRecurrence?.projectedImpactScore, 70);

assert.match(forecast.csvContent, /forecast,status,risk_probability_percent,projected_impact_score,driver,next_action/);

console.log("board approval scenario forecast smoke passed");
