import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createProject } from "../src/lib/editor/factory";
import { findImageToolPreset, imageToolPresets } from "../src/lib/editor/image-tool-presets";
import { createMediaLayoutLayers } from "../src/lib/editor/media-layouts";
import { exportPresets, getAspectPreset } from "../src/lib/editor/presets";
import type { MediaAsset } from "../src/lib/editor/types";

const now = "2026-05-15T00:00:00.000Z";
const image: MediaAsset = {
  id: "asset_image",
  name: "photo.png",
  type: "image",
  mimeType: "image/png",
  size: 1200,
  duration: 5,
  width: 1200,
  height: 900,
  storageKey: "asset_image",
  source: "browser-indexeddb",
  createdAt: now,
};

assert.equal(imageToolPresets.length >= 6, true);
assert.equal(new Set(imageToolPresets.map((preset) => preset.id)).size, imageToolPresets.length);
for (const expected of ["photo-collage-square", "photo-grid-portrait", "youtube-thumbnail", "wide-banner", "vertical-wallpaper", "image-resizer"]) {
  assert.equal(imageToolPresets.some((preset) => preset.id === expected), true);
}
assert.equal(imageToolPresets.every((preset) => exportPresets.some((exportPreset) => exportPreset.id === preset.exportPresetId)), true);
assert.equal(imageToolPresets.every((preset) => preset.mediaTypes.includes("image")), true);

const thumbnail = findImageToolPreset("youtube-thumbnail");
const aspect = getAspectPreset(thumbnail.aspectRatio);
const project = createProject("Image tools check", thumbnail.aspectRatio);
const layers = createMediaLayoutLayers({
  project,
  assets: [image],
  mode: thumbnail.mode,
  clipSeconds: thumbnail.clipSeconds,
  track: 0,
});

assert.equal(project.width, aspect.width);
assert.equal(project.height, aspect.height);
assert.equal(layers.length, 1);
assert.equal(layers[0].kind, "image");
assert.equal(layers[0].assetId, image.id);

const panel = readFileSync(new URL("../src/features/editor/components/media-layout-panel.tsx", import.meta.url), "utf8");
assert.match(panel, /imageToolPresets/);
assert.match(panel, /setAspectRatio\(tool\.aspectRatio\)/);
assert.match(panel, /selectedExportPreset/);
assert.match(panel, /Create \{modeLabels\[mode\]\}/);

console.log("Image tool workflow guard passed.");
