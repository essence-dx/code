import type { ExportPreset } from "@/lib/editor/presets";
import { isAnimatedImageExportFormat, isVideoExportFormat } from "@/lib/render/export-formats";
import { targetSizeVideoBitrateKbps, type ExportConversionSettings } from "@/lib/render/export-planner";

export interface ExportQualityPreviewInput {
  settings: ExportConversionSettings;
  duration: number;
  preset: ExportPreset;
  projectWidth: number;
  projectHeight: number;
  projectFps: number;
}

export interface ExportQualityPreview {
  applies: boolean;
  label: string;
  detail: string;
  estimatedSizeMb: number;
  videoBitrateKbps: number;
  width: number;
  height: number;
  fps: number;
  warnings: string[];
}

export function createExportQualityPreview({
  settings,
  duration,
  preset,
  projectWidth,
  projectHeight,
  projectFps,
}: ExportQualityPreviewInput): ExportQualityPreview {
  const width = positiveInteger(settings.width) || positiveInteger(preset.width) || positiveInteger(projectWidth) || 1920;
  const height = positiveInteger(settings.height) || positiveInteger(preset.height) || positiveInteger(projectHeight) || 1080;
  const fps = positiveInteger(settings.fps) || positiveInteger(preset.fps) || positiveInteger(projectFps) || 30;

  if (!isVideoExportFormat(preset.format) && !isAnimatedImageExportFormat(preset.format)) {
    return {
      applies: false,
      label: "Preset",
      detail: "Compression preview applies to video and GIF exports.",
      estimatedSizeMb: 0,
      videoBitrateKbps: 0,
      width,
      height,
      fps,
      warnings: [],
    };
  }

  const targetBitrate = targetSizeVideoBitrateKbps(settings, duration);
  const videoBitrateKbps =
    targetBitrate || settings.videoBitrateKbps || parseBitrateKbps(preset.videoBitrate) || estimatePresetVideoBitrateKbps(preset, width, height, fps);
  const estimatedSizeMb = duration > 0 ? ((videoBitrateKbps + audioBitrateKbps(preset.format)) * duration) / 8192 : 0;
  const bpp = bitsPerPixelPerFrame(videoBitrateKbps, width, height, fps);
  const warnings = qualityWarnings({ settings, preset, width, height, fps, videoBitrateKbps, bpp });

  return {
    applies: true,
    label: qualityLabel(bpp, preset.format),
    detail: `${Math.round(videoBitrateKbps)} kbps video, ${width}x${height}, ${fps} fps`,
    estimatedSizeMb,
    videoBitrateKbps,
    width,
    height,
    fps,
    warnings,
  };
}

function estimatePresetVideoBitrateKbps(preset: ExportPreset, width: number, height: number, fps: number) {
  const bpp = isAnimatedImageExportFormat(preset.format) ? 0.12 : crfBitsPerPixel(preset.crf);
  return Math.max(200, Math.round((width * height * fps * bpp) / 1000));
}

function crfBitsPerPixel(crf: number | undefined) {
  if (typeof crf !== "number") return 0.055;
  if (crf <= 22) return 0.08;
  if (crf <= 24) return 0.065;
  if (crf <= 27) return 0.048;
  return 0.032;
}

function parseBitrateKbps(value: string | undefined) {
  const match = value?.trim().match(/^(\d+(?:\.\d+)?)(k|m)?$/i);
  if (!match) return 0;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return match[2]?.toLowerCase() === "m" ? Math.round(amount * 1000) : Math.round(amount);
}

function bitsPerPixelPerFrame(videoBitrateKbps: number, width: number, height: number, fps: number) {
  const pixelsPerSecond = width * height * fps;
  return pixelsPerSecond > 0 ? (videoBitrateKbps * 1000) / pixelsPerSecond : 0;
}

function qualityLabel(bpp: number, format: ExportPreset["format"]) {
  if (isAnimatedImageExportFormat(format)) return bpp >= 0.08 ? "Smooth GIF" : "Compact GIF";
  if (bpp >= 0.075) return "High quality";
  if (bpp >= 0.045) return "Balanced";
  if (bpp >= 0.025) return "Compact";
  return "Risky compression";
}

function qualityWarnings({
  settings,
  preset,
  width,
  height,
  fps,
  videoBitrateKbps,
  bpp,
}: {
  settings: ExportConversionSettings;
  preset: ExportPreset;
  width: number;
  height: number;
  fps: number;
  videoBitrateKbps: number;
  bpp: number;
}) {
  const warnings: string[] = [];
  if (settings.targetSizeMb > 0 && bpp < 0.022) warnings.push("Target size may show visible artifacts.");
  if (!isAnimatedImageExportFormat(preset.format) && width * height >= 1920 * 1080 && videoBitrateKbps < 1200) warnings.push("1080p video may need more bitrate.");
  if (isAnimatedImageExportFormat(preset.format) && fps > 15) warnings.push("High-FPS GIF exports can grow quickly.");
  return warnings;
}

function audioBitrateKbps(format: ExportPreset["format"]) {
  return isAnimatedImageExportFormat(format) ? 0 : 128;
}

function positiveInteger(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}
