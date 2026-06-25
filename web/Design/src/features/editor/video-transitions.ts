import type { VideoClipTransition } from "@/features/editor/types";

export const videoClipTransitionOptions: Array<{
  value: VideoClipTransition;
  label: string;
}> = [
  { value: "none", label: "None" },
  { value: "fade", label: "Fade" },
  { value: "slide", label: "Slide" },
  { value: "zoom", label: "Zoom" },
];

export function getVideoClipTransitionAnimation(
  transition: VideoClipTransition,
  durationSeconds: number,
) {
  if (transition === "none") return undefined;

  return `${getVideoClipTransitionAnimationName(transition)} ${Math.max(
    0.1,
    durationSeconds,
  )}s ease-out`;
}

function getVideoClipTransitionAnimationName(
  transition: Exclude<VideoClipTransition, "none">,
) {
  if (transition === "slide") return "essence-video-slide-in";
  if (transition === "zoom") return "essence-video-zoom-in";

  return "essence-video-fade-in";
}
