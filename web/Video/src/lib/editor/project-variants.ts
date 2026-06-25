import { createTextLayer } from "@/lib/editor/factory";
import type { EditorProject, LayerKind, TimelineLayer } from "@/lib/editor/types";
import { socialFormatPresets, type SocialFormatPreset } from "@/lib/editor/social-format-presets";
import { TIMELINE_MIN_LAYER_SECONDS } from "@/lib/editor/timeline";

export interface RepurposeClipVariantInput {
  title: string;
  start: number;
  end: number;
  platform: "youtube-shorts" | "instagram-reels" | "tiktok" | "linkedin" | "x";
  caption: string;
  editNotes: string[];
}

export function createSocialFormatProjectVariant(project: EditorProject, preset: SocialFormatPreset): EditorProject {
  const now = new Date().toISOString();
  const widthScale = preset.width / project.width;
  const heightScale = preset.height / project.height;
  const layerScale = Math.min(widthScale, heightScale);

  return {
    ...project,
    id: `project_${crypto.randomUUID()}`,
    title: `${project.title} - ${preset.label}`,
    aspectRatio: preset.aspectRatio,
    socialFormatId: preset.id,
    width: preset.width,
    height: preset.height,
    layers: project.layers.map((layer) => ({
      ...layer,
      transform: safeZoneFramedTransform(layer, project, preset, layerScale),
      updatedAt: now,
    })),
    updatedAt: now,
  };
}

export function createSocialFormatProjectResize(project: EditorProject, preset: SocialFormatPreset): EditorProject {
  const variant = createSocialFormatProjectVariant(project, preset);

  return {
    ...variant,
    id: project.id,
    title: project.title,
  };
}

export function createRepurposeClipProjectVariant(project: EditorProject, clip: RepurposeClipVariantInput): EditorProject | null {
  const timing = normalizedClipTiming(clip.start, clip.end, project.duration);
  if (!timing) return null;

  const preset = socialPresetForClipPlatform(clip.platform);
  const now = new Date().toISOString();
  const layerScale = Math.min(preset.width / project.width, preset.height / project.height);
  const clippedLayers = project.layers
    .flatMap((layer) => createClippedVariantLayer(layer, project, preset, layerScale, timing.start, timing.end, now))
    .sort((a, b) => a.track - b.track || a.start - b.start);
  const captionLayer = createClipCaptionLayer(clip, preset, timing.duration, nextTrack(clippedLayers), now);

  return {
    ...project,
    id: `project_${crypto.randomUUID()}`,
    title: `${project.title} - ${cleanVariantTitle(clip.title)}`,
    aspectRatio: preset.aspectRatio,
    socialFormatId: preset.id,
    width: preset.width,
    height: preset.height,
    duration: timing.duration,
    layers: captionLayer ? [...clippedLayers, captionLayer] : clippedLayers,
    updatedAt: now,
  };
}

export function createRepurposeClipProjectVariants(project: EditorProject, clips: RepurposeClipVariantInput[]) {
  return clips.flatMap((clip) => {
    const variant = createRepurposeClipProjectVariant(project, clip);
    return variant ? [variant] : [];
  });
}

export function socialPresetForClipPlatform(platform: RepurposeClipVariantInput["platform"]) {
  const presetId = {
    "youtube-shorts": "youtube-shorts",
    "instagram-reels": "instagram-reels",
    tiktok: "tiktok-reel",
    linkedin: "linkedin-feed",
    x: "youtube-video",
  } satisfies Record<RepurposeClipVariantInput["platform"], string>;

  return socialFormatPresets.find((preset) => preset.id === presetId[platform]) ?? socialFormatPresets[0];
}

function createClippedVariantLayer(
  layer: TimelineLayer,
  project: EditorProject,
  preset: SocialFormatPreset,
  layerScale: number,
  clipStart: number,
  clipEnd: number,
  now: string,
) {
  const start = Math.max(layer.start, clipStart);
  const end = Math.min(layer.start + layer.duration, clipEnd);
  const duration = end - start;
  if (duration < TIMELINE_MIN_LAYER_SECONDS) return [];

  const trimDelta = Math.max(0, start - layer.start);

  return [
    {
      ...layer,
      id: crypto.randomUUID(),
      start: Math.max(0, start - clipStart),
      duration,
      trimStart: Math.max(0, layer.trimStart + trimDelta),
      transform: safeZoneFramedTransform(layer, project, preset, layerScale),
      cues: layer.cues?.filter((cue) => cue.end >= layer.trimStart + trimDelta && cue.start <= layer.trimStart + trimDelta + duration),
      notes: [layer.notes, `Clip variant source: ${formatSeconds(clipStart)}-${formatSeconds(clipEnd)}.`].filter(Boolean).join("\n"),
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function createClipCaptionLayer(clip: RepurposeClipVariantInput, preset: SocialFormatPreset, duration: number, track: number, now: string) {
  const caption = clip.caption.trim();
  if (!caption) return null;

  const layer = createTextLayer("text", track);
  const titleSafe = preset.safeZones.title.insets;
  const width = Math.max(240, Math.round(preset.width * (1 - titleSafe.left - titleSafe.right) * 0.86));
  const height = Math.max(96, Math.round(preset.height * 0.09));

  return {
    ...layer,
    name: "Clip caption",
    start: 0,
    duration,
    text: caption,
    transform: {
      ...layer.transform,
      x: 0.5,
      y: Math.min(1 - titleSafe.bottom - 0.04, Math.max(titleSafe.top + 0.04, 0.78)),
      width,
      height,
    },
    style: {
      ...layer.style,
      fontSize: Math.max(34, Math.round(preset.height * 0.032)),
      background: "#00000099",
      radius: 12,
      shadowBlur: 18,
      shadowColor: "#000000",
    },
    notes: clip.editNotes.join("\n"),
    createdAt: now,
    updatedAt: now,
  };
}

function safeZoneFramedTransform(layer: TimelineLayer, project: EditorProject, preset: SocialFormatPreset, layerScale: number) {
  const width = Math.max(1, Math.round(layer.transform.width * layerScale));
  const height = Math.max(1, Math.round(layer.transform.height * layerScale));
  const safeZone = safeZoneForLayer(layer.kind, preset);
  const halfWidth = Math.min(0.5, width / preset.width / 2);
  const halfHeight = Math.min(0.5, height / preset.height / 2);
  const projectedX = project.width > 0 ? (layer.transform.x * project.width * layerScale) / preset.width : layer.transform.x;
  const projectedY = project.height > 0 ? (layer.transform.y * project.height * layerScale) / preset.height : layer.transform.y;

  return {
    ...layer.transform,
    width,
    height,
    x: clampIntoSafeAxis(projectedX, safeZone.left, safeZone.right, halfWidth),
    y: clampIntoSafeAxis(projectedY, safeZone.top, safeZone.bottom, halfHeight),
  };
}

function safeZoneForLayer(kind: LayerKind, preset: SocialFormatPreset) {
  if (kind === "text" || kind === "subtitle" || kind === "sticker" || kind === "timer") {
    return preset.safeZones.title.insets;
  }

  return preset.safeZones.action.insets;
}

function clampIntoSafeAxis(value: number, leadingInset: number, trailingInset: number, halfSize: number) {
  const min = leadingInset + halfSize;
  const max = 1 - trailingInset - halfSize;
  if (min > max) return 0.5;
  return Math.min(max, Math.max(min, value));
}

function normalizedClipTiming(start: number, end: number, projectDuration: number) {
  const safeStart = Number.isFinite(start) ? Math.max(0, start) : 0;
  const safeEnd = Number.isFinite(end) ? Math.min(Math.max(0, projectDuration), end) : 0;
  const duration = safeEnd - safeStart;
  if (duration < TIMELINE_MIN_LAYER_SECONDS) return null;

  return {
    start: roundSeconds(safeStart),
    end: roundSeconds(safeEnd),
    duration: roundSeconds(duration),
  };
}

function nextTrack(layers: TimelineLayer[]) {
  return layers.length ? Math.max(...layers.map((layer) => layer.track)) + 1 : 1;
}

function cleanVariantTitle(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 80) || "AI clip";
}

function formatSeconds(value: number) {
  return `${roundSeconds(value)}s`;
}

function roundSeconds(value: number) {
  return Math.round(value * 1000) / 1000;
}
