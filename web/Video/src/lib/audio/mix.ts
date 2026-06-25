import type { TimelineLayer } from "@/lib/editor/types";

export interface LayerAudioMix {
  volume: number;
  fadeIn: number;
  fadeOut: number;
}

export function normalizeLayerAudioMix(layer: Pick<TimelineLayer, "duration" | "volume" | "fadeIn" | "fadeOut">): LayerAudioMix {
  const duration = Math.max(0, finiteAudioNumber(layer.duration, 0));

  return {
    volume: clampAudioValue(layer.volume, 1, 0, 2),
    fadeIn: clampAudioValue(layer.fadeIn, 0, 0, duration),
    fadeOut: clampAudioValue(layer.fadeOut, 0, 0, duration),
  };
}

export function layerAudioGainAtTime(
  layer: Pick<TimelineLayer, "start" | "duration" | "muted" | "volume" | "fadeIn" | "fadeOut">,
  currentTime: number,
) {
  if (layer.muted) return 0;

  const mix = normalizeLayerAudioMix(layer);
  const localTime = Math.max(0, currentTime - layer.start);
  const remaining = Math.max(0, layer.duration - localTime);
  const fadeInGain = mix.fadeIn > 0 ? Math.min(1, localTime / mix.fadeIn) : 1;
  const fadeOutGain = mix.fadeOut > 0 ? Math.min(1, remaining / mix.fadeOut) : 1;

  return Math.max(0, Math.min(2, mix.volume * Math.min(fadeInGain, fadeOutGain)));
}

function clampAudioValue(value: number | undefined, fallback: number, min: number, max: number) {
  return Math.min(max, Math.max(min, finiteAudioNumber(value, fallback)));
}

function finiteAudioNumber(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
