import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hasCanvasMediaEffects } from "../src/lib/editor/chroma-key";
import { createTextLayer } from "../src/lib/editor/factory";
import { createObjectMask, hasActiveObjectMasks, normalizeLayerObjectMasks } from "../src/lib/editor/object-masks";
import { normalizeLayerVisualStyle } from "../src/lib/editor/visual-effects";
import { syncedProjectPayloadSchema } from "../src/lib/projects/project-sync-schema";

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const blurMask = createObjectMask("blur");
const solidMask = { ...createObjectMask("solid"), x: 0.1, y: 0.2, width: 0.25, height: 0.18, tracking: "center" as const };
const masks = normalizeLayerObjectMasks([blurMask, solidMask]);
assert.equal(masks.length, 2);
assert.equal(hasActiveObjectMasks(masks), true);

const layer = createTextLayer("text", 0);
layer.kind = "video";
layer.assetId = "asset_object_mask";
layer.style = {
  ...normalizeLayerVisualStyle(layer.style),
  objectMasks: masks,
};
assert.equal(hasCanvasMediaEffects(layer), true);

assert.equal(
  syncedProjectPayloadSchema.safeParse({
    project: {
      formatVersion: 1,
      id: "project_masks",
      title: "Object mask check",
      aspectRatio: "16:9",
      width: 1920,
      height: 1080,
      duration: 5,
      fps: 30,
      background: "#000000",
      layers: [layer],
      updatedAt: new Date().toISOString(),
    },
    mediaAssets: [],
  }).success,
  true,
);

const objectMasks = read("src/lib/editor/object-masks.ts");
assert.match(objectMasks, /drawObjectMasks/);
assert.match(objectMasks, /drawBlurMask/);
assert.match(objectMasks, /drawSolidMask/);

const panel = read("src/features/editor/components/object-mask-panel.tsx");
assert.match(panel, /Object masks/);
assert.match(panel, /Center track/);

const inspector = read("src/features/editor/components/inspector-panel.tsx");
assert.match(inspector, /ObjectMaskPanel/);

const preview = read("src/features/editor/components/preview-canvas.tsx");
assert.match(preview, /hasCanvasMediaEffects/);

const chromaKey = read("src/lib/editor/chroma-key.ts");
assert.match(chromaKey, /drawObjectMasks/);
assert.match(chromaKey, /hasActiveObjectMasks/);

const schema = read("src/lib/projects/project-sync-schema.ts");
assert.match(schema, /objectMasks/);
assert.match(schema, /tracking: z\.enum/);

console.log("Object mask workflow checks passed.");
