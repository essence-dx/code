import type { CSSProperties } from "react";

import type {
  DesignElement,
  LayerMotionEasing,
  LayerMotionKeyframe,
  LayerMotionPreset,
} from "@/features/editor/types";

export const layerMotionPresetOptions: readonly {
  label: string;
  value: LayerMotionPreset;
}[] = [
  { label: "None", value: "none" },
  { label: "Fade", value: "fade" },
  { label: "Rise", value: "rise" },
  { label: "Slide left", value: "slide-left" },
  { label: "Slide right", value: "slide-right" },
  { label: "Zoom", value: "zoom" },
  { label: "Pop", value: "pop" },
];

export const layerMotionEasingOptions: readonly {
  label: string;
  value: LayerMotionEasing;
}[] = [
  { label: "Linear", value: "linear" },
  { label: "Ease in", value: "ease-in" },
  { label: "Ease out", value: "ease-out" },
  { label: "Ease in-out", value: "ease-in-out" },
];

export function getLayerMotionPreset(element: DesignElement) {
  return element.motionPreset ?? "none";
}

export function getLayerMotionStart(element: DesignElement) {
  return Math.max(0, element.motionStartSeconds ?? 0);
}

export function getLayerMotionDuration(element: DesignElement) {
  return Math.max(0.1, element.motionDurationSeconds ?? 0.7);
}

export function getLayerMotionEasing(element: DesignElement) {
  return element.motionEasing ?? "ease-out";
}

export function getLayerMotionKeyframes(element: DesignElement) {
  return (element.motionKeyframes ?? [])
    .map(normalizeLayerMotionKeyframe)
    .sort((first, second) => first.timeSeconds - second.timeSeconds);
}

export function createLayerMotionKeyframe(
  element: DesignElement,
  timeSeconds: number,
): LayerMotionKeyframe {
  return {
    timeSeconds: roundSeconds(Math.max(0, timeSeconds)),
    x: roundPixels(element.x),
    y: roundPixels(element.y),
    width: roundPixels(element.width),
    height: roundPixels(element.height),
    rotation: roundPixels(element.rotation),
    opacity: roundSeconds(Math.max(0, Math.min(1, element.opacity))),
  };
}

export function upsertLayerMotionKeyframe(
  element: DesignElement,
  keyframe: LayerMotionKeyframe,
) {
  const normalizedKeyframe = normalizeLayerMotionKeyframe(keyframe);
  const keyframes = getLayerMotionKeyframes(element);
  const nextKeyframes = keyframes.some(
    (item) => item.timeSeconds === normalizedKeyframe.timeSeconds,
  )
    ? keyframes.map((item) =>
        item.timeSeconds === normalizedKeyframe.timeSeconds
          ? normalizedKeyframe
          : item,
      )
    : [...keyframes, normalizedKeyframe];

  return nextKeyframes.sort(
    (first, second) => first.timeSeconds - second.timeSeconds,
  );
}

export function createLayerMotionExport(element: DesignElement) {
  const preset = getLayerMotionPreset(element);
  const keyframes = getLayerMotionKeyframes(element);

  if (preset === "none" && !keyframes.length) return null;

  return {
    preset,
    presetPackId: element.motionPresetPackId ?? null,
    groupId: element.motionGroupId ?? null,
    startSeconds: roundSeconds(getLayerMotionStart(element)),
    durationSeconds: roundSeconds(getLayerMotionDuration(element)),
    easing: getLayerMotionEasing(element),
    keyframes,
  };
}

export function getLayerMotionStyle(element: DesignElement) {
  const preset = getLayerMotionPreset(element);

  if (preset === "none") return {};

  return {
    "--essence-layer-opacity": element.opacity,
    animationDelay: `${getLayerMotionStart(element)}s`,
    animationDuration: `${getLayerMotionDuration(element)}s`,
    animationFillMode: "both",
    animationName: getLayerMotionAnimationName(preset),
    animationTimingFunction: getLayerMotionEasing(element),
  } as CSSProperties;
}

function getLayerMotionAnimationName(preset: LayerMotionPreset) {
  if (preset === "fade") return "essence-layer-fade";
  if (preset === "rise") return "essence-layer-rise";
  if (preset === "slide-left") return "essence-layer-slide-left";
  if (preset === "slide-right") return "essence-layer-slide-right";
  if (preset === "zoom") return "essence-layer-zoom";
  if (preset === "pop") return "essence-layer-pop";

  return undefined;
}

function roundSeconds(value: number) {
  return Math.round(value * 1000) / 1000;
}

function roundPixels(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeLayerMotionKeyframe(
  keyframe: LayerMotionKeyframe,
): LayerMotionKeyframe {
  return {
    timeSeconds: roundSeconds(Math.max(0, keyframe.timeSeconds)),
    x: roundPixels(keyframe.x),
    y: roundPixels(keyframe.y),
    width: Math.max(1, roundPixels(keyframe.width)),
    height: Math.max(1, roundPixels(keyframe.height)),
    rotation: roundPixels(keyframe.rotation),
    opacity: roundSeconds(Math.max(0, Math.min(1, keyframe.opacity))),
  };
}
