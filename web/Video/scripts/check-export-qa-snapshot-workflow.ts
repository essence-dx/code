import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createExportQaSnapshot } from "../src/lib/editor/export-qa-summary";
import { createLayerFromAsset, createProject, createTextLayer } from "../src/lib/editor/factory";
import type { MediaAsset } from "../src/lib/editor/types";
import { createRenderPlan } from "../src/lib/render/export-planner";
import { createRenderHandoffPlan } from "../src/lib/render/render-handoff";

const capturedAt = "2026-05-16T03:57:58.788Z";
const asset = createMediaAsset({ objectUrl: "blob:ready-video" });
const project = createProject("Snapshot export QA", "9:16");
project.socialFormatId = "youtube-shorts";
project.duration = 10;
project.layers = [
  { ...createLayerFromAsset(asset, 0), duration: 10 },
  { ...createTextLayer("subtitle", 1), duration: 10 },
];

const plan = createRenderPlan(project, [asset], "mp4-vertical-1080", "mp4");
const handoff = createRenderHandoffPlan({ project, assets: [asset], plan, isDesktopRuntime: false });
const snapshot = createExportQaSnapshot({ project, mediaAssets: [asset], plan, handoff, capturedAt });

assert.equal(snapshot.status, "ready");
assert.equal(snapshot.capturedAt, capturedAt);
assert.equal(snapshot.preset, "mp4-vertical-1080");
assert.equal(snapshot.format, "mp4");
assert.equal(snapshot.renderRouteLabel, "Browser route");
assert.equal(snapshot.sections.some((section) => section.id === "render-route"), true);

const types = read("src/lib/editor/types.ts");
const exportPanel = read("src/features/editor/components/export-panel.tsx");
const exportSlice = read("src/features/editor/state/editor-export-slice.ts");
const storeTypes = read("src/features/editor/state/editor-store-types.ts");
const collaborationStore = read("src/lib/projects/collaboration-store.ts");
const reviewClient = read("src/features/review/components/export-review-page-client.tsx");
const workspaceDialog = read("src/features/projects/components/review-workspace-dialog.tsx");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");

assert.match(types, /exportQaSnapshot\?: ExportQaSnapshot/);
assert.match(types, /export interface ExportQaSnapshot/);
assert.match(storeTypes, /mediaAttributionSummary\?: ExportJob\["mediaAttributionSummary"\]/);
assert.match(exportSlice, /queueExport: \(format, preset, options = \{\}\)/);
assert.match(exportSlice, /exportQaSnapshot: options\.exportQaSnapshot/);
assert.match(exportPanel, /createExportQaSnapshot/);
assert.match(exportPanel, /queueExport\(selectedPreset\.format, selectedPreset\.id, \{/);
assert.match(exportPanel, /Export QA\s*\{job\.exportQaSnapshot\.status\}/);
assert.match(collaborationStore, /exportQaSnapshot\?: ExportQaSnapshot/);
assert.match(collaborationStore, /exportQaSnapshot: input\.job\.exportQaSnapshot/);
assert.match(collaborationStore, /job\.exportQaSnapshot\?\.status === "blocked"/);
assert.match(reviewClient, /Export QA Evidence/);
assert.match(reviewClient, /review\.exportQaSnapshot\.sections\.map/);
assert.match(workspaceDialog, /Export QA\s*\{job\.exportQaSnapshot\.status\}/);
assert.match(packageJson, /check:export-qa-snapshot-workflow/);
assert.match(lightweight, /check:export-qa-snapshot-workflow/);

console.log("Export QA snapshot workflow checks passed.");

function createMediaAsset(input: Partial<MediaAsset>): MediaAsset {
  return {
    id: input.id ?? crypto.randomUUID(),
    name: input.name ?? "snapshot-video.mp4",
    type: input.type ?? "video",
    mimeType: input.mimeType ?? "video/mp4",
    size: input.size ?? 1_024_000,
    duration: input.duration ?? 10,
    width: input.width ?? 1080,
    height: input.height ?? 1920,
    storageKey: input.storageKey ?? "snapshot-video.mp4",
    source: input.source ?? "browser-indexeddb",
    objectUrl: input.objectUrl,
    createdAt: input.createdAt ?? capturedAt,
  };
}

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
