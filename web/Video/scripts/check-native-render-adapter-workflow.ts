import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createProject, createShapeLayer, createTextLayer } from "../src/lib/editor/factory";
import type { ExportJob } from "../src/lib/editor/types";
import { createRenderPlan } from "../src/lib/render/export-planner";
import { createNativeRenderRequest } from "../src/lib/render/native-render-adapter";

const project = createProject("Native route", "16:9");
project.duration = 240;
project.layers = [
  { ...createTextLayer("text", 0), name: "Intro", text: "Intro" },
  { ...createShapeLayer(1), name: "Brand plate", start: 2 },
  { ...createTextLayer("text", 1), name: "Outro", text: "Outro", start: 120 },
];

const plan = createRenderPlan(project, [], "mp4-1080p", "mp4");
const transparentPlan = createRenderPlan(project, [], "png-transparent-frame", "png");
const request = createNativeRenderRequest({
  project,
  plan,
  assets: [],
  job: {
    id: "job_native_1",
    projectId: project.id,
    format: "mp4",
    preset: "mp4-1080p",
    status: "queued",
    progress: 0,
    outputName: "native-route.mp4",
    createdAt: "2026-05-15T00:00:00.000Z",
    updatedAt: "2026-05-15T00:00:00.000Z",
  } satisfies ExportJob,
});
const transparentRequest = createNativeRenderRequest({
  project,
  plan: transparentPlan,
  assets: [],
  job: {
    id: "job_native_png_1",
    projectId: project.id,
    format: "png",
    preset: "png-transparent-frame",
    status: "queued",
    progress: 0,
    outputName: "native-route.png",
    createdAt: "2026-05-15T00:00:00.000Z",
    updatedAt: "2026-05-15T00:00:00.000Z",
  } satisfies ExportJob,
});

assert.equal(request.jobId, "job_native_1");
assert.equal(request.projectTitle, "Native route");
assert.equal(request.format, "mp4");
assert.equal(request.preset, "mp4-1080p");
assert.equal(request.width, 1920);
assert.equal(request.height, 1080);
assert.equal(request.fps, 30);
assert.equal(request.layerCount, 3);
assert.ok(request.estimatedOutputBytes > 0);
assert.equal(request.renderGraph.version, 1);
assert.equal(request.renderGraph.canvas.width, 1920);
assert.equal(request.renderGraph.canvas.height, 1080);
assert.equal(request.renderGraph.layers.length, 3);
assert.equal(request.renderGraph.layers[0]?.kind, "text");
assert.equal(request.renderGraph.layers[0]?.text, "Intro");
assert.equal(request.renderGraph.layers[1]?.kind, "shape");
assert.equal(request.renderGraph.layers[0]?.volume, 1);
assert.equal(request.renderGraph.layers[0]?.fadeIn, 0);
assert.equal(request.renderGraph.layers[0]?.fadeOut, 0);
assert.equal(transparentRequest.renderGraph.canvas.background, "transparent");
assert.equal(transparentRequest.renderGraph.canvas.transparentBackground, true);

const adapter = read("src/lib/render/native-render-adapter.ts");
assert.match(adapter, /start_native_render/);
assert.match(adapter, /get_native_render_status/);
assert.match(adapter, /cancel_native_render/);
assert.match(adapter, /renderWithNativeDesktopAdapter/);
assert.match(adapter, /NativeRenderCancelledError/);
assert.match(adapter, /artifactKind/);
assert.match(adapter, /requestedFormat/);
assert.match(adapter, /manifestPath/);
assert.match(adapter, /createNativeRenderGraph/);
assert.match(adapter, /renderGraph/);

const renderGraph = read("src/lib/render/native-render-graph.ts");
assert.match(renderGraph, /NativeRenderGraph/);
assert.match(renderGraph, /createNativeRenderGraph/);
assert.match(renderGraph, /captionMode === "burn-in"/);
assert.match(renderGraph, /NativeRenderGraphMedia/);
assert.match(renderGraph, /sourceDuration/);
assert.match(renderGraph, /normalizeLayerSpeed/);
assert.match(renderGraph, /trackingTargetLayerId/);

const exportPanel = read("src/features/editor/components/export-panel.tsx");
assert.match(exportPanel, /renderWithNativeDesktopAdapter/);
assert.match(exportPanel, /canUseNativeRenderAdapter/);
assert.match(exportPanel, /createNativeRenderRequest/);
assert.match(exportPanel, /NativeRenderCancelledError/);

const rustNativeRender = read("src-tauri/src/native_render.rs");
assert.match(rustNativeRender, /pub fn start_native_render/);
assert.match(rustNativeRender, /pub fn get_native_render_status/);
assert.match(rustNativeRender, /pub fn cancel_native_render/);
assert.match(rustNativeRender, /NativeRenderState/);
assert.match(rustNativeRender, /estimated_output_bytes/);
assert.match(rustNativeRender, /render_graph/);
assert.match(rustNativeRender, /render_native_output/);
assert.match(rustNativeRender, /write_native_render_manifest/);
assert.match(rustNativeRender, /media-file/);
assert.match(rustNativeRender, /std::env::temp_dir/);
assert.match(rustNativeRender, /"mov" \| "avi" \| "mpeg"/);
assert.match(rustNativeRender, /"jpg" \| "webp"/);
assert.match(rustNativeRender, /"mp3" \| "m4a"/);
assert.match(rustNativeRender, /video\/quicktime/);
assert.match(rustNativeRender, /audio\/mpeg/);
assert.match(rustNativeRender, /render-manifest\.json/);
assert.match(rustNativeRender, /"renderGraph": &request\.render_graph/);
assert.match(rustNativeRender, /manifest-ready/);
assert.match(rustNativeRender, /spawn-ffmpeg-with-render-graph/);
assert.doesNotMatch(rustNativeRender, /native-render:\/\//);

const rustNativeFfmpeg = read("src-tauri/src/native_ffmpeg.rs");
assert.match(rustNativeFfmpeg, /pub fn render_with_ffmpeg/);
assert.match(rustNativeFfmpeg, /ffmpeg_binary/);
assert.match(rustNativeFfmpeg, /ESSENCE_FFMPEG_PATH/);
assert.match(rustNativeFfmpeg, /run_ffmpeg_command/);
assert.match(rustNativeFfmpeg, /native_ffmpeg_args/);
assert.match(rustNativeFfmpeg, /background_input/);
assert.match(rustNativeFfmpeg, /transparent_background/);
assert.match(rustNativeFfmpeg, /pix_fmt/);
assert.match(rustNativeFfmpeg, /rgba/);
assert.match(rustNativeFfmpeg, /native_layer_filtergraph/);
assert.match(rustNativeFfmpeg, /native_layer_filtergraph\(&request\.render_graph, app_local_data_dir\)/);
assert.match(rustNativeFfmpeg, /native_media_inputs/);
assert.match(rustNativeFfmpeg, /filter_complex_graph/);
assert.match(rustNativeFfmpeg, /audio_filtergraph/);
assert.match(rustNativeFfmpeg, /anullsrc=channel_layout=stereo/);
assert.match(rustNativeFfmpeg, /color=c=\{color\}:s=\{size\}:r=\{fps\}:d=\{duration\}/);
assert.match(rustNativeFfmpeg, /fn audio_output_format/);
assert.match(rustNativeFfmpeg, /fn audio_codec_args/);
assert.match(rustNativeFfmpeg, /mpeg1video/);
assert.match(rustNativeFfmpeg, /"webp" => args/);
assert.match(rustNativeFfmpeg, /"avi" => args/);

const rustNativeFfmpegGraph = read("src-tauri/src/native_ffmpeg_graph.rs");
assert.match(rustNativeFfmpegGraph, /pub fn native_layer_filtergraph/);
assert.match(rustNativeFfmpegGraph, /transparentBackground/);
assert.match(rustNativeFfmpegGraph, /0x000000@0\.000/);
assert.match(rustNativeFfmpegGraph, /fn text_layer_filter/);
assert.match(rustNativeFfmpegGraph, /fn native_font_files/);
assert.match(rustNativeFfmpegGraph, /fontfile/);
assert.match(rustNativeFfmpegGraph, /fn escape_filter_path/);
assert.match(rustNativeFfmpegGraph, /fn box_layer_filter/);
assert.match(rustNativeFfmpegGraph, /pub fn native_media_inputs/);
assert.match(rustNativeFfmpegGraph, /fn resolve_media_path/);
assert.match(rustNativeFfmpegGraph, /pub fn filter_complex_graph/);
assert.match(rustNativeFfmpegGraph, /pub fn audio_filtergraph/);
assert.match(rustNativeFfmpegGraph, /"mov" \| "avi" \| "mpeg"/);
assert.match(rustNativeFfmpegGraph, /"mp3" \| "m4a"/);
assert.match(rustNativeFfmpegGraph, /atrim=0:/);
assert.match(rustNativeFfmpegGraph, /source_duration/);
assert.match(rustNativeFfmpegGraph, /fn video_speed_filters/);
assert.match(rustNativeFfmpegGraph, /fn audio_speed_filters/);
assert.match(rustNativeFfmpegGraph, /areverse/);
assert.match(rustNativeFfmpegGraph, /atempo/);
assert.match(rustNativeFfmpegGraph, /adelay=\{delay_ms\}\|\{delay_ms\}/);
assert.match(rustNativeFfmpegGraph, /amix=inputs=/);
assert.match(rustNativeFfmpegGraph, /overlay=x=/);
assert.match(rustNativeFfmpegGraph, /force_original_aspect_ratio=decrease/);
assert.match(rustNativeFfmpegGraph, /drawtext/);
assert.match(rustNativeFfmpegGraph, /drawbox/);
assert.match(rustNativeFfmpegGraph, /enable='between\(t/);

const rustLib = read("src-tauri/src/lib.rs");
assert.match(rustLib, /mod native_ffmpeg/);
assert.match(rustLib, /mod native_ffmpeg_graph/);
assert.match(rustLib, /mod native_render/);
assert.match(rustLib, /NativeRenderState::default/);
assert.match(rustLib, /start_native_render/);
assert.match(rustLib, /get_native_render_status/);
assert.match(rustLib, /cancel_native_render/);

const desktopCapabilities = read("src/lib/product/capabilities/desktop.ts");
assert.match(desktopCapabilities, /native render adapter/);
assert.match(desktopCapabilities, /typed progress/);
assert.match(desktopCapabilities, /compositor manifest/);
assert.match(desktopCapabilities, /typed native render graph/);
assert.match(desktopCapabilities, /native FFmpeg execution path/);
assert.match(desktopCapabilities, /native FFmpeg text and shape overlays/);
assert.match(desktopCapabilities, /native media inputs and audio mixing/);

console.log("Native render adapter workflow checks passed.");

function read(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}
