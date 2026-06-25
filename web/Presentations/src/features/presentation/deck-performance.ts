import type { Deck } from "./types"

export const UNDO_HISTORY_MAX_ENTRIES = 30
export const UNDO_HISTORY_MAX_BYTES = 20 * 1024 * 1024
const LARGE_DECK_SLIDE_COUNT = 60
const LARGE_DECK_ELEMENT_COUNT = 900
const LARGE_DECK_ANIMATION_COUNT = 120
const LARGE_SLIDE_ELEMENT_COUNT = 60
const LARGE_SLIDE_ANIMATION_COUNT = 18
const LARGE_DECK_BYTES = 8 * 1024 * 1024
const HEAVY_DECK_SLIDE_COUNT = 140
const HEAVY_DECK_ELEMENT_COUNT = 2_200
const HEAVY_DECK_ANIMATION_COUNT = 300
const HEAVY_SLIDE_ELEMENT_COUNT = 140
const HEAVY_SLIDE_ANIMATION_COUNT = 40
const HEAVY_DECK_BYTES = 16 * 1024 * 1024

export const deckScaleLimits = {
  history: {
    entries: UNDO_HISTORY_MAX_ENTRIES,
    estimatedBytes: UNDO_HISTORY_MAX_BYTES,
  },
  large: {
    animatedElements: LARGE_DECK_ANIMATION_COUNT,
    elements: LARGE_DECK_ELEMENT_COUNT,
    estimatedBytes: LARGE_DECK_BYTES,
    maxAnimatedElementsOnSlide: LARGE_SLIDE_ANIMATION_COUNT,
    maxElementsOnSlide: LARGE_SLIDE_ELEMENT_COUNT,
    slides: LARGE_DECK_SLIDE_COUNT,
  },
  heavy: {
    animatedElements: HEAVY_DECK_ANIMATION_COUNT,
    elements: HEAVY_DECK_ELEMENT_COUNT,
    estimatedBytes: HEAVY_DECK_BYTES,
    maxAnimatedElementsOnSlide: HEAVY_SLIDE_ANIMATION_COUNT,
    maxElementsOnSlide: HEAVY_SLIDE_ELEMENT_COUNT,
    slides: HEAVY_DECK_SLIDE_COUNT,
  },
} as const

type TrimDirection = "newest-first" | "newest-last"
type DeckScaleRating = "ready" | "large" | "heavy"

export type DeckHistoryMetrics = {
  entries: number
  estimatedBytes: number
  maxEntries: number
  maxBytes: number
}

export type DeckScaleMetrics = {
  animatedElements: number
  elements: number
  estimatedBytes: number
  maxAnimatedElementsOnSlide: number
  maxElementsOnSlide: number
  rating: DeckScaleRating
  slides: number
}

export function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export function estimateDeckBytes(deck: Deck) {
  const assetBytes = (deck.assets ?? []).reduce((total, asset) => {
    return (
      total +
      asset.dataUrl.length +
      asset.remoteUrl.length +
      asset.storage.length +
      asset.name.length +
      asset.mimeType.length +
      asset.id.length
    )
  }, 0)
  const structuralDeck: Deck = {
    ...deck,
    assets: [],
  }

  return JSON.stringify(structuralDeck).length + assetBytes
}

function scaleRating(metrics: Omit<DeckScaleMetrics, "rating">): DeckScaleRating {
  if (
    metrics.slides >= HEAVY_DECK_SLIDE_COUNT ||
    metrics.elements >= HEAVY_DECK_ELEMENT_COUNT ||
    metrics.animatedElements >= HEAVY_DECK_ANIMATION_COUNT ||
    metrics.maxElementsOnSlide >= HEAVY_SLIDE_ELEMENT_COUNT ||
    metrics.maxAnimatedElementsOnSlide >= HEAVY_SLIDE_ANIMATION_COUNT ||
    metrics.estimatedBytes >= HEAVY_DECK_BYTES
  ) {
    return "heavy"
  }

  if (
    metrics.slides >= LARGE_DECK_SLIDE_COUNT ||
    metrics.elements >= LARGE_DECK_ELEMENT_COUNT ||
    metrics.animatedElements >= LARGE_DECK_ANIMATION_COUNT ||
    metrics.maxElementsOnSlide >= LARGE_SLIDE_ELEMENT_COUNT ||
    metrics.maxAnimatedElementsOnSlide >= LARGE_SLIDE_ANIMATION_COUNT ||
    metrics.estimatedBytes >= LARGE_DECK_BYTES
  ) {
    return "large"
  }

  return "ready"
}

export function deckScaleMetrics(deck: Deck): DeckScaleMetrics {
  const slides = deck.slides.length
  const elements = deck.slides.reduce(
    (total, slide) => total + slide.elements.length,
    0,
  )
  const maxElementsOnSlide = deck.slides.reduce(
    (max, slide) => Math.max(max, slide.elements.length),
    0,
  )
  const animatedElements = deck.slides.reduce(
    (total, slide) =>
      total + slide.elements.filter((element) => element.animation !== "none").length,
    0,
  )
  const maxAnimatedElementsOnSlide = deck.slides.reduce(
    (max, slide) =>
      Math.max(
        max,
        slide.elements.filter((element) => element.animation !== "none").length,
      ),
    0,
  )
  const estimatedBytes = estimateDeckBytes(deck)
  const metrics = {
    animatedElements,
    elements,
    estimatedBytes,
    maxAnimatedElementsOnSlide,
    maxElementsOnSlide,
    slides,
  }

  return {
    ...metrics,
    rating: scaleRating(metrics),
  }
}

export function deckScaleLabel(rating: DeckScaleRating) {
  if (rating === "heavy") return "Heavy deck"
  if (rating === "large") return "Large deck"
  return "Deck ready"
}

export function historyMetrics(history: Deck[]): DeckHistoryMetrics {
  return {
    entries: history.length,
    estimatedBytes: history.reduce(
      (total, deck) => total + estimateDeckBytes(deck),
      0,
    ),
    maxEntries: UNDO_HISTORY_MAX_ENTRIES,
    maxBytes: UNDO_HISTORY_MAX_BYTES,
  }
}

export function trimDeckHistory(
  history: Deck[],
  direction: TrimDirection = "newest-last",
) {
  const ordered =
    direction === "newest-last"
      ? history.slice(-UNDO_HISTORY_MAX_ENTRIES).reverse()
      : history.slice(0, UNDO_HISTORY_MAX_ENTRIES)
  const kept: Deck[] = []
  let totalBytes = 0

  for (const deck of ordered) {
    const deckBytes = estimateDeckBytes(deck)
    if (kept.length > 0 && totalBytes + deckBytes > UNDO_HISTORY_MAX_BYTES) {
      break
    }

    kept.push(deck)
    totalBytes += deckBytes
  }

  return direction === "newest-last" ? kept.reverse() : kept
}
