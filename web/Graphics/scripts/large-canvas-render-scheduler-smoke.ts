import { readFileSync } from "node:fs";
import {
  getLargeCanvasRenderSchedulerCsv,
  getLargeCanvasRenderSchedulerJson,
  getLargeCanvasRenderSchedulerMarkdown,
  getLargeCanvasRenderSchedulerReport,
} from "../src/features/editor/large-canvas-render-scheduler";
import type { DesignLayer, DesignPage } from "../src/features/editor/types";

const generatedAt = "2026-05-19T15:00:00.000Z";
const densePage: DesignPage = {
  id: "page-large-scheduler",
  name: "Large scheduler canvas",
  background: "#0f172a",
  layers: Array.from({ length: 132 }, (_, index) =>
    createLayer(`dense-scheduler-${index}`, index),
  ),
};
const selectedLayerIds = [
  "dense-scheduler-0",
  "dense-scheduler-1",
  "dense-scheduler-2",
  "dense-scheduler-3",
];
const report = getLargeCanvasRenderSchedulerReport({
  generatedAt,
  page: densePage,
  selectedLayerIds,
  tileSize: 320,
});
const readyReport = getLargeCanvasRenderSchedulerReport({
  generatedAt,
  page: {
    ...densePage,
    id: "page-ready-scheduler",
    name: "Ready scheduler canvas",
    layers: [
      createLayer("ready-scheduler-0", 0, { simple: true }),
      createLayer("ready-scheduler-1", 1, { simple: true }),
      createLayer("ready-scheduler-2", 2, { simple: true }),
    ],
  },
  selectedLayerIds: ["ready-scheduler-0"],
  tileSize: 512,
});
const markdown = getLargeCanvasRenderSchedulerMarkdown(report);
const csv = getLargeCanvasRenderSchedulerCsv(report);
const json = JSON.parse(getLargeCanvasRenderSchedulerJson(report)) as {
  queues: unknown[];
  rows: unknown[];
  summary: {
    hotTileCount: number;
    profilerEvidenceCount: number;
    scheduledTileCount: number;
    selectionCacheInvalidationCount: number;
    simplificationCandidateCount: number;
    status: string;
  };
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};
const extensionsSource = readFileSync(
  "src/features/editor/components/extensions-panel.tsx",
  "utf8",
);

assert(report.status === "blocked", "Dense canvas should block unscheduled large-canvas release.");
assert(report.scheduledTileCount > 4, "Scheduler should create viewport-tiled draw queues.");
assert(report.hotTileCount > 0, "Scheduler should detect hot tiles that need queue splitting.");
assert(
  report.selectionCacheInvalidationCount > selectedLayerIds.length,
  "Scheduler should expand selection cache invalidation to overlapping layers.",
);
assert(
  report.simplificationCandidateCount > 0,
  "Scheduler should surface dense vector path simplification candidates.",
);
assert(
  report.profilerEvidenceCount >= 3,
  "Scheduler should retain profiler evidence from existing canvas telemetry.",
);
assert(
  report.rows.some((row) => row.category === "viewport-tile-queue"),
  "Rows should include viewport-tiled draw queue evidence.",
);
assert(
  report.rows.some((row) => row.category === "selection-cache"),
  "Rows should include selection cache invalidation evidence.",
);
assert(
  report.rows.some((row) => row.category === "vector-simplification"),
  "Rows should include vector path simplification budget evidence.",
);
assert(
  report.rows.some((row) => row.category === "profiler-evidence"),
  "Rows should include profiler evidence.",
);
assert(readyReport.status === "ready", "Small canvas should stay scheduler-ready.");
assert(readyReport.hotTileCount === 0, "Ready canvas should not produce hot tiles.");
assert(markdown.includes("Large Canvas Render Scheduler"), "Markdown should include a clear title.");
assert(markdown.includes("viewport-tiled"), "Markdown should mention viewport-tiled queues.");
assert(csv.includes("viewport-tile-queue"), "CSV should include scheduler categories.");
assert(json.rows.length === report.rows.length, "JSON should preserve all scheduler rows.");
assert(json.queues.length === report.queues.length, "JSON should preserve all scheduler queues.");
assert(
  json.summary.status === report.status &&
    json.summary.scheduledTileCount === report.scheduledTileCount &&
    json.summary.hotTileCount === report.hotTileCount,
  "JSON summary should preserve queue status and tile counts.",
);
assert(
  json.summary.selectionCacheInvalidationCount ===
    report.selectionCacheInvalidationCount,
  "JSON summary should preserve selection cache invalidation count.",
);
assert(
  json.summary.profilerEvidenceCount === report.profilerEvidenceCount,
  "JSON summary should preserve profiler evidence count.",
);
assert(
  json.summary.simplificationCandidateCount ===
    report.simplificationCandidateCount,
  "JSON summary should preserve simplification candidate count.",
);
assert(
  /LargeCanvasRenderSchedulerPanel/.test(extensionsSource) &&
    /getLargeCanvasRenderSchedulerReport/.test(extensionsSource),
  "Extensions should wire the large-canvas render scheduler panel and report.",
);
assert(
  packageJson.scripts["editor:large-canvas-render-scheduler-smoke"]?.includes(
    "large-canvas-render-scheduler-smoke",
  ),
  "Targeted large-canvas scheduler smoke command should be listed.",
);

console.log(
  `Large-canvas render scheduler smoke passed: ${report.score} score, ${report.scheduledTileCount} tiles, ${report.hotTileCount} hot tile(s).`,
);

function createLayer(
  id: string,
  index: number,
  options: { simple?: boolean } = {},
): DesignLayer {
  const family = options.simple ? 5 : index % 6;
  const gridX = index % 12;
  const gridY = Math.floor(index / 12);
  const overlapOffset = options.simple ? index * 180 : (index % 4) * 18;

  return {
    id,
    type: family === 0 || family === 2 ? "path" : family === 1 ? "image" : "rectangle",
    name: `Scheduler layer ${index + 1}`,
    x: options.simple ? 120 + index * 180 : 80 + gridX * 170 + overlapOffset,
    y: options.simple ? 160 : 80 + gridY * 130 + overlapOffset,
    width: options.simple ? 120 : family === 1 ? 520 : 460,
    height: options.simple ? 96 : family === 1 ? 360 : 300,
    rotation: 0,
    opacity: family === 4 ? 0.35 : 1,
    visible: true,
    locked: false,
    fill: family === 1 ? "transparent" : "#38bdf8",
    stroke: "#0f172a",
    strokeWidth: 1,
    cornerRadius: options.simple ? 8 : 18,
    imageSrc: family === 1 ? "data:image/png;base64,fixture" : undefined,
    imageFit: family === 1 ? "cover" : undefined,
    pathData:
      family === 0 || family === 2
        ? createPathData(options.simple ? 3 : family === 0 ? 52 : 34)
        : undefined,
    pathViewBox:
      family === 0 || family === 2
        ? {
            x: 0,
            y: 0,
            width: options.simple ? 120 : 460,
            height: options.simple ? 96 : 300,
          }
        : undefined,
    shadowEnabled: family === 3,
    shadowBlur: family === 3 ? 28 : undefined,
    shadowColor: family === 3 ? "rgba(15, 23, 42, 0.35)" : undefined,
    blendMode: family === 4 ? "multiply" : undefined,
    fillRule: family === 0 || family === 2 ? "nonzero" : undefined,
  };
}

function createPathData(segmentCount: number) {
  return [
    "M 0 0",
    ...Array.from(
      { length: segmentCount },
      (_, index) =>
        `C ${index * 8 + 12} ${index % 2 === 0 ? 42 : 180} ${index * 8 + 38} ${
          index % 3 === 0 ? 260 : 24
        } ${index * 8 + 64} ${index % 2 === 0 ? 120 : 220}`,
    ),
  ].join(" ");
}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}
