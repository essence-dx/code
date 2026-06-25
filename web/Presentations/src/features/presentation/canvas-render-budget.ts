import type { Slide } from "./types"

export type CanvasRenderBudget = {
  density: "normal" | "dense" | "budgeted"
  elementCount: number
  textOverflowCheckIds: string[]
}

export type CanvasElementContainmentStyle = {
  contain?: "layout style paint"
  contentVisibility?: "auto"
}

const DENSE_SLIDE_ELEMENT_COUNT = 80
const BUDGETED_SLIDE_ELEMENT_COUNT = 140
const DENSE_TEXT_OVERFLOW_CHECKS = 48
const BUDGETED_TEXT_OVERFLOW_CHECKS = 24

function textElementIds(slide: Slide) {
  return slide.elements
    .filter((element) => element.type === "title" || element.type === "text")
    .map((element) => element.id)
}

export function canvasRenderBudget(
  slide: Slide,
  selectedElementIds: string[] = [],
): CanvasRenderBudget {
  const elementCount = slide.elements.length
  const selectedIds = new Set(selectedElementIds)

  if (elementCount < DENSE_SLIDE_ELEMENT_COUNT) {
    return {
      density: "normal",
      elementCount,
      textOverflowCheckIds: textElementIds(slide),
    }
  }

  const density =
    elementCount >= BUDGETED_SLIDE_ELEMENT_COUNT ? "budgeted" : "dense"
  const checkLimit =
    density === "budgeted"
      ? BUDGETED_TEXT_OVERFLOW_CHECKS
      : DENSE_TEXT_OVERFLOW_CHECKS
  const alwaysCheckIds = slide.elements
    .filter(
      (element) =>
        selectedIds.has(element.id) &&
        (element.type === "title" || element.type === "text"),
    )
    .map((element) => element.id)
  const textOverflowCheckIds = Array.from(
    new Set([...alwaysCheckIds, ...textElementIds(slide).slice(0, checkLimit)]),
  )

  return {
    density,
    elementCount,
    textOverflowCheckIds,
  }
}

export function shouldCheckTextOverflow(
  budget: CanvasRenderBudget,
  elementId: string,
) {
  return budget.textOverflowCheckIds.includes(elementId)
}

export function canvasElementContainmentStyle(
  budget: CanvasRenderBudget,
): CanvasElementContainmentStyle {
  if (budget.density === "normal") return {}

  return {
    contain: "layout style paint" as const,
    contentVisibility: "auto" as const,
  }
}
