import assert from "node:assert/strict";
import { createLayerFromAsset, createProject, createTextLayer } from "../src/lib/editor/factory";
import type { EditorProject, MediaAsset } from "../src/lib/editor/types";
import { PROJECT_FORMAT_VERSION } from "../src/lib/editor/types";
import { inferMediaTypeFromFile, UnsupportedMediaTypeError } from "../src/lib/media/media-type";
import { createLocalProjectRecord, parseLocalProjectRecord } from "../src/lib/projects/local-project-record";
import { parseProjectBundleText, validateProjectBundleFile } from "../src/lib/projects/project-bundle";
import { syncedProjectPayloadSchema } from "../src/lib/projects/project-sync-schema";
import { createRenderPlan } from "../src/lib/render/export-planner";
import { preflightRenderPlan } from "../src/lib/render/render-preflight";

const now = "2026-05-14T00:00:00.000Z";

const videoAsset: MediaAsset = {
  id: "asset_runtime_video",
  name: "Launch clip.mp4",
  type: "video",
  mimeType: "video/mp4",
  size: 6_000_000,
  duration: 12,
  width: 1920,
  height: 1080,
  storageKey: "runtime-video",
  source: "browser-indexeddb",
  createdAt: now,
};

const project = createProject("Runtime smoke project", "16:9");
const videoLayer = createLayerFromAsset(videoAsset, 0);
const captionLayer = createTextLayer("subtitle", 1);
const hydratedProject: EditorProject = {
  ...project,
  formatVersion: PROJECT_FORMAT_VERSION,
  duration: 12,
  layers: [videoLayer, { ...captionLayer, duration: 12 }],
  updatedAt: now,
};

assert.equal(inferMediaTypeFromFile({ name: "clip.MP4", type: "" }), "video");
assert.equal(inferMediaTypeFromFile({ name: "voice.wav", type: "audio/wav" }), "audio");
assert.equal(inferMediaTypeFromFile({ name: "poster", type: "image/png" }), "image");
assert.throws(() => inferMediaTypeFromFile({ name: "notes.txt", type: "text/plain" }), UnsupportedMediaTypeError);

const syncedPayload = syncedProjectPayloadSchema.parse({
  project: hydratedProject,
  mediaAssets: [videoAsset],
});
assert.equal(syncedPayload.project.layers.length, 2);
assert.equal("objectUrl" in syncedPayload.mediaAssets[0], false);

const localRecord = createLocalProjectRecord({
  project: hydratedProject,
  mediaAssets: [videoAsset],
  createdAt: now,
  updatedAt: now,
});
assert.equal(parseLocalProjectRecord(localRecord)?.id, hydratedProject.id);
assert.equal(localRecord.layerCount, 2);
assert.equal(localRecord.mediaCount, 1);

validateProjectBundleFile({ name: "runtime-smoke.json", type: "application/json", size: 1024 });
const parsedBundle = parseProjectBundleText(JSON.stringify({ project: hydratedProject, assets: [videoAsset] }));
assert.equal(parsedBundle.project.id, hydratedProject.id);
assert.equal(parsedBundle.mediaAssets.length, 1);

const bundlePlan = createRenderPlan(hydratedProject, [videoAsset], "project-bundle", "json");
assert.equal(bundlePlan.mode, "project-bundle");
assert.equal((await preflightRenderPlan(bundlePlan, hydratedProject, [videoAsset])).ok, true);

const textOnlyProject: EditorProject = {
  ...createProject("PNG preflight project", "1:1"),
  duration: 5,
  layers: [createTextLayer("text", 0)],
  updatedAt: now,
};
const pngPlan = createRenderPlan(textOnlyProject, [], "png-current-frame", "png");
assert.equal(pngPlan.mode, "composite");
assert.equal((await preflightRenderPlan(pngPlan, textOnlyProject, [])).ok, true);

console.log("Editor runtime smoke checks passed.");
