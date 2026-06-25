import { strict as assert } from "node:assert";
import type { RuntimeReleaseAutomationRunbook } from "@/features/projects/runtime-release-automation-runbook";
import { createRuntimeReleaseAutomationCommandCenter } from "@/features/projects/runtime-release-automation-command-center";

const readyRunbook = {
  generatedAt: "2026-05-17T14:00:00.000Z",
  summary: {
    blockedCommandCount: 0,
    blockedGuardrailCount: 0,
    commandCount: 3,
    missingCommandKindCount: 0,
    nextAction: "Runtime release automation runbook is ready for production promotion.",
    productionAlias: "essence-spline.vercel.app",
    releaseCandidateId: "runtime-ready",
    rollbackGuardrailCount: 2,
    runbookHash: "sha256:ready-runbook",
    runbookScore: 100,
    status: "ready",
  },
  workspaceId: "Essence Runtime",
} as RuntimeReleaseAutomationRunbook;

const blockedRunbook = {
  ...readyRunbook,
  summary: {
    ...readyRunbook.summary,
    blockedCommandCount: 1,
    missingCommandKindCount: 1,
    releaseCandidateId: "runtime-blocked",
    runbookHash: "sha256:blocked-runbook",
    runbookScore: 62,
    status: "blocked",
  },
} as RuntimeReleaseAutomationRunbook;

const rollbackReadyRunbook = {
  ...readyRunbook,
  summary: {
    ...readyRunbook.summary,
    releaseCandidateId: "runtime-rollback",
    runbookHash: "sha256:rollback-runbook",
    runbookScore: 100,
  },
} as RuntimeReleaseAutomationRunbook;

const archivedRunbook = {
  ...readyRunbook,
  summary: {
    ...readyRunbook.summary,
    releaseCandidateId: "runtime-archived",
    runbookHash: "sha256:archived-runbook",
    runbookScore: 96,
  },
} as RuntimeReleaseAutomationRunbook;

const commandCenter = createRuntimeReleaseAutomationCommandCenter({
  candidates: [
    {
      archivedAt: "2026-05-17T16:00:00.000Z",
      owner: "Release Archive",
      runbook: archivedRunbook,
    },
    {
      owner: "Release Operator",
      runbook: blockedRunbook,
    },
    {
      owner: "Release Operator",
      runbook: readyRunbook,
    },
    {
      lastRollbackDrillAt: "2026-05-17T15:00:00.000Z",
      owner: "Release Operator",
      runbook: rollbackReadyRunbook,
    },
  ],
  generatedAt: "2026-05-17T16:30:00.000Z",
  workspaceId: "Essence Runtime",
});

assert.equal(commandCenter.summary.status, "blocked");
assert.equal(commandCenter.summary.commandCenterScore, 75);
assert.equal(commandCenter.summary.readyCount, 1);
assert.equal(commandCenter.summary.blockedCount, 1);
assert.equal(commandCenter.summary.rollbackReadyCount, 1);
assert.equal(commandCenter.summary.archivedCount, 1);
assert.equal(commandCenter.rows.length, 4);
assert.ok(commandCenter.summary.commandCenterHash.startsWith("sha256:"));
assert.deepEqual(
  commandCenter.rows.map((row) => row.status),
  ["blocked", "rollback-ready", "ready", "archived"],
);
assert.equal(commandCenter.rows.find((row) => row.status === "rollback-ready")?.primaryActionKind, "rollback");
assert.equal(commandCenter.rows.find((row) => row.status === "ready")?.primaryActionKind, "promote");
assert.equal(commandCenter.rows.find((row) => row.status === "blocked")?.primaryActionKind, "resolve-blockers");
assert.equal(commandCenter.rows.find((row) => row.status === "archived")?.primaryActionKind, "archive");
assert.match(commandCenter.csvContent, /^candidate_id,status,score,owner,primary_action,evidence_hash,next_action/);
assert.ok(commandCenter.jsonContent.includes("runtime-rollback"));
assert.equal(commandCenter.csvFileName, "essence-runtime-runtime-release-automation-command-center-20260517.csv");
assert.equal(commandCenter.jsonFileName, "essence-runtime-runtime-release-automation-command-center-20260517.json");
assert.ok(commandCenter.csvDataUri.startsWith("data:text/csv"));
assert.ok(commandCenter.jsonDataUri.startsWith("data:application/json"));

const readyOnly = createRuntimeReleaseAutomationCommandCenter({
  candidates: [
    {
      owner: "Release Operator",
      runbook: readyRunbook,
    },
  ],
});

assert.equal(readyOnly.summary.status, "ready");
assert.equal(readyOnly.summary.commandCenterScore, 100);
assert.match(readyOnly.summary.nextAction, /Promote/);

console.log("runtime release automation command center smoke passed");
