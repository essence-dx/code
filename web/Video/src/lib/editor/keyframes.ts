import { normalizeLayerCrop } from "@/lib/editor/framing";
import type { LayerCrop, LayerKeyframe, LayerKeyframeEasing, LayerTransform, TimelineLayer } from "@/lib/editor/types";

const supportedEasings: LayerKeyframeEasing[] = ["linear", "ease-in", "ease-out", "ease-in-out"];

export function createLayerKeyframeSnapshot(layer: TimelineLayer, time: number): LayerKeyframe {
  return normalizeLayerKeyframe(
    {
      id: `keyframe_${crypto.randomUUID()}`,
      time,
      easing: "linear",
      transform: {
        x: layer.transform.x,
        y: layer.transform.y,
        width: layer.transform.width,
        height: layer.transform.height,
        rotation: layer.transform.rotation,
        scale: layer.transform.scale,
        crop: normalizeLayerCrop(layer.transform.crop),
      },
      opacity: layer.style.opacity,
    },
    layer.duration,
  ) as LayerKeyframe;
}

export function normalizeLayerKeyframes(keyframes: LayerKeyframe[] | undefined, duration: number) {
  const seen = new Set<string>();

  return (keyframes ?? [])
    .map((keyframe) => normalizeLayerKeyframe(keyframe, duration))
    .filter((keyframe): keyframe is LayerKeyframe => Boolean(keyframe))
    .filter((keyframe) => {
      if (seen.has(keyframe.id)) return false;
      seen.add(keyframe.id);
      return true;
    })
    .sort((a, b) => a.time - b.time);
}

export function keyframedLayerTransform(layer: Pick<TimelineLayer, "start" | "duration" | "transform" | "keyframes">, currentTime: number) {
  const keyframes = normalizeLayerKeyframes(layer.keyframes, layer.duration);
  if (!keyframes.length) return layer.transform;

  const localTime = localLayerTime(layer, currentTime);
  const frame = interpolatedKeyframe(keyframes, localTime);
  if (!frame) return layer.transform;

  return applyTransformFrame(layer.transform, frame);
}

export function keyframedLayerOpacity(layer: Pick<TimelineLayer, "start" | "duration" | "style" | "keyframes">, currentTime: number) {
  const keyframes = normalizeLayerKeyframes(layer.keyframes, layer.duration);
  if (!keyframes.length) return layer.style.opacity;

  const localTime = localLayerTime(layer, currentTime);
  const frame = interpolatedKeyframe(keyframes, localTime);
  return clampNumber(frame?.opacity, layer.style.opacity, 0, 1);
}

export function cloneLayerKeyframes(keyframes: LayerKeyframe[] | undefined) {
  return keyframes?.map((keyframe) => ({
    ...keyframe,
    transform: keyframe.transform
      ? {
          ...keyframe.transform,
          crop: keyframe.transform.crop ? { ...keyframe.transform.crop } : undefined,
        }
      : undefined,
  }));
}

function normalizeLayerKeyframe(keyframe: LayerKeyframe, duration: number): LayerKeyframe | null {
  const transform = normalizeKeyframeTransform(keyframe.transform);
  const opacity = finiteOptional(keyframe.opacity, 0, 1);

  if (!transform && opacity === undefined) return null;

  return {
    id: keyframe.id?.trim() || `keyframe_${crypto.randomUUID()}`,
    time: clampNumber(keyframe.time, 0, 0, Math.max(0, duration)),
    easing: supportedEasings.includes(keyframe.easing) ? keyframe.easing : "linear",
    transform,
    opacity,
  };
}

function normalizeKeyframeTransform(transform: LayerKeyframe["transform"]) {
  if (!transform) return undefined;

  const normalized = {
    x: finiteOptional(transform.x, -10, 10),
    y: finiteOptional(transform.y, -10, 10),
    width: finiteOptional(transform.width, 1, 20000),
    height: finiteOptional(transform.height, 1, 20000),
    rotation: finiteOptional(transform.rotation, -3600, 3600),
    scale: finiteOptional(transform.scale, 0.01, 100),
    crop: transform.crop ? normalizeLayerCrop(transform.crop) : undefined,
  };

  return Object.values(normalized).some((value) => value !== undefined) ? normalized : undefined;
}

function interpolatedKeyframe(keyframes: LayerKeyframe[], localTime: number): LayerKeyframe | null {
  const first = keyframes[0];
  const last = keyframes[keyframes.length - 1];
  if (!first || !last) return null;
  if (localTime <= first.time) return first;
  if (localTime >= last.time) return last;

  const nextIndex = keyframes.findIndex((keyframe) => keyframe.time >= localTime);
  const next = keyframes[nextIndex];
  const previous = keyframes[Math.max(0, nextIndex - 1)];
  if (!previous || !next) return null;
  if (next.time <= previous.time) return next;

  const rawProgress = (localTime - previous.time) / (next.time - previous.time);
  const progress = easingProgress(rawProgress, next.easing);

  return {
    id: `${previous.id}_${next.id}`,
    time: localTime,
    easing: next.easing,
    transform: interpolateTransform(previous.transform, next.transform, progress),
    opacity: interpolateOptional(previous.opacity, next.opacity, progress),
  };
}

function applyTransformFrame(transform: LayerTransform, keyframe: LayerKeyframe): LayerTransform {
  const frame = keyframe.transform;
  if (!frame) return transform;

  return {
    ...transform,
    x: frame.x ?? transform.x,
    y: frame.y ?? transform.y,
    width: frame.width ?? transform.width,
    height: frame.height ?? transform.height,
    rotation: frame.rotation ?? transform.rotation,
    scale: frame.scale ?? transform.scale,
    crop: frame.crop ?? transform.crop,
  };
}

function interpolateTransform(from: LayerKeyframe["transform"], to: LayerKeyframe["transform"], progress: number): LayerKeyframe["transform"] {
  if (!from && !to) return undefined;

  return {
    x: interpolateOptional(from?.x, to?.x, progress),
    y: interpolateOptional(from?.y, to?.y, progress),
    width: interpolateOptional(from?.width, to?.width, progress),
    height: interpolateOptional(from?.height, to?.height, progress),
    rotation: interpolateOptional(from?.rotation, to?.rotation, progress),
    scale: interpolateOptional(from?.scale, to?.scale, progress),
    crop: interpolateCrop(from?.crop, to?.crop, progress),
  };
}

function interpolateCrop(from: LayerCrop | undefined, to: LayerCrop | undefined, progress: number) {
  if (!from && !to) return undefined;
  const start = normalizeLayerCrop(from);
  const end = normalizeLayerCrop(to);

  return normalizeLayerCrop({
    x: lerp(start.x, end.x, progress),
    y: lerp(start.y, end.y, progress),
    width: lerp(start.width, end.width, progress),
    height: lerp(start.height, end.height, progress),
  });
}

function localLayerTime(layer: Pick<TimelineLayer, "start" | "duration">, currentTime: number) {
  return clampNumber(currentTime - layer.start, 0, 0, Math.max(0, layer.duration));
}

function easingProgress(progress: number, easing: LayerKeyframeEasing) {
  const value = clampNumber(progress, 0, 0, 1);
  if (easing === "ease-in") return value * value;
  if (easing === "ease-out") return 1 - (1 - value) * (1 - value);
  if (easing === "ease-in-out") return value < 0.5 ? 2 * value * value : 1 - (-2 * value + 2) ** 2 / 2;
  return value;
}

function interpolateOptional(from: number | undefined, to: number | undefined, progress: number) {
  if (from === undefined && to === undefined) return undefined;
  if (from === undefined) return to;
  if (to === undefined) return from;
  return lerp(from, to, progress);
}

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function finiteOptional(value: number | undefined, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) ? clampNumber(value, min, min, max) : undefined;
}

function clampNumber(value: number | undefined, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
