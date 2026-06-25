import type { EditorProject, ExportFormat, MediaAsset } from "@/lib/editor/types";
import { exportPresets, type ExportPreset } from "@/lib/editor/presets";
import { isAudioExportFormat, isStillImageExportFormat } from "@/lib/render/export-formats";

export interface RenderPlan {
  id: string;
  projectId: string;
  format: ExportFormat;
  preset: string;
  presetOptions?: ExportPreset;
  conversionOptions?: ExportConversionSettings;
  mode: "project-bundle" | "single-media-ffmpeg" | "composite";
  supported: boolean;
  reason?: string;
  primaryAsset?: MediaAsset;
  trimStart: number;
  duration: number;
  outputBaseName: string;
}

export type CaptionExportMode = "burn-in" | "sidecar" | "none";
export type CanvasBackgroundMode = "project" | "transparent";

export interface ExportConversionSettings {
  targetSizeMb: number;
  videoBitrateKbps: number;
  width: number;
  height: number;
  fps: number;
  captionMode: CaptionExportMode;
  backgroundMode: CanvasBackgroundMode;
}

export const DEFAULT_EXPORT_CONVERSION_SETTINGS: ExportConversionSettings = {
  targetSizeMb: 0,
  videoBitrateKbps: 0,
  width: 0,
  height: 0,
  fps: 0,
  captionMode: "burn-in",
  backgroundMode: "project",
};

export function createRenderPlan(
  project: EditorProject,
  assets: MediaAsset[],
  preset: string,
  format: ExportFormat,
  options: { conversion?: Partial<ExportConversionSettings> } = {},
): RenderPlan {
  const presetOptions = exportPresets.find((item) => item.id === preset);
  const conversionOptions = normalizeExportConversionSettings(options.conversion, presetOptions);
  const visibleLayers = project.layers.filter((layer) => !layer.hidden && (conversionOptions.captionMode === "burn-in" || layer.kind !== "subtitle"));
  const mediaLayers = visibleLayers.filter((layer) => layer.assetId);
  const hasCompositionLayers = visibleLayers.some((layer) => ["text", "subtitle", "shape", "sticker", "progress", "timer", "image"].includes(layer.kind));
  const hasNonMediaCompositionLayers = visibleLayers.some((layer) => ["text", "subtitle", "shape", "sticker", "progress", "timer"].includes(layer.kind));
  const shouldUseTransparentGifSourceRoute = presetOptions?.id === "gif-transparent-sticker" && format === "gif" && mediaLayers.length === 1 && !hasNonMediaCompositionLayers;
  const now = crypto.randomUUID();

  if (format === "json") {
    return {
      id: now,
      projectId: project.id,
      format,
      preset,
      presetOptions,
      conversionOptions,
      mode: "project-bundle",
      supported: true,
      trimStart: 0,
      duration: project.duration,
      outputBaseName: project.title,
    };
  }

  if (isStillImageExportFormat(format)) {
    return {
      id: now,
      projectId: project.id,
      format,
      preset,
      presetOptions,
      conversionOptions,
      mode: "composite",
      supported: true,
      trimStart: 0,
      duration: Math.max(0.1, project.duration),
      outputBaseName: project.title,
    };
  }

  if ((mediaLayers.length === 1 && !hasCompositionLayers) || shouldUseTransparentGifSourceRoute) {
    const layer = mediaLayers[0];
    const primaryAsset = assets.find((asset) => asset.id === layer.assetId);
    const audioOnlyUnsupported = primaryAsset?.type === "audio" && !isAudioExportFormat(format);
    const imageToAudioUnsupported = primaryAsset?.type === "image" && isAudioExportFormat(format);
    const transparentGifUnsupported = shouldUseTransparentGifSourceRoute && primaryAsset?.mimeType.toLowerCase() !== "image/gif";

    return {
      id: now,
      projectId: project.id,
      format,
      preset,
      presetOptions,
      conversionOptions,
      mode: "single-media-ffmpeg",
      supported: Boolean(primaryAsset) && !audioOnlyUnsupported && !imageToAudioUnsupported && !transparentGifUnsupported,
      primaryAsset,
      trimStart: layer.trimStart,
      duration: layer.duration,
      outputBaseName: project.title,
      reason: !primaryAsset
        ? "The source media file is missing from local storage."
        : audioOnlyUnsupported
          ? "Use an audio preset for audio-only export, or add a visual layer before video export."
          : imageToAudioUnsupported
            ? "Audio export needs an audio or video source."
            : transparentGifUnsupported
              ? "Transparent GIF export needs one imported GIF source."
              : undefined,
    };
  }

  return {
    id: now,
    projectId: project.id,
    format,
    preset,
    presetOptions,
    conversionOptions,
    mode: "composite",
    supported: true,
    trimStart: 0,
    duration: project.duration,
    outputBaseName: project.title,
  };
}

export function normalizeExportConversionSettings(
  settings: Partial<ExportConversionSettings> | undefined,
  preset?: ExportPreset,
): ExportConversionSettings {
  return {
    targetSizeMb: clampInteger(settings?.targetSizeMb, DEFAULT_EXPORT_CONVERSION_SETTINGS.targetSizeMb, 0, 5000),
    videoBitrateKbps: clampInteger(settings?.videoBitrateKbps, DEFAULT_EXPORT_CONVERSION_SETTINGS.videoBitrateKbps, 0, 50000),
    width: clampInteger(settings?.width, preset?.width ?? DEFAULT_EXPORT_CONVERSION_SETTINGS.width, 0, 7680),
    height: clampInteger(settings?.height, preset?.height ?? DEFAULT_EXPORT_CONVERSION_SETTINGS.height, 0, 7680),
    fps: clampInteger(settings?.fps, preset?.fps ?? DEFAULT_EXPORT_CONVERSION_SETTINGS.fps, 0, 120),
    captionMode: settings?.captionMode && ["burn-in", "sidecar", "none"].includes(settings.captionMode) ? settings.captionMode : "burn-in",
    backgroundMode: normalizeBackgroundMode(settings?.backgroundMode, preset),
  };
}

export function supportsTransparentBackgroundPreset(preset?: ExportPreset) {
  return preset?.id === "png-transparent-frame" || preset?.id === "gif-transparent-sticker";
}

export function planUsesTransparentBackground(plan: Pick<RenderPlan, "format" | "conversionOptions" | "presetOptions">) {
  return plan.conversionOptions?.backgroundMode === "transparent" && supportsTransparentBackgroundPreset(plan.presetOptions);
}

export function targetSizeVideoBitrateKbps(settings: ExportConversionSettings, duration: number, audioBitrateKbps = 128) {
  if (settings.targetSizeMb <= 0 || duration <= 0) return 0;

  const totalKbps = (settings.targetSizeMb * 8192) / duration;
  return clampInteger(Math.floor(totalKbps - audioBitrateKbps), 0, 200, 50000);
}

function clampInteger(value: number | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.isFinite(value) ? Number(value) : fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizeBackgroundMode(value: CanvasBackgroundMode | undefined, preset?: ExportPreset): CanvasBackgroundMode {
  if (value === "project") return "project";
  if (value === "transparent" && supportsTransparentBackgroundPreset(preset)) return "transparent";
  return supportsTransparentBackgroundPreset(preset) ? "transparent" : DEFAULT_EXPORT_CONVERSION_SETTINGS.backgroundMode;
}
