import type { Slide } from "./types"

export type SlideSectionRange = {
  startIndex: number
  endIndex: number
  startSlideId: string
  title: string
  slideIds: string[]
  isExplicitSection: boolean
}

type SlideSectionBlock = SlideSectionRange

type SlideSectionMutationResult = {
  slides: Slide[]
  changed: boolean
  selectedSlideId: string
  selectedSlideIds: string[]
}

function sectionTitle(slide: Slide | undefined) {
  return slide?.sectionTitle.trim() ?? ""
}

function rangeFromIndexes(
  slides: Slide[],
  startIndex: number,
  endIndex: number,
): SlideSectionRange | null {
  const startSlide = slides[startIndex]
  if (!startSlide) return null

  return {
    startIndex,
    endIndex,
    startSlideId: startSlide.id,
    title: sectionTitle(startSlide) || "Opening",
    slideIds: slides.slice(startIndex, endIndex + 1).map((slide) => slide.id),
    isExplicitSection: Boolean(sectionTitle(startSlide)),
  }
}

function sectionBlocks(slides: Slide[]): SlideSectionBlock[] {
  if (!slides.length) return []

  const blocks: SlideSectionBlock[] = []
  let startIndex = 0

  for (let index = 1; index < slides.length; index += 1) {
    if (!sectionTitle(slides[index])) continue

    const block = rangeFromIndexes(slides, startIndex, index - 1)
    if (block) blocks.push(block)
    startIndex = index
  }

  const finalBlock = rangeFromIndexes(slides, startIndex, slides.length - 1)
  if (finalBlock) blocks.push(finalBlock)

  return blocks
}

export function sectionBreakSlideIds(slides: Slide[]) {
  return slides
    .filter((slide) => sectionTitle(slide))
    .map((slide) => slide.id)
}

export function sanitizeCollapsedSectionSlideIds(
  slides: Slide[],
  collapsedSectionSlideIds: string[],
) {
  const validSectionIds = new Set(sectionBreakSlideIds(slides))
  const seen = new Set<string>()

  return collapsedSectionSlideIds.filter((slideId) => {
    if (!validSectionIds.has(slideId) || seen.has(slideId)) return false
    seen.add(slideId)
    return true
  })
}

export function deckSections(slides: Slide[]) {
  return sectionBlocks(slides).filter((section) => section.isExplicitSection)
}

export function deckSectionRanges(slides: Slide[]) {
  return sectionBlocks(slides)
}

export function sectionRangeForSlide(
  slides: Slide[],
  slideId: string,
): SlideSectionRange | null {
  const activeIndex = slides.findIndex((slide) => slide.id === slideId)
  if (activeIndex < 0) return null

  let startIndex = activeIndex
  while (startIndex > 0 && !sectionTitle(slides[startIndex])) {
    startIndex -= 1
  }

  let endIndex = slides.length - 1
  for (let index = startIndex + 1; index < slides.length; index += 1) {
    if (sectionTitle(slides[index])) {
      endIndex = index - 1
      break
    }
  }

  return rangeFromIndexes(slides, startIndex, endIndex)
}

export function canMoveSlideSection(
  slides: Slide[],
  slideId: string,
  direction: -1 | 1,
) {
  const range = sectionRangeForSlide(slides, slideId)
  if (!range?.isExplicitSection) return false

  const blocks = sectionBlocks(slides)
  const blockIndex = blocks.findIndex(
    (block) => block.startSlideId === range.startSlideId,
  )
  if (blockIndex < 0) return false

  const targetIndex = blockIndex + direction
  return targetIndex >= 0 && targetIndex < blocks.length
}

export function renameSlideSection(
  slides: Slide[],
  slideId: string,
  title: string,
): SlideSectionMutationResult {
  const range = sectionRangeForSlide(slides, slideId)
  const nextTitle = title.trim()

  if (!range?.isExplicitSection || !nextTitle || nextTitle === range.title) {
    return {
      slides,
      changed: false,
      selectedSlideId: slideId,
      selectedSlideIds: range?.slideIds ?? [slideId],
    }
  }

  return {
    slides: slides.map((slide, index) =>
      index === range.startIndex ? { ...slide, sectionTitle: nextTitle } : slide,
    ),
    changed: true,
    selectedSlideId: range.startSlideId,
    selectedSlideIds: range.slideIds,
  }
}

export function moveSlideSection(
  slides: Slide[],
  slideId: string,
  direction: -1 | 1,
): SlideSectionMutationResult {
  const range = sectionRangeForSlide(slides, slideId)
  if (!range?.isExplicitSection) {
    return {
      slides,
      changed: false,
      selectedSlideId: slideId,
      selectedSlideIds: range?.slideIds ?? [slideId],
    }
  }

  const blocks = sectionBlocks(slides)
  const blockIndex = blocks.findIndex(
    (block) => block.startSlideId === range.startSlideId,
  )
  const targetIndex = blockIndex + direction

  if (blockIndex < 0 || targetIndex < 0 || targetIndex >= blocks.length) {
    return {
      slides,
      changed: false,
      selectedSlideId: range.startSlideId,
      selectedSlideIds: range.slideIds,
    }
  }

  const reorderedBlocks = blocks.map((block) =>
    slides.slice(block.startIndex, block.endIndex + 1),
  )
  const currentBlock = reorderedBlocks[blockIndex]
  const targetBlock = reorderedBlocks[targetIndex]

  if (!currentBlock || !targetBlock) {
    return {
      slides,
      changed: false,
      selectedSlideId: range.startSlideId,
      selectedSlideIds: range.slideIds,
    }
  }

  reorderedBlocks[blockIndex] = targetBlock
  reorderedBlocks[targetIndex] = currentBlock

  return {
    slides: reorderedBlocks.flat(),
    changed: true,
    selectedSlideId: range.startSlideId,
    selectedSlideIds: range.slideIds,
  }
}
