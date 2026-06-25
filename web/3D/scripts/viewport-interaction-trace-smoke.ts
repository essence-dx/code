import { strict as assert } from "node:assert";
import {
  appendViewportInteractionEvent,
  createViewportInteractionReplay,
  createViewportInteractionTrace,
  exportViewportInteractionTrace,
  summarizeViewportInteractionTrace,
} from "@/features/editor/runtime/viewport-interaction-trace";

const trace = createViewportInteractionTrace({
  sceneId: "scene-runtime",
  startedAt: "2026-06-03T08:00:00.000Z",
});

const withPointer = appendViewportInteractionEvent(trace, {
  at: "2026-06-03T08:00:00.100Z",
  kind: "pointer",
  pointer: {
    button: 0,
    x: 0.42,
    y: 0.58,
  },
  type: "pointer-down",
});

const withKeyboard = appendViewportInteractionEvent(withPointer, {
  at: "2026-06-03T08:00:00.250Z",
  key: "Space",
  kind: "keyboard",
  type: "keyboard-down",
});

const withCamera = appendViewportInteractionEvent(withKeyboard, {
  at: "2026-06-03T08:00:00.500Z",
  camera: {
    controlEvent: "orbit-change",
    mode: "3d",
  },
  kind: "camera",
  type: "camera-control",
});

const withSelection = appendViewportInteractionEvent(withCamera, {
  at: "2026-06-03T08:00:00.750Z",
  kind: "selection",
  selection: {
    nextObjectId: "cube-1",
    previousObjectId: null,
  },
  type: "selection-change",
});

const summary = summarizeViewportInteractionTrace(withSelection);

assert.equal(summary.totalEvents, 4);
assert.equal(summary.pointerEvents, 1);
assert.equal(summary.keyboardEvents, 1);
assert.equal(summary.cameraEvents, 1);
assert.equal(summary.selectionEvents, 1);
assert.equal(summary.durationMs, 750);
assert.ok(summary.traceHash.startsWith("sha256:"));

const replay = createViewportInteractionReplay(withSelection);
assert.equal(replay.steps.length, 4);
assert.equal(replay.steps[0]?.waitMs, 100);
assert.equal(replay.steps[3]?.action, "selection:selection-change");
assert.match(replay.nextAction, /Replay 4 viewport interaction events/);

const exported = exportViewportInteractionTrace(withSelection);
assert.equal(exported.fileName, "scene-runtime-viewport-interaction-trace-20260603.json");
assert.match(exported.jsonContent, /"kind": "pointer"/);
assert.match(exported.jsonContent, /"traceHash"/);

const trimmed = appendViewportInteractionEvent(withSelection, {
  at: "2026-06-03T08:00:01.000Z",
  kind: "pointer",
  pointer: { x: 1.5, y: -1 },
  type: "pointer-move",
}, 4);

assert.equal(trimmed.events.length, 4);
assert.deepEqual(trimmed.events.at(-1)?.pointer, { x: 1, y: 0 });

console.log("viewport interaction trace smoke passed");
