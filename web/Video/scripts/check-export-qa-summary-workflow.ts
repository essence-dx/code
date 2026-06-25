import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createExportQaSummary } from "../src/lib/editor/export-qa-summary";
import { createLayerFromAsset, createProject, createTextLayer } from "../src/lib/editor/factory";
import type { MediaAsset } from "../src/lib/editor/types";
import { createRenderPlan } from "../src/lib/render/export-planner";
import { createRenderHandoffPlan } from "../src/lib/render/render-handoff";

const readyAsset = createMediaAsset({ objectUrl: "blob:ready-video" });
const project = createProject("Export QA summary", "9:16");
const videoLayer = createLayerFromAsset(readyAsset, 0);
const subtitleLayer = createTextLayer("subtitle", 1);
project.socialFormatId = "youtube-shorts";
project.layers = [
  { ...videoLayer, duration: 8, volume: 1 },
  { ...subtitleLayer, start: 0, duration: 8 },
];
project.duration = 8;

const plan = createRenderPlan(project, [readyAsset], "mp4-vertical-1080", "mp4");
const handoff = createRenderHandoffPlan({ project, assets: [readyAsset], plan, isDesktopRuntime: false });
const summary = createExportQaSummary({ project, mediaAssets: [readyAsset], plan, handoff });
const sectionIds = summary.sections.map((section) => section.id);

assert.equal(summary.status, "ready");
assert.deepEqual(sectionIds, ["format", "safe-zones", "subtitles", "audio-loudness", "missing-media", "render-route"]);
assert.equal(summary.sections.find((section) => section.id === "format")?.summary, "MP4 / 1080x1920");
assert.equal(summary.sections.find((section) => section.id === "safe-zones")?.summary, "Shorts safe zones");
assert.match(summary.sections.find((section) => section.id === "subtitles")?.summary ?? "", /1 cues burned in/);
assert.match(summary.sections.find((section) => section.id === "audio-loudness")?.detail ?? "", /Peak layer volume is 100%/);
assert.equal(summary.sections.find((section) => section.id === "render-route")?.summary, "Browser route");

const missingAsset = createMediaAsset({});
const missingProject = createProject("Missing export QA", "16:9");
missingProject.layers = [createLayerFromAsset(missingAsset, 0)];
const missingPlan = createRenderPlan(missingProject, [missingAsset], "mp4-1080p", "mp4");
const missingHandoff = createRenderHandoffPlan({ project: missingProject, assets: [missingAsset], plan: missingPlan, isDesktopRuntime: false });
const missingSummary = createExportQaSummary({
  project: missingProject,
  mediaAssets: [missingAsset],
  plan: missingPlan,
  handoff: missingHandoff,
});

assert.equal(missingSummary.status, "blocked");
assert.equal(missingSummary.sections.find((section) => section.id === "missing-media")?.status, "blocked");

const source = read("src/lib/editor/export-qa-summary.ts");
const checklist = read("src/features/editor/components/delivery-qa-checklist.tsx");
const exportPanel = read("src/features/editor/components/export-panel.tsx");
const packageJson = read("package.json");
const lightweight = read("scripts/check-lightweight.mjs");

assert.match(source, /safe-zones/);
assert.match(source, /subtitles/);
assert.match(source, /audio-loudness/);
assert.match(source, /missing-media/);
assert.match(source, /render-route/);
assert.match(checklist, /Open export QA summary/);
assert.match(checklist, /format, safe zones, captions, audio, media, and render route/);
assert.match(exportPanel, /plan=\{renderPlanPreview\}/);
assert.match(exportPanel, /handoff=\{renderHandoff\}/);
assert.match(packageJson, /check:export-qa-summary-workflow/);
assert.match(lightweight, /check:export-qa-summary-workflow/);

console.log("Export QA summary workflow checks passed.");

function createMediaAsset(input: Partial<MediaAsset>): MediaAsset {
  return {
    id: input.id ?? crypto.randomUUID(),
    name: input.name ?? "sample-video.mp4",
    type: input.type ?? "video",
    mimeType: input.mimeType ?? "video/mp4",
    size: input.size ?? 1_024_000,
    duration: input.duration ?? 8,
    width: input.width ?? 1080,
    height: input.height ?? 1920,
    storageKey: input.storageKey ?? "sample-video.mp4",
    source: input.source ?? "browser-indexeddb",
    objectUrl: input.objectUrl,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
