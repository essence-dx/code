import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createLayerFromAsset, createProject } from "../src/lib/editor/factory";
import { alignCrop, cropForAspectPreset, maskShapeRadius } from "../src/lib/editor/crop-presets";
import { hasActiveCrop, mediaObjectFit, normalizeLayerCrop, normalizeLayerFramingMode } from "../src/lib/editor/framing";
import type { MediaAsset } from "../src/lib/editor/types";
import { syncedProjectPayloadSchema } from "../src/lib/projects/project-sync-schema";

const now = "2026-05-14T00:00:00.000Z";
const asset: MediaAsset = {
  id: "asset_image",
  name: "poster.png",
  type: "image",
  mimeType: "image/png",
  size: 1000,
  duration: 5,
  width: 1200,
  height: 800,
  storageKey: "asset_image",
  source: "browser-indexeddb",
  createdAt: now,
};

const project = createProject("Framing check", "9:16");
const layer = createLayerFromAsset(asset, 0);
layer.transform.flipX = true;
layer.transform.flipY = true;
layer.transform.framing = "fit";
layer.transform.crop = { x: 0.1, y: 0.2, width: 0.75, height: 0.6 };
project.layers = [layer];

assert.equal(normalizeLayerFramingMode(undefined), "fill");
assert.equal(mediaObjectFit({ framing: "fit" }), "contain");
assert.equal(mediaObjectFit({ framing: "fill" }), "cover");
assert.equal(mediaObjectFit({ framing: "stretch" }), "fill");
assert.equal(hasActiveCrop(layer.transform.crop), true);
assert.deepEqual(normalizeLayerCrop({ x: 0.9, y: 0.9, width: 0.5, height: 0.5 }), { x: 0.5, y: 0.5, width: 0.5, height: 0.5 });
assert.deepEqual(cropForAspectPreset("square", { width: 1200, height: 800 }), { x: 0.16666666666666669, y: 0, width: 0.6666666666666666, height: 1 });
assert.deepEqual(alignCrop({ x: 0.2, y: 0.2, width: 0.5, height: 0.5 }, "right"), { x: 0.5, y: 0.2, width: 0.5, height: 0.5 });
assert.equal(maskShapeRadius("circle", { width: 320, height: 240 }), 120);
assert.equal(syncedProjectPayloadSchema.safeParse({ project, mediaAssets: [asset] }).success, true);

const inspector = readFileSync(new URL("../src/features/editor/components/inspector-panel.tsx", import.meta.url), "utf8");
const transformSection = readFileSync(new URL("../src/features/editor/components/inspector-transform-section.tsx", import.meta.url), "utf8");
assert.match(inspector, /InspectorTransformSection/);
assert.match(transformSection, /Flip horizontal/);
assert.match(transformSection, /FramingModeControls/);
assert.match(transformSection, /CropControls/);
assert.match(transformSection, /cropAspectPresets/);
assert.match(transformSection, /cropFocusPresets/);
assert.match(transformSection, /MaskShapeControls/);
assert.match(transformSection, /Add blurred background/);
assert.match(transformSection, /onFitSelectedLayersToCanvas/);

const store = readFileSync(new URL("../src/features/editor/state/editor-store.ts", import.meta.url), "utf8");
const timelineEditSlice = readFileSync(new URL("../src/features/editor/state/editor-timeline-edit-slice.ts", import.meta.url), "utf8");
assert.match(store, /createEditorTimelineEditSlice\(set, get,/);
assert.match(timelineEditSlice, /centerSelectedLayers/);
assert.match(timelineEditSlice, /fitSelectedLayersToCanvas/);
assert.match(timelineEditSlice, /addBlurredBackgroundForSelectedMediaLayers/);
assert.match(timelineEditSlice, /createBlurredBackgroundLayer/);

const preview = readFileSync(new URL("../src/features/editor/components/preview-canvas.tsx", import.meta.url), "utf8");
assert.match(preview, /mediaObjectFit/);
assert.match(preview, /mediaElementStyle/);

const renderer = readFileSync(new URL("../src/lib/render/composite-renderer.ts", import.meta.url), "utf8");
assert.match(renderer, /mediaDrawPlan/);
assert.match(renderer, /sourceX/);
assert.match(renderer, /context\.roundRect\(x, y, width, height, Math\.max\(0, radius\)\)/);

console.log("Framing workflow checks passed.");
