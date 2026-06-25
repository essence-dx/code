import { strict as assert } from "node:assert";
import type { RuntimeReleaseAutomationNotificationRoutingReport } from "@/features/projects/runtime-release-automation-notification-routing";
import type { RuntimeReleaseAutomationRunbook } from "@/features/projects/runtime-release-automation-runbook";
import type { RuntimeReleasePromotionRehearsalPacket } from "@/features/projects/runtime-release-promotion-rehearsal-packet";
import { createRuntimeReleaseAutomationVerification } from "@/features/projects/runtime-release-automation-verification";

const readyRunbook = {
  summary: {
    blockedCommandCount: 0,
    blockedGuardrailCount: 0,
    commandCount: 3,
    missingCommandKindCount: 0,
    releaseCandidateId: "runtime-ready",
    rollbackGuardrailCount: 2,
    runbookHash: "sha256:ready-runbook",
    runbookScore: 100,
    status: "ready",
  },
  workspaceId: "Essence Runtime",
} as RuntimeReleaseAutomationRunbook;

const blockedRunbook = {
  summary: {
    blockedCommandCount: 1,
    blockedGuardrailCount: 1,
    commandCount: 1,
    missingCommandKindCount: 2,
    releaseCandidateId: "runtime-blocked",
    rollbackGuardrailCount: 1,
    runbookHash: "sha256:blocked-runbook",
    runbookScore: 55,
    status: "blocked",
  },
  workspaceId: "Essence Runtime",
} as RuntimeReleaseAutomationRunbook;

const readyRehearsal = {
  summary: {
    failedStepCount: 0,
    missingCoverageCount: 0,
    packetHash: "sha256:ready-rehearsal",
    rehearsalScore: 100,
    requiredCoverageCount: 4,
    status: "ready",
    warningStepCount: 0,
  },
  workspaceId: "Essence Runtime",
} as RuntimeReleasePromotionRehearsalPacket;

const blockedRehearsal = {
  summary: {
    failedStepCount: 1,
    missingCoverageCount: 1,
    packetHash: "sha256:blocked-rehearsal",
    rehearsalScore: 42,
    requiredCoverageCount: 3,
    status: "blocked",
    warningStepCount: 0,
  },
  workspaceId: "Essence Runtime",
} as RuntimeReleasePromotionRehearsalPacket;

const notificationRouting = {
  summary: {
    eligibleRouteCount: 11,
    notificationCount: 3,
    routeCount: 24,
    routingHash: "sha256:notification-routing",
    routingScore: 46,
    status: "critical",
    suppressedByPreferenceCount: 3,
    suppressedByRoleCount: 10,
  },
  workspaceId: "Essence Runtime",
} as RuntimeReleaseAutomationNotificationRoutingReport;

const report = createRuntimeReleaseAutomationVerification({
  generatedAt: "2026-05-18T10:00:00.000Z",
  notificationRouting,
  rehearsalPackets: [readyRehearsal, blockedRehearsal],
  runbooks: [readyRunbook, blockedRunbook],
  workspaceId: "Essence Runtime",
});

assert.equal(report.summary.status, "ready");
assert.equal(report.summary.coverageScore, 100);
assert.equal(report.summary.runbookTransitionCoverageCount, 2);
assert.equal(report.summary.rehearsalScoringCoverageCount, 2);
assert.equal(report.summary.notificationRouteEligibilityCount, 1);
assert.equal(report.summary.blockedCoverageCount, 0);
assert.ok(report.summary.verificationHash.startsWith("sha256:"));
assert.deepEqual(
  report.rows.map((row) => row.id),
  ["runbook:ready", "runbook:blocked", "rehearsal:ready", "rehearsal:blocked", "notification:route-eligibility"],
);
assert.match(report.csvContent, /^verification_id,kind,status,scenario_count,evidence_hash,next_action/);
assert.ok(report.jsonContent.includes("notification:route-eligibility"));
assert.equal(report.csvFileName, "essence-runtime-runtime-release-automation-verification-20260518.csv");
assert.equal(report.jsonFileName, "essence-runtime-runtime-release-automation-verification-20260518.json");
assert.ok(report.csvDataUri.startsWith("data:text/csv"));
assert.ok(report.jsonDataUri.startsWith("data:application/json"));

const missingNotificationCoverage = createRuntimeReleaseAutomationVerification({
  notificationRouting: {
    ...notificationRouting,
    summary: {
      ...notificationRouting.summary,
      eligibleRouteCount: 0,
      routeCount: 0,
    },
  },
  rehearsalPackets: [readyRehearsal],
  runbooks: [readyRunbook],
});

assert.equal(missingNotificationCoverage.summary.status, "blocked");
assert.equal(missingNotificationCoverage.rows.find((row) => row.id === "notification:route-eligibility")?.status, "blocked");
assert.match(missingNotificationCoverage.summary.nextAction, /Add missing/);

console.log("runtime release automation verification smoke passed");
