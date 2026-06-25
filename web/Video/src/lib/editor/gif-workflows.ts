import { normalizeLayerVisualStyle } from "@/lib/editor/visual-effects";
import type { ExportPreset } from "@/lib/editor/presets";
import type { AspectPreset, LayerCrop, LayerFramingMode, LayerStyle, MediaAsset, MediaType, TimelineLayer } from "@/lib/editor/types";
import type { MediaLayoutMode } from "@/lib/editor/media-layouts";

export type GifWorkflowSource = "gif" | "video" | "image-or-video";

export interface GifWorkflowPreset {
  id: string;
  label: string;
  description: string;
  source: GifWorkflowSource;
  aspectRatio: AspectPreset["id"];
  exportPresetId: ExportPreset["id"];
  defaultDuration: number;
  defaultTrimStart: number;
  assetLimit: number;
  layoutMode?: MediaLayoutMode;
  framing: LayerFramingMode;
  crop: LayerCrop;
  stylePatch?: Partial<LayerStyle>;
  muteAudio: boolean;
  bestFor: string;
}

export const gifWorkflowPresets: GifWorkflowPreset[] = [
  {
    id: "gif-trim",
    label: "Trim GIF",
    description: "Shorten an animated GIF or video source into a compact loop.",
    source: "image-or-video",
    aspectRatio: "1:1",
    exportPresetId: "gif-social-square",
    defaultDuration: 4,
    defaultTrimStart: 0,
    assetLimit: 1,
    framing: "fit",
    crop: { x: 0, y: 0, width: 1, height: 1 },
    muteAudio: true,
    bestFor: "Reaction loops",
  },
  {
    id: "gif-crop-square",
    label: "Crop GIF",
    description: "Center-crop a source into a square GIF canvas.",
    source: "image-or-video",
    aspectRatio: "1:1",
    exportPresetId: "gif-social-square",
    defaultDuration: 4,
    defaultTrimStart: 0,
    assetLimit: 1,
    framing: "fill",
    crop: { x: 0.08, y: 0.08, width: 0.84, height: 0.84 },
    muteAudio: true,
    bestFor: "Social previews",
  },
  {
    id: "gif-collage",
    label: "GIF collage",
    description: "Combine up to four animated or video sources into one GIF.",
    source: "image-or-video",
    aspectRatio: "1:1",
    exportPresetId: "gif-social-square",
    defaultDuration: 4,
    defaultTrimStart: 0,
    assetLimit: 4,
    layoutMode: "collage",
    framing: "fill",
    crop: { x: 0, y: 0, width: 1, height: 1 },
    muteAudio: true,
    bestFor: "Comparison GIFs",
  },
  {
    id: "gif-to-mp4",
    label: "GIF to MP4",
    description: "Place an imported GIF on a video timeline and queue MP4 delivery.",
    source: "gif",
    aspectRatio: "1:1",
    exportPresetId: "mp4-720p-compressed",
    defaultDuration: 5,
    defaultTrimStart: 0,
    assetLimit: 1,
    framing: "fit",
    crop: { x: 0, y: 0, width: 1, height: 1 },
    muteAudio: true,
    bestFor: "Smaller uploads",
  },
  {
    id: "gif-transparent-sticker",
    label: "Transparent GIF",
    description: "Resize a transparent GIF source into a sticker-ready transparent loop.",
    source: "gif",
    aspectRatio: "1:1",
    exportPresetId: "gif-transparent-sticker",
    defaultDuration: 5,
    defaultTrimStart: 0,
    assetLimit: 1,
    framing: "fit",
    crop: { x: 0, y: 0, width: 1, height: 1 },
    muteAudio: true,
    bestFor: "Transparent stickers",
  },
  {
    id: "mp4-to-gif",
    label: "MP4 to GIF",
    description: "Turn a short video segment into a social GIF export.",
    source: "video",
    aspectRatio: "1:1",
    exportPresetId: "gif-social-square",
    defaultDuration: 3,
    defaultTrimStart: 0,
    assetLimit: 1,
    framing: "fill",
    crop: { x: 0, y: 0, width: 1, height: 1 },
    muteAudio: true,
    bestFor: "Video reactions",
  },
  {
    id: "gif-color-pop",
    label: "Color GIF",
    description: "Apply a stronger color look to a short animated source.",
    source: "image-or-video",
    aspectRatio: "1:1",
    exportPresetId: "gif-social-square",
    defaultDuration: 4,
    defaultTrimStart: 0,
    assetLimit: 1,
    framing: "fill",
    crop: { x: 0, y: 0, width: 1, height: 1 },
    stylePatch: {
      brightness: 1.05,
      contrast: 1.18,
      saturation: 1.32,
      tint: 0.08,
      temperature: -0.05,
    },
    muteAudio: true,
    bestFor: "Color-changing effects",
  },
];

export function findGifWorkflowPreset(id: string) {
  return gifWorkflowPresets.find((preset) => preset.id === id) ?? gifWorkflowPresets[0];
}

export function gifWorkflowSupportsAsset(preset: GifWorkflowPreset, asset: Pick<MediaAsset, "type" | "mimeType">) {
  if (preset.source === "gif") return isGifAsset(asset);
  if (preset.source === "video") return asset.type === "video";
  return isGifAsset(asset) || asset.type === "video" || asset.type === "image";
}

export function gifWorkflowMediaTypes(preset: GifWorkflowPreset): MediaType[] {
  if (preset.source === "video") return ["video"];
  return ["image", "video"];
}

export function isGifAsset(asset: Pick<MediaAsset, "mimeType">) {
  return asset.mimeType.toLowerCase() === "image/gif";
}

export function createGifWorkflowLayerPatch({
  preset,
  layer,
  asset,
  canvas,
  duration,
  trimStart,
}: {
  preset: GifWorkflowPreset;
  layer: TimelineLayer;
  asset: Pick<MediaAsset, "name">;
  canvas: Pick<AspectPreset, "width" | "height">;
  duration: number;
  trimStart: number;
}): Partial<TimelineLayer> {
  return {
    name: `${asset.name} ${preset.label}`,
    duration: clampDuration(duration, preset.defaultDuration),
    trimStart: Math.max(0, finiteNumber(trimStart, preset.defaultTrimStart)),
    muted: preset.muteAudio || layer.muted,
    transform: {
      ...layer.transform,
      x: 0.5,
      y: 0.5,
      width: canvas.width,
      height: canvas.height,
      rotation: 0,
      scale: 1,
      framing: preset.framing,
      crop: { ...preset.crop },
    },
    style: normalizeLayerVisualStyle({
      ...layer.style,
      ...preset.stylePatch,
    }),
    notes: `${preset.label} workflow. Recommended export: ${preset.exportPresetId}.`,
  };
}

export function clampDuration(value: number, fallback: number) {
  return Math.min(30, Math.max(0.5, finiteNumber(value, fallback)));
}

function finiteNumber(value: number, fallback: number) {
  return Number.isFinite(value) ? value : fallback;
}
