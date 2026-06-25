import { strict as assert } from "node:assert";
import type { RuntimeReleaseApprovalChecklist } from "@/features/projects/runtime-release-approval-checklist";
import type { RuntimeReleaseGatesReport } from "@/features/projects/runtime-release-gates";
import type { RuntimeReleaseOperatorQueue } from "@/features/projects/runtime-release-operator-queue";
import { createRuntimeReleaseCandidateComparison } from "@/features/projects/runtime-release-candidate-comparison";

const lastApprovedGates = {
  gates: [
    {
      blockerCount: 0,
      evidenceHash: "sha256:perf-old",
      id: "performance-budgets",
      label: "Performance budgets",
      nextAction: "Ready.",
      status: "ready",
    },
    {
      blockerCount: 0,
      evidenceHash: "sha256:replay-same",
      id: "deterministic-replay",
      label: "Deterministic replay",
      nextAction: "Ready.",
      status: "ready",
    },
    {
      blockerCount: 0,
      evidenceHash: "sha256:material-old",
      id: "material-parity",
      label: "Material parity",
      nextAction: "Ready.",
      status: "ready",
    },
  ],
  summary: {
    releaseGateHash: "sha256:last-gates",
    releaseGateScore: 100,
    status: "ready",
  },
} as RuntimeReleaseGatesReport;

const currentGates = {
  gates: [
    {
      blockerCount: 1,
      evidenceHash: "sha256:perf-new",
      id: "performance-budgets",
      label: "Performance budgets",
      nextAction: "Reduce p95 timings.",
      status: "blocked",
    },
    {
      blockerCount: 0,
      evidenceHash: "sha256:replay-same",
      id: "deterministic-replay",
      label: "Deterministic replay",
      nextAction: "Ready.",
      status: "ready",
    },
    {
      blockerCount: 0,
      evidenceHash: "sha256:material-new",
      id: "material-parity",
      label: "Material parity",
      nextAction: "Ready.",
      status: "ready",
    },
    {
      blockerCount: 0,
      evidenceHash: "sha256:browser-new",
      id: "browser-screenshots",
      label: "Browser screenshots",
      nextAction: "Ready.",
      status: "ready",
    },
  ],
  summary: {
    releaseGateHash: "sha256:current-gates",
    releaseGateScore: 75,
    status: "blocked",
  },
} as RuntimeReleaseGatesReport;

const lastApprovedApproval = {
  summary: {
    approvalHash: "sha256:last-approval",
    approvalScore: 100,
    status: "approved",
  },
} as RuntimeReleaseApprovalChecklist;

const currentApproval = {
  summary: {
    approvalHash: "sha256:current-approval",
    approvalScore: 60,
    status: "blocked",
  },
} as RuntimeReleaseApprovalChecklist;

const lastApprovedQueue = {
  summary: {
    queueHash: "sha256:last-queue",
    queueScore: 100,
    status: "ready",
  },
} as RuntimeReleaseOperatorQueue;

const currentQueue = {
  summary: {
    queueHash: "sha256:current-queue",
    queueScore: 75,
    status: "blocked",
  },
} as RuntimeReleaseOperatorQueue;

const comparison = createRuntimeReleaseCandidateComparison({
  current: {
    approvalChecklist: currentApproval,
    operatorQueue: currentQueue,
    releaseCandidateId: "runtime-2026-05-17",
    runtimeReleaseGates: currentGates,
  },
  generatedAt: "2026-05-17T11:00:00.000Z",
  lastApproved: {
    approvalChecklist: lastApprovedApproval,
    operatorQueue: lastApprovedQueue,
    releaseCandidateId: "runtime-2026-05-10",
    runtimeReleaseGates: lastApprovedGates,
  },
  workspaceId: "Essence Runtime",
});

assert.equal(comparison.summary.status, "blocked");
assert.equal(comparison.summary.diffCount, 6);
assert.equal(comparison.summary.regressionCount, 4);
assert.equal(comparison.summary.improvementCount, 1);
assert.equal(comparison.summary.newGateCount, 1);
assert.equal(comparison.summary.comparisonScore, 14);
assert.ok(comparison.summary.comparisonHash.startsWith("sha256:"));
assert.deepEqual(
  comparison.rows.map((row) => row.id),
  [
    "approval-score",
    "gate:performance-budgets",
    "queue-score",
    "release-gate-score",
    "gate:browser-screenshots",
    "gate:material-parity",
    "gate:deterministic-replay",
  ],
);
assert.equal(comparison.rows.find((row) => row.id === "gate:performance-budgets")?.change, "regressed");
assert.equal(comparison.rows.find((row) => row.id === "gate:browser-screenshots")?.change, "new");
assert.equal(comparison.rows.find((row) => row.id === "gate:deterministic-replay")?.change, "unchanged");
assert.ok(comparison.csvContent.includes("runtime-2026-05-17"));
assert.ok(comparison.jsonContent.includes("runtime-2026-05-10"));
assert.equal(comparison.csvFileName, "essence-runtime-runtime-release-candidate-comparison-20260517.csv");
assert.ok(comparison.csvDataUri.startsWith("data:text/csv"));
assert.ok(comparison.jsonDataUri.startsWith("data:application/json"));

const improved = createRuntimeReleaseCandidateComparison({
  current: {
    approvalChecklist: {
      ...lastApprovedApproval,
      summary: {
        ...lastApprovedApproval.summary,
        approvalHash: "sha256:approval-improved",
        approvalScore: 100,
      },
    },
    operatorQueue: {
      ...lastApprovedQueue,
      summary: {
        ...lastApprovedQueue.summary,
        queueHash: "sha256:queue-improved",
        queueScore: 100,
      },
    },
    releaseCandidateId: "runtime-2026-05-18",
    runtimeReleaseGates: {
      ...currentGates,
      gates: currentGates.gates.map((gate) => ({
        ...gate,
        blockerCount: 0,
        status: "ready",
      })),
      summary: {
        ...currentGates.summary,
        releaseGateHash: "sha256:gates-improved",
        releaseGateScore: 100,
        status: "ready",
      },
    },
  },
  lastApproved: {
    approvalChecklist: currentApproval,
    operatorQueue: currentQueue,
    releaseCandidateId: "runtime-2026-05-17",
    runtimeReleaseGates: currentGates,
  },
});

assert.equal(improved.summary.status, "watch");
assert.equal(improved.summary.regressionCount, 0);
assert.ok(improved.summary.comparisonScore > comparison.summary.comparisonScore);

console.log("runtime release candidate comparison smoke passed");
