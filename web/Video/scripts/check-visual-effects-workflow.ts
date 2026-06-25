import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createProgressLayer, createProject, createTextLayer, createTimerLayer } from "../src/lib/editor/factory";
import { animatedLayerTransform } from "../src/lib/editor/motion";
import { layerTransitionFrame, normalizeLayerTransition, transitionClipPath } from "../src/lib/editor/transitions";
import { normalizeLayerVisualStyle, visualEffectsBoxShadow, visualEffectsFilter, visualEffectsVignette } from "../src/lib/editor/visual-effects";
import { visualEffectPresets } from "../src/lib/editor/visual-effect-presets";
import { createRenderPlan } from "../src/lib/render/export-planner";
import { syncedProjectPayloadSchema } from "../src/lib/projects/project-sync-schema";

const project = createProject("Visual workflow check", "16:9");
const textLayer = createTextLayer("text", 0);
const progressLayer = createProgressLayer(1);
const timerLayer = createTimerLayer(2);

textLayer.motion = { preset: "slow-zoom", intensity: 2 };
textLayer.transition = { in: "fade", out: "slide", duration: 0.5 };
textLayer.style = {
  ...textLayer.style,
  brightness: 1.25,
  contrast: 1.1,
  saturation: 0.9,
  exposure: 0.2,
  temperature: 0.35,
  tint: -0.15,
  vignette: 0.4,
  lookPreset: "cinematic",
  borderWidth: 4,
  shadowBlur: 24,
  shadowColor: "#111111",
};

project.layers = [textLayer, progressLayer, timerLayer];
project.duration = 8;

assert.equal(normalizeLayerVisualStyle({ ...textLayer.style, brightness: 4 }).brightness, 2);
assert.equal(normalizeLayerVisualStyle({ ...textLayer.style, exposure: -5 }).exposure, -1);
assert.equal(normalizeLayerVisualStyle({ ...textLayer.style, temperature: 5 }).temperature, 1);
assert.equal(normalizeLayerVisualStyle({ ...textLayer.style, tint: -5 }).tint, -1);
assert.equal(normalizeLayerVisualStyle({ ...textLayer.style, vignette: 5 }).vignette, 1);
assert.match(visualEffectsFilter(textLayer.style), /sepia/);
assert.match(visualEffectsFilter(textLayer.style), /hue-rotate/);
assert.match(visualEffectsBoxShadow(textLayer.style) ?? "", /inset/);
assert.equal(visualEffectsVignette(textLayer.style).alpha > 0, true);
assert.deepEqual(
  visualEffectPresets.map((preset) => preset.id),
  ["cinematic", "clean-product", "high-contrast", "soft-shadow", "warm-film", "cool-clean"],
);
assert.equal(animatedLayerTransform(textLayer, textLayer.start + textLayer.duration).scale > textLayer.transform.scale, true);
assert.equal(normalizeLayerTransition({ in: "crossfade", out: "slide", duration: 99 }, 4).duration, 2);
assert.equal(normalizeLayerTransition({ in: "pop", out: "wipe-up", duration: 0.4 }, 4).out, "wipe-up");
assert.equal(layerTransitionFrame(textLayer, textLayer.start + 0.25).opacity < 1, true);
assert.equal(layerTransitionFrame(textLayer, textLayer.start + textLayer.duration - 0.1).offsetXRatio > 0, true);
assert.equal(layerTransitionFrame({ ...textLayer, transition: { in: "zoom", out: "push", duration: 0.5 } }, textLayer.start + 0.1).scale < 1, true);
assert.equal(layerTransitionFrame({ ...textLayer, transition: { in: "push", out: "push", duration: 0.5 } }, textLayer.start + textLayer.duration - 0.1).offsetXRatio > 0.5, true);
assert.match(
  transitionClipPath(layerTransitionFrame({ ...textLayer, transition: { in: "wipe-left", out: "wipe-up", duration: 0.5 } }, textLayer.start + 0.1).clip) ?? "",
  /inset/,
);
assert.equal(progressLayer.kind, "progress");
assert.equal(timerLayer.kind, "timer");
assert.equal(syncedProjectPayloadSchema.safeParse({ project, mediaAssets: [] }).success, true);
assert.equal(createRenderPlan(project, [], "mp4-1080p", "mp4").mode, "composite");

const previewCanvas = readFileSync(new URL("../src/features/editor/components/preview-canvas.tsx", import.meta.url), "utf8");
assert.match(previewCanvas, /ProgressOverlay/);
assert.match(previewCanvas, /TimerOverlay/);
assert.match(previewCanvas, /layerTransitionFrame/);
assert.match(previewCanvas, /transitionClipPath/);

const renderer = readFileSync(new URL("../src/lib/render/composite-renderer.ts", import.meta.url), "utf8");
assert.match(renderer, /drawProgressLayer/);
assert.match(renderer, /timerText/);
assert.match(renderer, /layerTransitionFrame/);
assert.match(renderer, /applyTransitionClip/);
assert.match(renderer, /drawVignette/);

const inspector = readFileSync(new URL("../src/features/editor/components/inspector-panel.tsx", import.meta.url), "utf8");
assert.match(inspector, /TransitionPanel/);
assert.match(inspector, /FreezeFramePanel/);

const freezeFrame = readFileSync(new URL("../src/lib/media/freeze-frame.ts", import.meta.url), "utf8");
assert.match(freezeFrame, /captureVideoFreezeFrame/);
assert.match(freezeFrame, /saveBrowserMedia/);

console.log("Visual effects workflow checks passed.");
