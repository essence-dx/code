import {
  getAudioFadeIn,
  getAudioFadeOut,
  getAudioBeatMarkers,
  getAudioBeatSyncSuggestions,
  getAudioVolumeKeyframes,
  getMediaTimelineDuration,
  getMediaTimelineEnd,
  getMediaTimelineStart,
  getMediaTrimEnd,
  getMediaTrimStart,
  getMediaVolume,
  getVideoTransitionDuration,
  getVideoTransitionIn,
  getVideoTransitionOut,
  isMediaTimelineElement,
} from "@/features/editor/media-timeline";
import { createLayerMotionExport } from "@/features/editor/layer-motion";
import { getPageDimensions } from "@/features/editor/page-dimensions";
import {
  createMediaProductionReadinessReport,
  type MediaProductionReadinessReport,
} from "@/features/editor/media-production-readiness";
import {
  createLayerMotionReadinessReport,
  type LayerMotionReadinessReport,
} from "@/features/editor/layer-motion-advanced";
import type {
  AudioElement,
  DesignDocument,
  VideoElement,
} from "@/features/editor/types";

type MediaSequenceClip = {
  id: string;
  type: "video" | "audio";
  title: string;
  track: "video" | "audio";
  source: string;
  mimeType: string;
  timelineStartSeconds: number;
  timelineDurationSeconds: number;
  timelineEndSeconds: number;
  trimStartSeconds: number;
  trimEndSeconds: number | null;
  subtitleCues: {
    id?: string;
    startSeconds: number;
    endSeconds: number;
    text: string;
  }[];
  volume: number;
  fadeInSeconds: number;
  fadeOutSeconds: number;
  volumeKeyframes: {
    timeSeconds: number;
    volume: number;
  }[];
  beatMarkers: {
    timeSeconds: number;
    label?: string;
  }[];
  beatSyncSuggestions: {
    timeSeconds: number;
    label: string;
    confidence: number;
  }[];
  license: {
    sourceProvider: string | null;
    sourceUrl: string | null;
    authorName: string | null;
    licenseName: string | null;
    licenseUrl: string | null;
  } | null;
  muted: boolean;
  loop: boolean;
  showControls: boolean;
  transition: {
    in: VideoElement["transitionIn"];
    out: VideoElement["transitionOut"];
    durationSeconds: number;
  } | null;
  objectFit: VideoElement["objectFit"] | null;
  motion: ReturnType<typeof createLayerMotionExport>;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
  };
};

type MediaSequencePage = {
  id: string;
  name: string;
  index: number;
  format: string | null;
  width: number;
  height: number;
  durationSeconds: number;
  clips: MediaSequenceClip[];
};

type MediaSequenceExport = {
  format: "essence-media-sequence-v1";
  projectName: string;
  exportedAt: string;
  canvas: {
    width: number;
    height: number;
  };
  readiness: MediaProductionReadinessReport;
  motionReadiness: LayerMotionReadinessReport;
  pages: MediaSequencePage[];
};

export function createMediaSequenceExport(input: {
  document: DesignDocument;
  projectName: string;
}) {
  const output: MediaSequenceExport = {
    format: "essence-media-sequence-v1",
    projectName: input.projectName,
    exportedAt: new Date().toISOString(),
    canvas: {
      width: input.document.width,
      height: input.document.height,
    },
    readiness: createMediaProductionReadinessReport(
      input.document.pages.flatMap((page) => page.elements),
    ),
    motionReadiness: createLayerMotionReadinessReport(
      input.document.pages.flatMap((page) => page.elements),
    ),
    pages: input.document.pages.map((page, pageIndex) => {
      const pageSize = getPageDimensions(input.document, page);
      const clips = page.elements
        .filter(isMediaTimelineElement)
        .map(createMediaSequenceClip)
        .sort(compareSequenceClips);

      return {
        id: page.id,
        name: page.name,
        index: pageIndex,
        format: page.format ?? null,
        width: pageSize.width,
        height: pageSize.height,
        durationSeconds: roundSeconds(
          Math.max(0, ...clips.map((clip) => clip.timelineEndSeconds)),
        ),
        clips,
      };
    }),
  };

  return `${JSON.stringify(output, null, 2)}\n`;
}

function createMediaSequenceClip(
  element: VideoElement | AudioElement,
): MediaSequenceClip {
  const trimEndSeconds = getMediaTrimEnd(element);

  return {
    id: element.id,
    type: element.type,
    title: element.title,
    track: element.type,
    source: element.src,
    mimeType: element.mimeType,
    timelineStartSeconds: roundSeconds(getMediaTimelineStart(element)),
    timelineDurationSeconds: roundSeconds(getMediaTimelineDuration(element)),
    timelineEndSeconds: roundSeconds(getMediaTimelineEnd(element)),
    trimStartSeconds: roundSeconds(getMediaTrimStart(element)),
    trimEndSeconds: trimEndSeconds === null ? null : roundSeconds(trimEndSeconds),
    subtitleCues:
      element.type === "video"
        ? (element.subtitleCues ?? []).map((cue) => ({
            id: cue.id,
            startSeconds: roundSeconds(cue.startSeconds),
            endSeconds: roundSeconds(cue.endSeconds),
            text: cue.text,
          }))
        : [],
    volume: roundSeconds(getMediaVolume(element)),
    fadeInSeconds: roundSeconds(getAudioFadeIn(element)),
    fadeOutSeconds: roundSeconds(getAudioFadeOut(element)),
    volumeKeyframes: getAudioVolumeKeyframes(element).map((keyframe) => ({
      timeSeconds: roundSeconds(keyframe.timeSeconds),
      volume: roundSeconds(keyframe.volume),
    })),
    beatMarkers:
      element.type === "audio"
        ? getAudioBeatMarkers(element).map((marker) => ({
            timeSeconds: roundSeconds(marker.timeSeconds),
            label: marker.label,
          }))
        : [],
    beatSyncSuggestions:
      element.type === "audio"
        ? getAudioBeatSyncSuggestions(element).map((suggestion) => ({
            timeSeconds: roundSeconds(suggestion.timeSeconds),
            label: suggestion.label,
            confidence: roundSeconds(suggestion.confidence),
          }))
        : [],
    license: element.type === "audio" ? createAudioLicenseExport(element) : null,
    muted: element.type === "video" ? element.muted : false,
    loop: element.loop,
    showControls: element.showControls,
    transition:
      element.type === "video"
        ? {
            in: getVideoTransitionIn(element),
            out: getVideoTransitionOut(element),
            durationSeconds: roundSeconds(getVideoTransitionDuration(element)),
          }
        : null,
    objectFit: element.type === "video" ? element.objectFit : null,
    motion: createLayerMotionExport(element),
    bounds: {
      x: roundPixels(element.x),
      y: roundPixels(element.y),
      width: roundPixels(element.width),
      height: roundPixels(element.height),
      rotation: roundPixels(element.rotation),
      opacity: roundSeconds(element.opacity),
    },
  };
}

function createAudioLicenseExport(element: AudioElement) {
  const hasLicenseMetadata =
    element.sourceProvider ||
    element.sourceUrl ||
    element.authorName ||
    element.licenseName ||
    element.licenseUrl;

  if (!hasLicenseMetadata) return null;

  return {
    sourceProvider: element.sourceProvider ?? null,
    sourceUrl: element.sourceUrl ?? null,
    authorName: element.authorName ?? null,
    licenseName: element.licenseName ?? null,
    licenseUrl: element.licenseUrl ?? null,
  };
}

function compareSequenceClips(
  left: MediaSequenceClip,
  right: MediaSequenceClip,
) {
  return (
    left.timelineStartSeconds - right.timelineStartSeconds ||
    trackWeight(left.track) - trackWeight(right.track) ||
    left.title.localeCompare(right.title)
  );
}

function trackWeight(track: MediaSequenceClip["track"]) {
  return track === "video" ? 0 : 1;
}

function roundSeconds(value: number) {
  return Math.round(value * 1000) / 1000;
}

function roundPixels(value: number) {
  return Math.round(value * 100) / 100;
}
