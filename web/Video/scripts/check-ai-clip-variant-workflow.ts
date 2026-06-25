import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createLayerFromAsset, createProject, createTextLayer } from "../src/lib/editor/factory";
import {
  createRepurposeClipProjectVariant,
  createRepurposeClipProjectVariants,
  socialPresetForClipPlatform,
} from "../src/lib/editor/project-variants";
import { syncedProjectPayloadSchema } from "../src/lib/projects/project-sync-schema";
import { aiCapabilities } from "../src/lib/product/capabilities/ai";
import type { MediaAsset } from "../src/lib/editor/types";

const project = createProject("Launch webinar", "16:9");
project.duration = 60;

const videoAsset: MediaAsset = {
  id: "asset-video",
  name: "webinar.mp4",
  type: "video",
  mimeType: "video/mp4",
  size: 4000,
  duration: 60,
  width: 1920,
  height: 1080,
  storageKey: "browser-media/webinar.mp4",
  source: "browser-indexeddb",
  createdAt: "2026-05-15T00:00:00.000Z",
};

const videoLayer = createLayerFromAsset(videoAsset, 0);
videoLayer.start = 0;
videoLayer.duration = 60;

const titleLayer = createTextLayer("text", 1);
titleLayer.start = 10;
titleLayer.duration = 18;
titleLayer.transform.x = 0.96;
titleLayer.transform.y = 0.96;

project.layers = [videoLayer, titleLayer];

const clip = {
  title: "Feature demo hook",
  start: 12,
  end: 24,
  platform: "youtube-shorts" as const,
  caption: "The fastest way to turn a webinar into short clips.",
  editNotes: ["Open with the product shot.", "Keep captions inside the vertical title safe zone."],
};

assert.equal(socialPresetForClipPlatform("youtube-shorts").id, "youtube-shorts");
assert.equal(socialPresetForClipPlatform("instagram-reels").id, "tiktok-reel");

const variant = createRepurposeClipProjectVariant(project, clip);
assert.ok(variant);
assert.notEqual(variant.id, project.id);
assert.equal(variant.duration, 12);
assert.equal(variant.aspectRatio, "9:16");
assert.equal(variant.width, 1080);
assert.equal(variant.height, 1920);
assert.equal(variant.layers.some((layer) => layer.name === "Clip caption" && layer.text === clip.caption), true);
assert.equal(variant.layers.every((layer) => layer.start >= 0 && layer.start + layer.duration <= variant.duration), true);

const clippedVideo = variant.layers.find((layer) => layer.assetId === videoAsset.id);
assert.equal(clippedVideo?.start, 0);
assert.equal(clippedVideo?.duration, 12);
assert.equal(clippedVideo?.trimStart, 12);

const clippedTitle = variant.layers.find((layer) => layer.name === "Text layer");
assert.ok(clippedTitle);
assert.equal(clippedTitle.transform.x <= 0.86, true);
assert.equal(clippedTitle.transform.y <= 0.76, true);
assert.equal(syncedProjectPayloadSchema.safeParse({ project: variant, mediaAssets: [videoAsset] }).success, true);
assert.equal(createRepurposeClipProjectVariants(project, [clip, { ...clip, start: 40, end: 40 }]).length, 1);

const resultTypes = readFileSync(new URL("../src/features/editor/components/ai-result-types.ts", import.meta.url), "utf8");
const resultView = readFileSync(new URL("../src/features/editor/components/ai-result-view.tsx", import.meta.url), "utf8");
const assistantPanel = readFileSync(new URL("../src/features/editor/components/ai-assistant-panel.tsx", import.meta.url), "utf8");
const variantSource = readFileSync(new URL("../src/lib/editor/project-variants.ts", import.meta.url), "utf8");

assert.match(resultTypes, /isRepurposeOutput/);
assert.match(resultView, /Save clip variants/);
assert.match(resultView, /onSaveClipVariants/);
assert.match(assistantPanel, /createRepurposeClipProjectVariants/);
assert.match(assistantPanel, /saveLocalProject/);
assert.match(variantSource, /safeZoneFramedTransform/);

const clipCapability = aiCapabilities.find((capability) => capability.id === "ai-video-generation");
assert.equal(clipCapability?.status, "partial");
assert.match(clipCapability?.evidence.join(" ") ?? "", /clip variants/);

console.log("AI clip variant workflow checks passed.");
