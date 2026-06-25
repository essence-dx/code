import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createLayerFromAsset, createProject, createTextLayer } from "../src/lib/editor/factory";
import { createObjectMask } from "../src/lib/editor/object-masks";
import { availableTrackingRegions, trackedLayerTransform } from "../src/lib/editor/tracking";
import type { MediaAsset } from "../src/lib/editor/types";

const asset = {
  id: "asset_tracking_video",
  name: "Tracking source.mp4",
  type: "video",
  mimeType: "video/mp4",
  size: 1024,
  duration: 12,
  width: 1000,
  height: 500,
  storageKey: "file://G:/Kapwing/fixtures/tracking-source.mp4",
  source: "tauri-fs",
  createdAt: "2026-05-15T00:00:00.000Z",
} satisfies MediaAsset;

const project = createProject("Motion tracking", "16:9");
const sourceLayer = createLayerFromAsset(asset, 0);
const trackedMask = {
  ...createObjectMask("solid"),
  id: "mask_face",
  x: 0.6,
  y: 0.3,
  width: 0.2,
  height: 0.2,
  tracking: "center" as const,
};
sourceLayer.id = "layer_source";
sourceLayer.transform = {
  ...sourceLayer.transform,
  x: 0.5,
  y: 0.5,
  width: 1000,
  height: 500,
  scale: 1,
  rotation: 0,
};
sourceLayer.style.objectMasks = [trackedMask];

const labelLayer = createTextLayer("text", 1);
labelLayer.id = "layer_label";
labelLayer.tracking = {
  enabled: true,
  targetLayerId: sourceLayer.id,
  targetMaskId: trackedMask.id,
  offsetX: 0,
  offsetY: -0.06,
  scaleWithTarget: false,
};
project.layers = [sourceLayer, labelLayer];

const regions = availableTrackingRegions(project.layers, labelLayer.id);
assert.deepEqual(
  regions.map((region) => region.id),
  ["layer_source:center", "layer_source:mask:mask_face"],
);

const transform = trackedLayerTransform(labelLayer, project.layers, 0, { width: project.width, height: project.height });
assert.equal(Number(transform.x.toFixed(4)), 0.6042);
assert.equal(Number(transform.y.toFixed(4)), 0.3937);

const tracking = read("src/lib/editor/tracking.ts");
assert.match(tracking, /availableTrackingRegions/);
assert.match(tracking, /trackedLayerTransform/);
assert.match(tracking, /trackingAnchor/);
assert.match(tracking, /targetMaskId/);

const preview = read("src/features/editor/components/preview-canvas.tsx");
assert.match(preview, /trackedLayerTransform/);

const renderer = read("src/lib/render/composite-renderer.ts");
assert.match(renderer, /trackedLayerTransform/);

const panel = read("src/features/editor/components/tracking-attachment-panel.tsx");
assert.match(panel, /TrackingAttachmentPanel/);
assert.match(panel, /SelectItem/);
assert.match(panel, /Scale follow/);

const schema = read("src/lib/projects/project-sync-schema.ts");
assert.match(schema, /layerTrackingAttachmentSchema/);
assert.match(schema, /tracking: layerTrackingAttachmentSchema\.optional\(\)/);

const graph = read("src/lib/render/native-render-graph.ts");
assert.match(graph, /trackingTargetLayerId/);
assert.match(graph, /normalizeLayerTrackingAttachment/);

console.log("Motion tracking attachment workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
