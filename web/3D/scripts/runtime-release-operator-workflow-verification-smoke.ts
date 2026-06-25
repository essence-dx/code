import { strict as assert } from "node:assert";
import type { RuntimeReleaseApprovalChecklist } from "@/features/projects/runtime-release-approval-checklist";
import type { RuntimeReleaseCandidateComparison } from "@/features/projects/runtime-release-candidate-comparison";
import { createRuntimeReleaseOperatorWorkflowVerification } from "@/features/projects/runtime-release-operator-workflow-verification";

const approvalScenarios = [
  {
    releaseCandidateId: "candidate-blocked",
    summary: {
      approvalHash: "sha256:approval-blocked",
      approvalScore: 60,
      blockedGateCount: 1,
      expirationStatus: "active",
      status: "blocked",
    },
  },
  {
    releaseCandidateId: "candidate-approved",
    summary: {
      approvalHash: "sha256:approval-approved",
      approvalScore: 100,
      blockedGateCount: 0,
      expirationStatus: "active",
      status: "approved",
    },
  },
  {
    releaseCandidateId: "candidate-expired",
    summary: {
      approvalHash: "sha256:approval-expired",
      approvalScore: 65,
      blockedGateCount: 0,
      expirationStatus: "expired",
      status: "expired",
    },
  },
  {
    releaseCandidateId: "candidate-pending",
    summary: {
      approvalHash: "sha256:approval-pending",
      approvalScore: 75,
      blockedGateCount: 0,
      expirationStatus: "active",
      status: "pending",
    },
  },
] as RuntimeReleaseApprovalChecklist[];

const comparisonScenarios = [
  {
    currentReleaseCandidateId: "candidate-regressed",
    summary: {
      comparisonHash: "sha256:comparison-regressed",
      comparisonScore: 20,
      diffCount: 4,
      regressionCount: 2,
      status: "blocked",
    },
  },
  {
    currentReleaseCandidateId: "candidate-watch",
    summary: {
      comparisonHash: "sha256:comparison-watch",
      comparisonScore: 80,
      diffCount: 2,
      regressionCount: 0,
      status: "watch",
    },
  },
  {
    currentReleaseCandidateId: "candidate-ready",
    summary: {
      comparisonHash: "sha256:comparison-ready",
      comparisonScore: 100,
      diffCount: 0,
      regressionCount: 0,
      status: "ready",
    },
  },
] as RuntimeReleaseCandidateComparison[];

const report = createRuntimeReleaseOperatorWorkflowVerification({
  approvalScenarios,
  comparisonScenarios,
  generatedAt: "2026-05-17T13:00:00.000Z",
  workspaceId: "Essence Runtime",
});

assert.equal(report.summary.status, "ready");
assert.equal(report.summary.coverageScore, 100);
assert.equal(report.summary.transitionCoverageCount, 4);
assert.equal(report.summary.staleInvalidationCount, 1);
assert.equal(report.summary.diffSummaryCount, 3);
assert.equal(report.summary.blockedCoverageCount, 0);
assert.ok(report.summary.verificationHash.startsWith("sha256:"));
assert.equal(report.rows.length, 7);
assert.equal(report.rows.find((row) => row.id === "approval:approved")?.status, "ready");
assert.equal(report.rows.find((row) => row.id === "approval:expired")?.evidenceHash, "sha256:approval-expired");
assert.equal(report.rows.find((row) => row.id === "comparison:blocked")?.status, "ready");
assert.equal(report.rows.find((row) => row.id === "comparison:watch")?.scenarioCount, 1);
assert.match(report.csvContent, /^verification_id,kind,status,scenario_count,evidence_hash,next_action/);
assert.ok(report.jsonContent.includes("candidate-expired"));
assert.equal(report.csvFileName, "essence-runtime-runtime-release-operator-workflow-verification-20260517.csv");
assert.equal(report.jsonFileName, "essence-runtime-runtime-release-operator-workflow-verification-20260517.json");
assert.ok(report.csvDataUri.startsWith("data:text/csv"));
assert.ok(report.jsonDataUri.startsWith("data:application/json"));

const missingExpired = createRuntimeReleaseOperatorWorkflowVerification({
  approvalScenarios: approvalScenarios.filter((scenario) => scenario.summary.status !== "expired"),
  comparisonScenarios,
});

assert.equal(missingExpired.summary.status, "blocked");
assert.equal(missingExpired.rows.find((row) => row.id === "approval:expired")?.status, "blocked");
assert.match(missingExpired.summary.nextAction, /Add missing/);

console.log("runtime release operator workflow verification smoke passed");
