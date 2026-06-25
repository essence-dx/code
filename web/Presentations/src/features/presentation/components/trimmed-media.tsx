"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import {
  mediaCaptionCues,
  serializeMediaCaptionVtt,
} from "../media-captions"
import {
  mediaTrimEnd,
  mediaTrimStart,
} from "../media-trim"
import type { PresentationElement } from "../types"

type TrimmedMediaProps = {
  element: PresentationElement
  mediaControls: boolean
  autoPlayMedia: boolean
}

function useCaptionTrackUrl(element: PresentationElement) {
  const vtt = useMemo(
    () => serializeMediaCaptionVtt(mediaCaptionCues(element)),
    [element.mediaCaptionCues],
  )
  const [url, setUrl] = useState("")

  useEffect(() => {
    if (!vtt) {
      setUrl("")
      return
    }

    const nextUrl = URL.createObjectURL(
      new Blob([vtt], { type: "text/vtt;charset=utf-8" }),
    )

    setUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [vtt])

  return url
}

export function TrimmedVideo({
  element,
  mediaControls,
  autoPlayMedia,
}: TrimmedMediaProps) {
  const mediaRef = useRef<HTMLVideoElement | null>(null)
  const start = mediaTrimStart(element)
  const end = mediaTrimEnd(element)
  const captionTrackUrl = useCaptionTrackUrl(element)

  function syncStart(media: HTMLMediaElement) {
    if (start > 0 && media.currentTime < start) {
      media.currentTime = start
    }
    if (end > start && media.currentTime >= end) {
      media.currentTime = start
    }
  }

  function syncEnd(media: HTMLMediaElement) {
    if (end <= start || media.currentTime < end) return

    media.pause()
    media.currentTime = start
  }

  return (
    <video
      ref={mediaRef}
      autoPlay={autoPlayMedia && element.mediaAutoplay}
      className="size-full"
      controls={mediaControls}
      muted={!mediaControls}
      playsInline
      preload="metadata"
      src={element.src}
      style={{
        objectFit: element.fit === "fill" ? "fill" : element.fit,
      }}
      title={element.alt || "Slide video"}
      onLoadedMetadata={(event) => syncStart(event.currentTarget)}
      onPlay={(event) => syncStart(event.currentTarget)}
      onTimeUpdate={(event) => syncEnd(event.currentTarget)}
    >
      {captionTrackUrl ? (
        <track
          default
          kind="captions"
          label="Captions"
          src={captionTrackUrl}
          srcLang="en"
        />
      ) : null}
    </video>
  )
}

export function TrimmedAudio({
  element,
  mediaControls,
  autoPlayMedia,
}: TrimmedMediaProps) {
  const mediaRef = useRef<HTMLAudioElement | null>(null)
  const start = mediaTrimStart(element)
  const end = mediaTrimEnd(element)
  const captionTrackUrl = useCaptionTrackUrl(element)

  function syncStart(media: HTMLMediaElement) {
    if (start > 0 && media.currentTime < start) {
      media.currentTime = start
    }
    if (end > start && media.currentTime >= end) {
      media.currentTime = start
    }
  }

  function syncEnd(media: HTMLMediaElement) {
    if (end <= start || media.currentTime < end) return

    media.pause()
    media.currentTime = start
  }

  return (
    <audio
      ref={mediaRef}
      autoPlay={autoPlayMedia && element.mediaAutoplay}
      className="w-full"
      controls={mediaControls}
      preload="metadata"
      src={element.src}
      title={element.alt || "Slide audio"}
      onLoadedMetadata={(event) => syncStart(event.currentTarget)}
      onPlay={(event) => syncStart(event.currentTarget)}
      onTimeUpdate={(event) => syncEnd(event.currentTarget)}
    >
      {captionTrackUrl ? (
        <track
          default
          kind="captions"
          label="Captions"
          src={captionTrackUrl}
          srcLang="en"
        />
      ) : null}
    </audio>
  )
}
