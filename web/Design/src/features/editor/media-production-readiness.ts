import {
  getAudioVolumeKeyframes,
  getMediaTimelineDuration,
  getMediaTimelineEnd,
  getMediaTimelineStart,
  getMediaVolume,
  getVideoTransitionDuration,
  getVideoTransitionIn,
  getVideoTransitionOut,
  isMediaTimelineElement,
  snapMediaTimelineSeconds,
  type MediaTimelineElement,
} from "@/features/editor/media-timeline";
import type {
  AudioElement,
  DesignElement,
  MediaVolumeKeyframe,
  VideoElement,
} from "@/features/editor/types";

export type MediaProductionReadinessStatus = "ready" | "review" | "blocked";

export type MediaProductionReadinessCheck = {
  id:
    | "clips"
    | "video"
    | "captions"
    | "transitions"
    | "audio-ducking"
    | "timeline";
  label: string;
  status: MediaProductionReadinessStatus;
  detail: string;
  action: string;
};

export type MediaProductionReadinessReport = {
  status: MediaProductionReadinessStatus;
  score: number;
  checks: MediaProductionReadinessCheck[];
  needsAudioDucking: boolean;
  counts: {
    clips: number;
    videos: number;
    audio: number;
    captions: number;
    transitionedVideos: number;
    duckedAudio: number;
    timelineDurationSeconds: number;
  };
};

export type MediaProductionElementUpdate = {
  elementId: string;
  updates: Partial<DesignElement>;
};

const audioDuckingThreshold = 0.5;
const minimumOverlapSeconds = 0.25;
const duckingRampSeconds = 0.5;

export function createMediaProductionReadinessReport(
  elements: DesignElement[],
): MediaProductionReadinessReport {
  const mediaElements = elements.filter(isMediaTimelineElement);
  const videos = mediaElements.filter(isVideoElement);
  const audio = mediaElements.filter(isAudioElement);
  const captionedVideos = videos.filter(hasUsableCaptions);
  const transitionedVideos = videos.filter(hasUsableTransitions);
  const duckedAudio = audio.filter((element) =>
    hasAudioDuckingForVideoOverlap(element, videos),
  );
  const needsAudioDucking = audio.some(
    (element) =>
      getOverlappingVideoRanges(element, videos).length > 0 &&
      !hasAudioDuckingForVideoOverlap(element, videos),
  );
  const timelineIssue = getTimelineIssue(mediaElements, videos);
  const timelineDurationSeconds = Math.max(
    0,
    ...mediaElements.map((element) => getMediaTimelineEnd(element)),
  );
  const checks: MediaProductionReadinessCheck[] = [
    {
      id: "clips",
      label: "Timeline clips",
      status: mediaElements.length ? "ready" : "blocked",
      detail: mediaElements.length
        ? `${mediaElements.length} media clips arranged on this page`
        : "No video or audio clips are on this page",
      action: mediaElements.length
        ? "Keep timing clips against the page story"
        : "Add at least one video or audio clip",
    },
    {
      id: "video",
      label: "Video track",
      status: videos.length ? "ready" : "blocked",
      detail: videos.length
        ? `${videos.length} video clips are ready for review`
        : "Production export needs at least one video clip",
      action: videos.length
        ? "Review framing and trimming before export"
        : "Add a video clip to the timeline",
    },
    {
      id: "captions",
      label: "Captions",
      status:
        videos.length === 0 || captionedVideos.length === videos.length
          ? "ready"
          : "review",
      detail: videos.length
        ? `${captionedVideos.length} of ${videos.length} video clips include captions`
        : "Captions are not required until video is added",
      action:
        videos.length === 0 || captionedVideos.length === videos.length
          ? "Keep captions aligned with spoken content"
          : "Add captions for uncaptained video clips",
    },
    {
      id: "transitions",
      label: "Scene transitions",
      status:
        videos.length === 0 || transitionedVideos.length === videos.length
          ? "ready"
          : "review",
      detail: videos.length
        ? `${transitionedVideos.length} of ${videos.length} video clips have in and out transitions`
        : "Transitions are not required until video is added",
      action:
        videos.length === 0 || transitionedVideos.length === videos.length
          ? "Keep transitions subtle and consistent"
          : "Set transition in, transition out, and duration",
    },
    {
      id: "audio-ducking",
      label: "Audio ducking",
      status: needsAudioDucking ? "review" : "ready",
      detail: needsAudioDucking
        ? "Some audio overlaps video without volume ducking"
        : audio.length
          ? `${duckedAudio.length} audio clips are ducked or already low-volume when overlapping video`
          : "No audio clips require ducking",
      action: needsAudioDucking
        ? "Apply ducking so speech and captions remain readable"
        : "Keep voice, music, and effects balanced",
    },
    {
      id: "timeline",
      label: "Timeline structure",
      status: timelineIssue.status,
      detail: timelineIssue.detail,
      action: timelineIssue.action,
    },
  ];

  return {
    status: getOverallStatus(checks),
    score: getReadinessScore(checks),
    checks,
    needsAudioDucking,
    counts: {
      clips: mediaElements.length,
      videos: videos.length,
      audio: audio.length,
      captions: captionedVideos.length,
      transitionedVideos: transitionedVideos.length,
      duckedAudio: duckedAudio.length,
      timelineDurationSeconds: roundSeconds(timelineDurationSeconds),
    },
  };
}

export function createAudioDuckingUpdates(
  elements: DesignElement[],
  duckedVolume = 0.35,
): MediaProductionElementUpdate[] {
  const mediaElements = elements.filter(isMediaTimelineElement);
  const videos = mediaElements.filter(isVideoElement);

  return mediaElements
    .filter(isAudioElement)
    .map((audio) => createAudioDuckingUpdate(audio, videos, duckedVolume))
    .filter((update): update is MediaProductionElementUpdate =>
      Boolean(update),
    );
}

function createAudioDuckingUpdate(
  audio: AudioElement,
  videos: VideoElement[],
  duckedVolume: number,
): MediaProductionElementUpdate | null {
  const overlappingRanges = getOverlappingVideoRanges(audio, videos);

  if (!overlappingRanges.length) return null;
  if (hasAudioDuckingForVideoOverlap(audio, videos)) return null;

  const audioStart = getMediaTimelineStart(audio);
  const audioDuration = getMediaTimelineDuration(audio);
  const baseVolume = getMediaVolume(audio);
  const generatedKeyframes = overlappingRanges.flatMap((range) => {
    const overlapStart = Math.max(0, range.start - audioStart);
    const overlapEnd = Math.min(audioDuration, range.end - audioStart);

    if (overlapEnd - overlapStart <= minimumOverlapSeconds) return [];

    return [
      {
        timeSeconds: Math.max(0, overlapStart - duckingRampSeconds),
        volume: baseVolume,
      },
      {
        timeSeconds: overlapStart,
        volume: duckedVolume,
      },
      {
        timeSeconds: overlapEnd,
        volume: duckedVolume,
      },
      {
        timeSeconds: Math.min(audioDuration, overlapEnd + duckingRampSeconds),
        volume: baseVolume,
      },
    ];
  });

  if (!generatedKeyframes.length) return null;

  return {
    elementId: audio.id,
    updates: {
      volumeKeyframes: mergeVolumeKeyframes(
        getAudioVolumeKeyframes(audio),
        generatedKeyframes,
      ),
    } as Partial<DesignElement>,
  };
}

function hasAudioDuckingForVideoOverlap(
  audio: AudioElement,
  videos: VideoElement[],
) {
  if (!getOverlappingVideoRanges(audio, videos).length) return true;
  if (getMediaVolume(audio) <= audioDuckingThreshold) return true;

  return getAudioVolumeKeyframes(audio).length > 0;
}

function hasUsableCaptions(video: VideoElement) {
  return video.subtitleCues.some(
    (cue) =>
      cue.text.trim().length > 0 &&
      Number.isFinite(cue.startSeconds) &&
      Number.isFinite(cue.endSeconds) &&
      cue.endSeconds > cue.startSeconds,
  );
}

function hasUsableTransitions(video: VideoElement) {
  return (
    getVideoTransitionIn(video) !== "none" &&
    getVideoTransitionOut(video) !== "none" &&
    getVideoTransitionDuration(video) > 0
  );
}

function getTimelineIssue(
  mediaElements: MediaTimelineElement[],
  videos: VideoElement[],
): Pick<MediaProductionReadinessCheck, "status" | "detail" | "action"> {
  if (!mediaElements.length) {
    return {
      status: "blocked",
      detail: "No clips are available to export",
      action: "Add media clips before exporting a video sequence",
    };
  }

  if (mediaElements.some(hasInvalidTimelineValues)) {
    return {
      status: "blocked",
      detail: "One or more clips has invalid timing metadata",
      action: "Reset invalid start, duration, and trim values",
    };
  }

  if (hasOverlappingVideos(videos)) {
    return {
      status: "review",
      detail: "Some video clips overlap on the video track",
      action: "Trim, split, or reorder video clips before export",
    };
  }

  return {
    status: "ready",
    detail: "Timeline timing is valid for sequence export",
    action: "Run final export when the design review is complete",
  };
}

function hasInvalidTimelineValues(element: MediaTimelineElement) {
  return (
    !Number.isFinite(element.timelineStartSeconds) ||
    !Number.isFinite(element.timelineDurationSeconds) ||
    element.timelineStartSeconds < 0 ||
    element.timelineDurationSeconds <= 0 ||
    (element.trimEndSeconds !== null &&
      element.trimEndSeconds <= element.trimStartSeconds)
  );
}

function hasOverlappingVideos(videos: VideoElement[]) {
  const ordered = videos
    .map((video) => ({
      start: getMediaTimelineStart(video),
      end: getMediaTimelineEnd(video),
    }))
    .sort((first, second) => first.start - second.start);

  return ordered.some((range, index) => {
    if (index === 0) return false;

    return range.start < ordered[index - 1].end - minimumOverlapSeconds;
  });
}

function getOverlappingVideoRanges(audio: AudioElement, videos: VideoElement[]) {
  const audioStart = getMediaTimelineStart(audio);
  const audioEnd = getMediaTimelineEnd(audio);

  return videos
    .map((video) => {
      const start = Math.max(audioStart, getMediaTimelineStart(video));
      const end = Math.min(audioEnd, getMediaTimelineEnd(video));

      return { start, end };
    })
    .filter((range) => range.end - range.start > minimumOverlapSeconds);
}

function mergeVolumeKeyframes(
  existing: MediaVolumeKeyframe[],
  generated: MediaVolumeKeyframe[],
) {
  const keyframes = new Map<number, MediaVolumeKeyframe>();

  for (const keyframe of [...existing, ...generated]) {
    const timeSeconds = snapMediaTimelineSeconds(keyframe.timeSeconds, 0.1);

    keyframes.set(timeSeconds, {
      timeSeconds,
      volume: Math.max(0, Math.min(1, keyframe.volume)),
    });
  }

  return [...keyframes.values()].sort(
    (first, second) => first.timeSeconds - second.timeSeconds,
  );
}

function isVideoElement(element: MediaTimelineElement): element is VideoElement {
  return element.type === "video";
}

function isAudioElement(element: MediaTimelineElement): element is AudioElement {
  return element.type === "audio";
}

function getOverallStatus(checks: MediaProductionReadinessCheck[]) {
  if (checks.some((check) => check.status === "blocked")) return "blocked";
  if (checks.some((check) => check.status === "review")) return "review";

  return "ready";
}

function getReadinessScore(checks: MediaProductionReadinessCheck[]) {
  const points = checks.reduce((total, check) => {
    if (check.status === "ready") return total + 2;
    if (check.status === "review") return total + 1;

    return total;
  }, 0);

  return Math.round((points / (checks.length * 2)) * 100);
}

function roundSeconds(value: number) {
  return Math.round(value * 1000) / 1000;
}
