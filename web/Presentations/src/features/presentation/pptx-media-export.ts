import { visibleElements } from "./element-visibility"
import { hasMediaCaptions, mediaCaptionCues } from "./media-captions"
import {
  hasMediaTrim,
  mediaTrimLabel,
} from "./media-trim"
import {
  isNativeMediaSourceCandidate,
  isNativePptxMediaEmbeddable,
  mediaMimeType,
  mediaPptxMode,
  mediaSourceKind,
  type MediaSourceKind,
} from "./media-handoff"
import type { Deck, PresentationElement, Slide } from "./types"

type MediaElementType = "audio" | "video"

export type PptxMediaExportOptions = {
  resolvedMedia?: Record<string, string>
}

export type PptxMediaExportDecision = {
  data?: string
  extn: string
  mediaType: MediaElementType
  mimeType: string
  mode: "native" | "placeholder"
  reason: string
  sourceKind: MediaSourceKind
}

export type PptxMediaExportCue = {
  autoplay: boolean
  captionCueCount: number
  elementId: string
  label: string
  mimeType: string
  mode: "native" | "placeholder"
  reason: string
  sourceKind: MediaSourceKind
  trimLabel: string
}

const mediaMimeExtensions: Record<string, string> = {
  "audio/aac": "aac",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "video/m4v": "m4v",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
}

function isMediaElement(element: PresentationElement) {
  return element.type === "audio" || element.type === "video"
}

function mediaElementType(element: PresentationElement): MediaElementType {
  return element.type === "audio" ? "audio" : "video"
}

function mediaLabel(element: PresentationElement, index: number) {
  return (
    element.alt.trim() ||
    element.content.trim() ||
    `${mediaElementType(element)} ${index + 1}`
  )
}

export function pptxMediaExtension(element: PresentationElement) {
  const mimeType = mediaMimeType(element)

  return mediaMimeExtensions[mimeType] ?? ""
}

function resolvedElementForExport(
  element: PresentationElement,
  options?: PptxMediaExportOptions,
) {
  const resolvedSource = options?.resolvedMedia?.[element.id]?.trim() ?? ""
  if (!resolvedSource) return null

  const resolvedElement = {
    ...element,
    src: resolvedSource,
  }

  return isNativePptxMediaEmbeddable(resolvedElement) ? resolvedElement : null
}

function placeholderReason(
  element: PresentationElement,
  options?: PptxMediaExportOptions,
) {
  const sourceKind = mediaSourceKind(element)
  const mimeType = mediaMimeType(element)
  const resolvedSource = options?.resolvedMedia?.[element.id]?.trim() ?? ""

  if (resolvedSource) {
    return "Resolved media handoff did not provide a supported inline base64 Office media source."
  }

  if (sourceKind === "missing") return "No media source is attached."
  if (element.rotation) return "Rotated media is preserved as a PPTX fallback."
  if (!mimeType) return "The media type cannot be inferred from the source."
  if (!isNativeMediaSourceCandidate(element)) {
    return `${mimeType} is not in the supported Office media list.`
  }
  if (sourceKind === "remote") {
    return "Remote media needs a local or inline copy before PPTX packaging."
  }
  if (sourceKind === "browser-local") {
    return "Browser blob media needs a saved file handoff before PPTX packaging."
  }
  if (sourceKind === "local-reference") {
    return "Local references need a desktop file handoff before PPTX packaging."
  }

  return "Inline media must be base64 encoded before PPTX packaging."
}

export function pptxMediaExportDecision(
  element: PresentationElement,
  options?: PptxMediaExportOptions,
): PptxMediaExportDecision {
  const sourceKind = mediaSourceKind(element)
  const mediaType = mediaElementType(element)
  const resolvedElement = resolvedElementForExport(element, options)

  if (resolvedElement) {
    const mimeType = mediaMimeType(resolvedElement)
    const extn = pptxMediaExtension(resolvedElement)

    if (extn) {
      return {
        data: resolvedElement.src.trim(),
        extn,
        mediaType,
        mimeType,
        mode: "native",
        reason: "Resolved desktop/local media is packaged as native PPTX media.",
        sourceKind,
      }
    }
  }

  const mimeType = mediaMimeType(element)
  const extn = pptxMediaExtension(element)

  if (isNativePptxMediaEmbeddable(element) && extn) {
    return {
      data: element.src.trim(),
      extn,
      mediaType,
      mimeType,
      mode: "native",
      reason: "Supported inline media is packaged as native PPTX media.",
      sourceKind,
    }
  }

  return {
    extn,
    mediaType,
    mimeType,
    mode: "placeholder",
    reason: placeholderReason(element, options),
    sourceKind,
  }
}

export function slidePptxMediaExportHandoffCues(
  slide: Slide,
  options?: PptxMediaExportOptions,
) {
  const mediaElements = visibleElements(slide).filter(isMediaElement)

  return mediaElements
    .map((element, index): PptxMediaExportCue => {
      const decision = pptxMediaExportDecision(element, options)

      return {
        autoplay: element.mediaAutoplay,
        captionCueCount: mediaCaptionCues(element).length,
        elementId: element.id,
        label: mediaLabel(element, index),
        mimeType: decision.mimeType,
        mode: decision.mode,
        reason: decision.reason,
        sourceKind: decision.sourceKind,
        trimLabel: mediaTrimLabel(element),
      }
    })
    .filter((cue, index) => {
      const element = mediaElements[index]

      return (
        cue.mode === "placeholder" ||
        cue.autoplay ||
        cue.captionCueCount > 0 ||
        Boolean(cue.trimLabel) ||
        Boolean(element && hasMediaCaptions(element)) ||
        Boolean(element && hasMediaTrim(element))
      )
    })
}

export function serializePptxMediaExportHandoffNotes(
  slide: Slide,
  options?: PptxMediaExportOptions,
) {
  const cues = slidePptxMediaExportHandoffCues(slide, options)

  if (!cues.length) return ""

  return [
    "PPTX media export",
    ...cues.map((cue) => {
      const details = [
        `${cue.label}: ${cue.mode}`,
        cue.mimeType || "unknown media type",
        cue.sourceKind,
        cue.trimLabel,
        cue.autoplay ? "autoplay handoff" : "",
        cue.captionCueCount ? `${cue.captionCueCount} caption cues` : "",
        cue.reason,
      ].filter(Boolean)

      return `- ${details.join("; ")}.`
    }),
  ].join("\n")
}

export function deckPptxMediaExportReport(
  deck: Deck,
  options?: PptxMediaExportOptions,
) {
  const mediaDecisions = deck.slides.flatMap((slide) =>
    visibleElements(slide)
      .filter(isMediaElement)
      .map((element) => ({
        decision: pptxMediaExportDecision(element, options),
        element,
      })),
  )
  const decisions = mediaDecisions.map((entry) => entry.decision)

  return {
    localReferenceCount: decisions.filter(
      (decision) => decision.sourceKind === "local-reference",
    ).length,
    nativeMediaCount: decisions.filter((decision) => decision.mode === "native").length,
    placeholderCount: decisions.filter((decision) => decision.mode === "placeholder").length,
    remoteOrBlobCount: decisions.filter(
      (decision) =>
        decision.sourceKind === "remote" || decision.sourceKind === "browser-local",
    ).length,
    resolvedMediaCount: mediaDecisions.filter(
      ({ decision, element }) =>
        decision.mode === "native" &&
        Boolean(options?.resolvedMedia?.[element.id]?.trim()),
    ).length,
    totalMediaCount: decisions.length,
    unsupportedCount: decisions.filter(
      (decision) =>
        decision.mimeType && !mediaMimeExtensions[decision.mimeType],
    ).length,
  }
}

export function isNativePptxMediaElement(element: PresentationElement) {
  return mediaPptxMode(element) === "native"
}
