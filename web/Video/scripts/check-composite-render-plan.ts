import assert from "node:assert/strict";
import type { EditorProject, MediaAsset, TimelineLayer } from "../src/lib/editor/types";
import { createRenderPlan } from "../src/lib/render/export-planner";
import { createCompositeRenderManifest } from "../src/lib/render/composite-manifest";

const now = "2026-05-14T00:00:00.000Z";

const videoAsset = mediaAsset({
  id: "asset-video",
  name: "demo.mp4",
  type: "video",
  mimeType: "video/mp4",
  duration: 12,
  width: 1920,
  height: 1080,
});
const audioAsset = mediaAsset({
  id: "asset-audio",
  name: "voiceover.wav",
  type: "audio",
  mimeType: "audio/wav",
  duration: 10,
});

const project: EditorProject = {
  formatVersion: 1,
  id: "project-composite-check",
  title: "Composite check",
  aspectRatio: "16:9",
  width: 1920,
  height: 1080,
  duration: 12,
  fps: 30,
  background: "#111827",
  updatedAt: now,
  layers: [
    timelineLayer({ id: "layer-audio", kind: "audio", track: 4, assetId: audioAsset.id, name: "Voiceover", duration: 10 }),
    timelineLayer({ id: "layer-title", kind: "text", track: 2, name: "Title", text: "Launch cut", duration: 5 }),
    timelineLayer({ id: "layer-video", kind: "video", track: 0, assetId: videoAsset.id, name: "Demo clip", duration: 12 }),
    timelineLayer({ id: "layer-caption", kind: "subtitle", track: 3, name: "Captions", duration: 10 }),
    timelineLayer({ id: "layer-shape", kind: "shape", track: 1, name: "Callout", duration: 6 }),
    timelineLayer({ id: "layer-hidden", kind: "image", track: 5, assetId: "asset-missing", name: "Hidden missing", hidden: true }),
  ],
};

const plan = createRenderPlan(project, [videoAsset, audioAsset], "webm-720p-compressed", "webm");
assert.equal(plan.mode, "composite");
assert.equal(plan.supported, true);

const manifest = createCompositeRenderManifest(plan, project, [videoAsset, audioAsset]);
assert.equal(manifest.width, 1280);
assert.equal(manifest.height, 720);
assert.equal(manifest.fps, 24);
assert.equal(manifest.duration, 12);
assert.equal(manifest.transparentBackground, false);
assert.equal(plan.outputBaseName, "Composite check");
assert.deepEqual(
  manifest.layers.map((item) => item.layer.id),
  ["layer-video", "layer-shape", "layer-title", "layer-caption", "layer-audio"],
);
assert.deepEqual(
  manifest.visualLayers.map((item) => item.layer.id),
  ["layer-video", "layer-shape", "layer-title", "layer-caption"],
);
assert.deepEqual(
  manifest.audioLayers.map((item) => item.layer.id),
  ["layer-audio"],
);
assert.deepEqual(manifest.missingMediaLayers, []);

const missingAudioManifest = createCompositeRenderManifest(plan, project, [videoAsset]);
assert.deepEqual(
  missingAudioManifest.missingMediaLayers.map((layer) => layer.id),
  ["layer-audio"],
);

const transparentPngPlan = createRenderPlan(project, [videoAsset, audioAsset], "png-transparent-frame", "png");
const transparentPngManifest = createCompositeRenderManifest(transparentPngPlan, project, [videoAsset, audioAsset]);
assert.equal(transparentPngPlan.conversionOptions?.backgroundMode, "transparent");
assert.equal(transparentPngManifest.transparentBackground, true);

const singleMediaProject: EditorProject = {
  ...project,
  layers: [timelineLayer({ id: "layer-single-video", kind: "video", assetId: videoAsset.id, name: "Single clip", duration: 8 })],
};
const singleMediaPlan = createRenderPlan(singleMediaProject, [videoAsset], "mp4-1080p", "mp4");
assert.equal(singleMediaPlan.mode, "single-media-ffmpeg");
assert.equal(singleMediaPlan.primaryAsset?.id, videoAsset.id);
assert.equal(singleMediaPlan.outputBaseName, "Composite check");

console.log("Composite render plan scenarios passed.");

function mediaAsset(input: Partial<MediaAsset> & Pick<MediaAsset, "id" | "name" | "type" | "mimeType" | "duration">): MediaAsset {
  return {
    size: 1000,
    storageKey: input.id,
    source: "browser-indexeddb",
    createdAt: now,
    ...input,
  };
}

function timelineLayer(input: Partial<TimelineLayer> & Pick<TimelineLayer, "id" | "kind" | "name">): TimelineLayer {
  return {
    track: 0,
    start: 0,
    duration: 5,
    trimStart: 0,
    playbackRate: 1,
    locked: false,
    muted: false,
    hidden: false,
    transform: {
      x: 0.5,
      y: 0.5,
      width: 640,
      height: 360,
      rotation: 0,
      scale: 1,
    },
    style: {
      fill: "#ffffff",
      stroke: "transparent",
      background: "transparent",
      fontFamily: "Geist",
      fontSize: 42,
      fontWeight: 700,
      radius: 8,
      opacity: 1,
      blur: 0,
    },
    createdAt: now,
    updatedAt: now,
    ...input,
  };
}
