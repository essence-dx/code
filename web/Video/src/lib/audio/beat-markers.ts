import type { MediaAsset, TimelineLayer, TimelineMarker } from "@/lib/editor/types";

export const beatMarkerColor = "#a855f7";
export const maxBeatMarkers = 64;

export function detectBeatMarkerTimes(input: { layer: TimelineLayer; asset?: MediaAsset; maxMarkers?: number }) {
  const peaks = input.asset?.waveformPeaks?.filter((peak) => Number.isFinite(peak) && peak >= 0) ?? [];
  if (input.layer.kind !== "audio" || peaks.length < 8 || input.layer.duration <= 0) return [];

  const markerLimit = Math.max(4, Math.min(maxBeatMarkers, input.maxMarkers ?? 32));
  const assetDuration = Math.max(input.asset?.duration ?? input.layer.duration, input.layer.trimStart + input.layer.duration * input.layer.playbackRate, 0.001);
  const sourceStart = Math.max(0, Math.min(assetDuration, input.layer.trimStart));
  const sourceEnd = Math.max(sourceStart, Math.min(assetDuration, input.layer.trimStart + input.layer.duration * input.layer.playbackRate));
  const startIndex = Math.max(0, Math.floor((sourceStart / assetDuration) * peaks.length));
  const endIndex = Math.min(peaks.length, Math.max(startIndex + 1, Math.ceil((sourceEnd / assetDuration) * peaks.length)));
  const regionPeaks = peaks.slice(startIndex, endIndex);
  if (regionPeaks.length < 8) return [];

  const threshold = beatThreshold(regionPeaks);
  const localWindow = Math.max(2, Math.floor(regionPeaks.length / 96));
  const minGapSeconds = Math.max(0.28, Math.min(0.7, input.layer.duration / markerLimit));
  const candidates = regionPeaks
    .map((peak, index) => ({ peak, index }))
    .filter(({ peak, index }) => peak >= threshold && isLocalPeak(regionPeaks, index, localWindow))
    .map(({ peak, index }) => ({
      time: input.layer.start + (index / Math.max(1, regionPeaks.length - 1)) * input.layer.duration,
      score: peak,
    }))
    .sort((a, b) => b.score - a.score);

  const selected: number[] = [];
  for (const candidate of candidates) {
    if (selected.some((time) => Math.abs(time - candidate.time) < minGapSeconds)) continue;
    selected.push(roundBeatTime(candidate.time));
    if (selected.length >= markerLimit) break;
  }

  return selected.sort((a, b) => a - b);
}

export function beatMarkerLabel(index: number) {
  return `Beat ${index + 1}`;
}

export function isBeatMarker(marker: Pick<TimelineMarker, "label">) {
  return /^Beat \d+$/i.test(marker.label.trim());
}

function beatThreshold(peaks: number[]) {
  const average = peaks.reduce((sum, peak) => sum + peak, 0) / peaks.length;
  const variance = peaks.reduce((sum, peak) => sum + Math.pow(peak - average, 2), 0) / peaks.length;
  return Math.max(average + Math.sqrt(variance) * 0.45, percentile(peaks, 0.72));
}

function isLocalPeak(peaks: number[], index: number, radius: number) {
  const value = peaks[index] ?? 0;
  for (let offset = -radius; offset <= radius; offset += 1) {
    if (offset === 0) continue;
    if ((peaks[index + offset] ?? 0) > value) return false;
  }
  return true;
}

function percentile(values: number[], ratio: number) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor(sorted.length * ratio)))] ?? 0;
}

function roundBeatTime(time: number) {
  return Number(time.toFixed(3));
}
