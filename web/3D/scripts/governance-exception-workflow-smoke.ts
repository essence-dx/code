import { strict as assert } from "node:assert";
import { createGovernanceExceptionWorkflow } from "@/features/projects/governance-exception-workflow";
import type { GovernanceTimelineReport } from "@/features/projects/governance-timeline";
import type { PolicyAsCodeReport } from "@/features/projects/policy-as-code-checks";

const generatedAt = "2026-05-16T13:00:00.000Z";

const policyAsCodeReport: PolicyAsCodeReport = {
  generatedAt,
  rows: [
    {
      evidence: "2 permission issues, 1 review-surface blocker, 1 published scene.",
      failCount: 1,
      id: "publish-permissions",
      label: "Publish permissions",
      nextAction: "Approve required review gates or disable public permissions before publishing.",
      ownerHint: "Publishing owner",
      passCount: 2,
      ruleCount: 4,
      rules: [],
      status: "blocked",
      warningCount: 1,
    },
    {
      evidence: "1 policy checked, 0 window issues, 1 stale policy.",
      failCount: 0,
      id: "retention-windows",
      label: "Retention windows",
      nextAction: "Refresh stale policies and finish requested purge approvals.",
      ownerHint: "Compliance owner",
      passCount: 3,
      ruleCount: 4,
      rules: [],
      status: "watch",
      warningCount: 1,
    },
    {
      evidence: "4 archive rows checked, handoff ready, risk healthy.",
      failCount: 0,
      id: "release-approvals",
      label: "Release approvals",
      nextAction: "Keep release approval hashes and attestations with the archive.",
      ownerHint: "Launch owner",
      passCount: 4,
      ruleCount: 4,
      rules: [],
      status: "ready",
      warningCount: 0,
    },
  ],
  summary: {
    blockedCount: 1,
    failedRuleCount: 1,
    passedRuleCount: 9,
    policyScore: 55,
    readyCount: 1,
    totalCount: 3,
    warningRuleCount: 2,
    watchCount: 1,
    worstStatus: "blocked",
  },
};

const governanceTimelineReport: GovernanceTimelineReport = {
  events: [
    {
      actorLabel: "Release Owner",
      correlationCount: 1,
      detail: "Public link approval was changed before release.",
      evidence: "publishing audit event for Launch scene.",
      id: "audit:audit-1",
      occurredAt: "2026-05-16T10:00:00.000Z",
      ownerHint: "Release Owner",
      projectId: "project-1",
      projectName: "Launch scene",
      relatedEventIds: ["incident:incident-1"],
      relatedSources: ["incident"],
      severity: "critical",
      source: "audit",
      statusLabel: "danger",
      title: "Publish approval blocked",
    },
    {
      actorLabel: null,
      correlationCount: 0,
      detail: "Public checks are healthy.",
      evidence: "2 samples, 0 failures, 0 pending items.",
      id: "slo:public-surfaces",
      occurredAt: "2026-05-16T12:00:00.000Z",
      ownerHint: "Operations owner",
      projectId: null,
      projectName: null,
      relatedEventIds: [],
      relatedSources: [],
      severity: "healthy",
      source: "slo",
      statusLabel: "healthy",
      title: "SLO: Public surfaces",
    },
  ],
  generatedAt,
  summary: {
    correlatedCount: 1,
    criticalCount: 1,
    earliestAt: "2026-05-16T10:00:00.000Z",
    healthyCount: 1,
    infoCount: 0,
    latestAt: "2026-05-16T12:00:00.000Z",
    sourceCounts: {
      audit: 1,
      incident: 0,
      postmortem: 0,
      "release-drill": 0,
      "resource-guardrail": 0,
      slo: 1,
    },
    timelineScore: 50,
    totalCount: 2,
    warningCount: 0,
  },
};

const workflow = createGovernanceExceptionWorkflow({
  exceptionRequests: [
    {
      expiresAt: "2026-05-23T13:00:00.000Z",
      id: "exception-approved",
      ownerNote: "Temporarily allow launch while the public-link review board signs the remaining gate.",
      requestedAt: "2026-05-16T12:30:00.000Z",
      requestedBy: "Release Owner",
      reviewerNote: "Approved for one week with rollback owner assigned.",
      reviewerSignoff: "approved",
      scopeId: "policy:publish-permissions",
      scopeLabel: "Publish permissions",
      signedOffAt: "2026-05-16T12:45:00.000Z",
      signedOffBy: "Governance Reviewer",
    },
    {
      expiresAt: "2026-05-15T13:00:00.000Z",
      id: "exception-expired",
      ownerNote: "Old retention exception.",
      requestedAt: "2026-05-10T12:30:00.000Z",
      requestedBy: "Compliance Owner",
      reviewerNote: "This approval window is over.",
      reviewerSignoff: "approved",
      scopeId: "policy:retention-windows",
      scopeLabel: "Retention windows",
      signedOffAt: "2026-05-10T12:45:00.000Z",
      signedOffBy: "Governance Reviewer",
    },
  ],
  generatedAt,
  governanceTimelineReport,
  policyAsCodeReport,
});

assert.equal(workflow.summary.totalCount, 3);
assert.equal(workflow.summary.approvedCount, 1);
assert.equal(workflow.summary.expiredCount, 1);
assert.equal(workflow.summary.reviewNeededCount, 1);
assert.equal(workflow.summary.workflowScore, 50);
assert.equal(workflow.rows[0]?.id, "exception:policy:retention-windows");
assert.equal(workflow.rows.find((row) => row.id === "exception:policy:publish-permissions")?.status, "approved");
assert.equal(workflow.rows.find((row) => row.id === "suggested:timeline:audit:audit-1")?.status, "review-needed");

const readyWorkflow = createGovernanceExceptionWorkflow({
  exceptionRequests: [],
  generatedAt,
  governanceTimelineReport: {
    ...governanceTimelineReport,
    events: governanceTimelineReport.events.filter((event) => event.severity === "healthy"),
    summary: {
      ...governanceTimelineReport.summary,
      criticalCount: 0,
      totalCount: 1,
    },
  },
  policyAsCodeReport: {
    ...policyAsCodeReport,
    rows: policyAsCodeReport.rows.map((row) => ({
      ...row,
      failCount: 0,
      status: "ready",
      warningCount: 0,
    })),
    summary: {
      ...policyAsCodeReport.summary,
      blockedCount: 0,
      watchCount: 0,
      worstStatus: "ready",
    },
  },
});

assert.equal(readyWorkflow.summary.totalCount, 0);
assert.equal(readyWorkflow.summary.workflowScore, 100);
assert.equal(readyWorkflow.rows.length, 0);

console.log("governance exception workflow smoke passed");
