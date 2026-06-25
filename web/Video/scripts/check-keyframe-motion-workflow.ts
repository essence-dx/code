import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createTextLayer } from "../src/lib/editor/factory";
import { createLayerKeyframeSnapshot, keyframedLayerOpacity, normalizeLayerKeyframes } from "../src/lib/editor/keyframes";
import { animatedLayerTransform } from "../src/lib/editor/motion";
import { syncedProjectPayloadSchema } from "../src/lib/projects/project-sync-schema";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const layer = createTextLayer("text", 0);
layer.duration = 10;
layer.transform.x = 0.2;
layer.transform.y = 0.4;
layer.transform.scale = 1;
layer.style.opacity = 1;

const start = createLayerKeyframeSnapshot(layer, 0);
layer.transform.x = 0.8;
layer.transform.y = 0.6;
layer.transform.rotation = 90;
layer.transform.scale = 2;
layer.transform.crop = { x: 0.1, y: 0.1, width: 0.8, height: 0.8 };
layer.style.opacity = 0.25;
const end = createLayerKeyframeSnapshot(layer, 10);

layer.keyframes = normalizeLayerKeyframes([start, { ...end, easing: "ease-in-out" }], layer.duration);

const midpoint = animatedLayerTransform(layer, layer.start + 5);
assert.equal(midpoint.x > 0.2 && midpoint.x < 0.8, true);
assert.equal(midpoint.y > 0.4 && midpoint.y < 0.6, true);
assert.equal(midpoint.rotation > 0 && midpoint.rotation < 90, true);
assert.equal(midpoint.scale > 1 && midpoint.scale < 2, true);
assert.equal((midpoint.crop?.width ?? 1) < 1, true);
assert.equal(keyframedLayerOpacity(layer, layer.start + 5) < 1, true);

const projectPayload = {
  project: {
    formatVersion: 1,
    id: "project_keyframes",
    title: "Keyframe check",
    aspectRatio: "16:9",
    width: 1920,
    height: 1080,
    duration: 10,
    fps: 30,
    background: "#000000",
    layers: [layer],
    updatedAt: new Date().toISOString(),
  },
  mediaAssets: [],
};

assert.equal(syncedProjectPayloadSchema.safeParse(projectPayload).success, true);

const keyframes = read("src/lib/editor/keyframes.ts");
assert.match(keyframes, /keyframedLayerTransform/);
assert.match(keyframes, /keyframedLayerOpacity/);
assert.match(keyframes, /crop/);

const inspector = read("src/features/editor/components/inspector-panel.tsx");
assert.match(inspector, /KeyframePanel/);

const panel = read("src/features/editor/components/keyframe-panel.tsx");
assert.match(panel, /createLayerKeyframeSnapshot/);
assert.match(panel, /Capture current values/);

const preview = read("src/features/editor/components/preview-canvas.tsx");
assert.match(preview, /keyframedLayerOpacity/);
assert.match(preview, /animatedLayerTransform/);

const renderer = read("src/lib/render/composite-renderer.ts");
assert.match(renderer, /keyframedLayerOpacity/);
assert.match(renderer, /animatedLayerTransform/);

console.log("Keyframe motion workflow checks passed.");
