import { canvasRenderBudget, type CanvasRenderBudget } from "./canvas-render-budget"
import { deckScaleLimits } from "./deck-performance"
import type { Deck, Slide } from "./types"

export type LargeDeckSafeguardStatus = "attention" | "ready" | "watch"

export type SlideWindowRange = {
  afterCount: number
  anchorIndex: number
  beforeCount: number
  endIndexExclusive: number
  startIndex: number
  totalCount: number
  visibleCount: number
}

export type VirtualFilmstripWindow = SlideWindowRange & {
  firstVisibleIndex: number
}

export type SlideAnchorWindowPlan = {
  deferredSlideCount: number
  mode: "full" | "windowed"
  range: SlideWindowRange
  renderedSlideIds: string[]
  selectedSlideId: string | null
  status: LargeDeckSafeguardStatus
}

export type CanvasDetailWindowPlan = {
  animatedElementCount: number
  budget: CanvasRenderBudget
  deferredTextOverflowCheckCount: number
  selectedSlideId: string | null
  status: LargeDeckSafeguardStatus
  textElementCount: number
}

export type LargeDeckSafeguardCheck = {
  detail: string
  id: string
  label: string
  limit: string
  status: LargeDeckSafeguardStatus
  value: string
}

export type LargeDeckSafeguardReport = {
  canvasDetail: CanvasDetailWindowPlan
  checks: LargeDeckSafeguardCheck[]
  readyCount: number
  selectedSlideIndex: number
  slideWindow: SlideAnchorWindowPlan
  status: LargeDeckSafeguardStatus
  summary: string
  totalCount: number
  windowAnimationCount: number
}

export const largeDeckWindowLimits = {
  animationWindowAttentionCount: deckScaleLimits.heavy.animatedElements,
  animationWindowWatchCount: deckScaleLimits.large.animatedElements,
  filmstripFallbackViewportHeight: 640,
  filmstripOverscanRows: 5,
  filmstripRowHeight: 90,
  maxAnchorWindowSlides: 25,
  selectedSlideRadius: 12,
} as const

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function statusFromPressure(
  value: number,
  watchLimit: number,
  attentionLimit: number,
): LargeDeckSafeguardStatus {
  if (value >= attentionLimit) return "attention"
  if (value >= watchLimit) return "watch"
  return "ready"
}

function combineStatuses(
  statuses: LargeDeckSafeguardStatus[],
): LargeDeckSafeguardStatus {
  if (statuses.includes("attention")) return "attention"
  if (statuses.includes("watch")) return "watch"
  return "ready"
}

function textElementCount(slide: Slide | undefined) {
  return (
    slide?.elements.filter(
      (element) => element.type === "title" || element.type === "text",
    ).length ?? 0
  )
}

function animatedElementCount(slide: Slide | undefined) {
  return (
    slide?.elements.filter((element) => (element.animation ?? "none") !== "none")
      .length ?? 0
  )
}

export function slideWindowRange(input: {
  anchorIndex: number
  maxVisibleCount?: number
  radius?: number
  totalCount: number
}): SlideWindowRange {
  const totalCount = Math.max(0, input.totalCount)

  if (!totalCount) {
    return {
      afterCount: 0,
      anchorIndex: 0,
      beforeCount: 0,
      endIndexExclusive: 0,
      startIndex: 0,
      totalCount,
      visibleCount: 0,
    }
  }

  const anchorIndex = clamp(input.anchorIndex, 0, totalCount - 1)
  const radius = input.radius ?? largeDeckWindowLimits.selectedSlideRadius
  const maxVisibleCount =
    input.maxVisibleCount ?? largeDeckWindowLimits.maxAnchorWindowSlides
  const visibleCount = Math.min(totalCount, maxVisibleCount, radius * 2 + 1)
  const halfWindow = Math.floor(visibleCount / 2)
  const startIndex = clamp(anchorIndex - halfWindow, 0, totalCount - visibleCount)
  const endIndexExclusive = startIndex + visibleCount

  return {
    afterCount: totalCount - endIndexExclusive,
    anchorIndex,
    beforeCount: startIndex,
    endIndexExclusive,
    startIndex,
    totalCount,
    visibleCount,
  }
}

export function virtualFilmstripWindow(input: {
  overscan?: number
  rowCount: number
  rowHeight?: number
  scrollTop: number
  viewportHeight: number
}): VirtualFilmstripWindow {
  const totalCount = Math.max(0, input.rowCount)
  const rowHeight = input.rowHeight ?? largeDeckWindowLimits.filmstripRowHeight
  const overscan = input.overscan ?? largeDeckWindowLimits.filmstripOverscanRows
  const viewportHeight =
    input.viewportHeight || largeDeckWindowLimits.filmstripFallbackViewportHeight
  const firstVisibleIndex = totalCount
    ? clamp(Math.floor(Math.max(0, input.scrollTop) / rowHeight), 0, totalCount - 1)
    : 0
  const startIndex = clamp(firstVisibleIndex - overscan, 0, totalCount)
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2
  const endIndexExclusive = Math.min(totalCount, startIndex + visibleCount)

  return {
    afterCount: totalCount - endIndexExclusive,
    anchorIndex: firstVisibleIndex,
    beforeCount: startIndex,
    endIndexExclusive,
    firstVisibleIndex,
    startIndex,
    totalCount,
    visibleCount: endIndexExclusive - startIndex,
  }
}

export function slideAnchorWindowPlan(
  deck: Deck,
  input: { selectedSlideId?: string | null } = {},
): SlideAnchorWindowPlan {
  const fallbackIndex = deck.slides.length ? 0 : -1
  const requestedIndex = input.selectedSlideId
    ? deck.slides.findIndex((slide) => slide.id === input.selectedSlideId)
    : fallbackIndex
  const selectedSlideIndex = requestedIndex >= 0 ? requestedIndex : fallbackIndex
  const range = slideWindowRange({
    anchorIndex: Math.max(0, selectedSlideIndex),
    totalCount: deck.slides.length,
  })
  const renderedSlideIds = deck.slides
    .slice(range.startIndex, range.endIndexExclusive)
    .map((slide) => slide.id)
  const deferredSlideCount = range.beforeCount + range.afterCount
  const mode = deferredSlideCount ? "windowed" : "full"
  const status =
    deck.slides.length >= deckScaleLimits.heavy.slides
      ? mode === "windowed"
        ? "watch"
        : "attention"
      : deck.slides.length >= deckScaleLimits.large.slides
        ? mode === "windowed"
          ? "ready"
          : "watch"
        : "ready"

  return {
    deferredSlideCount,
    mode,
    range,
    renderedSlideIds,
    selectedSlideId: deck.slides[selectedSlideIndex]?.id ?? null,
    status,
  }
}

export function canvasDetailWindowPlan(
  slide: Slide | undefined,
  selectedElementIds: string[] = [],
): CanvasDetailWindowPlan {
  const budget = slide
    ? canvasRenderBudget(slide, selectedElementIds)
    : {
        density: "normal" as const,
        elementCount: 0,
        textOverflowCheckIds: [],
      }
  const textCount = textElementCount(slide)
  const deferredTextOverflowCheckCount = Math.max(
    0,
    textCount - budget.textOverflowCheckIds.length,
  )
  const animatedCount = animatedElementCount(slide)
  const densityStatus =
    budget.density === "budgeted"
      ? "attention"
      : budget.density === "dense"
        ? "watch"
        : "ready"
  const animationStatus = statusFromPressure(
    animatedCount,
    deckScaleLimits.large.maxAnimatedElementsOnSlide,
    deckScaleLimits.heavy.maxAnimatedElementsOnSlide,
  )

  return {
    animatedElementCount: animatedCount,
    budget,
    deferredTextOverflowCheckCount,
    selectedSlideId: slide?.id ?? null,
    status: combineStatuses([densityStatus, animationStatus]),
    textElementCount: textCount,
  }
}

export function largeDeckSafeguardReport(
  deck: Deck,
  input: {
    selectedElementIds?: string[]
    selectedSlideId?: string | null
  } = {},
): LargeDeckSafeguardReport {
  const slideWindow = slideAnchorWindowPlan(deck, input)
  const selectedSlideIndex = slideWindow.range.anchorIndex
  const selectedSlide = deck.slides[selectedSlideIndex]
  const canvasDetail = canvasDetailWindowPlan(
    selectedSlide,
    input.selectedElementIds ?? [],
  )
  const windowAnimationCount = deck.slides
    .slice(slideWindow.range.startIndex, slideWindow.range.endIndexExclusive)
    .reduce((total, slide) => total + animatedElementCount(slide), 0)
  const windowAnimationStatus = statusFromPressure(
    windowAnimationCount,
    largeDeckWindowLimits.animationWindowWatchCount,
    largeDeckWindowLimits.animationWindowAttentionCount,
  )
  const checks = [
    {
      detail: "Only the active slide neighborhood needs full thumbnail work while the rest of the deck stays deferred.",
      id: "large-deck-slide-window",
      label: "Slide window",
      limit: `${largeDeckWindowLimits.maxAnchorWindowSlides} active slides`,
      status: slideWindow.status,
      value: `${slideWindow.range.visibleCount} / ${deck.slides.length}`,
    },
    {
      detail: "Filmstrip and search remain usable when off-window slide thumbnails are intentionally skipped.",
      id: "large-deck-deferred-slides",
      label: "Deferred slides",
      limit: "0 for small decks / deferred for large decks",
      status:
        deck.slides.length >= deckScaleLimits.large.slides &&
        !slideWindow.deferredSlideCount
          ? "watch"
          : "ready",
      value: `${slideWindow.deferredSlideCount}`,
    },
    {
      detail: "Dense active slides keep selected text checks while reducing repeated overflow work.",
      id: "large-deck-canvas-detail",
      label: "Active slide detail",
      limit: "dense watch / budgeted attention",
      status: canvasDetail.status,
      value: canvasDetail.budget.density,
    },
    {
      detail: "Animation pressure is measured inside the active slide window before preview or slideshow work expands.",
      id: "large-deck-window-animations",
      label: "Window animations",
      limit: `${largeDeckWindowLimits.animationWindowWatchCount} watch / ${largeDeckWindowLimits.animationWindowAttentionCount} attention`,
      status: windowAnimationStatus,
      value: `${windowAnimationCount}`,
    },
  ] satisfies LargeDeckSafeguardCheck[]
  const readyCount = checks.filter((check) => check.status === "ready").length
  const status = combineStatuses(checks.map((check) => check.status))

  return {
    canvasDetail,
    checks,
    readyCount,
    selectedSlideIndex,
    slideWindow,
    status,
    summary: `${readyCount} of ${checks.length} large-deck safeguards are ready.`,
    totalCount: checks.length,
    windowAnimationCount,
  }
}
