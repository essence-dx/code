import { createId } from "@/lib/editor/factory";
import { type MediaAsset, type TimelineLayer } from "@/lib/editor/types";
import { normalizeLayerAudioMix } from "@/lib/audio/mix";

export interface AutoDuckingSummary {
  changedLayerCount: number;
  createdLayerCount: number;
  duckedRegionCount: number;
  skippedReason?: string;
}

export interface AutoDuckingResult {
  layers: TimelineLayer[];
  summary: AutoDuckingSummary;
}

interface TimeRange {
  start: number;
  end: number;
}

const defaultDuckRatio = 0.36;
const defaultPaddingSeconds = 0.18;
const minSegmentSeconds = 0.12;

export function applyAutoDuckingToLayers(input: {
  layers: TimelineLayer[];
  mediaAssets: MediaAsset[];
  targetLayerId: string;
  duckRatio?: number;
  paddingSeconds?: number;
}): AutoDuckingResult {
  const targetLayer = input.layers.find((layer) => layer.id === input.targetLayerId);
  if (!targetLayer || targetLayer.kind !== "audio" || !targetLayer.assetId) {
    return unchanged(input.layers, "Choose a music or ambience audio layer before auto-ducking.");
  }

  const duckRanges = dialogueRangesForTarget({
    targetLayer,
    layers: input.layers,
    mediaAssets: input.mediaAssets,
    paddingSeconds: input.paddingSeconds ?? defaultPaddingSeconds,
  });
  if (!duckRanges.length) {
    return unchanged(input.layers, "No overlapping dialogue or voice regions were found.");
  }

  const segments = splitTargetLayerByDucking({
    targetLayer,
    duckRanges,
    duckRatio: input.duckRatio ?? defaultDuckRatio,
  });
  if (segments.length < 2) {
    return unchanged(input.layers, "The selected audio layer does not need splitting for the detected regions.");
  }

  const layers = input.layers.flatMap((layer) => (layer.id === targetLayer.id ? segments : [layer]));
  return {
    layers,
    summary: {
      changedLayerCount: 1,
      createdLayerCount: segments.length,
      duckedRegionCount: duckRanges.length,
    },
  };
}

export function isLikelyMusicLayer(layer: TimelineLayer, asset?: MediaAsset) {
  const text = `${layer.name} ${layer.notes ?? ""} ${asset?.name ?? ""}`.toLowerCase();
  return /(music|song|instrumental|ambient|bed|score|theme|beat|soundtrack|loop)/.test(text);
}

export function isLikelyDialogueLayer(layer: TimelineLayer, asset?: MediaAsset) {
  if (layer.hidden || layer.muted || layer.kind === "subtitle" || layer.kind === "text") return false;
  const text = `${layer.name} ${layer.notes ?? ""} ${asset?.name ?? ""}`.toLowerCase();
  if (/(music|song|instrumental|ambient|sfx|sound effect|whoosh|click|applause|bed|score|theme|beat|loop)/.test(text)) return false;
  if (/(voice|voiceover|dialogue|dialog|speech|talk|talking|interview|narration|speaker|camera|screen)/.test(text)) return true;
  return layer.kind === "video";
}

function dialogueRangesForTarget(input: {
  targetLayer: TimelineLayer;
  layers: TimelineLayer[];
  mediaAssets: MediaAsset[];
  paddingSeconds: number;
}) {
  const targetRange = layerRange(input.targetLayer);
  const ranges = input.layers.flatMap((layer) => {
    if (layer.id === input.targetLayer.id || !layer.assetId) return [];
    const asset = input.mediaAssets.find((item) => item.id === layer.assetId);
    if (!isLikelyDialogueLayer(layer, asset)) return [];

    return activeRangesForLayer(layer, asset)
      .map((range) => ({
        start: Math.max(targetRange.start, range.start - input.paddingSeconds),
        end: Math.min(targetRange.end, range.end + input.paddingSeconds),
      }))
      .filter((range) => range.end - range.start >= minSegmentSeconds);
  });

  return mergeRanges(ranges);
}

function activeRangesForLayer(layer: TimelineLayer, asset?: MediaAsset) {
  if (layer.kind !== "audio" || !asset?.waveformPeaks?.length) return [layerRange(layer)];

  const peaks = asset.waveformPeaks.filter((peak) => Number.isFinite(peak) && peak >= 0);
  if (peaks.length < 8) return [layerRange(layer)];

  const threshold = activePeakThreshold(peaks);
  const assetDuration = Math.max(asset.duration, layer.trimStart + layer.duration * layer.playbackRate, 0.001);
  const sourceStart = Math.max(0, Math.min(assetDuration, layer.trimStart));
  const sourceEnd = Math.max(sourceStart, Math.min(assetDuration, layer.trimStart + layer.duration * layer.playbackRate));
  const startIndex = Math.max(0, Math.floor((sourceStart / assetDuration) * peaks.length));
  const endIndex = Math.min(peaks.length, Math.max(startIndex + 1, Math.ceil((sourceEnd / assetDuration) * peaks.length)));
  const regionPeaks = peaks.slice(startIndex, endIndex);
  const ranges: TimeRange[] = [];
  let activeStartIndex: number | null = null;

  regionPeaks.forEach((peak, index) => {
    if (peak >= threshold && activeStartIndex === null) activeStartIndex = index;
    if ((peak < threshold || index === regionPeaks.length - 1) && activeStartIndex !== null) {
      const activeEndIndex = peak < threshold ? index : index + 1;
      ranges.push({
        start: layer.start + (activeStartIndex / regionPeaks.length) * layer.duration,
        end: layer.start + (activeEndIndex / regionPeaks.length) * layer.duration,
      });
      activeStartIndex = null;
    }
  });

  return mergeRanges(ranges).length ? mergeRanges(ranges) : [layerRange(layer)];
}

function splitTargetLayerByDucking(input: { targetLayer: TimelineLayer; duckRanges: TimeRange[]; duckRatio: number }) {
  const layer = input.targetLayer;
  const baseMix = normalizeLayerAudioMix(layer);
  const targetRange = layerRange(layer);
  const boundaries = Array.from(
    new Set([
      targetRange.start,
      targetRange.end,
      ...input.duckRanges.flatMap((range) => [Math.max(targetRange.start, range.start), Math.min(targetRange.end, range.end)]),
    ]),
  ).sort((a, b) => a - b);
  const now = new Date().toISOString();

  return boundaries
    .slice(0, -1)
    .map((start, index) => ({ start, end: boundaries[index + 1] ?? start }))
    .filter((segment) => segment.end - segment.start >= minSegmentSeconds)
    .map((segment, index) => {
      const isDucked = input.duckRanges.some((range) => overlaps(segment, range));
      const duration = segment.end - segment.start;
      return {
        ...layer,
        id: index === 0 ? layer.id : createId("layer"),
        name: `${layer.name}${isDucked ? " ducked" : ""}`,
        start: segment.start,
        duration,
        trimStart: layer.trimStart + Math.max(0, segment.start - layer.start) * layer.playbackRate,
        volume: isDucked ? Number((baseMix.volume * input.duckRatio).toFixed(3)) : baseMix.volume,
        fadeIn: Math.min(baseMix.fadeIn, duration / 2),
        fadeOut: Math.min(baseMix.fadeOut, duration / 2),
        notes: [layer.notes, isDucked ? "Auto-ducked under detected dialogue." : "Auto-duck source segment."].filter(Boolean).join("\n"),
        createdAt: index === 0 ? layer.createdAt : now,
        updatedAt: now,
      } satisfies TimelineLayer;
    });
}

function activePeakThreshold(peaks: number[]) {
  const sorted = [...peaks].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  const upper = sorted[Math.floor(sorted.length * 0.78)] ?? median;
  return Math.max(median * 1.35, upper * 0.72, 0.08);
}

function mergeRanges(ranges: TimeRange[]) {
  const ordered = ranges.filter((range) => range.end > range.start).sort((a, b) => a.start - b.start);
  const merged: TimeRange[] = [];

  for (const range of ordered) {
    const last = merged.at(-1);
    if (!last || range.start > last.end + minSegmentSeconds) {
      merged.push({ ...range });
      continue;
    }

    last.end = Math.max(last.end, range.end);
  }

  return merged;
}

function layerRange(layer: TimelineLayer): TimeRange {
  return { start: layer.start, end: layer.start + layer.duration };
}

function overlaps(a: TimeRange, b: TimeRange) {
  return a.start < b.end && b.start < a.end;
}

function unchanged(layers: TimelineLayer[], skippedReason: string): AutoDuckingResult {
  return {
    layers,
    summary: {
      changedLayerCount: 0,
      createdLayerCount: 0,
      duckedRegionCount: 0,
      skippedReason,
    },
  };
}
