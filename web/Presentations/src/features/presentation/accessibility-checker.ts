import { resolveElementImageSrc } from "./deck-assets"
import { elementSlideTarget, normalizeElementLinkUrl } from "./element-links"
import { visibleElements } from "./element-visibility"
import { chartData, chartText } from "./chart-formatting"
import { iconDefinition } from "./icon-library"
import { isLinearShape, shapeKindLabels, shapeKind } from "./shape-formatting"
import { tableText } from "./table-formatting"
import { textOverflowStatus } from "./text-formatting"
import type { Deck, PresentationElement, Slide } from "./types"

export type AccessibilitySeverity = "error" | "warning"

export type AccessibilityFinding = {
  id: string
  severity: AccessibilitySeverity
  slideId: string
  slideIndex: number
  slideTitle: string
  elementId?: string
  title: string
  details: string
}

export type AccessibilitySummary = {
  errors: number
  warnings: number
  total: number
}

function isTextElement(element: PresentationElement) {
  return element.type === "title" || element.type === "text"
}

function isTransparent(value: string | undefined) {
  return !value || value === "transparent" || value === "rgba(0,0,0,0)"
}

function hexToRgb(value: string) {
  const clean = value.trim().replace(/^#/, "")
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((part) => `${part}${part}`)
          .join("")
      : clean

  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function luminance(color: ReturnType<typeof hexToRgb>) {
  if (!color) return null

  const channels = [color.r, color.g, color.b].map((channel) => {
    const value = channel / 255
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4
  })

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = luminance(hexToRgb(foreground))
  const backgroundLuminance = luminance(hexToRgb(background))

  if (foregroundLuminance === null || backgroundLuminance === null) {
    return null
  }

  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)

  return (lighter + 0.05) / (darker + 0.05)
}

function elementLabel(element: PresentationElement) {
  if (element.type === "image") return element.alt || "Image"
  if (element.type === "video") return element.alt || "Video"
  if (element.type === "audio") return element.alt || "Audio"
  if (element.type === "icon") return element.alt || iconDefinition(element.iconName).label
  if (element.type === "shape") return shapeKindLabels[shapeKind(element)]
  if (element.type === "table") return "Table"
  if (element.type === "chart") return "Chart"

  return element.content.trim().split(/\r?\n/)[0] || element.type
}

function createFinding(
  slide: Slide,
  slideIndex: number,
  input: Omit<AccessibilityFinding, "id" | "slideId" | "slideIndex" | "slideTitle">,
): AccessibilityFinding {
  const elementPart = input.elementId ? `-${input.elementId}` : ""

  return {
    id: `${slide.id}${elementPart}-${input.title}`,
    slideId: slide.id,
    slideIndex,
    slideTitle: slide.title || `Slide ${slideIndex + 1}`,
    ...input,
  }
}

function scanElement(
  deck: Deck,
  slide: Slide,
  slideIndex: number,
  element: PresentationElement,
) {
  const findings: AccessibilityFinding[] = []

  if (element.linkUrl?.trim() && !normalizeElementLinkUrl(element.linkUrl)) {
    findings.push(
      createFinding(slide, slideIndex, {
        severity: "warning",
        elementId: element.id,
        title: "Invalid action link",
        details: "Use an http, https, mailto, or tel link.",
      }),
    )
  }

  if (element.linkSlideId?.trim() && !elementSlideTarget(element, deck.slides)) {
    findings.push(
      createFinding(slide, slideIndex, {
        severity: "warning",
        elementId: element.id,
        title: "Invalid slide jump",
        details: "Pick an existing slide for this object action.",
      }),
    )
  }

  if (element.type === "image") {
    const imageSrc = resolveElementImageSrc(element, deck.assets)

    if (!imageSrc) {
      findings.push(
        createFinding(slide, slideIndex, {
          severity: "error",
          elementId: element.id,
          title: "Image is empty",
          details: `${elementLabel(element)} has no image source.`,
        }),
      )
    }

    if (!element.alt.trim()) {
      findings.push(
        createFinding(slide, slideIndex, {
          severity: "error",
          elementId: element.id,
          title: "Image needs alt text",
          details: "Add alt text so screen reader users know what the image shows.",
        }),
      )
    }
  }

  if (element.type === "video") {
    if (!element.src) {
      findings.push(
        createFinding(slide, slideIndex, {
          severity: "error",
          elementId: element.id,
          title: "Video is empty",
          details: `${elementLabel(element)} has no video source.`,
        }),
      )
    }

    if (!element.alt.trim()) {
      findings.push(
        createFinding(slide, slideIndex, {
          severity: "warning",
          elementId: element.id,
          title: "Video needs a title",
          details: "Add a video title so the object is understandable in review and slideshow contexts.",
        }),
      )
    }
  }

  if (element.type === "audio") {
    if (!element.src) {
      findings.push(
        createFinding(slide, slideIndex, {
          severity: "error",
          elementId: element.id,
          title: "Audio is empty",
          details: `${elementLabel(element)} has no audio source.`,
        }),
      )
    }

    if (!element.alt.trim()) {
      findings.push(
        createFinding(slide, slideIndex, {
          severity: "warning",
          elementId: element.id,
          title: "Audio needs a title",
          details: "Add an audio title so the object is understandable in review and slideshow contexts.",
        }),
      )
    }
  }

  if (element.type === "icon" && !element.alt.trim()) {
    findings.push(
      createFinding(slide, slideIndex, {
        severity: "warning",
        elementId: element.id,
        title: "Icon needs a title",
        details: "Add a short icon title so the object is understandable in review and slideshow contexts.",
      }),
    )
  }

  if (element.type === "table" && !tableText(element).trim()) {
    findings.push(
      createFinding(slide, slideIndex, {
        severity: "warning",
        elementId: element.id,
        title: "Empty table",
        details: "Add table content or remove the empty table.",
      }),
    )
  }

  if (element.type === "shape" && isLinearShape(element) && element.width < 4) {
    findings.push(
      createFinding(slide, slideIndex, {
        severity: "warning",
        elementId: element.id,
        title: "Line may be too short",
        details: "Increase the line width so it is visible during slideshow playback.",
      }),
    )
  }

  if (
    element.type === "chart" &&
    (!chartText(element).trim() ||
      chartData(element).every((datum) => datum.value === 0))
  ) {
    findings.push(
      createFinding(slide, slideIndex, {
        severity: "warning",
        elementId: element.id,
        title: "Empty chart",
        details: "Add chart data or remove the empty chart.",
      }),
    )
  }

  if (!isTextElement(element)) {
    return findings
  }

  if (!element.content.trim()) {
    findings.push(
      createFinding(slide, slideIndex, {
        severity: "warning",
        elementId: element.id,
        title: "Empty text box",
        details: "Remove the empty text box or add useful text.",
      }),
    )
  }

  const overflow = textOverflowStatus(element)
  if (overflow.clipped) {
    findings.push(
      createFinding(slide, slideIndex, {
        severity: "error",
        elementId: element.id,
        title: "Text is clipped",
        details: "Increase the object size, reduce text, or enable shrink-to-fit.",
      }),
    )
  }

  if (element.fontSize < 12) {
    findings.push(
      createFinding(slide, slideIndex, {
        severity: "warning",
        elementId: element.id,
        title: "Text may be too small",
        details: "Use at least 12px for readable presentation text.",
      }),
    )
  }

  const background = isTransparent(element.background)
    ? slide.background
    : element.background
  const ratio = contrastRatio(element.color, background)
  const largeText = element.fontSize >= 24 || (element.fontWeight >= 700 && element.fontSize >= 18)
  const requiredRatio = largeText ? 3 : 4.5

  if (ratio !== null && ratio < requiredRatio) {
    findings.push(
      createFinding(slide, slideIndex, {
        severity: "error",
        elementId: element.id,
        title: "Low text contrast",
        details: `Contrast is ${ratio.toFixed(1)}:1. Aim for at least ${requiredRatio}:1.`,
      }),
    )
  }

  return findings
}

function scanSlide(deck: Deck, slide: Slide, slideIndex: number) {
  const elements = visibleElements(slide)
  const findings: AccessibilityFinding[] = []
  const hasTitle = elements.some(
    (element) => element.type === "title" && element.content.trim(),
  )

  if (!slide.title.trim() || !hasTitle) {
    findings.push(
      createFinding(slide, slideIndex, {
        severity: "warning",
        title: "Slide needs a clear title",
        details: "Use a non-empty slide title and visible title object.",
      }),
    )
  }

  for (const element of elements) {
    findings.push(...scanElement(deck, slide, slideIndex, element))
  }

  return findings
}

export function scanDeckAccessibility(deck: Deck) {
  return deck.slides.flatMap((slide, index) => scanSlide(deck, slide, index))
}

export function summarizeAccessibility(
  findings: AccessibilityFinding[],
): AccessibilitySummary {
  const errors = findings.filter((finding) => finding.severity === "error").length
  const warnings = findings.length - errors

  return {
    errors,
    warnings,
    total: findings.length,
  }
}
