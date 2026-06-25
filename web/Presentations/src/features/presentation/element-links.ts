import type { PresentationElement, Slide } from "./types"

const allowedLinkProtocols = new Set(["http:", "https:", "mailto:", "tel:"])
const schemePattern = /^[a-z][a-z\d+.-]*:/i

export function normalizeElementLinkUrl(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) return ""

  const candidate = schemePattern.test(trimmed) ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(candidate)
    return allowedLinkProtocols.has(url.protocol) ? url.href : ""
  } catch {
    return ""
  }
}

export function elementLinkUrl(element: Pick<PresentationElement, "linkUrl">) {
  return normalizeElementLinkUrl(element.linkUrl)
}

export function elementSlideTarget(
  element: Pick<PresentationElement, "linkSlideId">,
  slides: Pick<Slide, "id">[],
) {
  const slideId = element.linkSlideId?.trim() ?? ""
  if (!slideId) return ""

  return slides.some((slide) => slide.id === slideId) ? slideId : ""
}

export type ElementSlideTargetDiagnostic = {
  detail: string
  label: string
  slideNumber: number | null
  status: "empty" | "missing" | "ready" | "self"
  targetSlideId: string
}

export function elementSlideTargetDiagnostic(
  element: Pick<PresentationElement, "linkSlideId">,
  slides: Pick<Slide, "id" | "title">[],
  currentSlideId = "",
): ElementSlideTargetDiagnostic {
  const slideId = element.linkSlideId?.trim() ?? ""

  if (!slideId) {
    return {
      detail: "No internal slide jump is set.",
      label: "No slide jump",
      slideNumber: null,
      status: "empty",
      targetSlideId: "",
    }
  }

  const slideIndex = slides.findIndex((slide) => slide.id === slideId)

  if (slideIndex < 0) {
    return {
      detail: "The selected slide target no longer exists.",
      label: "Missing slide target",
      slideNumber: null,
      status: "missing",
      targetSlideId: slideId,
    }
  }

  const slide = slides[slideIndex]!
  const slideNumber = slideIndex + 1
  const label = `Slide ${slideNumber}: ${slide.title || "Untitled slide"}`

  if (slide.id === currentSlideId) {
    return {
      detail: "This action points back to the current slide.",
      label,
      slideNumber,
      status: "self",
      targetSlideId: slide.id,
    }
  }

  return {
    detail: "Internal slide jump is ready for slideshow and PPTX export.",
    label,
    slideNumber,
    status: "ready",
    targetSlideId: slide.id,
  }
}
