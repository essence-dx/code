import { strict as assert } from "node:assert";
import type { RuntimeReleaseApprovalChecklist } from "@/features/projects/runtime-release-approval-checklist";
import type { RuntimeReleaseCandidateComparison } from "@/features/projects/runtime-release-candidate-comparison";
import type { RuntimeReleaseOperatorQueue } from "@/features/projects/runtime-release-operator-queue";
import { createRuntimeReleaseHandoffBundle } from "@/features/projects/runtime-release-handoff-bundle";

const approvalChecklist = {
  approvalNotes: "Approved after runtime gate remediation.",
  approvedAt: "2026-05-17T12:05:00.000Z",
  csvDataUri: "data:text/csv;charset=utf-8,approval",
  csvFileName: "approval.csv",
  expiresAt: "2026-05-20T12:00:00.000Z",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "approval.json",
  releaseCandidateId: "runtime-2026-05-17",
  summary: {
    approvalHash: "sha256:approval",
    approvalScore: 100,
    reviewerEmail: "release@example.com",
    reviewerName: "Release Owner",
    status: "approved",
  },
} as RuntimeReleaseApprovalChecklist;

const operatorQueue = {
  csvDataUri: "data:text/csv;charset=utf-8,queue",
  csvFileName: "queue.csv",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "queue.json",
  summary: {
    overdueCount: 0,
    queueHash: "sha256:queue",
    queueScore: 100,
    status: "ready",
  },
} as RuntimeReleaseOperatorQueue;

const candidateComparison = {
  csvDataUri: "data:text/csv;charset=utf-8,comparison",
  csvFileName: "comparison.csv",
  currentReleaseCandidateId: "runtime-2026-05-17",
  jsonDataUri: "data:application/json;charset=utf-8,%7B%7D",
  jsonFileName: "comparison.json",
  lastApprovedReleaseCandidateId: "runtime-2026-05-10",
  summary: {
    comparisonHash: "sha256:comparison",
    comparisonScore: 100,
    regressionCount: 0,
    status: "ready",
  },
} as RuntimeReleaseCandidateComparison;

const bundle = createRuntimeReleaseHandoffBundle({
  approvalChecklist,
  candidateComparison,
  generatedAt: "2026-05-17T12:00:00.000Z",
  handoffAudience: "release-review",
  operatorQueue,
  workspaceId: "Essence Runtime",
});

assert.equal(bundle.summary.status, "ready");
assert.equal(bundle.summary.bundleScore, 100);
assert.equal(bundle.summary.sectionCount, 3);
assert.equal(bundle.summary.blockedSectionCount, 0);
assert.equal(bundle.summary.reviewerName, "Release Owner");
assert.equal(bundle.summary.reviewerEmailRedacted, "re***@example.com");
assert.equal(bundle.summary.releaseCandidateId, "runtime-2026-05-17");
assert.ok(bundle.summary.bundleHash.startsWith("sha256:"));
assert.equal(bundle.files.length, 3);
assert.deepEqual(
  bundle.files.map((file) => file.format),
  ["markdown", "csv", "json"],
);
assert.equal(bundle.files.every((file) => file.href.startsWith("data:")), true);
assert.equal(bundle.files.find((file) => file.format === "markdown")?.download, "essence-runtime-runtime-release-handoff-bundle-20260517.md");
assert.ok(bundle.markdownContent.includes("# Runtime Release Handoff Bundle"));
assert.ok(bundle.markdownContent.includes("Release Owner"));
assert.ok(bundle.markdownContent.includes("re***@example.com"));
assert.match(bundle.csvContent, /^section,status,score,evidence_hash,next_action/);
assert.ok(bundle.jsonContent.includes("runtime-2026-05-17"));
assert.equal(bundle.csvFileName, "essence-runtime-runtime-release-handoff-bundle-20260517.csv");
assert.equal(bundle.jsonFileName, "essence-runtime-runtime-release-handoff-bundle-20260517.json");

const blockedBundle = createRuntimeReleaseHandoffBundle({
  approvalChecklist: {
    ...approvalChecklist,
    summary: {
      ...approvalChecklist.summary,
      approvalScore: 60,
      status: "blocked",
    },
  },
  candidateComparison: {
    ...candidateComparison,
    summary: {
      ...candidateComparison.summary,
      comparisonScore: 30,
      regressionCount: 2,
      status: "blocked",
    },
  },
  operatorQueue: {
    ...operatorQueue,
    summary: {
      ...operatorQueue.summary,
      overdueCount: 1,
      queueScore: 75,
      status: "overdue",
    },
  },
});

assert.equal(blockedBundle.summary.status, "blocked");
assert.equal(blockedBundle.summary.blockedSectionCount, 3);
assert.ok(blockedBundle.summary.bundleScore < 70);
assert.match(blockedBundle.summary.nextAction, /Resolve/);

console.log("runtime release handoff bundle smoke passed");
