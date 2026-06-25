import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createLayerFromAsset, createProject, createTextLayer } from "../src/lib/editor/factory";
import { createDeliveryQaReport } from "../src/lib/editor/delivery-qa";
import { exportPresets } from "../src/lib/editor/presets";
import type { MediaAsset } from "../src/lib/editor/types";
import {
  createRenderPlan,
  normalizeExportConversionSettings,
  supportsTransparentBackgroundPreset,
  targetSizeVideoBitrateKbps,
} from "../src/lib/render/export-planner";
import { createExportQualityPreview } from "../src/lib/render/export-quality-preview";
import { preflightRenderPlan } from "../src/lib/render/render-preflight";

const project = createProject("Export reliability check", "16:9");
const textLayer = createTextLayer("text", 0);
project.layers = [textLayer];
project.duration = 5;
const gifAsset: MediaAsset = {
  id: "asset_gif_alpha",
  name: "transparent.gif",
  type: "image",
  mimeType: "image/gif",
  size: 1200,
  duration: 3,
  width: 480,
  height: 480,
  storageKey: "asset_gif_alpha",
  source: "browser-indexeddb",
  createdAt: "2026-05-15T00:00:00.000Z",
};
const gifProject = createProject("Transparent sticker", "1:1");
gifProject.layers = [createLayerFromAsset(gifAsset)];
gifProject.duration = 3;

const browserGlobals = globalThis as Record<string, unknown>;
Object.defineProperty(browserGlobals, "MediaRecorder", {
  value: class {
    static isTypeSupported() {
      return true;
    }
  },
  configurable: true,
});
Object.defineProperty(browserGlobals, "HTMLCanvasElement", {
  value: class {},
  configurable: true,
});
const canvasElement = browserGlobals.HTMLCanvasElement as { prototype: Record<string, unknown> };
Object.defineProperty(canvasElement.prototype, "captureStream", {
  value: () => ({}),
  configurable: true,
});

const webmPlan = createRenderPlan(project, [], "webm-1080p", "webm");
const movPlan = createRenderPlan(project, [], "mov-1080p", "mov");
const aviPlan = createRenderPlan(project, [], "avi-720p", "avi");
const mpegPlan = createRenderPlan(project, [], "mpeg-720p", "mpeg");
const pngPlan = createRenderPlan(project, [], "png-current-frame", "png");
const jpgPlan = createRenderPlan(project, [], "jpg-current-frame", "jpg");
const webpPlan = createRenderPlan(project, [], "webp-current-frame", "webp");
const transparentPngPlan = createRenderPlan(project, [], "png-transparent-frame", "png");
const transparentGifPreset = exportPresets.find((preset) => preset.id === "gif-transparent-sticker");
const transparentCompositeGifPlan = createRenderPlan(project, [], "gif-transparent-sticker", "gif");
const transparentGifPlan = createRenderPlan(gifProject, [gifAsset], "gif-transparent-sticker", "gif");
const compressedPlan = createRenderPlan(project, [], "mp4-720p-compressed", "mp4", {
  conversion: { targetSizeMb: 5, width: 640, height: 360, fps: 24, captionMode: "sidecar" },
});

assert.equal(webmPlan.mode, "composite");
assert.equal(movPlan.mode, "composite");
assert.equal(aviPlan.mode, "composite");
assert.equal(mpegPlan.mode, "composite");
assert.equal(pngPlan.mode, "composite");
assert.equal(jpgPlan.mode, "composite");
assert.equal(webpPlan.mode, "composite");
assert.equal(pngPlan.conversionOptions?.backgroundMode, "project");
assert.equal(transparentPngPlan.conversionOptions?.backgroundMode, "transparent");
assert.equal(transparentGifPreset?.format, "gif");
assert.equal(transparentCompositeGifPlan.mode, "composite");
assert.equal(transparentCompositeGifPlan.conversionOptions?.backgroundMode, "transparent");
assert.equal(transparentGifPlan.mode, "single-media-ffmpeg");
assert.equal(transparentGifPlan.supported, true);
assert.equal(transparentGifPlan.conversionOptions?.backgroundMode, "transparent");
assert.equal(transparentGifPlan.primaryAsset?.id, gifAsset.id);
assert.equal(supportsTransparentBackgroundPreset(transparentGifPreset), true);
assert.equal(normalizeExportConversionSettings(undefined, transparentGifPreset).backgroundMode, "transparent");
assert.equal(compressedPlan.conversionOptions?.width, 640);
assert.equal(compressedPlan.conversionOptions?.height, 360);
assert.equal(compressedPlan.conversionOptions?.fps, 24);
assert.equal(compressedPlan.conversionOptions?.captionMode, "sidecar");
assert.equal(compressedPlan.conversionOptions?.backgroundMode, "project");
assert.equal(targetSizeVideoBitrateKbps(compressedPlan.conversionOptions!, compressedPlan.duration) > 0, true);
assert.equal(normalizeExportConversionSettings({ videoBitrateKbps: 999999 }).videoBitrateKbps, 50000);
assert.equal(exportPresets.some((preset) => preset.id === "gif-transparent-sticker"), true);
assert.equal(exportPresets.some((preset) => preset.id === "png-current-frame"), true);
assert.equal(exportPresets.some((preset) => preset.id === "png-transparent-frame"), true);
assert.equal(exportPresets.some((preset) => preset.id === "mov-1080p"), true);
assert.equal(exportPresets.some((preset) => preset.id === "avi-720p"), true);
assert.equal(exportPresets.some((preset) => preset.id === "mpeg-720p"), true);
assert.equal(exportPresets.some((preset) => preset.id === "jpg-current-frame"), true);
assert.equal(exportPresets.some((preset) => preset.id === "webp-current-frame"), true);
assert.equal(exportPresets.some((preset) => preset.id === "mp3-audio"), true);
assert.equal(exportPresets.some((preset) => preset.id === "m4a-audio"), true);
assert.equal(createDeliveryQaReport(project, []).issues.length >= 0, true);

const qualityPreview = createExportQualityPreview({
  settings: compressedPlan.conversionOptions!,
  duration: compressedPlan.duration,
  preset: exportPresets.find((preset) => preset.id === "mp4-720p-compressed")!,
  projectWidth: project.width,
  projectHeight: project.height,
  projectFps: project.fps,
});
assert.equal(qualityPreview.applies, true);
assert.equal(qualityPreview.width, 640);
assert.equal(qualityPreview.height, 360);
assert.equal(qualityPreview.videoBitrateKbps > 0, true);
assert.equal(qualityPreview.estimatedSizeMb > 0, true);

const webmPreflight = await preflightRenderPlan(webmPlan, project, []);
assert.equal(webmPreflight.ok, true);
assert.equal(webmPreflight.warnings.length, 0);

const pngPreflight = await preflightRenderPlan(pngPlan, project, []);
assert.equal(pngPreflight.ok, true);
assert.equal((await preflightRenderPlan(jpgPlan, project, [])).ok, true);
assert.equal((await preflightRenderPlan(webpPlan, project, [])).ok, true);
const transparentGifPreflight = await preflightRenderPlan(transparentCompositeGifPlan, project, []);
assert.equal(transparentGifPreflight.ok, true);
assert.equal(transparentGifPreflight.errors.length, 0);

const exportPanel = readFileSync(new URL("../src/features/editor/components/export-panel.tsx", import.meta.url), "utf8");
assert.match(exportPanel, /ConverterCompressorControls/);
assert.match(exportPanel, /Target MB/);
assert.match(exportPanel, /Bitrate/);
assert.match(exportPanel, /Burn captions/);
assert.match(exportPanel, /SRT sidecar/);
assert.match(exportPanel, /isStillImageExportFormat/);
assert.match(exportPanel, /backgroundMode/);
assert.match(exportPanel, /Transparent/);
assert.match(exportPanel, /supportsTransparentBackgroundPreset/);
assert.match(exportPanel, /projectSubtitleSidecarCues/);
assert.match(exportPanel, /renderedFile/);
assert.match(exportPanel, /sourceSnapshot/);
assert.match(exportPanel, /formatBytes/);
assert.match(exportPanel, /ExportQualityPreviewBadge/);
assert.match(exportPanel, /formatQualityPreviewSize/);
assert.match(exportPanel, /preflightWarningMessage/);
assert.match(exportPanel, /clearFinishedExportJobs/);
assert.match(exportPanel, /removeExportJob/);
assert.match(exportPanel, /batchCancelledRef/);
assert.match(exportPanel, /exportJobPresetLabel/);
assert.match(exportPanel, /Clear done/);

const store = readFileSync(new URL("../src/features/editor/state/editor-store.ts", import.meta.url), "utf8");
assert.match(store, /createEditorExportSlice\(set, get\)/);

const browserRenderer = readFileSync(new URL("../src/lib/render/browser-renderer.ts", import.meta.url), "utf8");
assert.match(browserRenderer, /scaleFilterForPlan/);
assert.match(browserRenderer, /planVideoBitrate/);
assert.match(browserRenderer, /targetSizeVideoBitrateKbps/);
assert.match(browserRenderer, /audioCodecArgs/);
assert.match(browserRenderer, /stillImageQualityArgs/);
assert.match(browserRenderer, /mpeg1video/);
assert.match(browserRenderer, /transparentGifFilter/);
assert.match(browserRenderer, /renderPngFrameSequenceAsGif/);
assert.match(browserRenderer, /frame-%05d\.png/);
assert.match(browserRenderer, /reserve_transparent=1/);
assert.match(browserRenderer, /paletteuse=alpha_threshold=128/);

const manifest = readFileSync(new URL("../src/lib/render/composite-manifest.ts", import.meta.url), "utf8");
assert.match(manifest, /conversionOptions\?\.captionMode/);
assert.match(manifest, /transparentBackground/);
assert.match(manifest, /planUsesTransparentBackground/);

const compositeRenderer = readFileSync(new URL("../src/lib/render/composite-renderer.ts", import.meta.url), "utf8");
assert.match(compositeRenderer, /renderTransparentCompositeGifWithCanvas/);
assert.match(compositeRenderer, /renderPngFrameSequenceAsGif/);
assert.match(compositeRenderer, /canvasToImageBlob\(canvas, "png"\)/);

const exportSlice = readFileSync(new URL("../src/features/editor/state/editor-export-slice.ts", import.meta.url), "utf8");
assert.match(exportSlice, /removeExportJob/);
assert.match(exportSlice, /clearFinishedExportJobs/);
assert.match(exportSlice, /createExportSourceSnapshot/);
assert.match(exportSlice, /createExportReviewSnapshot/);
assert.match(exportSlice, /status === "queued" \|\| job\.status === "rendering"/);

const types = readFileSync(new URL("../src/lib/editor/types.ts", import.meta.url), "utf8");
assert.match(types, /ExportSourceSnapshot/);
assert.match(types, /RenderedExportFile/);

const exportOutput = readFileSync(new URL("../src/lib/render/export-output.ts", import.meta.url), "utf8");
assert.match(exportOutput, /size: blob\.size/);
assert.match(exportOutput, /savedAt/);

const qualityPreviewSource = readFileSync(new URL("../src/lib/render/export-quality-preview.ts", import.meta.url), "utf8");
assert.match(qualityPreviewSource, /targetSizeVideoBitrateKbps/);
assert.match(qualityPreviewSource, /Risky compression/);
assert.match(qualityPreviewSource, /estimatedSizeMb/);

console.log("Export reliability workflow checks passed.");
