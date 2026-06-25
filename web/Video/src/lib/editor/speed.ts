import type { LayerSpeed, LayerSpeedRamp, TimelineLayer } from "@/lib/editor/types";

export const MIN_PLAYBACK_RATE = 0.1;
export const MAX_PLAYBACK_RATE = 16;

export function defaultLayerSpeed(playbackRate = 1): LayerSpeed {
  const rate = normalizePlaybackRate(playbackRate);

  return {
    reversed: false,
    preservePitch: true,
    ramp: {
      enabled: false,
      mode: "linear",
      startRate: rate,
      endRate: rate,
    },
  };
}

export function normalizeLayerSpeed(speed: LayerSpeed | undefined, playbackRate = 1): LayerSpeed {
  const baseRate = normalizePlaybackRate(playbackRate);
  const ramp = normalizeSpeedRamp(speed?.ramp, baseRate);

  return {
    reversed: speed?.reversed ?? false,
    preservePitch: speed?.preservePitch ?? true,
    ramp,
  };
}

export function normalizePlaybackRate(value: number | undefined, fallback = 1) {
  const parsed = Number.isFinite(value) ? Number(value) : fallback;
  return Math.min(MAX_PLAYBACK_RATE, Math.max(MIN_PLAYBACK_RATE, parsed));
}

export function layerPlaybackRateAtProjectTime(layer: TimelineLayer, projectTime: number) {
  const speed = normalizeLayerSpeed(layer.speed, layer.playbackRate);
  if (!speed.ramp.enabled || layer.duration <= 0) return normalizePlaybackRate(layer.playbackRate);

  const elapsed = Math.min(layer.duration, Math.max(0, projectTime - layer.start));
  const progress = Math.min(1, Math.max(0, elapsed / layer.duration));
  return normalizePlaybackRate(speed.ramp.startRate + (speed.ramp.endRate - speed.ramp.startRate) * progress);
}

export function layerSourceTimeAtProjectTime(layer: TimelineLayer, projectTime: number) {
  const elapsed = Math.min(layer.duration, Math.max(0, projectTime - layer.start));
  const sourceElapsed = layerSourceElapsedAtTimelineElapsed(layer, elapsed);
  const speed = normalizeLayerSpeed(layer.speed, layer.playbackRate);

  if (!speed.reversed) return layer.trimStart + sourceElapsed;

  return layer.trimStart + Math.max(0, layerSourceDuration(layer) - sourceElapsed);
}

export function layerSourceDuration(layer: TimelineLayer) {
  return layerSourceElapsedAtTimelineElapsed(layer, layer.duration);
}

export function layerRequiresTimelineSeeking(layer: TimelineLayer) {
  const speed = normalizeLayerSpeed(layer.speed, layer.playbackRate);
  return speed.reversed || speed.ramp.enabled;
}

function normalizeSpeedRamp(ramp: LayerSpeedRamp | undefined, playbackRate: number): LayerSpeedRamp {
  return {
    enabled: ramp?.enabled ?? false,
    mode: "linear",
    startRate: normalizePlaybackRate(ramp?.startRate, playbackRate),
    endRate: normalizePlaybackRate(ramp?.endRate, playbackRate),
  };
}

function layerSourceElapsedAtTimelineElapsed(layer: TimelineLayer, elapsed: number) {
  const speed = normalizeLayerSpeed(layer.speed, layer.playbackRate);
  const safeElapsed = Math.min(Math.max(0, elapsed), Math.max(0, layer.duration));
  if (!speed.ramp.enabled || layer.duration <= 0) return safeElapsed * normalizePlaybackRate(layer.playbackRate);

  const rateDelta = speed.ramp.endRate - speed.ramp.startRate;
  return speed.ramp.startRate * safeElapsed + (rateDelta * safeElapsed * safeElapsed) / (2 * layer.duration);
}
