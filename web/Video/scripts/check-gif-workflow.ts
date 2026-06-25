import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createLayerFromAsset } from "../src/lib/editor/factory";
import {
  createGifWorkflowLayerPatch,
  findGifWorkflowPreset,
  gifWorkflowPresets,
  gifWorkflowSupportsAsset,
  isGifAsset,
} from "../src/lib/editor/gif-workflows";
import { createGifFramePreview } from "../src/lib/editor/gif-frame-preview";
import { canExtractGifFrameThumbnails } from "../src/lib/editor/gif-frame-thumbnails";
import { exportPresets, getAspectPreset } from "../src/lib/editor/presets";
import type { MediaAsset } from "../src/lib/editor/types";

const now = "2026-05-15T00:00:00.000Z";
const gifAsset: MediaAsset = {
  id: "gif_asset",
  name: "reaction.gif",
  type: "image",
  mimeType: "image/gif",
  size: 2400,
  duration: 5,
  width: 600,
  height: 600,
  storageKey: "gif_asset",
  source: "browser-indexeddb",
  createdAt: now,
};
const videoAsset: MediaAsset = {
  ...gifAsset,
  id: "video_asset",
  name: "clip.mp4",
  type: "video",
  mimeType: "video/mp4",
  storageKey: "video_asset",
};

assert.equal(gifWorkflowPresets.length >= 7, true);
assert.equal(new Set(gifWorkflowPresets.map((preset) => preset.id)).size, gifWorkflowPresets.length);
for (const expected of ["gif-trim", "gif-crop-square", "gif-collage", "gif-to-mp4", "gif-transparent-sticker", "mp4-to-gif", "gif-color-pop"]) {
  assert.equal(gifWorkflowPresets.some((preset) => preset.id === expected), true);
}
assert.equal(gifWorkflowPresets.every((preset) => exportPresets.some((exportPreset) => exportPreset.id === preset.exportPresetId)), true);
assert.equal(isGifAsset(gifAsset), true);
assert.equal(gifWorkflowSupportsAsset(findGifWorkflowPreset("gif-to-mp4"), gifAsset), true);
assert.equal(gifWorkflowSupportsAsset(findGifWorkflowPreset("gif-to-mp4"), videoAsset), false);
assert.equal(gifWorkflowSupportsAsset(findGifWorkflowPreset("gif-transparent-sticker"), gifAsset), true);
assert.equal(gifWorkflowSupportsAsset(findGifWorkflowPreset("gif-transparent-sticker"), videoAsset), false);
assert.equal(gifWorkflowSupportsAsset(findGifWorkflowPreset("mp4-to-gif"), videoAsset), true);

const workflow = findGifWorkflowPreset("gif-color-pop");
const aspect = getAspectPreset(workflow.aspectRatio);
const layer = createLayerFromAsset(gifAsset);
const patch = createGifWorkflowLayerPatch({
  preset: workflow,
  layer,
  asset: gifAsset,
  canvas: aspect,
  duration: 4,
  trimStart: 1.5,
});

assert.equal(patch.duration, 4);
assert.equal(patch.trimStart, 1.5);
assert.equal(patch.transform?.width, aspect.width);
assert.equal(patch.transform?.height, aspect.height);
assert.equal(patch.style?.saturation, 1.32);
assert.equal(patch.muted, true);

const preview = createGifFramePreview({
  preset: findGifWorkflowPreset("mp4-to-gif"),
  asset: videoAsset,
  exportPreset: exportPresets.find((preset) => preset.id === "gif-social-square"),
  duration: 3,
  trimStart: 1.25,
});
assert.equal(preview.fps, 12);
assert.equal(preview.frameCount, 36);
assert.equal(preview.frames.length, 8);
assert.equal(preview.frames[0]?.sourceTime, 1.25);
assert.equal(preview.frames.at(-1)?.positionPercent, 100);
assert.equal(preview.transparency.status, "solid-canvas");

const transparentPreview = createGifFramePreview({
  preset: findGifWorkflowPreset("gif-transparent-sticker"),
  asset: gifAsset,
  exportPreset: exportPresets.find((preset) => preset.id === "gif-transparent-sticker"),
  duration: 5,
  trimStart: 0,
});
assert.equal(transparentPreview.fps, 10);
assert.equal(transparentPreview.transparency.status, "alpha-ready");

const clampedPreview = createGifFramePreview({
  preset: findGifWorkflowPreset("gif-trim"),
  asset: { ...gifAsset, duration: 2 },
  exportPreset: exportPresets.find((preset) => preset.id === "gif-social-square"),
  duration: 8,
  trimStart: 99,
});
assert.equal(clampedPreview.duration, 2);
assert.equal(clampedPreview.trimStart, 0);
assert.equal(clampedPreview.sourceEnd, 2);
assert.equal(canExtractGifFrameThumbnails({ ...videoAsset, objectUrl: "blob:video" }), true);
assert.equal(canExtractGifFrameThumbnails({ ...gifAsset, objectUrl: "blob:gif" }), true);
assert.equal(canExtractGifFrameThumbnails(videoAsset), false);

const panel = readFileSync(new URL("../src/features/editor/components/gif-workflow-panel.tsx", import.meta.url), "utf8");
assert.match(panel, /gifWorkflowPresets/);
assert.match(panel, /Apply and queue export/);
assert.match(panel, /queueExport/);
assert.match(panel, /createGifWorkflowLayerPatch/);
assert.match(panel, /createGifFramePreview/);
assert.match(panel, /createGifFrameThumbnails/);
assert.match(panel, /Frame strip/);
assert.match(panel, /frameThumbnails/);
assert.match(panel, /setCurrentTime/);

const thumbnailExtractor = readFileSync(new URL("../src/lib/editor/gif-frame-thumbnails.ts", import.meta.url), "utf8");
assert.match(thumbnailExtractor, /createGifFrameThumbnails/);
assert.match(thumbnailExtractor, /HTMLVideoElement/);
assert.match(thumbnailExtractor, /CanvasRenderingContext2D/);

const creationPanel = readFileSync(new URL("../src/features/editor/components/creation-panel.tsx", import.meta.url), "utf8");
assert.match(creationPanel, /GifWorkflowPanel/);
assert.match(creationPanel, /value="gif"/);

console.log("GIF workflow guard passed.");
