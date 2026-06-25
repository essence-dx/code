import { strict as assert } from "node:assert";
import type { RuntimeReleaseGatesReport } from "@/features/projects/runtime-release-gates";
import { createRuntimeReleaseApprovalChecklist } from "@/features/projects/runtime-release-approval-checklist";

const blockedGateReport = {
  gates: [
    {
      blockerCount: 1,
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
  ],
  summary: {
    blockedCount: 1,
    releaseGateHash: "sha256:gates-blocked",
    releaseGateScore: 50,
    status: "blocked",
  },
} as RuntimeReleaseGatesReport;

const readyGateReport = {
  ...blockedGateReport,
  gates: blockedGateReport.gates.map((gate) => ({
    ...gate,
    blockerCount: 0,
    status: "ready",
  })),
  summary: {
    ...blockedGateReport.summary,
    blockedCount: 0,
    releaseGateHash: "sha256:gates-ready",
    releaseGateScore: 100,
    status: "ready",
  },
} as RuntimeReleaseGatesReport;

const blockedChecklist = createRuntimeReleaseApprovalChecklist({
  approvalNotes: "Ready after performance remediation.",
  approvedAt: "2026-05-17T09:05:00.000Z",
  expiresAt: "2026-05-18T09:00:00.000Z",
  generatedAt: "2026-05-17T09:00:00.000Z",
  releaseCandidateId: "runtime-2026-05-17",
  reviewer: {
    email: "release@example.com",
    name: "Release Owner",
    role: "operator",
    userId: "user-release",
  },
  runtimeReleaseGates: blockedGateReport,
  workspaceId: "Essence Runtime",
});

assert.equal(blockedChecklist.summary.status, "blocked");
assert.equal(blockedChecklist.summary.blockedGateCount, 1);
assert.equal(blockedChecklist.summary.approvalScore, 50);
assert.equal(blockedChecklist.summary.reviewerName, "Release Owner");
assert.ok(blockedChecklist.summary.approvalHash.startsWith("sha256:"));
assert.ok(blockedChecklist.rows.some((row) => row.gateId === "performance-budgets" && row.status === "blocked"));
assert.ok(blockedChecklist.csvContent.includes("performance-budgets"));
assert.ok(blockedChecklist.jsonContent.includes("runtime-2026-05-17"));
assert.equal(blockedChecklist.csvFileName, "essence-runtime-runtime-release-approval-checklist-20260517.csv");

const approvedChecklist = createRuntimeReleaseApprovalChecklist({
  approvalNotes: "Runtime gates reviewed and approved for production handoff.",
  approvedAt: "2026-05-17T09:05:00.000Z",
  expiresAt: "2026-05-18T09:00:00.000Z",
  generatedAt: "2026-05-17T09:00:00.000Z",
  releaseCandidateId: "runtime-2026-05-17",
  reviewer: {
    email: "release@example.com",
    name: "Release Owner",
    role: "operator",
    userId: "user-release",
  },
  runtimeReleaseGates: readyGateReport,
});

assert.equal(approvedChecklist.summary.status, "approved");
assert.equal(approvedChecklist.summary.approvalScore, 100);
assert.equal(approvedChecklist.summary.expirationStatus, "active");
assert.ok(approvedChecklist.rows.every((row) => row.status === "approved"));

const expiredChecklist = createRuntimeReleaseApprovalChecklist({
  approvalNotes: "Approved earlier.",
  approvedAt: "2026-05-16T09:05:00.000Z",
  expiresAt: "2026-05-17T08:59:00.000Z",
  generatedAt: "2026-05-17T09:00:00.000Z",
  releaseCandidateId: "runtime-2026-05-17",
  reviewer: {
    email: "release@example.com",
    name: "Release Owner",
    role: "operator",
    userId: "user-release",
  },
  runtimeReleaseGates: readyGateReport,
});

assert.equal(expiredChecklist.summary.status, "expired");
assert.equal(expiredChecklist.summary.expirationStatus, "expired");
assert.match(expiredChecklist.summary.nextAction, /Renew/);

const pendingChecklist = createRuntimeReleaseApprovalChecklist({
  expiresAt: "2026-05-18T09:00:00.000Z",
  generatedAt: "2026-05-17T09:00:00.000Z",
  runtimeReleaseGates: readyGateReport,
});

assert.equal(pendingChecklist.summary.status, "pending");
assert.equal(pendingChecklist.summary.reviewerName, "Unassigned");
assert.equal(pendingChecklist.summary.approvalScore, 75);

console.log("runtime release approval checklist smoke passed");
