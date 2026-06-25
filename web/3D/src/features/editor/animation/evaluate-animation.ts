import { isTransformAnimationProperty } from "./animation-registry";
import type { AnimationKeyframeValue, AnimationTrack, Material, Transform, Vec3 } from "../types";

function interpolateNumber(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function interpolateVec3(start: Vec3, end: Vec3, progress: number): Vec3 {
  return [
    interpolateNumber(start[0], end[0], progress),
    interpolateNumber(start[1], end[1], progress),
    interpolateNumber(start[2], end[2], progress),
  ];
}

function easeProgress(track: AnimationTrack, progress: number) {
  if (track.easing === "easeIn") {
    return progress * progress;
  }

  if (track.easing === "easeOut") {
    return 1 - (1 - progress) * (1 - progress);
  }

  if (track.easing === "easeInOut") {
    return progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  }

  return progress;
}

function isVec3(value: AnimationKeyframeValue): value is Vec3 {
  return Array.isArray(value) && value.length === 3;
}

function isNumber(value: AnimationKeyframeValue): value is number {
  return typeof value === "number";
}

function evaluateTrack<T extends AnimationKeyframeValue>(track: AnimationTrack, fallback: T, time: number, isExpectedValue: (value: AnimationKeyframeValue) => value is T, interpolate: (start: T, end: T, progress: number) => T): T {
  const keyframes = [...track.keyframes].sort((left, right) => left.time - right.time);

  if (keyframes.length === 0) {
    return fallback;
  }

  if (keyframes.length === 1) {
    return isExpectedValue(keyframes[0].value) ? keyframes[0].value : fallback;
  }

  const duration = keyframes.at(-1)?.time ?? 0;
  const sampleTime = track.loop && duration > 0 ? time % duration : time;

  if (sampleTime <= keyframes[0].time) {
    return isExpectedValue(keyframes[0].value) ? keyframes[0].value : fallback;
  }

  for (let index = 0; index < keyframes.length - 1; index += 1) {
    const current = keyframes[index];
    const next = keyframes[index + 1];

    if (sampleTime >= current.time && sampleTime <= next.time) {
      if (!isExpectedValue(current.value) || !isExpectedValue(next.value)) {
        return fallback;
      }

      const span = Math.max(next.time - current.time, 0.001);
      return interpolate(current.value, next.value, easeProgress(track, (sampleTime - current.time) / span));
    }
  }

  const lastValue = keyframes.at(-1)?.value;
  return lastValue !== undefined && isExpectedValue(lastValue) ? lastValue : fallback;
}

export function evaluateAnimatedTransform(transform: Transform, tracks: AnimationTrack[], time: number): Transform {
  const positionTrack = tracks.find((track) => track.property === "position" && isTransformAnimationProperty(track.property));
  const rotationTrack = tracks.find((track) => track.property === "rotation" && isTransformAnimationProperty(track.property));
  const scaleTrack = tracks.find((track) => track.property === "scale" && isTransformAnimationProperty(track.property));

  return {
    position: positionTrack ? evaluateTrack(positionTrack, transform.position, time, isVec3, interpolateVec3) : transform.position,
    rotation: rotationTrack ? evaluateTrack(rotationTrack, transform.rotation, time, isVec3, interpolateVec3) : transform.rotation,
    scale: scaleTrack ? evaluateTrack(scaleTrack, transform.scale, time, isVec3, interpolateVec3) : transform.scale,
  };
}

export function evaluateAnimatedMaterial(material: Material, tracks: AnimationTrack[], time: number): Material {
  const opacityTrack = tracks.find((track) => track.property === "material.opacity");

  if (!opacityTrack) {
    return material;
  }

  return {
    ...material,
    opacity: evaluateTrack(opacityTrack, material.opacity, time, isNumber, interpolateNumber),
  };
}
