import { strict as assert } from "node:assert";
import type { RuntimeReleaseHandoffBundle } from "@/features/projects/runtime-release-handoff-bundle";
import { createRuntimeReleaseAutomationRunbook } from "@/features/projects/runtime-release-automation-runbook";

const readyHandoffBundle = {
  summary: {
    blockedSectionCount: 0,
    bundleHash: "sha256:handoff-ready",
    bundleScore: 100,
    nextAction: "Runtime release handoff bundle is ready.",
    releaseCandidateId: "runtime-2026-05-17",
    reviewerEmailRedacted: "re***@example.com",
    reviewerName: "Release Owner",
    sectionCount: 3,
    status: "ready",
  },
  workspaceId: "Essence Runtime",
} as RuntimeReleaseHandoffBundle;

const runbook = createRuntimeReleaseAutomationRunbook({
  generatedAt: "2026-05-17T14:00:00.000Z",
  handoffBundle: readyHandoffBundle,
  productionAlias: "essence-spline.vercel.app",
  promotionCommands: [
    {
      command: "vercel alias set essence-spline-runtime-20260517.vercel.app essence-spline.vercel.app",
      evidenceHash: "sha256:promote-command",
      id: "promote-production-alias",
      kind: "promote",
      label: "Promote production alias",
    },
    {
      command: "bun run release:post-deploy:smoke -- --url https://essence-spline.vercel.app",
      evidenceHash: "sha256:smoke-command",
      id: "post-promote-smoke",
      kind: "post-promote-smoke",
      label: "Run post-promote smoke",
    },
    {
      command: "vercel alias set essence-spline-known-good.vercel.app essence-spline.vercel.app",
      evidenceHash: "sha256:rollback-command",
      id: "rollback-production-alias",
      kind: "rollback",
      label: "Rollback production alias",
    },
  ],
  rollbackGuardrails: [
    {
      evidenceHash: "sha256:known-good",
      id: "known-good-deployment",
      label: "Known-good deployment captured",
      nextAction: "Keep the known-good deployment id available for rollback.",
      status: "ready",
    },
    {
      evidenceHash: "sha256:rollback-permission",
      id: "alias-rollback-permission",
      label: "Alias rollback permission verified",
      nextAction: "Keep production alias credentials active for the release owner.",
      status: "ready",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(runbook.summary.status, "ready");
assert.equal(runbook.summary.runbookScore, 100);
assert.equal(runbook.summary.commandCount, 3);
assert.equal(runbook.summary.rollbackGuardrailCount, 2);
assert.equal(runbook.summary.releaseCandidateId, "runtime-2026-05-17");
assert.equal(runbook.summary.productionAlias, "essence-spline.vercel.app");
assert.ok(runbook.summary.runbookHash.startsWith("sha256:"));
assert.deepEqual(
  runbook.commands.map((command) => command.kind),
  ["promote", "post-promote-smoke", "rollback"],
);
assert.equal(runbook.files.length, 2);
assert.equal(runbook.files.every((file) => file.href.startsWith("data:")), true);
assert.match(runbook.csvContent, /^item_id,kind,status,evidence_hash,next_action/);
assert.ok(runbook.jsonContent.includes("runtime-2026-05-17"));
assert.equal(runbook.csvFileName, "essence-runtime-runtime-release-automation-runbook-20260517.csv");
assert.equal(runbook.jsonFileName, "essence-runtime-runtime-release-automation-runbook-20260517.json");

const blockedRunbook = createRuntimeReleaseAutomationRunbook({
  handoffBundle: {
    ...readyHandoffBundle,
    summary: {
      ...readyHandoffBundle.summary,
      bundleScore: 70,
      status: "blocked",
    },
  },
  productionAlias: "essence-spline.vercel.app",
  promotionCommands: runbook.commands.filter((command) => command.kind === "promote"),
  rollbackGuardrails: [
    {
      evidenceHash: "sha256:missing-known-good",
      id: "known-good-deployment",
      label: "Known-good deployment captured",
      nextAction: "Capture a known-good deployment id before promotion.",
      status: "blocked",
    },
  ],
});

assert.equal(blockedRunbook.summary.status, "blocked");
assert.ok(blockedRunbook.summary.runbookScore < 80);
assert.match(blockedRunbook.summary.nextAction, /Resolve/);
assert.equal(blockedRunbook.summary.missingCommandKindCount, 2);

console.log("runtime release automation runbook smoke passed");
