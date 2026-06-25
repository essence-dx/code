"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type SyntheticEvent,
} from "react";
import { Music, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  getAudioFadeIn,
  getAudioFadeOut,
  getMediaEffectiveVolume,
  getMediaTimelineDuration,
  getMediaTimelineStart,
  getMediaTrimEnd,
  getMediaTrimStart,
  getVideoTransitionDuration,
  getVideoTransitionIn,
  type MediaTimelineElement,
} from "@/features/editor/media-timeline";
import { getVideoClipTransitionAnimation } from "@/features/editor/video-transitions";
import { cn } from "@/lib/utils";

type MediaClipPreviewProps = {
  element: MediaTimelineElement | null;
};

export function MediaClipPreview({ element }: MediaClipPreviewProps) {
  if (!element) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        Select a timeline clip to preview playback.
      </div>
    );
  }

  const Icon = element.type === "video" ? Video : Music;
  const trimStart = getMediaTrimStart(element);
  const trimEnd =
    getMediaTrimEnd(element) ?? trimStart + getMediaTimelineDuration(element);
  const timelineStart = getMediaTimelineStart(element);

  return (
    <section className="rounded-md border border-border bg-background p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="min-w-0 truncate text-xs font-medium">
            {element.title}
          </span>
        </div>
        <Badge variant="outline">
          {formatSeconds(timelineStart)} -{" "}
          {formatSeconds(timelineStart + getMediaTimelineDuration(element))}
        </Badge>
      </div>
      <MediaPlayback element={element} trimStart={trimStart} trimEnd={trimEnd} />
    </section>
  );
}

function MediaPlayback({
  element,
  trimStart,
  trimEnd,
}: {
  element: MediaTimelineElement;
  trimStart: number;
  trimEnd: number;
}) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const previewEnd = Math.max(trimStart + 0.25, trimEnd);
  const fadeInSeconds = getAudioFadeIn(element);
  const fadeOutSeconds = getAudioFadeOut(element);
  const mediaKey = useMemo(
    () =>
      [
        element.id,
        trimStart,
        previewEnd,
        fadeInSeconds,
        fadeOutSeconds,
        element.type === "video" ? element.transitionIn : "",
        element.type === "video" ? element.transitionDurationSeconds : "",
      ].join(":"),
    [element, fadeInSeconds, fadeOutSeconds, previewEnd, trimStart],
  );

  useEffect(() => {
    const media = mediaRef.current;

    if (!media) return;

    media.volume = getMediaEffectiveVolume(
      element,
      media.currentTime,
      trimStart,
      previewEnd,
    );
  }, [element, previewEnd, trimStart]);

  function applyPreviewVolume(media: HTMLMediaElement) {
    media.volume = getMediaEffectiveVolume(
      element,
      media.currentTime,
      trimStart,
      previewEnd,
    );
  }

  function cuePreview(media: HTMLMediaElement) {
    if (Number.isFinite(trimStart) && trimStart < media.duration) {
      media.currentTime = trimStart;
    }

    applyPreviewVolume(media);
  }

  function keepInsideTrimRange(media: HTMLMediaElement) {
    if (media.currentTime < trimStart || media.currentTime >= previewEnd) {
      media.currentTime = trimStart;
    }

    applyPreviewVolume(media);
  }

  function handleTimeUpdate(event: SyntheticEvent<HTMLMediaElement>) {
    const media = event.currentTarget;

    applyPreviewVolume(media);

    if (media.currentTime < previewEnd) return;

    if (element.loop) {
      media.currentTime = trimStart;
      applyPreviewVolume(media);
      void media.play().catch(() => undefined);
      return;
    }

    media.pause();
    media.currentTime = trimStart;
    applyPreviewVolume(media);
  }

  const mediaProps = {
    key: mediaKey,
    src: element.src,
    controls: true,
    preload: "metadata" as const,
    loop: false,
    onLoadedMetadata: (event: SyntheticEvent<HTMLMediaElement>) =>
      cuePreview(event.currentTarget),
    onPlay: (event: SyntheticEvent<HTMLMediaElement>) =>
      keepInsideTrimRange(event.currentTarget),
    onTimeUpdate: handleTimeUpdate,
  };

  if (element.type === "video") {
    const transitionIn = getVideoTransitionIn(element);
    const transitionDuration = getVideoTransitionDuration(element);

    return (
      <video
        {...mediaProps}
        ref={(node) => {
          mediaRef.current = node;
        }}
        className={cn(
          "aspect-video w-full rounded-md bg-zinc-950",
          element.objectFit === "contain" ? "object-contain" : "object-cover",
        )}
        style={{
          animation: getVideoClipTransitionAnimation(
            transitionIn,
            transitionDuration,
          ),
        }}
        muted={element.muted}
      />
    );
  }

  return (
    <div
      className="rounded-md border p-3"
      style={{
        background: element.surfaceColor,
        borderColor: element.borderColor,
        color: element.textColor,
      }}
    >
      <audio
        {...mediaProps}
        ref={(node) => {
          mediaRef.current = node;
        }}
        className="w-full"
      />
      <div className="mt-2 text-xs" style={{ color: element.textColor }}>
        Trim preview {formatSeconds(trimStart)} - {formatSeconds(previewEnd)}
      </div>
    </div>
  );
}


function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
