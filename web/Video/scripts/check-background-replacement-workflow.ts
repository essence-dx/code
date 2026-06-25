import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hasActiveBackgroundReplacement, normalizeLayerBackgroundReplacement } from "../src/lib/editor/chroma-key";
import { createProject, createTextLayer } from "../src/lib/editor/factory";
import { normalizeLayerVisualStyle } from "../src/lib/editor/visual-effects";
import { syncedProjectPayloadSchema } from "../src/lib/projects/project-sync-schema";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const replacement = normalizeLayerBackgroundReplacement({
  enabled: true,
  mode: "color",
  color: "#1f2937",
  opacity: 0.7,
});
assert.equal(hasActiveBackgroundReplacement(replacement), true);
assert.equal(replacement.color, "#1f2937");
assert.equal(replacement.opacity, 0.7);

const disabled = normalizeLayerBackgroundReplacement({ enabled: true, mode: "transparent", color: "#ffffff", opacity: 1 });
assert.equal(hasActiveBackgroundReplacement(disabled), false);

const project = createProject("Background replacement check", "16:9");
const layer = createTextLayer("text", 0);
layer.kind = "video";
layer.assetId = "asset_video_green_screen";
layer.style = {
  ...normalizeLayerVisualStyle(layer.style),
  chromaKey: {
    enabled: true,
    color: "#00ff00",
    similarity: 0.3,
    smoothness: 0.12,
    spill: 0.4,
  },
  backgroundReplacement: replacement,
};
project.layers = [layer];

assert.equal(syncedProjectPayloadSchema.safeParse({ project, mediaAssets: [] }).success, true);

const chromaKey = read("src/lib/editor/chroma-key.ts");
assert.match(chromaKey, /normalizeLayerBackgroundReplacement/);
assert.match(chromaKey, /drawBackgroundReplacement/);
assert.match(chromaKey, /context\.fillRect/);

const effectsPanel = read("src/features/editor/components/visual-effects-panel.tsx");
assert.match(effectsPanel, /Replace keyed background/);
assert.match(effectsPanel, /backgroundReplacement/);

const previewMedia = read("src/features/editor/components/chroma-key-preview-media.tsx");
assert.match(previewMedia, /drawChromaKeyedMedia/);

const renderer = read("src/lib/render/composite-renderer.ts");
assert.match(renderer, /drawChromaKeyedMedia/);

console.log("Background replacement workflow checks passed.");
