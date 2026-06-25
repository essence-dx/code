import {
  hasMediaCaptions,
  mediaCaptionCueSummary,
  mediaCaptionCues,
} from "./media-captions"
import {
  hasMediaTrim,
  mediaTrimEnd,
  mediaTrimLabel,
  mediaTrimStart,
} from "./media-trim"
import type { PresentationElement } from "./types"

export type MediaEditingReviewStatus = "attention" | "ready" | "warning"

export type MediaEditingReview = {
  captionCueCount: number
  captionSummary: string
  issues: string[]
  presenterHandoffSummary: string
  status: MediaEditingReviewStatus
  summary: string
  trimLabel: string
}

function isMediaElement(element: PresentationElement) {
  return element.type === "video" || element.type === "audio"
}

export function mediaEditingReview(
  element: PresentationElement,
): MediaEditingReview {
  const cues = mediaCaptionCues(element)
  const trimStart = mediaTrimStart(element)
  const trimEnd = mediaTrimEnd(element)
  const trimLabel = mediaTrimLabel(element)
  const hasEndTrim = trimEnd > 0
  const invalidTrimRange = hasEndTrim && trimEnd <= trimStart
  const cueBeforeTrim =
    trimStart > 0 && cues.some((cue) => cue.startSeconds < trimStart)
  const cueAfterTrim =
    hasEndTrim &&
    trimEnd > trimStart &&
    cues.some((cue) => cue.endSeconds > trimEnd)
  const hasPlainCaption = Boolean(element.mediaCaption.trim())
  const issues: string[] = []

  if (!isMediaElement(element)) {
    return {
      captionCueCount: 0,
      captionSummary: "No media captions",
      issues: ["Select an audio or video object to review media editing."],
      presenterHandoffSummary: "No media handoff",
      status: "attention",
      summary: "Media editing review needs an audio or video object.",
      trimLabel: "",
    }
  }

  if (invalidTrimRange) {
    issues.push("End trim must be after the start trim.")
  }

  if (cueBeforeTrim || cueAfterTrim) {
    issues.push("Timed captions sit outside the selected trim range.")
  }

  if (hasPlainCaption && !cues.length) {
    issues.push(
      "Plain captions export as static text; add timed cues for synced presenter playback.",
    )
  }

  if (element.mediaAutoplay) {
    issues.push("Autoplay is preserved as PowerPoint handoff metadata.")
  }

  const status: MediaEditingReviewStatus =
    invalidTrimRange || cueBeforeTrim || cueAfterTrim
      ? "attention"
      : issues.length || hasMediaTrim(element) || hasMediaCaptions(element)
        ? "warning"
        : "ready"
  const presenterParts = [
    trimLabel ? `Trim ${trimLabel}` : "Full length",
    cues.length
      ? `${cues.length} timed caption cue${cues.length === 1 ? "" : "s"}`
      : hasPlainCaption
        ? "Plain caption"
        : "No captions",
    element.mediaAutoplay ? "Autoplay requested" : "Manual playback",
  ]

  return {
    captionCueCount: cues.length,
    captionSummary: cues.length ? mediaCaptionCueSummary(element) : "No timed cues",
    issues,
    presenterHandoffSummary: presenterParts.join(" | "),
    status,
    summary:
      status === "attention"
        ? "Resolve trim and caption timing before presenter handoff."
        : status === "warning"
          ? "Media edits are saved with explicit PowerPoint handoff notes."
          : "Trim, captions, and presenter handoff are aligned.",
    trimLabel,
  }
}
