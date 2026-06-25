import type { CSSProperties } from "react";

import {
  getLayerMotionDuration,
  getLayerMotionEasing,
  getLayerMotionKeyframes,
  getLayerMotionPreset,
  getLayerMotionStart,
} from "@/features/editor/layer-motion";
import {
  getMediaTimelineDuration,
  getMediaTimelineEnd,
  getMediaTimelineStart,
  getMediaTrimEnd,
  getMediaTrimStart,
  getVideoTransitionDuration,
  getVideoTransitionIn,
  getVideoTransitionOut,
  isMediaTimelineElement,
} from "@/features/editor/media-timeline";
import type {
  DesignElement,
  LayerMotionKeyframe,
  LayerMotionPreset,
  VideoClipTransition,
} from "@/features/editor/types";

export type TimelineRenderFrame = {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  wrapperOpacity: number;
  transformParts: string[];
};

export function getTimelineRenderFrame(
  element: DesignElement,
  renderTimeSeconds?: number,
): TimelineRenderFrame {
  const baseFrame: TimelineRenderFrame = {
    visible: true,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    rotation: element.rotation,
    wrapperOpacity: 1,
    transformParts: [],
  };

  if (typeof renderTimeSeconds !== "number") {
    return baseFrame;
  }

  if (
    isMediaTimelineElement(element) &&
    !isMediaVisibleAtTime(element, renderTimeSeconds)
  ) {
    return {
      ...baseFrame,
      visible: false,
    };
  }

  return applyLayerMotionFrame(element, renderTimeSeconds, baseFrame);
}

export function getTimelineElementTransform(frame: TimelineRenderFrame) {
  return [`rotate(${frame.rotation}deg)`, ...frame.transformParts].join(" ");
}

export function getTimelineMediaPlaybackTime(
  element: DesignElement,
  renderTimeSeconds?: number,
) {
  if (
    typeof renderTimeSeconds !== "number" ||
    !isMediaTimelineElement(element)
  ) {
    return null;
  }

  if (!isMediaVisibleAtTime(element, renderTimeSeconds)) {
    return null;
  }

  const localTime = Math.max(
    0,
    renderTimeSeconds - getMediaTimelineStart(element),
  );
  const trimStart = getMediaTrimStart(element);
  const trimEnd = getMediaTrimEnd(element);
  const playbackTime = trimStart + localTime;

  return trimEnd === null ? playbackTime : Math.min(trimEnd, playbackTime);
}

export function getVideoTimelineContentStyle(
  element: Extract<DesignElement, { type: "video" }>,
  renderTimeSeconds?: number,
): CSSProperties {
  if (typeof renderTimeSeconds !== "number") return {};

  const start = getMediaTimelineStart(element);
  const duration = getMediaTimelineDuration(element);
  const localTime = Math.max(0, renderTimeSeconds - start);
  const remainingTime = Math.max(0, duration - localTime);
  const transitionDuration = getVideoTransitionDuration(element);

  if (transitionDuration <= 0) return {};

  const opacityFactors: number[] = [];
  const transformParts: string[] = [];
  const transitionIn = getVideoTransitionIn(element);
  const transitionOut = getVideoTransitionOut(element);

  if (transitionIn !== "none" && localTime < transitionDuration) {
    const progress = clamp(localTime / transitionDuration);

    applyVideoTransitionFrame({
      direction: "in",
      opacityFactors,
      progress,
      transformParts,
      transition: transitionIn,
    });
  }

  if (transitionOut !== "none" && remainingTime < transitionDuration) {
    const progress = clamp(remainingTime / transitionDuration);

    applyVideoTransitionFrame({
      direction: "out",
      opacityFactors,
      progress,
      transformParts,
      transition: transitionOut,
    });
  }

  return {
    opacity:
      opacityFactors.length > 0
        ? element.opacity * Math.min(...opacityFactors)
        : undefined,
    transform: transformParts.length > 0 ? transformParts.join(" ") : undefined,
  };
}

function applyLayerMotionFrame(
  element: DesignElement,
  renderTimeSeconds: number,
  frame: TimelineRenderFrame,
): TimelineRenderFrame {
  const keyframes = getLayerMotionKeyframes(element);

  if (keyframes.length > 0) {
    return applyLayerMotionKeyframes(
      element,
      renderTimeSeconds,
      frame,
      keyframes,
    );
  }

  const preset = getLayerMotionPreset(element);

  if (preset === "none") return frame;

  const start = getLayerMotionStart(element);
  const duration = getLayerMotionDuration(element);
  const progress = easeProgress(
    clamp((renderTimeSeconds - start) / duration),
    getLayerMotionEasing(element),
  );
  const nextFrame = {
    ...frame,
    transformParts: [...frame.transformParts],
  };

  applyLayerMotionPreset(preset, progress, nextFrame);

  return nextFrame;
}

function applyLayerMotionKeyframes(
  element: DesignElement,
  renderTimeSeconds: number,
  frame: TimelineRenderFrame,
  keyframes: LayerMotionKeyframe[],
): TimelineRenderFrame {
  const firstKeyframe = keyframes[0];
  const lastKeyframe = keyframes[keyframes.length - 1];

  if (renderTimeSeconds <= firstKeyframe.timeSeconds) {
    return createFrameFromKeyframe(element, frame, firstKeyframe);
  }

  if (renderTimeSeconds >= lastKeyframe.timeSeconds) {
    return createFrameFromKeyframe(element, frame, lastKeyframe);
  }

  for (let index = 1; index < keyframes.length; index += 1) {
    const previous = keyframes[index - 1];
    const next = keyframes[index];

    if (renderTimeSeconds <= next.timeSeconds) {
      const span = Math.max(0.001, next.timeSeconds - previous.timeSeconds);
      const progress = clamp((renderTimeSeconds - previous.timeSeconds) / span);

      return createFrameFromKeyframe(element, frame, {
        timeSeconds: renderTimeSeconds,
        x: interpolate(previous.x, next.x, progress),
        y: interpolate(previous.y, next.y, progress),
        width: interpolate(previous.width, next.width, progress),
        height: interpolate(previous.height, next.height, progress),
        rotation: interpolate(previous.rotation, next.rotation, progress),
        opacity: interpolate(previous.opacity, next.opacity, progress),
      });
    }
  }

  return frame;
}

function createFrameFromKeyframe(
  element: DesignElement,
  frame: TimelineRenderFrame,
  keyframe: LayerMotionKeyframe,
): TimelineRenderFrame {
  return {
    ...frame,
    x: keyframe.x,
    y: keyframe.y,
    width: Math.max(1, keyframe.width),
    height: Math.max(1, keyframe.height),
    rotation: keyframe.rotation,
    wrapperOpacity:
      element.opacity > 0 ? clamp(keyframe.opacity / element.opacity) : 1,
  };
}

function applyLayerMotionPreset(
  preset: LayerMotionPreset,
  progress: number,
  frame: TimelineRenderFrame,
) {
  if (preset === "fade") {
    frame.wrapperOpacity *= progress;
    return;
  }

  if (preset === "rise") {
    frame.wrapperOpacity *= progress;
    frame.transformParts.push(
      `translateY(${roundPixels(18 * (1 - progress))}px)`,
    );
    return;
  }

  if (preset === "slide-left") {
    frame.wrapperOpacity *= progress;
    frame.transformParts.push(
      `translateX(${roundPixels(-24 * (1 - progress))}px)`,
    );
    return;
  }

  if (preset === "slide-right") {
    frame.wrapperOpacity *= progress;
    frame.transformParts.push(
      `translateX(${roundPixels(24 * (1 - progress))}px)`,
    );
    return;
  }

  if (preset === "zoom") {
    frame.wrapperOpacity *= progress;
    frame.transformParts.push(`scale(${roundScale(0.94 + 0.06 * progress)})`);
    return;
  }

  if (preset === "pop") {
    frame.wrapperOpacity *= progress;
    frame.transformParts.push(`scale(${roundScale(getPopScale(progress))})`);
  }
}

function applyVideoTransitionFrame(input: {
  direction: "in" | "out";
  opacityFactors: number[];
  progress: number;
  transformParts: string[];
  transition: VideoClipTransition;
}) {
  if (input.transition === "fade") {
    input.opacityFactors.push(input.progress);
    return;
  }

  if (input.transition === "slide") {
    input.opacityFactors.push(input.progress);
    input.transformParts.push(
      `translateX(${roundPixels(
        input.direction === "in"
          ? 24 * (1 - input.progress)
          : -24 * (1 - input.progress),
      )}px)`,
    );
    return;
  }

  if (input.transition === "zoom") {
    input.opacityFactors.push(input.progress);
    input.transformParts.push(
      `scale(${roundScale(
        input.direction === "in"
          ? 1.08 - 0.08 * input.progress
          : 1 + 0.08 * (1 - input.progress),
      )})`,
    );
  }
}

function isMediaVisibleAtTime(
  element: Extract<DesignElement, { type: "video" | "audio" }>,
  renderTimeSeconds: number,
) {
  return (
    renderTimeSeconds >= getMediaTimelineStart(element) &&
    renderTimeSeconds < getMediaTimelineEnd(element)
  );
}

function easeProgress(progress: number, easing: string) {
  if (easing === "linear") return progress;
  if (easing === "ease-in") return progress * progress;
  if (easing === "ease-in-out") {
    return progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
  }

  return 1 - Math.pow(1 - progress, 2);
}

function getPopScale(progress: number) {
  if (progress <= 0.7) {
    return interpolate(0.88, 1.04, progress / 0.7);
  }

  return interpolate(1.04, 1, (progress - 0.7) / 0.3);
}

function interpolate(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(1, value));
}

function roundPixels(value: number) {
  return Math.round(value * 100) / 100;
}

function roundScale(value: number) {
  return Math.round(value * 1000) / 1000;
}
