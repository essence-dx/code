import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createProject, createTextLayer } from "../src/lib/editor/factory";
import { createSocialFormatProjectResize, createSocialFormatProjectVariant } from "../src/lib/editor/project-variants";
import { exportPresets } from "../src/lib/editor/presets";
import { socialDeliveryPresets, socialFormatPresets, preferredSocialFormatForAspect, preferredSocialFormatForCanvas } from "../src/lib/editor/social-format-presets";
import { createRenderPlan } from "../src/lib/render/export-planner";
import { syncedProjectPayloadSchema } from "../src/lib/projects/project-sync-schema";

const project = createProject("Social format check", "16:9");
const textLayer = createTextLayer("text", 0);
project.layers = [textLayer];
project.duration = 5;

assert.equal(socialFormatPresets.length >= 6, true);
assert.equal(socialFormatPresets.some((preset) => preset.id === "youtube-shorts" && preset.aspectRatio === "9:16"), true);
assert.equal(socialFormatPresets.some((preset) => preset.id === "instagram-square" && preset.aspectRatio === "1:1"), true);
for (const expected of ["linkedin-feed", "linkedin-banner", "instagram-reels", "instagram-feed-portrait", "tiktok-reel", "youtube-thumbnail", "youtube-channel-banner"]) {
  assert.equal(socialFormatPresets.some((preset) => preset.id === expected), true);
}
assert.equal(preferredSocialFormatForAspect("9:16").aspectRatio, "9:16");
assert.equal(socialDeliveryPresets.every((delivery) => exportPresets.some((preset) => preset.id === delivery.exportPresetId)), true);

const verticalPreset = socialFormatPresets.find((preset) => preset.id === "youtube-shorts");
assert.ok(verticalPreset);
const variant = createSocialFormatProjectVariant(project, verticalPreset);
assert.notEqual(variant.id, project.id);
assert.equal(variant.aspectRatio, "9:16");
assert.equal(variant.socialFormatId, "youtube-shorts");
assert.equal(variant.width, 1080);
assert.equal(variant.height, 1920);
assert.equal(variant.layers[0].transform.width <= textLayer.transform.width, true);
assert.equal(syncedProjectPayloadSchema.safeParse({ project: variant, mediaAssets: [] }).success, true);

const linkedinBannerPreset = socialFormatPresets.find((preset) => preset.id === "linkedin-banner");
assert.ok(linkedinBannerPreset);
const resized = createSocialFormatProjectResize(project, linkedinBannerPreset);
assert.equal(resized.id, project.id);
assert.equal(resized.title, project.title);
assert.equal(resized.socialFormatId, "linkedin-banner");
assert.equal(preferredSocialFormatForCanvas(resized).id, "linkedin-banner");

const pngPlan = createRenderPlan(project, [], "png-current-frame", "png");
assert.equal(pngPlan.mode, "composite");
assert.equal(pngPlan.supported, true);

const exportPanel = readFileSync(new URL("../src/features/editor/components/export-panel.tsx", import.meta.url), "utf8");
assert.match(exportPanel, /socialDeliveryPresets/);
assert.match(exportPanel, /selectedBatchDeliveryIds/);
assert.match(exportPanel, /renderBatch/);
assert.match(exportPanel, /renderCurrentFrameImage/);

const socialPanel = readFileSync(new URL("../src/features/editor/components/social-format-panel.tsx", import.meta.url), "utf8");
assert.match(socialPanel, /createSocialFormatProjectVariant/);
assert.match(socialPanel, /createSocialFormatProjectResize/);
assert.match(socialPanel, /saveLocalProject/);
assert.match(socialPanel, /selectedVariantIds/);

const previewCanvas = readFileSync(new URL("../src/features/editor/components/preview-canvas.tsx", import.meta.url), "utf8");
assert.match(previewCanvas, /preferredSocialFormatForCanvas/);
assert.match(previewCanvas, /safeZoneInsetStyle/);

console.log("Social format workflow checks passed.");
