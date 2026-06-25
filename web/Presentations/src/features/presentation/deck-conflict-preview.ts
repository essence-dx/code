import type { Deck, Slide } from "./types"

export type DeckVersionPreview = {
  title: string
  theme: Deck["theme"]
  slideCount: number
  elementCount: number
  updatedAt: string
}

export type DeckConflictPreview = {
  local: DeckVersionPreview
  cloud: DeckVersionPreview
  changedSlides: number
  localOnlySlides: number
  cloudOnlySlides: number
  unchangedSlides: number
  titleChanged: boolean
  themeChanged: boolean
  masterChanged: boolean
}

function slideSignature(slide: Slide) {
  return JSON.stringify({
    title: slide.title,
    sectionTitle: slide.sectionTitle,
    layout: slide.layout,
    background: slide.background,
    transition: slide.transition,
    transitionDurationMs: slide.transitionDurationMs,
    autoAdvanceAfterMs: slide.autoAdvanceAfterMs,
    rehearsalDurationMs: slide.rehearsalDurationMs,
    notes: slide.notes,
    comments: slide.comments,
    elements: slide.elements,
  })
}

function deckPreview(deck: Deck): DeckVersionPreview {
  return {
    title: deck.title,
    theme: deck.theme,
    slideCount: deck.slides.length,
    elementCount: deck.slides.reduce(
      (total, slide) => total + slide.elements.length,
      0,
    ),
    updatedAt: deck.updatedAt,
  }
}

export function compareDeckVersions(
  localDeck: Deck,
  cloudDeck: Deck,
): DeckConflictPreview {
  const cloudSlidesById = new Map(
    cloudDeck.slides.map((slide) => [slide.id, slide]),
  )
  let changedSlides = 0
  let unchangedSlides = 0
  let localOnlySlides = 0

  for (const localSlide of localDeck.slides) {
    const cloudSlide = cloudSlidesById.get(localSlide.id)
    if (!cloudSlide) {
      localOnlySlides += 1
      continue
    }

    if (slideSignature(localSlide) === slideSignature(cloudSlide)) {
      unchangedSlides += 1
    } else {
      changedSlides += 1
    }
  }

  const localSlideIds = new Set(localDeck.slides.map((slide) => slide.id))
  const cloudOnlySlides = cloudDeck.slides.filter(
    (slide) => !localSlideIds.has(slide.id),
  ).length

  return {
    local: deckPreview(localDeck),
    cloud: deckPreview(cloudDeck),
    changedSlides,
    localOnlySlides,
    cloudOnlySlides,
    unchangedSlides,
    titleChanged: localDeck.title !== cloudDeck.title,
    themeChanged: localDeck.theme !== cloudDeck.theme,
    masterChanged:
      JSON.stringify(localDeck.master) !== JSON.stringify(cloudDeck.master),
  }
}
