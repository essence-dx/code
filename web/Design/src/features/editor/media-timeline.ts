import type {
  AudioElement,
  DesignElement,
  MediaBeatMarker,
  MediaBeatSyncSuggestion,
  MediaVolumeKeyframe,
  VideoElement,
} from "@/features/editor/types";
import { nanoid } from "nanoid";

export type MediaTimelineElement = VideoElement | AudioElement;
export const mediaTimelineSnapSeconds = 0.5;
export const mediaTimelineDefaultFrameMs = 1_200;

export function isMediaTimelineElement(
  element: DesignElement,
): element is MediaTimelineElement {
  return element.type === "video" || element.type === "audio";
}

export function getMediaTimelineStart(element: MediaTimelineElement) {
  return Math.max(0, element.timelineStartSeconds ?? 0);
}

export function getMediaTimelineDuration(element: MediaTimelineElement) {
  return Math.max(1, element.timelineDurationSeconds ?? 10);
}

export function getMediaTrimStart(element: MediaTimelineElement) {
  return Math.max(0, element.trimStartSeconds ?? 0);
}

export function getMediaTrimEnd(element: MediaTimelineElement) {
  const trimEnd = element.trimEndSeconds;

  return typeof trimEnd === "number" && trimEnd > 0 ? trimEnd : null;
}

export function getMediaVolume(element: MediaTimelineElement) {
  return Math.max(0, Math.min(1, element.volume ?? 1));
}

export function getVideoTransitionIn(element: MediaTimelineElement) {
  return element.type === "video" ? (element.transitionIn ?? "none") : "none";
}

export function getVideoTransitionOut(element: MediaTimelineElement) {
  return element.type === "video" ? (element.transitionOut ?? "none") : "none";
}

export function getVideoTransitionDuration(element: MediaTimelineElement) {
  return element.type === "video"
    ? Math.max(0, Math.min(3, element.transitionDurationSeconds ?? 0.5))
    : 0;
}

export function getAudioVolumeKeyframes(element: MediaTimelineElement) {
  if (element.type !== "audio") return [];

  return (element.volumeKeyframes ?? [])
    .map((keyframe) => ({
      timeSeconds: snapMediaTimelineSeconds(keyframe.timeSeconds),
      volume: Math.max(0, Math.min(1, keyframe.volume)),
    }))
    .sort((first, second) => first.timeSeconds - second.timeSeconds);
}

export function getAudioBeatMarkers(element: MediaTimelineElement) {
  if (element.type !== "audio") return [];

  return (element.beatMarkers ?? [])
    .map((marker) => ({
      timeSeconds: snapMediaTimelineSeconds(marker.timeSeconds),
      label: marker.label?.trim() || undefined,
    }))
    .sort((first, second) => first.timeSeconds - second.timeSeconds);
}

export function getAudioBeatSyncSuggestions(element: MediaTimelineElement) {
  if (element.type !== "audio") return [];

  return (element.beatSyncSuggestions ?? [])
    .map((suggestion) => ({
      timeSeconds: snapMediaTimelineSeconds(suggestion.timeSeconds),
      label: suggestion.label.trim() || "Sync point",
      confidence: Math.max(0, Math.min(1, suggestion.confidence)),
    }))
    .sort((first, second) => first.timeSeconds - second.timeSeconds);
}

export function getAudioFadeIn(element: MediaTimelineElement) {
  return element.type === "audio" ? Math.max(0, element.fadeInSeconds ?? 0) : 0;
}

export function getAudioFadeOut(element: MediaTimelineElement) {
  return element.type === "audio"
    ? Math.max(0, element.fadeOutSeconds ?? 0)
    : 0;
}

export function getMediaEffectiveVolume(
  element: MediaTimelineElement,
  currentTime: number,
  trimStart: number,
  trimEnd: number,
) {
  const baseVolume = getAudioVolumeAtTime(element, currentTime, trimStart);
  const fadeInSeconds = getAudioFadeIn(element);
  const fadeOutSeconds = getAudioFadeOut(element);
  const offsetSeconds = Math.max(0, currentTime - trimStart);
  const remainingSeconds = Math.max(0, trimEnd - currentTime);
  let multiplier = 1;

  if (fadeInSeconds > 0) {
    multiplier = Math.min(multiplier, offsetSeconds / fadeInSeconds);
  }

  if (fadeOutSeconds > 0) {
    multiplier = Math.min(multiplier, remainingSeconds / fadeOutSeconds);
  }

  return Math.max(0, Math.min(1, baseVolume * multiplier));
}

export function createAudioVolumeKeyframeUpdates(
  element: MediaTimelineElement,
  playheadSeconds: number,
) {
  if (element.type !== "audio") return {};

  const clipStart = getMediaTimelineStart(element);
  const clipDuration = getMediaTimelineDuration(element);
  const keyframeTime = snapMediaTimelineSeconds(
    Math.max(0, Math.min(clipDuration, playheadSeconds - clipStart)),
  );
  const keyframes = getAudioVolumeKeyframes(element);
  const keyframe: MediaVolumeKeyframe = {
    timeSeconds: keyframeTime,
    volume: getMediaVolume(element),
  };
  const nextKeyframes = keyframes.some(
    (item) => item.timeSeconds === keyframeTime,
  )
    ? keyframes.map((item) =>
        item.timeSeconds === keyframeTime ? keyframe : item,
      )
    : [...keyframes, keyframe];

  return {
    volumeKeyframes: nextKeyframes.sort(
      (first, second) => first.timeSeconds - second.timeSeconds,
    ),
  } as Partial<DesignElement>;
}

export function createAudioBeatMarkerUpdates(
  element: MediaTimelineElement,
  playheadSeconds: number,
) {
  if (element.type !== "audio") return {};

  const clipStart = getMediaTimelineStart(element);
  const clipDuration = getMediaTimelineDuration(element);
  const markerTime = snapMediaTimelineSeconds(
    Math.max(0, Math.min(clipDuration, playheadSeconds - clipStart)),
  );
  const markers = getAudioBeatMarkers(element);
  const marker: MediaBeatMarker = {
    timeSeconds: markerTime,
    label: `Beat ${markers.length + 1}`,
  };
  const nextMarkers = markers.some((item) => item.timeSeconds === markerTime)
    ? markers.map((item) => (item.timeSeconds === markerTime ? marker : item))
    : [...markers, marker];

  return {
    beatMarkers: nextMarkers.sort(
      (first, second) => first.timeSeconds - second.timeSeconds,
    ),
  } as Partial<DesignElement>;
}

export function createAudioBeatDetectionUpdates(args: {
  beatMarkers: MediaBeatMarker[];
  beatSyncSuggestions: MediaBeatSyncSuggestion[];
}) {
  return {
    beatMarkers: args.beatMarkers.sort(
      (first, second) => first.timeSeconds - second.timeSeconds,
    ),
    beatSyncSuggestions: args.beatSyncSuggestions.sort(
      (first, second) => first.timeSeconds - second.timeSeconds,
    ),
  } as Partial<DesignElement>;
}

function getAudioVolumeAtTime(
  element: MediaTimelineElement,
  currentTime: number,
  trimStart: number,
) {
  const keyframes = getAudioVolumeKeyframes(element);

  if (!keyframes.length) return getMediaVolume(element);

  const playbackTime = Math.max(0, currentTime - trimStart);
  const firstKeyframe = keyframes[0];
  const lastKeyframe = keyframes[keyframes.length - 1];

  if (playbackTime <= firstKeyframe.timeSeconds) {
    return firstKeyframe.volume;
  }

  if (playbackTime >= lastKeyframe.timeSeconds) {
    return lastKeyframe.volume;
  }

  for (let index = 1; index < keyframes.length; index += 1) {
    const previous = keyframes[index - 1];
    const next = keyframes[index];

    if (playbackTime <= next.timeSeconds) {
      const span = Math.max(0.001, next.timeSeconds - previous.timeSeconds);
      const progress = (playbackTime - previous.timeSeconds) / span;

      return previous.volume + (next.volume - previous.volume) * progress;
    }
  }

  return getMediaVolume(element);
}

export function getMediaTimelineEnd(element: MediaTimelineElement) {
  return getMediaTimelineStart(element) + getMediaTimelineDuration(element);
}

export function compareMediaTimelineElements(
  first: MediaTimelineElement,
  second: MediaTimelineElement,
) {
  return (
    getMediaTimelineStart(first) - getMediaTimelineStart(second) ||
    first.title.localeCompare(second.title)
  );
}

export function snapMediaTimelineSeconds(
  value: number,
  increment = mediaTimelineSnapSeconds,
) {
  if (!Number.isFinite(value)) return 0;
  if (increment <= 0) return Math.max(0, value);

  return Math.max(0, Math.round(value / increment) * increment);
}

export function clampMediaTimelineDuration(value: number) {
  return Math.max(1, snapMediaTimelineSeconds(value));
}

export function getMediaTimelineBounds(elements: MediaTimelineElement[]) {
  return {
    start: Math.min(
      0,
      ...elements.map((element) => getMediaTimelineStart(element)),
    ),
    end: Math.max(
      30,
      ...elements.map((element) => getMediaTimelineEnd(element)),
    ),
  };
}

export function getMediaTimelineExportDurationMs(
  elements: DesignElement[],
  fallbackMs = mediaTimelineDefaultFrameMs,
) {
  const mediaElements = elements.filter(isMediaTimelineElement);
  const timelineEndMs = Math.max(
    0,
    ...mediaElements.map((element) => getMediaTimelineEnd(element) * 1_000),
  );

  return Math.max(fallbackMs, Math.round(timelineEndMs));
}

export function createMediaTimelineReorderUpdates(
  elements: MediaTimelineElement[],
  elementId: string,
  direction: "earlier" | "later",
) {
  const orderedElements = [...elements].sort(compareMediaTimelineElements);
  const currentIndex = orderedElements.findIndex(
    (element) => element.id === elementId,
  );
  const targetIndex =
    direction === "earlier" ? currentIndex - 1 : currentIndex + 1;

  if (
    currentIndex < 0 ||
    targetIndex < 0 ||
    targetIndex >= orderedElements.length
  ) {
    return [];
  }

  const [element] = orderedElements.splice(currentIndex, 1);
  orderedElements.splice(targetIndex, 0, element);

  return createMediaTimelinePackUpdates(orderedElements);
}

function createMediaTimelinePackUpdates(elements: MediaTimelineElement[]) {
  if (!elements.length) return [];

  let nextStart = snapMediaTimelineSeconds(
    Math.min(...elements.map((element) => getMediaTimelineStart(element))),
  );

  return elements.map((element) => {
    const timelineStartSeconds = snapMediaTimelineSeconds(nextStart);

    nextStart += getMediaTimelineDuration(element);

    return {
      elementId: element.id,
      updates: {
        timelineStartSeconds,
      } as Partial<DesignElement>,
    };
  });
}

export function splitMediaTimelineElement(
  element: MediaTimelineElement,
  splitAtSeconds: number,
): [MediaTimelineElement, MediaTimelineElement] | null {
  const start = getMediaTimelineStart(element);
  const duration = getMediaTimelineDuration(element);
  const end = start + duration;
  const splitAt = snapMediaTimelineSeconds(splitAtSeconds);
  const beforeDuration = splitAt - start;
  const afterDuration = end - splitAt;

  if (beforeDuration < 1 || afterDuration < 1) return null;

  const trimStart = getMediaTrimStart(element);
  const trimEnd = getMediaTrimEnd(element);
  const before = {
    ...element,
    timelineDurationSeconds: beforeDuration,
    trimEndSeconds: trimEnd ?? trimStart + beforeDuration,
  } as MediaTimelineElement;
  const after = {
    ...element,
    id: nanoid(),
    title: `${element.title} split`,
    timelineStartSeconds: splitAt,
    timelineDurationSeconds: afterDuration,
    trimStartSeconds: trimStart + beforeDuration,
    trimEndSeconds: trimEnd,
    x: element.x + 24,
    y: element.y + 24,
  } as MediaTimelineElement;

  return [before, after];
}

export function getMediaSourceWithTrim(element: MediaTimelineElement) {
  const trimStart = getMediaTrimStart(element);
  const trimEnd = getMediaTrimEnd(element);

  if (trimStart <= 0 && trimEnd === null) return element.src;

  const delimiter = element.src.includes("#") ? "&" : "#";
  const endValue = trimEnd === null ? "" : trimEnd;

  return `${element.src}${delimiter}t=${trimStart},${endValue}`;
}
