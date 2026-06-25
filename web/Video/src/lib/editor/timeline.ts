import type { TimelineLayer } from "@/lib/editor/types";

export const TIMELINE_SNAP_SECONDS = 0.25;
export const TIMELINE_MIN_LAYER_SECONDS = 0.1;

export function snapTime(value: number, enabled = true, interval = TIMELINE_SNAP_SECONDS) {
  if (!enabled) return Math.max(0, value);
  const safeInterval = Number.isFinite(interval) && interval > 0 ? interval : TIMELINE_SNAP_SECONDS;
  return Math.max(0, Math.round(value / safeInterval) * safeInterval);
}

export function clampLayerTiming(start: number, duration: number) {
  return {
    start: Math.max(0, start),
    duration: Math.max(TIMELINE_MIN_LAYER_SECONDS, duration),
  };
}

export function transcriptFromLayers(layers: TimelineLayer[]) {
  return layers
    .filter((layer) => layer.kind === "subtitle")
    .flatMap((layer) => layer.cues ?? [])
    .sort((a, b) => a.start - b.start)
    .map((cue) => cue.text.trim())
    .filter(Boolean)
    .join("\n");
}
