import type { ExportPreset } from "@/lib/editor/presets";
import type { MediaAsset } from "@/lib/editor/types";
import type { GifWorkflowPreset } from "@/lib/editor/gif-workflows";
import { clampDuration } from "@/lib/editor/gif-workflows";

export type GifTransparencyStatus = "not-gif" | "solid-canvas" | "alpha-ready";

export interface GifFramePreviewFrame {
  index: number;
  label: string;
  projectTime: number;
  sourceTime: number;
  timeLabel: string;
  positionPercent: number;
}

export interface GifTransparencyReport {
  status: GifTransparencyStatus;
  label: string;
  detail: string;
}

export interface GifFramePreview {
  fps: number;
  duration: number;
  trimStart: number;
  sourceEnd: number;
  sourceDuration: number;
  maxTrimStart: number;
  frameCount: number;
  frames: GifFramePreviewFrame[];
  transparency: GifTransparencyReport;
}

export function createGifFramePreview({
  preset,
  asset,
  exportPreset,
  duration,
  trimStart,
  sampleCount = 8,
}: {
  preset: GifWorkflowPreset;
  asset?: Pick<MediaAsset, "duration" | "mimeType">;
  exportPreset?: ExportPreset;
  duration: number;
  trimStart: number;
  sampleCount?: number;
}): GifFramePreview {
  const fps = normalizeFps(exportPreset?.fps ?? 12);
  const requestedDuration = clampDuration(duration, preset.defaultDuration);
  const sourceDuration = normalizeSourceDuration(asset?.duration, requestedDuration);
  const effectiveDuration = Math.min(requestedDuration, sourceDuration);
  const maxTrimStart = Math.max(0, sourceDuration - effectiveDuration);
  const safeTrimStart = clampNumber(trimStart, preset.defaultTrimStart, 0, maxTrimStart);
  const sourceEnd = Math.min(sourceDuration, safeTrimStart + effectiveDuration);
  const frameCount = Math.max(1, Math.ceil((sourceEnd - safeTrimStart) * fps));

  return {
    fps,
    duration: effectiveDuration,
    trimStart: safeTrimStart,
    sourceEnd,
    sourceDuration,
    maxTrimStart,
    frameCount,
    frames: createFrameSamples({ frameCount, fps, trimStart: safeTrimStart, duration: effectiveDuration, sampleCount }),
    transparency: createGifTransparencyReport(exportPreset),
  };
}

export function createGifTransparencyReport(exportPreset?: ExportPreset): GifTransparencyReport {
  if (exportPreset?.format !== "gif") {
    return {
      status: "not-gif",
      label: "Video canvas",
      detail: "This workflow exports as a video file.",
    };
  }

  if (exportPreset.id === "gif-transparent-sticker") {
    return {
      status: "alpha-ready",
      label: "Alpha route",
      detail: "Transparent GIF export keeps source alpha for single-source GIF sticker routes.",
    };
  }

  return {
    status: "solid-canvas",
    label: "Solid canvas",
    detail: "GIF loop export uses the project canvas background.",
  };
}

function createFrameSamples({
  frameCount,
  fps,
  trimStart,
  duration,
  sampleCount,
}: {
  frameCount: number;
  fps: number;
  trimStart: number;
  duration: number;
  sampleCount: number;
}) {
  const count = Math.max(1, Math.min(sampleCount, frameCount));
  const indexes = uniqueFrameIndexes(
    Array.from({ length: count }, (_, index) => {
      if (count === 1) return 0;
      return Math.min(frameCount - 1, Math.round((index / (count - 1)) * (frameCount - 1)));
    }),
  );

  return indexes.map((index) => {
    const projectTime = Math.min(duration, index / fps);
    const sourceTime = trimStart + projectTime;

    return {
      index,
      label: `F${index + 1}`,
      projectTime,
      sourceTime,
      timeLabel: formatFrameTime(sourceTime),
      positionPercent: frameCount <= 1 ? 0 : Math.round((index / (frameCount - 1)) * 100),
    };
  });
}

function normalizeFps(value: number) {
  return clampNumber(value, 12, 1, 60);
}

function normalizeSourceDuration(value: number | undefined, fallback: number) {
  return Math.max(0.5, Number.isFinite(value) && value ? Number(value) : fallback);
}

function clampNumber(value: number, fallback: number, min: number, max: number) {
  const parsed = Number.isFinite(value) ? Number(value) : fallback;
  return Math.min(max, Math.max(min, parsed));
}

function uniqueFrameIndexes(values: number[]) {
  return Array.from(new Set(values)).sort((left, right) => left - right);
}

function formatFrameTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const wholeSeconds = Math.floor(safe % 60);
  const millis = Math.round((safe % 1) * 1000);
  return `${minutes}:${wholeSeconds.toString().padStart(2, "0")}.${millis.toString().padStart(3, "0")}`;
}
