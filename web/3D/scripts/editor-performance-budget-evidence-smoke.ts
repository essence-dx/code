import { strict as assert } from "node:assert";
import { defaultClonerSettings } from "@/features/editor/scene/cloner-settings";
import { createDefaultDocument, createSceneObject } from "@/features/editor/scene/default-document";
import {
  createEditorPerformanceBudgetEvidenceReport,
  createEditorPerformanceBudgetEvidenceRows,
} from "@/features/editor/utils/editor-performance-budget-evidence";
import type { SceneDocument } from "@/features/editor/types";

function createLargeSceneDocument(): SceneDocument {
  const base = createDefaultDocument("Runtime budget scene");
  const hero = createSceneObject("box", "Budget hero");

  hero.cloner = {
    ...defaultClonerSettings,
    count: 24,
    enabled: true,
  };
  hero.interaction = {
    pointerTrigger: {
      enabled: true,
      event: "click",
    },
  };

  return {
    ...base,
    objects: [hero, ...Array.from({ length: 80 }, (_, index) => createSceneObject(index % 2 === 0 ? "sphere" : "box", `Scene item ${index + 1}`))],
  };
}

const document = createLargeSceneDocument();
const rows = createEditorPerformanceBudgetEvidenceRows({
  document,
  operationSamples: {
    "large-scene-selection": [8.1, 9.4, 10.2, 11.5, 12.1],
    "published-viewer-startup": [410, 430, 455, 480, 510],
    "timeline-scrubbing": [13.2, 14.4, 15.1, 15.6, 15.9],
    transform: [7.2, 8.5, 9.1, 10.4, 11],
  },
});

assert.equal(rows.length, 4);
assert.deepEqual(
  rows.map((row) => row.operation),
  ["large-scene-selection", "transform", "timeline-scrubbing", "published-viewer-startup"],
);
assert.ok(rows.every((row) => row.status === "ready"));
assert.ok(rows.every((row) => row.performanceBudgetHash.startsWith("sha256:")));
assert.equal(rows.find((row) => row.operation === "large-scene-selection")?.budgetMs, 16);
assert.equal(rows.find((row) => row.operation === "published-viewer-startup")?.budgetMs, 1200);
assert.equal(rows.find((row) => row.operation === "timeline-scrubbing")?.sampleCount, 5);
assert.ok((rows.find((row) => row.operation === "transform")?.p95Ms ?? 0) <= 16);

const blockedRows = createEditorPerformanceBudgetEvidenceRows({
  document,
  operationSamples: {
    "large-scene-selection": [8, 9],
    "published-viewer-startup": [1300, 1450],
    "timeline-scrubbing": [13, 14],
    transform: [7, 8],
  },
});

assert.equal(blockedRows.find((row) => row.operation === "published-viewer-startup")?.status, "blocked");
assert.match(blockedRows.find((row) => row.operation === "published-viewer-startup")?.nextAction ?? "", /Reduce published viewer startup/);

const missingRows = createEditorPerformanceBudgetEvidenceRows({
  document,
  operationSamples: {
    "large-scene-selection": [],
    "published-viewer-startup": [410],
    "timeline-scrubbing": [13],
    transform: [7],
  },
});

assert.equal(missingRows.find((row) => row.operation === "large-scene-selection")?.status, "blocked");
assert.match(missingRows.find((row) => row.operation === "large-scene-selection")?.nextAction ?? "", /Capture large-scene selection/);

const report = createEditorPerformanceBudgetEvidenceReport({
  generatedAt: "2026-06-05T12:00:00.000Z",
  rows,
  workspaceId: "Workspace Runtime Fidelity",
});

assert.equal(report.summary.status, "ready");
assert.equal(report.summary.readyCount, 4);
assert.equal(report.summary.blockedCount, 0);
assert.equal(report.summary.runtimeBudgetScore, 100);
assert.equal(report.summary.operationCount, 4);
assert.match(report.summary.performanceBudgetHash, /^sha256:/);
assert.match(report.csvContent, /^operation,status,budget_ms,p95_ms,average_ms,sample_count,performance_budget_hash,next_action/);
assert.match(report.jsonContent, /"sceneScore"/);
assert.equal(report.csvFileName, "workspace-runtime-fidelity-editor-performance-budget-evidence-20260605.csv");
assert.equal(report.jsonFileName, "workspace-runtime-fidelity-editor-performance-budget-evidence-20260605.json");

console.log("editor performance budget evidence smoke passed");
