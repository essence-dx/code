import { strict as assert } from "node:assert";
import type { DeterministicRuntimeReplayReport } from "@/features/editor/runtime/deterministic-runtime-replay";
import type { MaterialPostProcessParityReport } from "@/features/editor/runtime/material-postprocess-parity";
import type { EditorPerformanceBudgetEvidenceReport } from "@/features/editor/utils/editor-performance-budget-evidence";
import type { PackagedSceneRuntimeSmokeReport } from "@/features/projects/packaged-scene-runtime-smoke";
import { createRuntimeQaPacket } from "@/features/projects/runtime-qa-packet";

const generatedAt = "2026-06-05T15:00:00.000Z";

const materialParityReport = {
  summary: {
    mismatchCount: 0,
    nextAction: "Material parity is ready.",
    parityHash: "sha256:material",
    parityScore: 100,
    status: "ready",
  },
} as MaterialPostProcessParityReport;

const packagedPlaybackReport = {
  summary: {
    blockedCount: 0,
    nextAction: "Packaged playback is ready.",
    readyCount: 3,
    runtimeSmokeHash: "sha256:packaged",
    runtimeSmokeScore: 100,
    status: "ready",
    surfaceCount: 3,
  },
} as PackagedSceneRuntimeSmokeReport;

const performanceBudgetReport = {
  summary: {
    blockedCount: 0,
    nextAction: "Performance budgets are ready.",
    operationCount: 4,
    performanceBudgetHash: "sha256:performance",
    readyCount: 4,
    runtimeBudgetScore: 100,
    status: "ready",
  },
} as EditorPerformanceBudgetEvidenceReport;

const deterministicReplayReport = {
  summary: {
    blockedCount: 0,
    nextAction: "Deterministic replay is ready.",
    readyCount: 2,
    replayCount: 2,
    replayScore: 100,
    reportHash: "sha256:replay",
    status: "ready",
  },
} as DeterministicRuntimeReplayReport;

const packet = createRuntimeQaPacket({
  deterministicReplayReport,
  generatedAt,
  materialParityReport,
  packagedPlaybackReport,
  performanceBudgetReport,
  sceneVersionHash: "sha256:scene-version",
  workspaceId: "Workspace Runtime QA",
});

assert.equal(packet.summary.status, "ready");
assert.equal(packet.summary.sectionCount, 4);
assert.equal(packet.summary.readyCount, 4);
assert.equal(packet.summary.blockedCount, 0);
assert.equal(packet.summary.qaScore, 100);
assert.equal(packet.summary.sceneVersionHash, "sha256:scene-version");
assert.match(packet.summary.packetHash, /^sha256:/);
assert.deepEqual(
  packet.sections.map((section) => section.id),
  ["material-parity", "packaged-playback", "performance-budget", "deterministic-replay"],
);
assert.match(packet.markdownContent, /# Runtime QA Packet/);
assert.match(packet.markdownContent, /Material and post-process parity/);
assert.match(packet.markdownContent, /Packaged scene playback/);
assert.match(packet.csvContent, /^section,status,score,hash,next_action/);
assert.match(packet.jsonContent, /"packetHash"/);
assert.equal(packet.markdownFileName, "workspace-runtime-qa-runtime-qa-packet-20260605.md");
assert.equal(packet.csvFileName, "workspace-runtime-qa-runtime-qa-packet-20260605.csv");
assert.equal(packet.jsonFileName, "workspace-runtime-qa-runtime-qa-packet-20260605.json");

const blockedPacket = createRuntimeQaPacket({
  deterministicReplayReport,
  generatedAt,
  materialParityReport: {
    ...materialParityReport,
    summary: {
      ...materialParityReport.summary,
      mismatchCount: 2,
      parityScore: 70,
      status: "blocked",
    },
  },
  packagedPlaybackReport,
  performanceBudgetReport,
  workspaceId: "Workspace Runtime QA",
});

assert.equal(blockedPacket.summary.status, "blocked");
assert.equal(blockedPacket.summary.blockedCount, 1);
assert.ok(blockedPacket.summary.qaScore < packet.summary.qaScore);
assert.match(blockedPacket.summary.nextAction, /Resolve blocked runtime QA sections/);

console.log("runtime qa packet smoke passed");
