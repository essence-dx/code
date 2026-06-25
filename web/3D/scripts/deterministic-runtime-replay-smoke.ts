import { strict as assert } from "node:assert";
import {
  appendViewportInteractionEvent,
  createViewportInteractionTrace,
} from "@/features/editor/runtime/viewport-interaction-trace";
import {
  createDeterministicRuntimeReplayReport,
  validateDeterministicRuntimeReplay,
} from "@/features/editor/runtime/deterministic-runtime-replay";

const trace = [
  {
    at: "2026-06-04T09:00:00.100Z",
    kind: "pointer" as const,
    pointer: { button: 0, x: 0.2, y: 0.3 },
    type: "pointer-down" as const,
  },
  {
    at: "2026-06-04T09:00:00.200Z",
    kind: "keyboard" as const,
    key: "Space",
    type: "keyboard-down" as const,
  },
  {
    at: "2026-06-04T09:00:00.300Z",
    camera: { controlEvent: "orbit-change" as const, mode: "3d" as const },
    kind: "camera" as const,
    type: "camera-control" as const,
  },
  {
    at: "2026-06-04T09:00:00.400Z",
    kind: "selection" as const,
    selection: { nextObjectId: "cube-1", previousObjectId: null },
    type: "selection-change" as const,
  },
].reduce(
  (currentTrace, event) => appendViewportInteractionEvent(currentTrace, event),
  createViewportInteractionTrace({
    sceneId: "runtime-scene",
    startedAt: "2026-06-04T09:00:00.000Z",
  }),
);

const ready = validateDeterministicRuntimeReplay({
  expected: {
    objectStates: {
      "cube-1": {
        selected: true,
      },
    },
    selectedObjectId: "cube-1",
    timeline: {
      cameraControlCount: 1,
      durationMs: 400,
      pointerEventCount: 1,
    },
    variables: {
      playState: true,
    },
  },
  trace,
});

assert.equal(ready.summary.status, "ready");
assert.equal(ready.summary.assertionCount, 6);
assert.equal(ready.summary.passedCount, 6);
assert.equal(ready.summary.failedCount, 0);
assert.equal(ready.finalState.selectedObjectId, "cube-1");
assert.equal(ready.finalState.variables.playState, true);
assert.equal(ready.finalState.timeline.cameraControlCount, 1);
assert.equal(ready.finalState.objectStates["cube-1"]?.selected, true);
assert.ok(ready.summary.replayHash.startsWith("sha256:"));

const blocked = validateDeterministicRuntimeReplay({
  expected: {
    selectedObjectId: "sphere-1",
    variables: {
      playState: false,
    },
  },
  trace,
});

assert.equal(blocked.summary.status, "blocked");
assert.equal(blocked.summary.failedCount, 2);
assert.ok(blocked.assertions.some((assertion) => assertion.path === "selectedObjectId" && assertion.status === "failed"));

const report = createDeterministicRuntimeReplayReport({
  generatedAt: "2026-06-04T09:01:00.000Z",
  replayResults: [ready, blocked],
  workspaceId: "Workspace Runtime Fidelity",
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.replayCount, 2);
assert.equal(report.summary.readyCount, 1);
assert.equal(report.summary.blockedCount, 1);
assert.equal(report.summary.replayScore, 50);
assert.equal(report.csvFileName, "workspace-runtime-fidelity-deterministic-runtime-replay-20260604.csv");
assert.equal(report.jsonFileName, "workspace-runtime-fidelity-deterministic-runtime-replay-20260604.json");
assert.match(report.csvContent, /^replay_id,status,assertions,passed,failed,replay_hash,next_action/);

console.log("deterministic runtime replay smoke passed");
