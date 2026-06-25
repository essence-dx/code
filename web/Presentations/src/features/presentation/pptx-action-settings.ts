import {
  elementLinkUrl,
  elementSlideTargetDiagnostic,
} from "./element-links"
import { presentationElementLabel } from "./element-labels"
import type { Deck, PresentationElement, Slide } from "./types"

export type PptxActionSettingMode =
  | "blocked"
  | "external-hyperlink"
  | "internal-slide-action"

export type PptxActionSettingStatus = "ready" | "warning"

export type PptxActionTargetKind =
  | "external-url"
  | "invalid-url"
  | "mailto"
  | "missing-slide"
  | "self-slide"
  | "slide"
  | "tel"

export type PptxActionRelationshipKind =
  | "external-hyperlink"
  | "internal-slide"
  | "none"

export type PptxActionSettingPlanItem = {
  detail: string
  elementId: string
  groupId: string
  label: string
  mode: PptxActionSettingMode
  nativeExport: boolean
  officeAction: "a:hlinkClick" | "none"
  relationshipKind: PptxActionRelationshipKind
  relationshipTarget: string
  slideId: string
  slideNumber: number
  slideTitle: string
  sourceElementIds: string[]
  status: PptxActionSettingStatus
  targetKind: PptxActionTargetKind
  targetLabel: string
  targetSlideId: string
  targetSlideNumber: number | null
  tooltip: string
}

export type PptxActionSettingPlan = {
  blockedCount: number
  emailCount: number
  externalLinkCount: number
  groupedActionCount: number
  invalidUrlCount: number
  internalSlideCount: number
  items: PptxActionSettingPlanItem[]
  missingTargetCount: number
  nativeActionSettingCount: number
  readyCount: number
  selfTargetCount: number
  telephoneCount: number
  totalCount: number
  warningCount: number
}

function hasAction(element: PresentationElement) {
  return Boolean(element.linkSlideId?.trim() || element.linkUrl?.trim())
}

function visibleActionElements(slide: Slide) {
  return slide.elements.filter((element) => !element.hidden && hasAction(element))
}

function groupLabel(
  element: PresentationElement,
  groupElements: PresentationElement[],
) {
  const textElement = groupElements.find(
    (item) =>
      (item.type === "title" || item.type === "text") && item.content.trim(),
  )

  return textElement?.content.trim() || presentationElementLabel(element)
}

function slideTitle(slide: Slide, index: number) {
  return slide.title || `Slide ${index + 1}`
}

function urlTargetKind(url: string): PptxActionTargetKind {
  if (url.startsWith("mailto:")) return "mailto"
  if (url.startsWith("tel:")) return "tel"
  return "external-url"
}

function urlTooltip(kind: PptxActionTargetKind) {
  if (kind === "mailto") return "Send email"
  if (kind === "tel") return "Call"
  return "Open link"
}

function slideRelationshipTarget(slideNumber: number) {
  return `../slides/slide${slideNumber}.xml`
}

function itemBase(input: {
  element: PresentationElement
  groupElements: PresentationElement[]
  label: string
  slide: Slide
  slideIndex: number
}) {
  return {
    elementId: input.element.id,
    groupId: input.element.groupId,
    label: input.label,
    slideId: input.slide.id,
    slideNumber: input.slideIndex + 1,
    slideTitle: slideTitle(input.slide, input.slideIndex),
    sourceElementIds: input.groupElements.map((element) => element.id),
  }
}

export function pptxActionSettingPlan(deck: Deck): PptxActionSettingPlan {
  const items: PptxActionSettingPlanItem[] = []

  deck.slides.forEach((slide, slideIndex) => {
    const seen = new Set<string>()

    for (const element of visibleActionElements(slide)) {
      const groupKey = element.groupId || element.id
      if (seen.has(groupKey)) continue

      const groupElements = element.groupId
        ? slide.elements.filter((item) => item.groupId === element.groupId)
        : [element]
      const linkedElement =
        groupElements.find((item) => !item.hidden && hasAction(item)) ?? element
      const label = groupLabel(linkedElement, groupElements)
      const base = itemBase({
        element: linkedElement,
        groupElements,
        label,
        slide,
        slideIndex,
      })
      const slideTarget = elementSlideTargetDiagnostic(
        linkedElement,
        deck.slides,
        slide.id,
      )
      const url = elementLinkUrl(linkedElement)
      const hasUrlInput = Boolean(linkedElement.linkUrl?.trim())

      seen.add(groupKey)

      if (slideTarget.status === "ready" || slideTarget.status === "self") {
        const targetSlideNumber = slideTarget.slideNumber
        const nativeExport = slideTarget.status === "ready"

        items.push({
          ...base,
          detail: nativeExport
            ? "Native PowerPoint click action can jump to the target slide."
            : "Self-targeted slide actions are kept as review handoff metadata.",
          mode: "internal-slide-action",
          nativeExport,
          officeAction: nativeExport ? "a:hlinkClick" : "none",
          relationshipKind: nativeExport ? "internal-slide" : "none",
          relationshipTarget:
            targetSlideNumber && nativeExport
              ? slideRelationshipTarget(targetSlideNumber)
              : "",
          status: nativeExport ? "ready" : "warning",
          targetKind: nativeExport ? "slide" : "self-slide",
          targetLabel: slideTarget.label,
          targetSlideId: slideTarget.targetSlideId,
          targetSlideNumber,
          tooltip: "Go to slide",
        })
        continue
      }

      if (slideTarget.status === "missing") {
        items.push({
          ...base,
          detail: slideTarget.detail,
          mode: "blocked",
          nativeExport: false,
          officeAction: "none",
          relationshipKind: "none",
          relationshipTarget: "",
          status: "warning",
          targetKind: "missing-slide",
          targetLabel: slideTarget.targetSlideId,
          targetSlideId: slideTarget.targetSlideId,
          targetSlideNumber: null,
          tooltip: "",
        })
        continue
      }

      if (url) {
        const targetKind = urlTargetKind(url)

        items.push({
          ...base,
          detail:
            "Native PowerPoint hyperlink relationship can preserve this click action.",
          mode: "external-hyperlink",
          nativeExport: true,
          officeAction: "a:hlinkClick",
          relationshipKind: "external-hyperlink",
          relationshipTarget: url,
          status: "ready",
          targetKind,
          targetLabel: url,
          targetSlideId: "",
          targetSlideNumber: null,
          tooltip: urlTooltip(targetKind),
        })
        continue
      }

      if (hasUrlInput) {
        items.push({
          ...base,
          detail: "The link URL uses an unsupported or invalid scheme.",
          mode: "blocked",
          nativeExport: false,
          officeAction: "none",
          relationshipKind: "none",
          relationshipTarget: "",
          status: "warning",
          targetKind: "invalid-url",
          targetLabel: linkedElement.linkUrl.trim(),
          targetSlideId: "",
          targetSlideNumber: null,
          tooltip: "",
        })
      }
    }
  })

  return {
    blockedCount: items.filter((item) => item.mode === "blocked").length,
    emailCount: items.filter((item) => item.targetKind === "mailto").length,
    externalLinkCount: items.filter(
      (item) => item.mode === "external-hyperlink",
    ).length,
    groupedActionCount: items.filter((item) => item.groupId).length,
    internalSlideCount: items.filter(
      (item) => item.mode === "internal-slide-action",
    ).length,
    invalidUrlCount: items.filter((item) => item.targetKind === "invalid-url")
      .length,
    items,
    missingTargetCount: items.filter(
      (item) => item.targetKind === "missing-slide",
    ).length,
    nativeActionSettingCount: items.filter((item) => item.nativeExport).length,
    readyCount: items.filter((item) => item.status === "ready").length,
    selfTargetCount: items.filter((item) => item.targetKind === "self-slide")
      .length,
    telephoneCount: items.filter((item) => item.targetKind === "tel").length,
    totalCount: items.length,
    warningCount: items.filter((item) => item.status === "warning").length,
  }
}
