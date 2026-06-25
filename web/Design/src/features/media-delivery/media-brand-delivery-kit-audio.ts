import type { MediaProductionReadinessReport } from "@/features/editor/media-production-readiness";
import {
  getAudioVolumeKeyframes,
  getMediaVolume,
  isMediaTimelineElement,
} from "@/features/editor/media-timeline";
import type { AudioElement, ProjectDetail } from "@/features/editor/types";
import type {
  MediaAudioLoudnessCheck,
  MediaBrandDeliveryKitStatus,
} from "@/features/media-delivery/media-brand-delivery-kits-types";

const targetLufs = -16;

export function createMediaAudioLoudnessCheck(input: {
  project: ProjectDetail;
  readiness: MediaProductionReadinessReport;
}): MediaAudioLoudnessCheck {
  const audio = input.project.document.pages
    .flatMap((page) => page.elements)
    .filter(isMediaTimelineElement)
    .filter(isAudioElement);
  const peakVolume = roundNumber(
    Math.max(0, ...audio.flatMap((element) => getAudioVolumes(element))),
  );
  const averageVolume = audio.length
    ? audio.reduce((total, element) => total + getMediaVolume(element), 0) /
      audio.length
    : 0;
  const estimatedLufs = audio.length
    ? roundNumber(-24 + averageVolume * 12, 1)
    : null;
  const duckedAudio = audio.filter(
    (element) =>
      getMediaVolume(element) <= 0.5 ||
      getAudioVolumeKeyframes(element).some(
        (keyframe) => keyframe.volume <= 0.5,
      ),
  ).length;
  const duckingCoveragePercent = audio.length
    ? Math.round((duckedAudio / audio.length) * 100)
    : 0;
  const lufsReady =
    estimatedLufs !== null && estimatedLufs >= -18 && estimatedLufs <= -14;
  const status: MediaBrandDeliveryKitStatus = !audio.length
    ? "review"
    : lufsReady && !input.readiness.needsAudioDucking
      ? "ready"
      : "review";

  return {
    id: `audio-loudness-${input.project.id}`,
    status,
    targetLufs,
    estimatedLufs,
    peakVolume,
    duckingCoveragePercent,
    detail:
      estimatedLufs === null
        ? "No audio clips are available for loudness review."
        : `Estimated ${estimatedLufs} LUFS against ${targetLufs} LUFS target with ${duckingCoveragePercent}% ducking coverage.`,
    action:
      status === "ready"
        ? "Keep music, speech, and effects balanced for export."
        : "Adjust clip volume or add ducking before final media export.",
  };
}

function isAudioElement(element: unknown): element is AudioElement {
  return Boolean(
    element &&
    typeof element === "object" &&
    "type" in element &&
    element.type === "audio",
  );
}

function getAudioVolumes(audio: AudioElement) {
  return [
    getMediaVolume(audio),
    ...getAudioVolumeKeyframes(audio).map((keyframe) => keyframe.volume),
  ];
}

function roundNumber(value: number, digits = 2) {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}
