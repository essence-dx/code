import { normalizeLayerSpeed, normalizePlaybackRate } from "@/lib/editor/speed";
import type { MediaAsset, SubtitleCue, TimelineLayer } from "@/lib/editor/types";

export interface TimelineCleanupCutSuggestion {
  start: number;
  end: number;
  priority: "high" | "medium" | "low";
  suggestedAction: "remove";
  reason: string;
}

export interface TimelineCleanupCutOutput {
  objective: string;
  cuts: TimelineCleanupCutSuggestion[];
}

export interface TimelineCleanupCutOptions {
  silenceThreshold?: number;
  minimumSilenceSeconds?: number;
  maxSuggestions?: number;
}

const fillerPatterns = [
  { label: "um", pattern: /\bum+\b/i },
  { label: "uh", pattern: /\buh+\b/i },
  { label: "erm", pattern: /\berm+\b/i },
  { label: "ah", pattern: /\bah+\b/i },
  { label: "you know", pattern: /\byou\s+know\b/i },
  { label: "kind of", pattern: /\bkind\s+of\b/i },
  { label: "sort of", pattern: /\bsort\s+of\b/i },
  { label: "I mean", pattern: /\bi\s+mean\b/i },
];

export function createTimelineCleanupCutOutput(
  layers: TimelineLayer[],
  assets: MediaAsset[],
  options: TimelineCleanupCutOptions = {},
): TimelineCleanupCutOutput {
  const suggestions = [
    ...createFillerWordCutSuggestions(layers),
    ...createSilenceCutSuggestions(layers, assets, options),
  ]
    .sort((a, b) => a.start - b.start || a.end - b.end)
    .slice(0, normalizedMaxSuggestions(options.maxSuggestions));

  return {
    objective: "Review silence and filler-word cleanup ranges before applying them to the timeline.",
    cuts: suggestions,
  };
}

export function createFillerWordCutSuggestions(layers: TimelineLayer[]): TimelineCleanupCutSuggestion[] {
  return layers.flatMap((layer) => {
    if (layer.kind !== "subtitle" || layer.locked || !layer.cues?.length) return [];

    return layer.cues.flatMap((cue) => {
      const filler = matchedFillerLabel(cue.text);
      if (!filler) return [];

      const range = cueProjectRange(layer, cue);
      if (!range) return [];

      return [
        {
          ...range,
          priority: "medium" as const,
          suggestedAction: "remove" as const,
          reason: `Remove possible filler phrase "${filler}" from caption "${cue.text.trim()}".`,
        },
      ];
    });
  });
}

export function createSilenceCutSuggestions(
  layers: TimelineLayer[],
  assets: MediaAsset[],
  options: TimelineCleanupCutOptions = {},
): TimelineCleanupCutSuggestion[] {
  const threshold = normalizedSilenceThreshold(options.silenceThreshold);
  const minimumSilenceSeconds = normalizedMinimumSilence(options.minimumSilenceSeconds);

  return layers.flatMap((layer) => {
    if ((layer.kind !== "audio" && layer.kind !== "video") || layer.locked || !layer.assetId) return [];

    const asset = assets.find((item) => item.id === layer.assetId);
    if (!asset?.waveformPeaks?.length) return [];

    const speed = normalizeLayerSpeed(layer.speed, layer.playbackRate);
    if (speed.reversed || speed.ramp.enabled) return [];

    const playbackRate = normalizePlaybackRate(layer.playbackRate, 1);
    const sourceStart = layer.trimStart;
    const sourceEnd = sourceStart + layer.duration * playbackRate;
    const sourceRanges = detectSilentSourceRanges(asset.waveformPeaks, asset.duration || sourceEnd, threshold, minimumSilenceSeconds);

    return sourceRanges.flatMap((sourceRange) => {
      const start = Math.max(sourceRange.start, sourceStart);
      const end = Math.min(sourceRange.end, sourceEnd);
      if (end - start < minimumSilenceSeconds) return [];

      return [
        {
          start: roundSeconds(layer.start + (start - sourceStart) / playbackRate),
          end: roundSeconds(layer.start + (end - sourceStart) / playbackRate),
          priority: end - start >= 1.2 ? "high" : "medium",
          suggestedAction: "remove" as const,
          reason: `Remove ${formatDuration(end - start)} of low-volume audio from ${asset.name}.`,
        },
      ];
    });
  });
}

export function detectSilentSourceRanges(peaks: number[], sourceDuration: number, threshold = 0.045, minimumSilenceSeconds = 0.45) {
  const safeDuration = Number.isFinite(sourceDuration) && sourceDuration > 0 ? sourceDuration : 0;
  if (!peaks.length || safeDuration <= 0) return [];

  const secondsPerPeak = safeDuration / peaks.length;
  const ranges: Array<{ start: number; end: number }> = [];
  let silentStartIndex: number | null = null;

  for (let index = 0; index <= peaks.length; index += 1) {
    const peak = peaks[index] ?? Number.POSITIVE_INFINITY;
    const isSilent = Number.isFinite(peak) && peak <= threshold;

    if (isSilent && silentStartIndex === null) {
      silentStartIndex = index;
      continue;
    }

    if (!isSilent && silentStartIndex !== null) {
      const start = silentStartIndex * secondsPerPeak;
      const end = index * secondsPerPeak;
      if (end - start >= minimumSilenceSeconds) {
        ranges.push({ start: roundSeconds(start), end: roundSeconds(end) });
      }
      silentStartIndex = null;
    }
  }

  return ranges;
}

function cueProjectRange(layer: TimelineLayer, cue: SubtitleCue) {
  const start = Math.max(layer.start, layer.start + cue.start - layer.trimStart);
  const end = Math.min(layer.start + layer.duration, layer.start + cue.end - layer.trimStart);
  if (end - start < 0.1) return null;

  return {
    start: roundSeconds(start),
    end: roundSeconds(end),
  };
}

function matchedFillerLabel(text: string) {
  return fillerPatterns.find((item) => item.pattern.test(text))?.label ?? null;
}

function normalizedSilenceThreshold(value: number | undefined) {
  return Math.min(0.2, Math.max(0.005, Number.isFinite(value) ? Number(value) : 0.045));
}

function normalizedMinimumSilence(value: number | undefined) {
  return Math.min(5, Math.max(0.25, Number.isFinite(value) ? Number(value) : 0.45));
}

function normalizedMaxSuggestions(value: number | undefined) {
  return Math.max(1, Math.min(40, Math.floor(Number.isFinite(value) ? Number(value) : 24)));
}

function formatDuration(seconds: number) {
  return `${roundSeconds(seconds).toFixed(1)}s`;
}

function roundSeconds(value: number) {
  return Math.round(value * 1000) / 1000;
}
