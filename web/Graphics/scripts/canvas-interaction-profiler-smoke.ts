import { readFileSync } from "node:fs";
import {
  getCanvasInteractionProfilerCsv,
  getCanvasInteractionProfilerJson,
  getCanvasInteractionProfilerMarkdown,
  getCanvasInteractionProfilerReport,
} from "../src/features/editor/canvas-interaction-profiler";
import type {
  DesignLayer,
  DesignPage,
} from "../src/features/editor/types";

const generatedAt = "2026-05-19T08:00:00.000Z";
const denseLayers = Array.from({ length: 92 }, (_, index) =>
  createLayer(`dense-${index}`, index),
);
const page: DesignPage = {
  id: "page-interaction-profiler",
  name: "Dense canvas",
  background: "#0f172a",
  layers: denseLayers,
};

const report = getCanvasInteractionProfilerReport({
  generatedAt,
  page,
  selectedLayerIds: ["dense-0", "dense-1", "dense-2"],
});
const readyReport = getCanvasInteractionProfilerReport({
  generatedAt,
  page: {
    ...page,
    id: "page-ready",
    name: "Ready canvas",
    layers: [createLayer("ready-0", 0), createLayer("ready-1", 12)],
  },
  selectedLayerIds: ["ready-0"],
});
const markdown = getCanvasInteractionProfilerMarkdown(report);
const csv = getCanvasInteractionProfilerCsv(report);
const json = JSON.parse(getCanvasInteractionProfilerJson(report)) as {
  replayNotes: unknown[];
  rows: unknown[];
  summary: {
    estimatedSelectionLatencyMs: number;
    panZoomFrameBudgetMs: number;
    hitTestHotspotCount: number;
  };
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const extensionsSource = readFileSync(
  "src/features/editor/components/extensions-panel.tsx",
  "utf8",
);
const performanceRegressionSource = readFileSync(
  "src/features/editor/performance-regression-export.ts",
  "utf8",
);

assert(report.status === "blocked", "Dense canvas fixture should block interaction release.");
assert(report.estimatedSelectionLatencyMs >= 34, "Selection latency should cross the blocking threshold.");
assert(report.panZoomFrameBudgetMs >= 16.7, "Pan and zoom frame time should cross the review threshold.");
assert(report.hitTestHotspotCount > 0, "Profiler should detect overlapping hit-test hotspots.");
assert(report.pointerReplayStepCount >= report.rows.length, "Rows should include replay steps.");
assert(report.optimizationNoteCount >= report.rows.length, "Rows should include optimization notes.");
assert(
  report.rows.some((row) => row.category === "selection-latency"),
  "Rows should include selection latency evidence.",
);
assert(
  report.rows.some((row) => row.category === "pan-zoom-frame"),
  "Rows should include pan and zoom frame-budget evidence.",
);
assert(
  report.rows.some((row) => row.category === "hit-test-hotspot"),
  "Rows should include hit-test hotspot evidence.",
);
assert(readyReport.status === "ready", "Small canvas fixture should stay ready.");
assert(markdown.includes("Canvas Interaction Profiler"), "Markdown should include a clear title.");
assert(markdown.includes("Replay Notes"), "Markdown should include replay notes.");
assert(csv.includes("selection-latency"), "CSV should include profiler categories.");
assert(json.rows.length === report.rows.length, "JSON should preserve all rows.");
assert(
  json.replayNotes.length === report.replayNotes.length,
  "JSON should preserve replay notes.",
);
assert(
  json.summary.estimatedSelectionLatencyMs === report.estimatedSelectionLatencyMs,
  "JSON summary should include selection latency.",
);
assert(
  json.summary.panZoomFrameBudgetMs === report.panZoomFrameBudgetMs,
  "JSON summary should include pan and zoom frame budget.",
);
assert(
  json.summary.hitTestHotspotCount === report.hitTestHotspotCount,
  "JSON summary should include hotspot count.",
);
assert(
  /CanvasInteractionProfilerPanel/.test(extensionsSource) &&
    /getCanvasInteractionProfilerReport/.test(extensionsSource),
  "Extensions should wire the interaction profiler panel and report.",
);
assert(
  /selectedLayerIds/.test(extensionsSource) &&
    /canvasInteractionProfiler/.test(extensionsSource),
  "Profiler should react to active selection changes.",
);
assert(
  /canvasInteractionProfiler/.test(performanceRegressionSource),
  "Performance release export should include profiler evidence.",
);
assert(
  packageJson.scripts["editor:canvas-interaction-profiler-smoke"]?.includes(
    "canvas-interaction-profiler-smoke",
  ),
  "Targeted profiler smoke command should be listed.",
);

console.log(
  `Canvas interaction profiler smoke passed: ${report.score} score, ${report.hitTestHotspotCount} hotspot(s), ${report.pointerReplayStepCount} replay step(s).`,
);

function createLayer(id: string, index: number): DesignLayer {
  const family = index % 6;

  return {
    id,
    type: family === 0 ? "path" : family === 1 ? "image" : "rectangle",
    name: `Dense layer ${index + 1}`,
    x: 120 + (index % 7) * 4,
    y: 80 + (index % 5) * 5,
    width: family === 1 ? 520 : 460,
    height: family === 1 ? 340 : 280,
    rotation: 0,
    opacity: family === 2 ? 0.18 : 1,
    visible: true,
    locked: false,
    fill: family === 1 ? "transparent" : "#38bdf8",
    stroke: "#0f172a",
    strokeWidth: 1,
    cornerRadius: 16,
    imageSrc: family === 1 ? "data:image/png;base64,fixture" : undefined,
    imageFit: family === 1 ? "cover" : undefined,
    pathData:
      family === 0
        ? "M 0 0 C 80 40 140 240 240 180 S 360 60 460 240"
        : undefined,
    pathViewBox:
      family === 0
        ? { x: 0, y: 0, width: 460, height: 280 }
        : undefined,
    shadowEnabled: family === 3,
    shadowBlur: family === 3 ? 24 : undefined,
    shadowColor: family === 3 ? "rgba(15, 23, 42, 0.35)" : undefined,
    blendMode: family === 4 ? "multiply" : undefined,
    fillRule: family === 0 ? "nonzero" : undefined,
  };
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}
