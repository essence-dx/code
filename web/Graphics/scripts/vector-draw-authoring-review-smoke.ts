import { readFileSync } from "node:fs";
import {
  getVectorDrawAuthoringReviewCsv,
  getVectorDrawAuthoringReviewJson,
  getVectorDrawAuthoringReviewMarkdown,
  getVectorDrawAuthoringReviewReport,
} from "../src/features/editor/vector-draw-authoring-review";
import type { CommandPaletteCommand } from "../src/features/editor/components/command-palette";
import { createLayerFromTool } from "../src/features/editor/document-utils";
import { createRefinedPencilPathPatch } from "../src/features/editor/vector-path-editing";
import type {
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "../src/features/editor/types";

const now = "2026-05-18T17:00:00.000Z";

const penPath: DesignLayer = {
  id: "pen-path",
  type: "path",
  name: "Pen curve",
  x: 80,
  y: 80,
  width: 260,
  height: 160,
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
  fill: "transparent",
  stroke: "#38bdf8",
  strokeWidth: 4,
  cornerRadius: 0,
  pathData: "M 8 140 C 40 20 96 22 132 88 S 204 112 248 28",
  pathViewBox: { x: 0, y: 0, width: 260, height: 160 },
  fillRule: "nonzero",
};

const booleanPath: DesignLayer = {
  id: "boolean-vector",
  type: "path",
  name: "Union Vector",
  x: 380,
  y: 96,
  width: 220,
  height: 148,
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
  fill: "#0ea5e9",
  stroke: "transparent",
  strokeWidth: 0,
  cornerRadius: 0,
  pathData:
    "M 0 0 L 160 0 L 160 120 L 0 120 Z M 64 28 L 220 28 L 220 148 L 64 148 Z",
  pathViewBox: { x: 0, y: 0, width: 220, height: 148 },
  fillRule: "evenodd",
};

const outlineableRectangle: DesignLayer = {
  id: "outline-card",
  type: "rectangle",
  name: "Outline candidate",
  x: 80,
  y: 300,
  width: 220,
  height: 120,
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
  fill: "#111827",
  stroke: "#f472b6",
  strokeWidth: 8,
  cornerRadius: 24,
};

const cutterFrame: DesignLayer = {
  id: "cutter-frame",
  type: "frame",
  name: "Cutter candidate",
  x: 340,
  y: 300,
  width: 260,
  height: 140,
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
  fill: "#f8fafc",
  stroke: "#94a3b8",
  strokeWidth: 1,
  cornerRadius: 18,
};

const page: DesignPage = {
  id: "page-vector-draw",
  name: "Vector Draw",
  background: "#0f172a",
  layers: [penPath, booleanPath, outlineableRectangle, cutterFrame],
};

const document: DesignDocument = {
  version: 1,
  activePageId: page.id,
  pages: [page],
  variables: {},
  components: {},
  activityEvents: [
    {
      id: "activity-vector-draw",
      kind: "extension",
      actorName: "Design Systems",
      actorEmail: "design@example.com",
      label: "Exported vector Draw review",
      detail: "Pen, pencil, boolean, cutter, outline, and topology packet.",
      createdAt: now,
    },
  ],
  updatedAt: now,
};

const commandPaletteCommands: CommandPaletteCommand[] = [
  command("tool-pen", "Pen tool", "Create editable vector paths", "P"),
  command("tool-pencil", "Pencil tool", "Draw refined freehand vector paths", "B"),
  command("tool-cutter", "Cutter tool", "Slice supported layers", "X"),
  command("outline-selection-stroke", "Outline stroke", "Convert strokes to vectors"),
  command("normalize-vector-paths", "Normalize vector paths", "Normalize viewBoxes"),
  command("snap-vector-path-nodes", "Snap vector path nodes", "Round vector nodes"),
  command("vector-preview-union", "Preview Union", "Preview boolean union"),
  command("vector-union", "Apply union selection", "Apply boolean union"),
];

const pencilPatch = createRefinedPencilPathPatch([
  { x: 80, y: 80 },
  { x: 96, y: 54 },
  { x: 132, y: 48 },
  { x: 164, y: 74 },
  { x: 208, y: 62 },
]);
const pencilLayer = createLayerFromTool("pencil", { x: 80, y: 80 });

assert(pencilPatch !== null, "Pencil refinement should produce a path patch.");
assert(pencilPatch?.pathData.includes("Q"), "Pencil refinement should smooth with quadratic commands.");
assert(pencilPatch?.pathViewBox?.width && pencilPatch.pathViewBox.width > 1, "Pencil path viewBox should be normalized.");
assert(pencilLayer?.type === "path", "Pencil tool should create path layers.");
assert(pencilLayer?.name === "Pencil path", "Pencil layer should be named for the authoring workflow.");

const report = getVectorDrawAuthoringReviewReport({
  activePage: page,
  commandPaletteCommands,
  document,
  generatedAt: now,
  selectedLayerIds: [penPath.id, booleanPath.id],
});

assert(report.status === "ready", "Vector Draw authoring fixture should be ready.");
assert(report.score >= 95, "Ready vector Draw fixture should keep a high score.");
assert(report.penRefinementCount >= 1, "Pen refinement evidence should be counted.");
assert(report.pencilRefinementCount >= 1, "Pencil refinement evidence should be counted.");
assert(report.bendOperationCount >= 1, "Bend/node handle evidence should be counted.");
assert(report.cutterOperationCount >= 1, "Cutter operation evidence should be counted.");
assert(report.booleanPreviewCount >= 1, "Boolean preview evidence should be counted.");
assert(report.strokeOutlineWorkflowCount >= 1, "Stroke outline workflow evidence should be counted.");
assert(report.exportSafeTopologyCount >= 1, "Export-safe topology evidence should be counted.");
assert(report.rows.some((row) => row.category === "pen-pencil-refinement"), "Rows should include pen/pencil refinement.");
assert(report.rows.some((row) => row.category === "boolean-preview"), "Rows should include boolean preview hardening.");
assert(report.rows.some((row) => row.category === "export-topology"), "Rows should include export topology.");

const markdown = getVectorDrawAuthoringReviewMarkdown(report);
const csv = getVectorDrawAuthoringReviewCsv(report);
const json = JSON.parse(getVectorDrawAuthoringReviewJson(report)) as {
  rows: unknown[];
  topologyRows: unknown[];
};
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
};

assert(markdown.includes("Vector Draw Authoring Review"), "Markdown should include a clear title.");
assert(markdown.includes("pen/pencil refinement"), "Markdown should mention pen/pencil refinement.");
assert(markdown.includes("bend/cutter operations"), "Markdown should mention bend/cutter operations.");
assert(markdown.includes("boolean preview"), "Markdown should mention boolean preview.");
assert(markdown.includes("stroke outline workflows"), "Markdown should mention stroke outline workflows.");
assert(markdown.includes("export-safe topology"), "Markdown should mention export-safe topology.");
assert(csv.includes("pen-pencil-refinement"), "CSV should include pen/pencil refinement rows.");
assert(json.rows.length === report.rows.length, "JSON should preserve review rows.");
assert(json.topologyRows.length === report.topologyRows.length, "JSON should preserve topology rows.");
assert(
  packageJson.scripts["editor:vector-draw-authoring-review-smoke"]?.includes(
    "vector-draw-authoring-review-smoke",
  ),
  "Targeted smoke command should be listed.",
);

console.log(
  `Vector Draw authoring review smoke passed: ${report.score} score, ${report.exportSafeTopologyCount} export-safe topology row(s).`,
);

function command(
  id: string,
  label: string,
  detail: string,
  shortcut?: string,
): CommandPaletteCommand {
  return {
    id,
    label,
    detail,
    shortcut,
    run: noop,
  };
}

function noop() {}

function assert(value: unknown, message: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}
