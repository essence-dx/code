import {
  hasMediaCaptions,
  mediaCaptionCues,
} from "./media-captions"
import { hasMediaTrim } from "./media-trim"
import type { Deck, PresentationElement } from "./types"

export type MediaHandoffStatus = "ready" | "warning" | "attention"

export type MediaSourceKind =
  | "missing"
  | "inline"
  | "remote"
  | "browser-local"
  | "local-reference"

export type MediaRecordingRuntime = {
  displayMedia?: boolean
  mediaRecorder?: boolean
  userMedia?: boolean
}

export type MediaHandoffReport = {
  captionCueCount: number
  currentPptxMode: "native" | "placeholder"
  detail: string
  issues: string[]
  mimeType: string
  nativeSourceCandidate: boolean
  recordingHint: string
  sourceKind: MediaSourceKind
  status: MediaHandoffStatus
  title: string
}

const videoMimeTypes = new Set([
  "video/mp4",
  "video/m4v",
  "video/quicktime",
  "video/x-m4v",
])

const audioMimeTypes = new Set([
  "audio/aac",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
])

const extensionMimeTypes: Record<string, string> = {
  aac: "audio/aac",
  m4a: "audio/mp4",
  m4v: "video/m4v",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  wav: "audio/wav",
}

function isMediaElement(element: PresentationElement) {
  return element.type === "video" || element.type === "audio"
}

function dataUrlMimeType(src: string) {
  const match = /^data:([^;,]+)[;,]/i.exec(src.trim())

  return match?.[1]?.toLowerCase() ?? ""
}

function sourceExtension(src: string) {
  const [path] = src.trim().split(/[?#]/)
  const match = /\.([a-z0-9]+)$/i.exec(path ?? "")

  return match?.[1]?.toLowerCase() ?? ""
}

export function mediaSourceKind(element: PresentationElement): MediaSourceKind {
  const src = element.src.trim()

  if (!src) return "missing"
  if (/^data:/i.test(src)) return "inline"
  if (/^https?:\/\//i.test(src)) return "remote"
  if (/^blob:/i.test(src)) return "browser-local"

  return "local-reference"
}

export function mediaMimeType(element: PresentationElement) {
  const src = element.src.trim()
  const inlineMime = dataUrlMimeType(src)
  if (inlineMime) return inlineMime

  return extensionMimeTypes[sourceExtension(src)] ?? ""
}

export function isNativeMediaSourceCandidate(element: PresentationElement) {
  if (!isMediaElement(element)) return false

  const mimeType = mediaMimeType(element)
  if (!mimeType) return false

  return element.type === "video"
    ? videoMimeTypes.has(mimeType)
    : audioMimeTypes.has(mimeType)
}

export function isInlineBase64MediaSource(element: PresentationElement) {
  return (
    mediaSourceKind(element) === "inline" &&
    /^data:[^;,]+;base64,/i.test(element.src.trim())
  )
}

export function isNativePptxMediaEmbeddable(element: PresentationElement) {
  return (
    isNativeMediaSourceCandidate(element) &&
    isInlineBase64MediaSource(element) &&
    !element.rotation
  )
}

export function mediaPptxMode(element: PresentationElement) {
  return isNativePptxMediaEmbeddable(element) ? "native" : "placeholder"
}

export function mediaRecordingReadiness(runtime: MediaRecordingRuntime) {
  const canUseRecorder = Boolean(runtime.mediaRecorder && runtime.userMedia)
  const canUseScreenCapture = Boolean(runtime.mediaRecorder && runtime.displayMedia)

  if (canUseRecorder && canUseScreenCapture) {
    return {
      detail: "Microphone, camera, and screen capture APIs are available.",
      status: "ready" as const,
      title: "Recording-ready browser",
    }
  }

  if (canUseRecorder) {
    return {
      detail: "Microphone and camera capture APIs are available; screen capture is not available.",
      status: "warning" as const,
      title: "Partial recording support",
    }
  }

  return {
    detail: "This browser does not expose the recording APIs needed for in-app capture.",
    status: "attention" as const,
    title: "Recording unavailable",
  }
}

export function mediaHandoffReport(
  element: PresentationElement,
  runtime: MediaRecordingRuntime = {},
): MediaHandoffReport {
  const sourceKind = mediaSourceKind(element)
  const mimeType = mediaMimeType(element)
  const nativeSourceCandidate = isNativeMediaSourceCandidate(element)
  const currentPptxMode = mediaPptxMode(element)
  const captionCueCount = mediaCaptionCues(element).length
  const issues: string[] = []

  if (sourceKind === "missing") {
    issues.push("Add a source before export or slideshow playback.")
  }

  if (sourceKind === "remote") {
    issues.push("Remote media needs a local copy before native PPTX embedding.")
  }

  if (sourceKind === "browser-local") {
    issues.push("Browser-local blob URLs need a saved file handoff before export.")
  }

  if (sourceKind === "local-reference") {
    issues.push("Local references need a desktop file handoff before browser PPTX export can package them.")
  }

  if (!mimeType && sourceKind !== "missing") {
    issues.push("The media type cannot be inferred from the current source.")
  } else if (mimeType && !nativeSourceCandidate) {
    issues.push(`${mimeType} is not in the current Office-compatible source list.`)
  }

  if (nativeSourceCandidate && sourceKind === "inline" && !isInlineBase64MediaSource(element)) {
    issues.push("Inline media must be base64 encoded before PPTX packaging.")
  }

  if (nativeSourceCandidate && element.rotation) {
    issues.push("Rotated media stays as a placeholder until native PPTX media rotation is supported.")
  }

  if (hasMediaTrim(element)) {
    issues.push("Trim settings are preserved as handoff metadata until native media trimming is authored.")
  }

  if (element.mediaAutoplay) {
    issues.push("Autoplay is preserved as handoff metadata for PowerPoint review.")
  }

  if (hasMediaCaptions(element)) {
    issues.push("Captions are preserved as visible/static text and timed handoff notes.")
  }

  const recording = mediaRecordingReadiness(runtime)
  const status: MediaHandoffStatus =
    sourceKind === "missing" || (mimeType && !nativeSourceCandidate)
      ? "attention"
      : issues.length
        ? "warning"
        : "ready"

  return {
    captionCueCount,
    currentPptxMode,
    detail:
      status === "ready"
        ? "This source exports as native PPTX media."
        : issues[0] ?? "Review media handoff before sharing.",
    issues,
    mimeType,
    nativeSourceCandidate,
    recordingHint: recording.detail,
    sourceKind,
    status,
    title:
      status === "ready"
        ? "Native PPTX media ready"
        : status === "warning"
          ? "Media handoff needs review"
          : "Media handoff blocked",
  }
}

export function deckMediaHandoffReport(deck: Deck) {
  const media = deck.slides.flatMap((slide) =>
    slide.elements.filter((element) => !element.hidden && isMediaElement(element)),
  )
  const reports = media.map((element) => mediaHandoffReport(element))

  return {
    attentionCount: reports.filter((report) => report.status === "attention").length,
    captionCueCount: reports.reduce(
      (total, report) => total + report.captionCueCount,
      0,
    ),
    nativeSourceCandidateCount: reports.filter(
      (report) => report.nativeSourceCandidate,
    ).length,
    nativePptxEmbeddingCount: reports.filter(
      (report) => report.currentPptxMode === "native",
    ).length,
    placeholderCount: reports.filter(
      (report) => report.currentPptxMode === "placeholder",
    ).length,
    remoteOrBlobCount: reports.filter(
      (report) =>
        report.sourceKind === "remote" || report.sourceKind === "browser-local",
    ).length,
    reports,
    totalMediaCount: media.length,
    trimHandoffCount: media.filter(hasMediaTrim).length,
    warningCount: reports.filter((report) => report.status === "warning").length,
  }
}
