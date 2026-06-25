import { strict as assert } from "node:assert";
import type { RuntimeReleaseAutomationCommandCenter } from "@/features/projects/runtime-release-automation-command-center";
import { createRuntimeReleasePromotionRehearsalPacket } from "@/features/projects/runtime-release-promotion-rehearsal-packet";

const commandCenter = {
  summary: {
    archivedCount: 0,
    blockedCount: 0,
    commandCenterHash: "sha256:command-center",
    commandCenterScore: 100,
    nextAction: "Promote ready candidates and keep rollback-ready candidates guarded.",
    readyCount: 1,
    rollbackReadyCount: 1,
    rowCount: 2,
    status: "ready",
  },
  workspaceId: "Essence Runtime",
} as RuntimeReleaseAutomationCommandCenter;

const packet = createRuntimeReleasePromotionRehearsalPacket({
  commandCenter,
  generatedAt: "2026-05-17T17:00:00.000Z",
  productionAlias: "essence-spline.vercel.app",
  releaseCandidateId: "runtime-2026-05-17",
  steps: [
    {
      detail: "Dry-run alias move from preview deployment to production alias.",
      durationMs: 4200,
      evidenceHash: "sha256:alias-move",
      id: "alias-move-dry-run",
      kind: "alias-move",
      status: "passed",
    },
    {
      detail: "Post-promote smoke returned healthy editor, viewer, embed, and package routes.",
      durationMs: 11800,
      evidenceHash: "sha256:post-promote-smoke",
      id: "post-promote-smoke",
      kind: "post-promote-smoke",
      status: "passed",
    },
    {
      detail: "Rollback drill restored the known-good deployment alias in rehearsal.",
      durationMs: 8700,
      evidenceHash: "sha256:rollback-drill",
      id: "rollback-drill",
      kind: "rollback-drill",
      status: "passed",
    },
    {
      detail: "Release owner acknowledged promotion and rollback steps.",
      durationMs: 900,
      evidenceHash: "sha256:operator-ack",
      id: "operator-acknowledgement",
      kind: "operator-acknowledgement",
      operator: "Release Owner",
      status: "passed",
    },
  ],
  workspaceId: "Essence Runtime",
});

assert.equal(packet.summary.status, "ready");
assert.equal(packet.summary.rehearsalScore, 100);
assert.equal(packet.summary.requiredCoverageCount, 4);
assert.equal(packet.summary.failedStepCount, 0);
assert.equal(packet.summary.warningStepCount, 0);
assert.equal(packet.summary.releaseCandidateId, "runtime-2026-05-17");
assert.equal(packet.summary.productionAlias, "essence-spline.vercel.app");
assert.ok(packet.summary.packetHash.startsWith("sha256:"));
assert.deepEqual(
  packet.steps.map((step) => step.kind),
  ["alias-move", "post-promote-smoke", "rollback-drill", "operator-acknowledgement"],
);
assert.equal(packet.files.length, 2);
assert.match(packet.csvContent, /^step_id,kind,status,duration_ms,evidence_hash,next_action/);
assert.ok(packet.jsonContent.includes("runtime-2026-05-17"));
assert.equal(packet.csvFileName, "essence-runtime-runtime-release-promotion-rehearsal-packet-20260517.csv");
assert.equal(packet.jsonFileName, "essence-runtime-runtime-release-promotion-rehearsal-packet-20260517.json");
assert.ok(packet.csvDataUri.startsWith("data:text/csv"));
assert.ok(packet.jsonDataUri.startsWith("data:application/json"));

const blockedPacket = createRuntimeReleasePromotionRehearsalPacket({
  commandCenter: {
    ...commandCenter,
    summary: {
      ...commandCenter.summary,
      blockedCount: 1,
      commandCenterScore: 75,
      status: "blocked",
    },
  },
  productionAlias: "essence-spline.vercel.app",
  releaseCandidateId: "runtime-blocked",
  steps: packet.steps.filter((step) => step.kind !== "rollback-drill").map((step) => ({
    ...step,
    status: step.kind === "post-promote-smoke" ? "failed" : step.status,
  })),
});

assert.equal(blockedPacket.summary.status, "blocked");
assert.ok(blockedPacket.summary.rehearsalScore < 80);
assert.equal(blockedPacket.summary.missingCoverageCount, 1);
assert.equal(blockedPacket.summary.failedStepCount, 1);
assert.match(blockedPacket.summary.nextAction, /Resolve/);

console.log("runtime release promotion rehearsal packet smoke passed");
