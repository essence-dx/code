import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { EditorProject, MediaAsset, TimelineLayer } from "../src/lib/editor/types";
import {
  layerPlaybackRateAtProjectTime,
  layerRequiresTimelineSeeking,
  layerSourceDuration,
  layerSourceTimeAtProjectTime,
  normalizeLayerSpeed,
} from "../src/lib/editor/speed";
import { createRenderPlan } from "../src/lib/render/export-planner";
import { createNativeRenderGraph } from "../src/lib/render/native-render-graph";

const layer = {
  id: "layer_speed",
  kind: "video",
  name: "Speed test",
  track: 1,
  start: 4,
  duration: 10,
  trimStart: 2,
  playbackRate: 1,
  speed: {
    reversed: true,
    preservePitch: false,
    ramp: {
      enabled: true,
      mode: "linear",
      startRate: 1,
      endRate: 3,
    },
  },
  locked: false,
  muted: false,
  hidden: false,
  transform: { x: 0.5, y: 0.5, width: 640, height: 360, rotation: 0, scale: 1 },
  style: {
    fill: "#ffffff",
    stroke: "transparent",
    background: "transparent",
    fontFamily: "Geist",
    fontSize: 32,
    fontWeight: 700,
    radius: 0,
    opacity: 1,
    blur: 0,
  },
  createdAt: "2026-05-14T00:00:00.000Z",
  updatedAt: "2026-05-14T00:00:00.000Z",
} satisfies TimelineLayer;

assert.equal(normalizeLayerSpeed({ ...layer.speed, ramp: { ...layer.speed.ramp, startRate: 0, endRate: 99 } }, 1).ramp.startRate, 0.1);
assert.equal(normalizeLayerSpeed({ ...layer.speed, ramp: { ...layer.speed.ramp, startRate: 0, endRate: 99 } }, 1).ramp.endRate, 16);
assert.equal(layerPlaybackRateAtProjectTime(layer, 4), 1);
assert.equal(layerPlaybackRateAtProjectTime(layer, 9), 2);
assert.equal(layerPlaybackRateAtProjectTime(layer, 14), 3);
assert.equal(layerSourceDuration(layer), 20);
assert.equal(layerSourceTimeAtProjectTime(layer, 4), 22);
assert.equal(layerSourceTimeAtProjectTime(layer, 9), 14.5);
assert.equal(layerSourceTimeAtProjectTime(layer, 14), 2);
assert.equal(layerRequiresTimelineSeeking(layer), true);

const asset = {
  id: "asset_speed_video",
  name: "speed-video.mp4",
  type: "video",
  mimeType: "video/mp4",
  size: 1000,
  duration: 30,
  width: 1280,
  height: 720,
  storageKey: "file://G:/Kapwing/fixtures/speed-video.mp4",
  source: "tauri-fs",
  createdAt: "2026-05-14T00:00:00.000Z",
} satisfies MediaAsset;
const project = {
  formatVersion: 1,
  id: "project_speed",
  title: "Speed render",
  aspectRatio: "16:9",
  width: 1280,
  height: 720,
  duration: 10,
  fps: 30,
  background: "#111827",
  updatedAt: "2026-05-14T00:00:00.000Z",
  layers: [{ ...layer, assetId: asset.id }],
} satisfies EditorProject;
const nativeGraph = createNativeRenderGraph(project, [asset], createRenderPlan(project, [asset], "mp4-1080p", "mp4"));
assert.equal(nativeGraph.layers[0]?.timing.sourceDuration, 20);
assert.equal(nativeGraph.layers[0]?.timing.speed.reversed, true);
assert.equal(nativeGraph.layers[0]?.timing.speed.preservePitch, false);
assert.equal(nativeGraph.layers[0]?.timing.speed.ramp.enabled, true);
assert.equal(nativeGraph.layers[0]?.timing.speed.ramp.startRate, 1);
assert.equal(nativeGraph.layers[0]?.timing.speed.ramp.endRate, 3);

const inspector = readFileSync(new URL("../src/features/editor/components/inspector-timing-section.tsx", import.meta.url), "utf8");
assert.match(inspector, /MediaSpeedEditor/);
assert.match(inspector, /Media speed/);
assert.match(inspector, /Reverse/);
assert.match(inspector, /Preserve pitch/);
assert.match(inspector, /Speed ramp/);

const preview = readFileSync(new URL("../src/features/editor/components/preview-canvas.tsx", import.meta.url), "utf8");
assert.match(preview, /layerSourceTimeAtProjectTime/);
assert.match(preview, /layerPlaybackRateAtProjectTime/);
assert.match(preview, /preservesPitch/);

const renderer = readFileSync(new URL("../src/lib/render/composite-renderer.ts", import.meta.url), "utf8");
assert.match(renderer, /layerSourceTimeAtProjectTime/);
assert.match(renderer, /layerRequiresTimelineSeeking/);
assert.match(renderer, /speed\.reversed/);

const nativeRenderGraph = readFileSync(new URL("../src/lib/render/native-render-graph.ts", import.meta.url), "utf8");
assert.match(nativeRenderGraph, /layerSourceDuration/);
assert.match(nativeRenderGraph, /sourceDuration/);
assert.match(nativeRenderGraph, /normalizeLayerSpeed/);

const nativeFfmpegGraph = readFileSync(new URL("../src-tauri/src/native_ffmpeg_graph.rs", import.meta.url), "utf8");
assert.match(nativeFfmpegGraph, /fn video_speed_filters/);
assert.match(nativeFfmpegGraph, /fn video_pts_filter/);
assert.match(nativeFfmpegGraph, /sqrt/);
assert.match(nativeFfmpegGraph, /areverse/);
assert.match(nativeFfmpegGraph, /atempo/);
assert.match(nativeFfmpegGraph, /sourceDuration/);

const schema = readFileSync(new URL("../src/lib/projects/project-sync-schema.ts", import.meta.url), "utf8");
assert.match(schema, /const layerSpeedSchema/);
assert.match(schema, /speed: layerSpeedSchema\.optional\(\)/);

console.log("Speed workflow checks passed.");
