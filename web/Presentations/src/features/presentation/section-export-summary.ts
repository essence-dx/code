import { deckSectionRanges } from "./slide-sections"
import type { Deck, PresentationElement, Slide } from "./types"

export type SectionExportSummaryItem = {
  id: string
  title: string
  explicit: boolean
  startSlideNumber: number
  endSlideNumber: number
  slideCount: number
  noteSlideCount: number
  openCommentCount: number
  mediaObjectCount: number
}

export type SectionExportSummary = {
  sections: SectionExportSummaryItem[]
  explicitSectionCount: number
  totalSlideCount: number
  groupedSlideCount: number
  noteSlideCount: number
  openCommentCount: number
  mediaObjectCount: number
  hasExplicitSections: boolean
  summary: string
}

function isMediaElement(element: PresentationElement) {
  return element.type === "audio" || element.type === "video"
}

function openCommentCount(slide: Slide) {
  return slide.comments.filter((comment) => !comment.resolved).length
}

function mediaObjectCount(slide: Slide) {
  return slide.elements.filter(isMediaElement).length
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`
}

export function sectionSlideRangeLabel(section: SectionExportSummaryItem) {
  if (section.startSlideNumber === section.endSlideNumber) {
    return `Slide ${section.startSlideNumber}`
  }

  return `Slides ${section.startSlideNumber}-${section.endSlideNumber}`
}

export function sectionExportSummary(deck: Deck): SectionExportSummary {
  const sections = deckSectionRanges(deck.slides).map((section) => {
    const slides = deck.slides.slice(section.startIndex, section.endIndex + 1)

    return {
      id: section.startSlideId,
      title: section.title,
      explicit: section.isExplicitSection,
      startSlideNumber: section.startIndex + 1,
      endSlideNumber: section.endIndex + 1,
      slideCount: section.slideIds.length,
      noteSlideCount: slides.filter((slide) => slide.notes.trim()).length,
      openCommentCount: slides.reduce(
        (count, slide) => count + openCommentCount(slide),
        0,
      ),
      mediaObjectCount: slides.reduce(
        (count, slide) => count + mediaObjectCount(slide),
        0,
      ),
    }
  })
  const explicitSections = sections.filter((section) => section.explicit)
  const groupedSlideCount = explicitSections.reduce(
    (count, section) => count + section.slideCount,
    0,
  )
  const noteSlideCount = sections.reduce(
    (count, section) => count + section.noteSlideCount,
    0,
  )
  const openComments = sections.reduce(
    (count, section) => count + section.openCommentCount,
    0,
  )
  const mediaObjects = sections.reduce(
    (count, section) => count + section.mediaObjectCount,
    0,
  )
  const hasExplicitSections = explicitSections.length > 0
  const sectionVerb = explicitSections.length === 1 ? "groups" : "group"
  const summary = !deck.slides.length
    ? "No slides are available for section handoff."
    : hasExplicitSections
      ? `${plural(explicitSections.length, "section")} ${sectionVerb} ${plural(
          groupedSlideCount,
          "slide",
        )} for handouts, outlines, and export review.`
      : "No named sections yet; print and export handoff follows slide order."

  return {
    sections,
    explicitSectionCount: explicitSections.length,
    totalSlideCount: deck.slides.length,
    groupedSlideCount,
    noteSlideCount,
    openCommentCount: openComments,
    mediaObjectCount: mediaObjects,
    hasExplicitSections,
    summary,
  }
}
