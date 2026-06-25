import { strict as assert } from "node:assert";
import {
  appendViewportInteractionEvent,
  createViewportInteractionTrace,
} from "@/features/editor/runtime/viewport-interaction-trace";
import {
  createPackagedSceneRuntimeSmokeReport,
  createPackagedSceneRuntimeSmokeRows,
} from "@/features/projects/packaged-scene-runtime-smoke";
import { defaultShareSettings } from "@/features/projects/share-settings";

const trace = [
  {
    at: "2026-06-05T10:00:00.080Z",
    kind: "pointer" as const,
    pointer: { button: 0, x: 0.35, y: 0.5 },
    type: "pointer-down" as const,
  },
  {
    at: "2026-06-05T10:00:00.160Z",
    kind: "selection" as const,
    selection: { nextObjectId: "hero-cube", previousObjectId: null },
    type: "selection-change" as const,
  },
  {
    at: "2026-06-05T10:00:00.240Z",
    camera: { controlEvent: "orbit-change" as const, mode: "3d" as const },
    kind: "camera" as const,
    type: "camera-control" as const,
  },
  {
    at: "2026-06-05T10:00:00.320Z",
    kind: "keyboard" as const,
    key: "Space",
    type: "keyboard-down" as const,
  },
].reduce(
  (currentTrace, event) => appendViewportInteractionEvent(currentTrace, event),
  createViewportInteractionTrace({
    sceneId: "scene-runtime",
    startedAt: "2026-06-05T10:00:00.000Z",
  }),
);

const rows = createPackagedSceneRuntimeSmokeRows({
  activeSceneId: "scene-runtime",
  expected: {
    selectedObjectId: "hero-cube",
    timeline: {
      cameraControlCount: 1,
      durationMs: 320,
      pointerEventCount: 1,
    },
    variables: {
      playState: true,
    },
  },
  frameBudgetMs: 16.7,
  frameSamples: {
    "app-package": [12.4, 13.8, 14.1, 15.2],
    embed: [11.8, 13.1, 15.9, 16.5],
    "public-viewer": [10.5, 12.7, 13.9, 15.4],
  },
  origin: "https://essence-spline.example",
  presetId: "web",
  sceneName: "Runtime Fidelity Scene",
  shareId: "share-runtime",
  shareSettings: defaultShareSettings,
  trace,
});

assert.equal(rows.length, 3);
assert.deepEqual(
  rows.map((row) => row.surface),
  ["public-viewer", "embed", "app-package"],
);
assert.ok(rows.every((row) => row.status === "ready"));
assert.ok(rows.every((row) => row.replay.summary.status === "ready"));
assert.ok(rows.every((row) => row.frameTiming.averageFrameMs <= 16.7));
assert.match(rows.find((row) => row.surface === "public-viewer")?.routePath ?? "", /^\/share\/share-runtime\?scene=scene-runtime$/);
assert.match(rows.find((row) => row.surface === "embed")?.routePath ?? "", /^\/embed\/share-runtime\?scene=scene-runtime$/);
assert.match(rows.find((row) => row.surface === "app-package")?.routePath ?? "", /^\/api\/public\/scenes\/share-runtime\/app-package\/web\?scene=scene-runtime$/);

const blockedRows = createPackagedSceneRuntimeSmokeRows({
  activeSceneId: "scene-runtime",
  expected: {
    selectedObjectId: "wrong-object",
  },
  frameBudgetMs: 16.7,
  frameSamples: {
    "app-package": [12, 21],
    embed: [12, 13],
    "public-viewer": [12, 13],
  },
  origin: "https://essence-spline.example",
  presetId: "web",
  sceneName: "Runtime Fidelity Scene",
  shareId: "share-runtime",
  shareSettings: defaultShareSettings,
  trace,
});

assert.equal(blockedRows.filter((row) => row.status === "blocked").length, 3);
assert.equal(blockedRows.find((row) => row.surface === "app-package")?.frameTiming.overBudgetFrameCount, 1);

const report = createPackagedSceneRuntimeSmokeReport({
  generatedAt: "2026-06-05T10:01:00.000Z",
  rows,
  workspaceId: "Workspace Runtime Fidelity",
});

assert.equal(report.summary.status, "ready");
assert.equal(report.summary.readyCount, 3);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.surfaceCount, 3);
assert.equal(report.summary.runtimeSmokeScore, 100);
assert.match(report.csvContent, /^surface,route,status,average_frame_ms,over_budget_frames,replay_status,runtime_smoke_hash,next_action/);
assert.match(report.jsonContent, /"runtimeSmokeHash"/);
assert.equal(report.csvFileName, "workspace-runtime-fidelity-packaged-scene-runtime-smoke-20260605.csv");
assert.equal(report.jsonFileName, "workspace-runtime-fidelity-packaged-scene-runtime-smoke-20260605.json");

console.log("packaged scene runtime smoke passed");
