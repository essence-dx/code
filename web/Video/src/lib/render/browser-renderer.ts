"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { getCachedBlobURLs, preloadFfmpeg } from "@/lib/render/ffmpeg-loader";
import type { EditorProject, ExportFormat, MediaAsset } from "@/lib/editor/types";
import { loadBrowserMediaBlob } from "@/lib/media/browser-media-store";
import { loadSelfHostedMediaBlob } from "@/lib/media/self-hosted-media";
import { loadTauriMediaBlob } from "@/lib/media/tauri-media";
import { saveProjectBundle } from "@/lib/projects/project-bundle-export";
import { isAudioExportFormat, isStillImageExportFormat } from "@/lib/render/export-formats";
import type { RenderPlan } from "@/lib/render/export-planner";
import { planUsesTransparentBackground, targetSizeVideoBitrateKbps } from "@/lib/render/export-planner";
import { exportFilename, exportMimeType, saveRenderedBlob } from "@/lib/render/export-output";
import { RenderEngineError, RenderMediaUnavailableError, RenderUnsupportedError } from "@/lib/render/render-errors";

let ffmpeg: FFmpeg | null = null;

export async function exportProjectBundle(project: EditorProject, assets: MediaAsset[]) {
  return saveProjectBundle(project, assets);
}

export interface BrowserRenderOptions {
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}

export async function renderWithBrowserFfmpeg(plan: RenderPlan, options: BrowserRenderOptions = {}) {
  if (plan.mode !== "single-media-ffmpeg" || !plan.primaryAsset) {
    throw new RenderUnsupportedError(plan.reason);
  }
  if (options.signal?.aborted) {
    throw new DOMException("Export cancelled.", "AbortError");
  }

  const blob = await loadRenderableMediaBlob(plan.primaryAsset);
  if (!blob) {
    throw new RenderMediaUnavailableError();
  }

  const engine = await getFfmpeg();
  const inputName = `input.${extensionFromMime(plan.primaryAsset.mimeType, plan.primaryAsset.name)}`;
  const outputName = exportFilename(plan.outputBaseName, plan.format);
  const onProgress = ({ progress }: { progress: number }) => options.onProgress?.(20 + Math.round(Math.max(0, Math.min(1, progress)) * 70));
  engine.on("progress", onProgress);

  try {
    await engine.writeFile(inputName, await fetchFile(blob), { signal: options.signal });
    const exitCode = await engine.exec(createFfmpegArgs(plan, inputName, outputName), undefined, { signal: options.signal });
    if (exitCode !== 0) {
      throw new RenderEngineError();
    }
    const output = await engine.readFile(outputName, undefined, { signal: options.signal });
    const outputBlob = new Blob([toBlobPart(output)], { type: exportMimeType(plan.format) });
    return saveRenderedBlob(outputBlob, outputName, plan.format);
  } finally {
    engine.off("progress", onProgress);
    await Promise.allSettled([engine.deleteFile(inputName), engine.deleteFile(outputName)]);
  }
}

async function loadRenderableMediaBlob(asset: MediaAsset) {
  if (asset.source === "tauri-fs") {
    return loadTauriMediaBlob(asset);
  }
  if (asset.source === "self-hosted-url") {
    return loadSelfHostedMediaBlob(asset);
  }

  return loadBrowserMediaBlob(asset.storageKey);
}

export async function transcodeRecordedBlob(blob: Blob, plan: RenderPlan, options: BrowserRenderOptions = {}) {
  if (options.signal?.aborted) {
    throw new DOMException("Export cancelled.", "AbortError");
  }

  const engine = await getFfmpeg();
  const inputName = "composite-input.webm";
  const outputName = exportFilename(plan.outputBaseName, plan.format);
  const onProgress = ({ progress }: { progress: number }) => options.onProgress?.(75 + Math.round(Math.max(0, Math.min(1, progress)) * 20));
  engine.on("progress", onProgress);

  try {
    await engine.writeFile(inputName, await fetchFile(blob), { signal: options.signal });
    const exitCode = await engine.exec(createTranscodeArgs(plan, inputName, outputName), undefined, { signal: options.signal });
    if (exitCode !== 0) {
      throw new RenderEngineError();
    }
    const output = await engine.readFile(outputName, undefined, { signal: options.signal });
    const outputBlob = new Blob([toBlobPart(output)], { type: exportMimeType(plan.format) });
    return saveRenderedBlob(outputBlob, outputName, plan.format);
  } finally {
    engine.off("progress", onProgress);
    await Promise.allSettled([engine.deleteFile(inputName), engine.deleteFile(outputName)]);
  }
}

export async function renderPngFrameSequenceAsGif(frames: Blob[], plan: RenderPlan, options: BrowserRenderOptions = {}) {
  if (options.signal?.aborted) {
    throw new DOMException("Export cancelled.", "AbortError");
  }
  if (!frames.length) {
    throw new RenderEngineError();
  }

  const engine = await getFfmpeg();
  const outputName = exportFilename(plan.outputBaseName, "gif");
  const frameNames = frames.map((_, index) => `frame-${index.toString().padStart(5, "0")}.png`);
  const onProgress = ({ progress }: { progress: number }) => options.onProgress?.(74 + Math.round(Math.max(0, Math.min(1, progress)) * 21));
  engine.on("progress", onProgress);

  try {
    for (const [index, frame] of frames.entries()) {
      if (options.signal?.aborted) {
        throw new DOMException("Export cancelled.", "AbortError");
      }
      await engine.writeFile(frameNames[index], await fetchFile(frame), { signal: options.signal });
      options.onProgress?.(Math.min(73, Math.round(((index + 1) / frames.length) * 70)));
    }

    const exitCode = await engine.exec(
      [
        "-framerate",
        `${planFps(plan, 10)}`,
        "-start_number",
        "0",
        "-i",
        "frame-%05d.png",
        "-filter_complex",
        transparentGifPaletteFilter(),
        "-loop",
        "0",
        outputName,
      ],
      undefined,
      { signal: options.signal },
    );
    if (exitCode !== 0) {
      throw new RenderEngineError();
    }

    const output = await engine.readFile(outputName, undefined, { signal: options.signal });
    const outputBlob = new Blob([toBlobPart(output)], { type: exportMimeType("gif") });
    return saveRenderedBlob(outputBlob, outputName, "gif");
  } finally {
    engine.off("progress", onProgress);
    await Promise.allSettled([...frameNames.map((frameName) => engine.deleteFile(frameName)), engine.deleteFile(outputName)]);
  }
}

export async function downloadRenderedBlob(blob: Blob, filename: string, format: ExportFormat) {
  return saveRenderedBlob(blob, filename, format);
}

export function cancelBrowserRender() {
  ffmpeg?.terminate();
  ffmpeg = null;
}

function toBlobPart(output: Awaited<ReturnType<FFmpeg["readFile"]>>): BlobPart {
  if (typeof output === "string") return output;
  const copy = new Uint8Array(output.length);
  copy.set(output);
  return copy.buffer;
}

async function getFfmpeg() {
  if (!ffmpeg) {
    const urls = getCachedBlobURLs();
    if (!urls.coreURL || !urls.wasmURL) {
      await preloadFfmpeg();
    }
    const { coreURL, wasmURL } = getCachedBlobURLs();
    if (!coreURL || !wasmURL) {
      throw new Error("FFmpeg core URLs not available after preload");
    }

    ffmpeg = new FFmpeg();
    await ffmpeg.load({ coreURL, wasmURL });
  }

  return ffmpeg;
}

function extensionFromMime(mimeType: string, name: string) {
  const existing = name.split(".").pop();
  if (existing && existing.length <= 5) return existing;
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("quicktime")) return "mov";
  if (mimeType.includes("x-msvideo")) return "avi";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("mp4")) return name.toLowerCase().endsWith(".m4a") ? "m4a" : "mp4";
  if (mimeType.includes("mpeg")) return "mp3";
  return "mp4";
}

function createFfmpegArgs(plan: RenderPlan, inputName: string, outputName: string) {
  const preset = plan.presetOptions;
  const base = ["-ss", `${Math.max(0, plan.trimStart)}`, "-i", inputName, "-t", `${Math.max(0.1, plan.duration)}`];
  const scaleFilter = scaleFilterForPlan(plan);

  if (plan.format === "gif") {
    return planUsesTransparentBackground(plan)
      ? [...base, "-filter_complex", transparentGifFilter(plan), "-loop", "0", outputName]
      : [...base, "-vf", gifFilter(plan), "-loop", "0", outputName];
  }

  if (isStillImageExportFormat(plan.format)) {
    return [...base, ...(scaleFilter ? ["-vf", scaleFilter] : []), "-frames:v", "1", ...stillImageQualityArgs(plan.format), outputName];
  }

  if (plan.format === "webm") {
    return [
      ...base,
      ...(scaleFilter ? ["-vf", scaleFilter] : []),
      "-r",
      `${planFps(plan, 30)}`,
      "-c:v",
      "libvpx-vp9",
      "-b:v",
      planVideoBitrate(plan, preset?.videoBitrate ?? "1800k"),
      "-c:a",
      "libopus",
      "-b:a",
      "96k",
      outputName,
    ];
  }

  if (isAudioExportFormat(plan.format)) {
    return [...base, "-vn", ...audioCodecArgs(plan.format), outputName];
  }

  if (plan.format === "avi") {
    return [
      ...base,
      ...(scaleFilter ? ["-vf", scaleFilter] : []),
      "-r",
      `${planFps(plan, 30)}`,
      "-c:v",
      "mpeg4",
      "-q:v",
      "5",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "128k",
      outputName,
    ];
  }

  if (plan.format === "mpeg") {
    return [
      ...base,
      ...(scaleFilter ? ["-vf", scaleFilter] : []),
      "-r",
      `${planFps(plan, 30)}`,
      "-c:v",
      "mpeg1video",
      "-b:v",
      planVideoBitrate(plan, "2500k"),
      "-c:a",
      "mp2",
      "-b:a",
      "192k",
      outputName,
    ];
  }

  return [
    ...base,
    ...(scaleFilter ? ["-vf", scaleFilter] : []),
    "-r",
    `${planFps(plan, 30)}`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    ...mp4QualityArgs(plan),
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    ...(plan.format === "mp4" || plan.format === "mov" ? ["-movflags", "+faststart"] : []),
    outputName,
  ];
}

function createTranscodeArgs(plan: RenderPlan, inputName: string, outputName: string) {
  const preset = plan.presetOptions;
  const scaleFilter = scaleFilterForPlan(plan);

  if (plan.format === "gif") {
    return planUsesTransparentBackground(plan)
      ? ["-i", inputName, "-filter_complex", transparentGifFilter(plan), "-loop", "0", outputName]
      : ["-i", inputName, "-vf", gifFilter(plan), "-loop", "0", outputName];
  }

  if (isStillImageExportFormat(plan.format)) {
    return ["-i", inputName, ...(scaleFilter ? ["-vf", scaleFilter] : []), "-frames:v", "1", ...stillImageQualityArgs(plan.format), outputName];
  }

  if (plan.format === "webm") {
    return [
      "-i",
      inputName,
      ...(scaleFilter ? ["-vf", scaleFilter] : []),
      "-r",
      `${planFps(plan, 30)}`,
      "-c:v",
      "libvpx-vp9",
      "-b:v",
      planVideoBitrate(plan, preset?.videoBitrate ?? "1800k"),
      "-c:a",
      "libopus",
      "-b:a",
      "96k",
      outputName,
    ];
  }

  if (isAudioExportFormat(plan.format)) {
    return ["-i", inputName, "-vn", ...audioCodecArgs(plan.format), outputName];
  }

  if (plan.format === "avi") {
    return [
      "-i",
      inputName,
      ...(scaleFilter ? ["-vf", scaleFilter] : []),
      "-r",
      `${planFps(plan, 30)}`,
      "-c:v",
      "mpeg4",
      "-q:v",
      "5",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "128k",
      outputName,
    ];
  }

  if (plan.format === "mpeg") {
    return [
      "-i",
      inputName,
      ...(scaleFilter ? ["-vf", scaleFilter] : []),
      "-r",
      `${planFps(plan, 30)}`,
      "-c:v",
      "mpeg1video",
      "-b:v",
      planVideoBitrate(plan, "2500k"),
      "-c:a",
      "mp2",
      "-b:a",
      "192k",
      outputName,
    ];
  }

  return [
    "-i",
    inputName,
    ...(scaleFilter ? ["-vf", scaleFilter] : []),
    "-r",
    `${planFps(plan, 30)}`,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    ...mp4QualityArgs(plan),
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    ...(plan.format === "mp4" || plan.format === "mov" ? ["-movflags", "+faststart"] : []),
    outputName,
  ];
}

function audioCodecArgs(format: ExportFormat) {
  if (format === "wav") return ["-c:a", "pcm_s16le"];
  if (format === "mp3") return ["-c:a", "libmp3lame", "-b:a", "192k"];
  return ["-c:a", "aac", "-b:a", "192k"];
}

function stillImageQualityArgs(format: ExportFormat) {
  if (format === "jpg") return ["-q:v", "2"];
  if (format === "webp") return ["-lossless", "0", "-q:v", "82"];
  return [];
}

function scaleFilterForPlan(plan: RenderPlan) {
  const width = plan.conversionOptions?.width || plan.presetOptions?.width;
  const height = plan.conversionOptions?.height || plan.presetOptions?.height;
  const padColor = planUsesTransparentBackground(plan) ? ":color=0x00000000" : "";
  return width && height ? `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2${padColor}` : null;
}

function planFps(plan: RenderPlan, fallback: number) {
  return plan.conversionOptions?.fps || plan.presetOptions?.fps || fallback;
}

function gifFilter(plan: RenderPlan) {
  return [scaleFilterForPlan(plan), `fps=${planFps(plan, 12)}`].filter(Boolean).join(",");
}

function transparentGifFilter(plan: RenderPlan) {
  const filter = ["format=rgba", scaleFilterForPlan(plan), `fps=${planFps(plan, 10)}`].filter(Boolean).join(",");
  return `[0:v]${filter},${transparentGifPaletteFilter()}`;
}

function transparentGifPaletteFilter() {
  return "split[s0][s1];[s0]palettegen=reserve_transparent=1:transparency_color=ffffff[p];[s1][p]paletteuse=alpha_threshold=128";
}

function planVideoBitrate(plan: RenderPlan, fallback: string) {
  const targetBitrate = plan.conversionOptions ? targetSizeVideoBitrateKbps(plan.conversionOptions, plan.duration) : 0;
  const manualBitrate = plan.conversionOptions?.videoBitrateKbps ?? 0;
  const bitrate = targetBitrate || manualBitrate;
  return bitrate > 0 ? `${bitrate}k` : fallback;
}

function mp4QualityArgs(plan: RenderPlan) {
  const bitrate = planVideoBitrate(plan, "");
  return bitrate ? ["-b:v", bitrate] : ["-crf", `${plan.presetOptions?.crf ?? 23}`];
}
