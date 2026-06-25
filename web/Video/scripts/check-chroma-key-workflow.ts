import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applyChromaKeyToPixels,
  hasActiveBackgroundReplacement,
  hasActiveChromaKey,
  normalizeLayerBackgroundReplacement,
  normalizeLayerChromaKey,
} from "../src/lib/editor/chroma-key";
import { createProject, createTextLayer } from "../src/lib/editor/factory";
import { normalizeLayerVisualStyle } from "../src/lib/editor/visual-effects";
import { syncedProjectPayloadSchema } from "../src/lib/projects/project-sync-schema";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const chromaKey = normalizeLayerChromaKey({
  enabled: true,
  color: "#00ff00",
  similarity: 0.3,
  smoothness: 0.1,
  spill: 0.7,
});
assert.equal(hasActiveChromaKey(chromaKey), true);
const backgroundReplacement = normalizeLayerBackgroundReplacement({
  enabled: true,
  mode: "color",
  color: "#111827",
  opacity: 0.82,
});
assert.equal(hasActiveBackgroundReplacement(backgroundReplacement), true);

const pixels = new Uint8ClampedArray([
  0, 255, 0, 255,
  220, 30, 30, 255,
]);
applyChromaKeyToPixels(pixels, chromaKey);
assert.equal(pixels[3] < 20, true);
assert.equal(pixels[7], 255);

const project = createProject("Chroma key check", "16:9");
const layer = createTextLayer("text", 0);
layer.kind = "image";
layer.assetId = "asset_green_screen";
layer.style = {
  ...normalizeLayerVisualStyle(layer.style),
  chromaKey,
  backgroundReplacement,
};
project.layers = [layer];
assert.equal(syncedProjectPayloadSchema.safeParse({ project, mediaAssets: [] }).success, true);

const effectsPanel = read("src/features/editor/components/visual-effects-panel.tsx");
assert.match(effectsPanel, /Chroma key/);
assert.match(effectsPanel, /Similarity/);
assert.match(effectsPanel, /Smoothness/);
assert.match(effectsPanel, /Spill/);
assert.match(effectsPanel, /Replace keyed background/);
assert.match(effectsPanel, /Replacement/);

const preview = read("src/features/editor/components/preview-canvas.tsx");
assert.match(preview, /ChromaKeyPreviewMedia/);
assert.match(preview, /hasCanvasMediaEffects/);

const previewMedia = read("src/features/editor/components/chroma-key-preview-media.tsx");
assert.match(previewMedia, /drawChromaKeyedMedia/);
assert.match(previewMedia, /requestAnimationFrame/);

const renderer = read("src/lib/render/composite-renderer.ts");
assert.match(renderer, /drawChromaKeyedMedia/);

const schema = read("src/lib/projects/project-sync-schema.ts");
assert.match(schema, /chromaKey/);
assert.match(schema, /backgroundReplacement/);

console.log("Chroma key workflow checks passed.");
