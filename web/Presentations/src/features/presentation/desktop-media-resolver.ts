import { visibleElements } from "./element-visibility"
import {
  isNativeMediaSourceCandidate,
  mediaMimeType,
  mediaSourceKind,
} from "./media-handoff"
import type { PptxMediaExportOptions } from "./pptx-media-export"
import type { Deck, PresentationElement } from "./types"

export type DesktopMediaResolverStatus =
  | "needs-resolver"
  | "not-needed"
  | "unsupported"

export type DesktopMediaResolverItem = {
  elementId: string
  label: string
  mimeType: string
  reason: string
  slideId: string
  slideTitle: string
  source: string
  status: DesktopMediaResolverStatus
}

export type DesktopMediaResolverPlan = {
  items: DesktopMediaResolverItem[]
  needsResolverCount: number
  notNeededCount: number
  unsupportedCount: number
}

export type ResolvedDesktopMediaSource = {
  dataUrl: string
  elementId: string
}

function isMediaElement(element: PresentationElement) {
  return element.type === "audio" || element.type === "video"
}

function mediaLabel(element: PresentationElement, fallback: string) {
  return element.alt.trim() || element.content.trim() || fallback
}

function resolverStatus(element: PresentationElement): DesktopMediaResolverStatus {
  const sourceKind = mediaSourceKind(element)

  if (
    sourceKind !== "browser-local" &&
    sourceKind !== "local-reference"
  ) {
    return "not-needed"
  }

  if (element.rotation || !isNativeMediaSourceCandidate(element)) {
    return "unsupported"
  }

  return "needs-resolver"
}

function resolverReason(
  element: PresentationElement,
  status: DesktopMediaResolverStatus,
) {
  const sourceKind = mediaSourceKind(element)

  if (status === "needs-resolver" && sourceKind === "browser-local") {
    return "Browser blob media needs a saved file or desktop-read data URL before PPTX packaging."
  }

  if (status === "needs-resolver") {
    return "Local media can be packaged after the desktop shell resolves the file into an inline data URL."
  }

  if (status === "unsupported" && element.rotation) {
    return "Rotated media still exports as a compatibility placeholder."
  }

  if (status === "unsupported") {
    return "The local media type is not in the supported Office media list."
  }

  return "No desktop media resolver handoff is required for this source."
}

export function desktopMediaResolverPlan(deck: Deck): DesktopMediaResolverPlan {
  const items = deck.slides.flatMap((slide, slideIndex) =>
    visibleElements(slide)
      .filter(isMediaElement)
      .map((element, elementIndex): DesktopMediaResolverItem => {
        const status = resolverStatus(element)

        return {
          elementId: element.id,
          label: mediaLabel(element, `Media ${elementIndex + 1}`),
          mimeType: mediaMimeType(element),
          reason: resolverReason(element, status),
          slideId: slide.id,
          slideTitle: slide.title.trim() || `Slide ${slideIndex + 1}`,
          source: element.src.trim(),
          status,
        }
      }),
  )

  return {
    items,
    needsResolverCount: items.filter((item) => item.status === "needs-resolver")
      .length,
    notNeededCount: items.filter((item) => item.status === "not-needed").length,
    unsupportedCount: items.filter((item) => item.status === "unsupported").length,
  }
}

export function pptxMediaExportOptionsFromResolvedDesktopMedia(
  sources: ResolvedDesktopMediaSource[],
): PptxMediaExportOptions {
  return {
    resolvedMedia: Object.fromEntries(
      sources
        .map((source) => [source.elementId, source.dataUrl.trim()] as const)
        .filter(([, dataUrl]) => dataUrl.length > 0),
    ),
  }
}
