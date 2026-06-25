import { strict as assert } from "node:assert";
import type { RuntimeReleaseApprovalChecklist } from "@/features/projects/runtime-release-approval-checklist";
import type { RuntimeReleaseGatesReport } from "@/features/projects/runtime-release-gates";
import { createRuntimeReleaseOperatorQueue } from "@/features/projects/runtime-release-operator-queue";

const releaseGates = {
  csvDataUri: "data:text/csv;charset=utf-8,gate",
  csvFileName: "runtime-gates.csv",
  gates: [
    {
      blockerCount: 2,
      evidenceHash: "sha256:perf",
      id: "performance-budgets",
      label: "Performance budgets",
      nextAction: "Reduce p95 timings.",
      status: "blocked",
    },
    {
      blockerCount: 0,
      evidenceHash: "sha256:replay",
      id: "deterministic-replay",
      label: "Deterministic replay",
      nextAction: "Replay ready.",
      status: "ready",
    },
    {
      blockerCount: 1,
      evidenceHash: "sha256:material",
      id: "material-parity",
      label: "Material parity",
      nextAction: "Resolve material drift.",
      status: "blocked",
    },
  ],
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "runtime-gates.json",
  summary: {
    releaseGateHash: "sha256:gates",
  },
} as RuntimeReleaseGatesReport;

const approvalChecklist = {
  csvDataUri: "data:text/csv;charset=utf-8,gate",
  csvFileName: "runtime-approval.csv",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "runtime-approval.json",
  summary: {
    approvalHash: "sha256:approval",
    status: "blocked",
  },
} as RuntimeReleaseApprovalChecklist;

const queue = createRuntimeReleaseOperatorQueue({
  approvalChecklist,
  assignments: {
    "deterministic-replay": {
      dueAt: "2026-05-19T10:00:00.000Z",
      ownerEmail: "qa@example.com",
      ownerName: "QA Lead",
    },
    "material-parity": {
      dueAt: "2026-05-18T10:00:00.000Z",
      ownerEmail: "art@example.com",
      ownerName: "Material Owner",
    },
    "performance-budgets": {
      dueAt: "2026-05-16T10:00:00.000Z",
      ownerEmail: "perf@example.com",
      ownerName: "Performance Owner",
    },
  },
  generatedAt: "2026-05-17T10:00:00.000Z",
  releaseCandidateId: "runtime-2026-05-17",
  runtimeReleaseGates: releaseGates,
  workspaceId: "Essence Runtime",
});

assert.equal(queue.summary.status, "overdue");
assert.equal(queue.summary.blockedCount, 2);
assert.equal(queue.summary.overdueCount, 1);
assert.equal(queue.summary.readyCount, 1);
assert.equal(queue.summary.assignedCount, 3);
assert.equal(queue.summary.queueScore, 33);
assert.ok(queue.summary.queueHash.startsWith("sha256:"));
assert.deepEqual(
  queue.rows.map((row) => row.gateId),
  ["performance-budgets", "material-parity", "deterministic-replay"],
);
assert.equal(queue.rows[0]?.status, "overdue");
assert.equal(queue.rows[0]?.ownerName, "Performance Owner");
assert.equal(queue.rows[0]?.downloadCount, 4);
assert.equal(queue.rows[0]?.downloads.some((download) => download.id === "runtime-gates-csv"), true);
assert.equal(queue.rows[1]?.status, "blocked");
assert.equal(queue.rows[2]?.status, "ready");
assert.match(queue.csvContent, /^gate,status,owner,owner_email,due_at,blockers,evidence_hash,next_action/);
assert.ok(queue.jsonContent.includes("runtime-2026-05-17"));
assert.equal(queue.csvFileName, "essence-runtime-runtime-release-operator-queue-20260517.csv");
assert.ok(queue.csvDataUri.startsWith("data:text/csv"));
assert.ok(queue.jsonDataUri.startsWith("data:application/json"));

const unassignedQueue = createRuntimeReleaseOperatorQueue({
  approvalChecklist,
  generatedAt: "2026-05-17T10:00:00.000Z",
  runtimeReleaseGates: releaseGates,
});

assert.equal(unassignedQueue.summary.unassignedCount, 3);
assert.equal(unassignedQueue.summary.status, "blocked");
assert.equal(unassignedQueue.rows.every((row) => row.ownerName === "Unassigned"), true);

console.log("runtime release operator queue smoke passed");
