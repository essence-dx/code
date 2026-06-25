import { normalizeLayerAudioMix } from "@/lib/audio/mix";
import { normalizeBrandKitSettings } from "@/lib/editor/brand-kit";
import { createId, formatTime } from "@/lib/editor/factory";
import { cloneLayerKeyframes, normalizeLayerKeyframes } from "@/lib/editor/keyframes";
import { normalizeLayerMotion } from "@/lib/editor/motion";
import { snapTime } from "@/lib/editor/timeline";
import { normalizeLayerTransition } from "@/lib/editor/transitions";
import type {
  AudioMixPreset,
  BrandTypographyPreset,
  EditorProject,
  LayerStylePreset,
  MediaAsset,
  MediaCollection,
  TimelineLayer,
  TimelineMarker,
} from "@/lib/editor/types";
import { normalizeLayerVisualStyle } from "@/lib/editor/visual-effects";
import type { EditorState, RemovedMediaRecovery } from "@/features/editor/state/editor-store-types";

export function createReplacementAudioLayer(
  sourceLayer: TimelineLayer,
  assetId: string,
  assetName: string,
  track: number,
  duration: number,
  now: string,
): TimelineLayer {
  return {
    ...sourceLayer,
    id: crypto.randomUUID(),
    kind: "audio",
    name: `${sourceLayer.name} replacement audio`,
    track,
    duration,
    trimStart: 0,
    playbackRate: 1,
    volume: 1,
    fadeIn: sourceLayer.fadeIn ?? 0,
    fadeOut: sourceLayer.fadeOut ?? 0,
    assetId,
    muted: false,
    hidden: false,
    notes: `Replacement audio: ${assetName}`,
    createdAt: now,
    updatedAt: now,
  };
}

export function getSelectedLayerIds(state: Pick<EditorState, "selectedLayerId" | "selectedLayerIds">) {
  if (state.selectedLayerIds.length) return state.selectedLayerIds;
  return state.selectedLayerId ? [state.selectedLayerId] : [];
}

export function groupAwareLayerIds(layers: TimelineLayer[], layerIds: string[]) {
  if (!layerIds.length) return [];

  const expanded = new Set(layerIds);
  const groupIds = new Set(
    layers
      .filter((layer) => expanded.has(layer.id) && layer.groupId)
      .map((layer) => layer.groupId as string),
  );

  if (!groupIds.size) return [...expanded];

  layers.forEach((layer) => {
    if (layer.groupId && groupIds.has(layer.groupId)) {
      expanded.add(layer.id);
    }
  });

  return [...expanded];
}

export function cloneLayer(layer: TimelineLayer, patch: Partial<TimelineLayer>): TimelineLayer {
  return {
    ...layer,
    transform: { ...layer.transform, crop: layer.transform.crop ? { ...layer.transform.crop } : undefined },
    style: { ...layer.style },
    cues: layer.cues?.map((cue) => ({ ...cue, id: crypto.randomUUID() })),
    keyframes: cloneLayerKeyframes(layer.keyframes),
    ...patch,
  };
}

export function normalizeProjectTimeline(project: EditorProject): EditorProject {
  const duration = projectDurationForLayers(project.duration, project.layers);
  return {
    ...project,
    duration,
    layers: project.layers.map((layer) => ({
      ...layer,
      ...normalizeLayerAudioMix(layer),
      motion: normalizeLayerMotion(layer.motion),
      keyframes: normalizeLayerKeyframes(layer.keyframes, layer.duration),
      transition: normalizeLayerTransition(layer.transition, layer.duration),
      style: normalizeLayerVisualStyle(layer.style),
    })),
    snapInterval: normalizeSnapInterval(project.snapInterval),
    rippleMode: Boolean(project.rippleMode),
    markers: timelineMarkers(project, duration),
    mediaCollections: normalizeMediaCollections(project.mediaCollections ?? []),
    layerStylePresets: normalizeLayerStylePresets(project.layerStylePresets ?? []),
    audioMixPresets: normalizeAudioMixPresets(project.audioMixPresets ?? []),
    brandTypographyPresets: normalizeBrandTypographyPresets(project.brandTypographyPresets ?? []),
    brandKit: normalizeBrandKitSettings(project.brandKit, { typographyPresets: project.brandTypographyPresets ?? [] }),
  };
}

export function mediaCollections(project: EditorProject) {
  return normalizeMediaCollections(project.mediaCollections ?? []);
}

export function normalizeMediaCollections(collections: MediaCollection[]) {
  const seen = new Set<string>();
  return collections.flatMap((collection) => {
    const name = cleanMediaCollectionName(collection.name);
    if (!collection.id || seen.has(collection.id) || !name) return [];
    seen.add(collection.id);

    return [
      {
        ...collection,
        name,
        assetIds: [...new Set(collection.assetIds.filter(Boolean))],
      },
    ];
  });
}

export function cleanMediaCollectionName(name: string) {
  return name.trim().replace(/\s+/g, " ").slice(0, 80);
}

export function layerStylePresets(project: EditorProject) {
  return normalizeLayerStylePresets(project.layerStylePresets ?? []);
}

export function normalizeLayerStylePresets(presets: LayerStylePreset[]) {
  const seen = new Set<string>();
  return presets.flatMap((preset) => {
    const name = cleanLayerStylePresetName(preset.name);
    if (!preset.id || seen.has(preset.id) || !name) return [];
    seen.add(preset.id);

    return [
      {
        ...preset,
        name,
        style: { ...preset.style },
      },
    ];
  });
}

export function cleanLayerStylePresetName(name: string) {
  return name.trim().replace(/\s+/g, " ").slice(0, 80) || "Layer style";
}

export function audioMixPresets(project: EditorProject) {
  return normalizeAudioMixPresets(project.audioMixPresets ?? []);
}

export function normalizeAudioMixPresets(presets: AudioMixPreset[]) {
  const seen = new Set<string>();
  return presets.flatMap((preset) => {
    const name = cleanAudioMixPresetName(preset.name);
    if (!preset.id || seen.has(preset.id) || !name) return [];
    seen.add(preset.id);
    const mix = normalizeLayerAudioMix({ duration: 7200, volume: preset.volume, fadeIn: preset.fadeIn, fadeOut: preset.fadeOut });

    return [
      {
        ...preset,
        name,
        ...mix,
        muted: Boolean(preset.muted),
      },
    ];
  });
}

export function cleanAudioMixPresetName(name: string) {
  return name.trim().replace(/\s+/g, " ").slice(0, 80) || "Audio mix";
}

export function brandTypographyPresets(project: EditorProject) {
  return normalizeBrandTypographyPresets(project.brandTypographyPresets ?? []);
}

export function normalizeBrandTypographyPresets(presets: BrandTypographyPreset[]) {
  const seen = new Set<string>();
  return presets.flatMap((preset) => {
    const name = cleanBrandTypographyName(preset.name);
    if (!preset.id || seen.has(preset.id) || !name) return [];
    seen.add(preset.id);

    return [
      {
        ...preset,
        name,
        headingFontFamily: cleanFontFamily(preset.headingFontFamily),
        bodyFontFamily: cleanFontFamily(preset.bodyFontFamily),
        captionFontFamily: cleanFontFamily(preset.captionFontFamily),
        headingWeight: clampFontWeight(preset.headingWeight, 800),
        bodyWeight: clampFontWeight(preset.bodyWeight, 500),
        captionWeight: clampFontWeight(preset.captionWeight, 700),
      },
    ];
  });
}

export function cleanBrandTypographyName(name: string) {
  return name.trim().replace(/\s+/g, " ").slice(0, 80);
}

export function typographyRoleStyle(preset: BrandTypographyPreset, role: "heading" | "body" | "caption") {
  if (role === "heading") {
    return { fontFamily: preset.headingFontFamily, fontWeight: preset.headingWeight, fontSize: 56 };
  }
  if (role === "caption") {
    return { fontFamily: preset.captionFontFamily, fontWeight: preset.captionWeight, fontSize: 42 };
  }
  return { fontFamily: preset.bodyFontFamily, fontWeight: preset.bodyWeight, fontSize: 34 };
}

export function isTextLikeLayer(layer: TimelineLayer) {
  return layer.kind === "text" || layer.kind === "subtitle" || layer.kind === "sticker" || layer.kind === "timer";
}

export function formatFreezeFrameTime(seconds: number) {
  return formatTime(seconds);
}

export function nextTrack(layers: TimelineLayer[]) {
  return layers.length ? Math.max(...layers.map((layer) => layer.track)) + 1 : 0;
}

export function timelineOrderedLayers(layers: TimelineLayer[]) {
  return [...layers].sort((a, b) => a.track - b.track || a.start - b.start || a.name.localeCompare(b.name));
}

export function duplicatedGroupId(groupId: string | undefined, groupIds: Map<string, string>) {
  if (!groupId) return undefined;
  const existing = groupIds.get(groupId);
  if (existing) return existing;

  const next = createId("group");
  groupIds.set(groupId, next);
  return next;
}

export function projectDurationForLayers(baseDuration: number, layers: TimelineLayer[]) {
  return layers.reduce((duration, layer) => Math.max(duration, layer.start + layer.duration), finiteNumber(baseDuration, 0));
}

export function createTimelineMarker(time: number, project: EditorProject): TimelineMarker {
  const now = new Date().toISOString();
  const count = timelineMarkers(project).length + 1;

  return {
    id: createId("marker"),
    time: clamp(time, 0, project.duration),
    label: `Marker ${count}`,
    color: "#f59e0b",
    createdAt: now,
    updatedAt: now,
  };
}

export function timelineMarkers(project: EditorProject, duration = project.duration) {
  return normalizeTimelineMarkers(project.markers ?? [], duration);
}

export function normalizeTimelineMarkers(markers: TimelineMarker[], duration: number) {
  return markers
    .map((marker) => ({
      ...marker,
      time: clamp(marker.time, 0, duration),
      label: cleanMarkerLabel(marker.label),
      color: normalizeHexColor(marker.color) ?? "#f59e0b",
    }))
    .sort((a, b) => a.time - b.time);
}

export function snapProjectTime(project: EditorProject, time: number) {
  const marker = nearestMarker(timelineMarkers(project), time);
  if (marker && Math.abs(marker.time - time) <= 0.18) {
    return marker.time;
  }

  return snapTime(time, true, projectSnapInterval(project));
}

export function projectSnapInterval(project: Pick<EditorProject, "snapInterval">) {
  return normalizeSnapInterval(project.snapInterval);
}

export function normalizeSnapInterval(seconds: number | undefined) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return 0.25;
  return Math.min(5, Math.max(0.05, Number(seconds)));
}

export function cleanMarkerLabel(label: string) {
  return label.trim().replace(/\s+/g, " ").slice(0, 80) || "Marker";
}

export function upsertAsset(assets: MediaAsset[], asset: MediaAsset) {
  const existing = assets.find((item) => item.id === asset.id);
  if (!existing) {
    return [asset, ...assets];
  }

  revokeReplacedObjectUrl(existing, asset);
  return assets.map((item) => (item.id === asset.id ? asset : item));
}

export function revokeMediaAssetObjectUrls(assets: MediaAsset[], keepAssets: MediaAsset[] = []) {
  const keepUrls = new Set(keepAssets.flatMap((asset) => (asset.objectUrl ? [asset.objectUrl] : [])));
  assets.forEach((asset) => {
    if (!asset.objectUrl || keepUrls.has(asset.objectUrl)) return;
    revokeObjectUrl(asset.objectUrl);
  });
}

export function revokeRemovedMediaRecovery(recovery: RemovedMediaRecovery | null) {
  if (!recovery) return;
  revokeMediaAssetObjectUrls([recovery.asset]);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, finiteNumber(value, min)));
}

export function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toLowerCase() : null;
}

export function cleanFontFamily(fontFamily: string) {
  return fontFamily.trim().replace(/\s+/g, " ").slice(0, 160) || "Geist";
}

function clampFontWeight(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1000, Math.max(100, Math.round(value)));
}

function nearestMarker(markers: TimelineMarker[], time: number) {
  return markers.reduce<TimelineMarker | null>((closest, marker) => {
    if (!closest) return marker;
    return Math.abs(marker.time - time) < Math.abs(closest.time - time) ? marker : closest;
  }, null);
}

function revokeReplacedObjectUrl(previous: MediaAsset, next: MediaAsset) {
  if (previous.objectUrl && previous.objectUrl !== next.objectUrl) {
    revokeObjectUrl(previous.objectUrl);
  }
}

function revokeObjectUrl(objectUrl: string) {
  if (objectUrl.startsWith("blob:")) {
    URL.revokeObjectURL(objectUrl);
  }
}

function finiteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
