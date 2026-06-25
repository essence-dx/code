import { createElement } from "./default-deck"
import { isElementLocked } from "./element-visibility"
import type { PresentationElement, Slide, SlideLayout } from "./types"

export const slideLayoutLabels: Record<SlideLayout, string> = {
  title: "Title",
  "title-body": "Title and body",
  section: "Section",
  blank: "Blank",
  "two-content": "Two content",
  comparison: "Comparison",
  quote: "Quote",
  "picture-caption": "Picture caption",
}

type LayoutSlot = Partial<Omit<PresentationElement, "id">> &
  Pick<PresentationElement, "type">

function titleSlot(input: Partial<LayoutSlot>): LayoutSlot {
  return {
    type: "title",
    placeholderRole: "title",
    content: "Add title",
    fontSize: 34,
    fontWeight: 700,
    lineHeight: 1.05,
    color: "#111827",
    ...input,
  }
}

function bodySlot(input: Partial<LayoutSlot>): LayoutSlot {
  return {
    type: "text",
    placeholderRole: "body",
    content: "Add your point here.",
    fontSize: 22,
    fontWeight: 500,
    lineHeight: 1.25,
    color: "#475569",
    ...input,
  }
}

function layoutSlots(layout: SlideLayout): LayoutSlot[] {
  if (layout === "blank") return []
  if (layout === "title") {
    return [
      titleSlot({
        x: 8,
        y: 22,
        width: 78,
        height: 18,
        content: "Add title",
        fontSize: 44,
      }),
    ]
  }
  if (layout === "section") {
    return [
      titleSlot({
        x: 8,
        y: 34,
        width: 78,
        height: 14,
        content: "Section title",
        fontSize: 40,
      }),
      bodySlot({
        x: 9,
        y: 52,
        width: 62,
        height: 10,
        content: "Add a short section description.",
        fontSize: 20,
      }),
    ]
  }
  if (layout === "two-content") {
    return [
      titleSlot({ x: 8, y: 9, width: 76, height: 11 }),
      bodySlot({ x: 9, y: 28, width: 38, height: 44 }),
      bodySlot({ x: 53, y: 28, width: 38, height: 44 }),
    ]
  }
  if (layout === "comparison") {
    return [
      titleSlot({ x: 8, y: 8, width: 76, height: 10 }),
      bodySlot({
        x: 9,
        y: 25,
        width: 36,
        height: 9,
        content: "Option A",
        fontSize: 20,
        fontWeight: 700,
      }),
      bodySlot({
        x: 55,
        y: 25,
        width: 36,
        height: 9,
        content: "Option B",
        fontSize: 20,
        fontWeight: 700,
      }),
      bodySlot({ x: 9, y: 38, width: 36, height: 36 }),
      bodySlot({ x: 55, y: 38, width: 36, height: 36 }),
    ]
  }
  if (layout === "quote") {
    return [
      bodySlot({
        x: 12,
        y: 25,
        width: 72,
        height: 24,
        content: "Add a memorable quote.",
        fontSize: 34,
        fontWeight: 600,
        lineHeight: 1.12,
      }),
      bodySlot({
        x: 14,
        y: 55,
        width: 44,
        height: 8,
        content: "Attribution",
        fontSize: 18,
      }),
    ]
  }
  if (layout === "picture-caption") {
    return [
      titleSlot({ x: 7, y: 8, width: 78, height: 10 }),
      {
        type: "image",
        placeholderRole: "media",
        x: 7,
        y: 22,
        width: 58,
        height: 50,
        background: "#e5e7eb",
        alt: "Picture placeholder",
        fit: "cover",
      },
      bodySlot({
        x: 69,
        y: 25,
        width: 23,
        height: 36,
        placeholderRole: "caption",
        content: "Add a caption.",
        fontSize: 19,
      }),
    ]
  }

  return [
    titleSlot({ x: 8, y: 10, width: 76, height: 12 }),
    bodySlot({ x: 9, y: 30, width: 74, height: 42 }),
  ]
}

function candidateElements(slide: Slide, slot: LayoutSlot) {
  const candidates = slide.elements.filter((element) => element.type === slot.type)
  const placeholderCandidates =
    slot.placeholderRole && slot.placeholderRole !== "none"
      ? candidates.filter((element) => element.placeholderRole === slot.placeholderRole)
      : []

  return placeholderCandidates.length ? placeholderCandidates : candidates
}

function lockedPlaceholderForSlot(
  slide: Slide,
  slot: LayoutSlot,
  usedIds: Set<string>,
) {
  if (!slot.placeholderRole || slot.placeholderRole === "none") return undefined

  return slide.elements.find(
    (element) =>
      !usedIds.has(element.id) &&
      isElementLocked(element) &&
      element.type === slot.type &&
      element.placeholderRole === slot.placeholderRole,
  )
}

function applySlot(
  existing: PresentationElement | undefined,
  slot: LayoutSlot,
) {
  if (existing) {
    const content = existing.content.trim() ? existing.content : slot.content
    const nextElement = {
      ...existing,
      ...slot,
      content: content ?? existing.content,
    }

    if (existing.type === "image" && slot.type === "image") {
      return {
        ...nextElement,
        assetId: existing.assetId,
        src: existing.src,
        alt: existing.alt || slot.alt || "Picture placeholder",
      }
    }

    return nextElement
  }

  return {
    ...createElement(slot.type),
    ...slot,
  }
}

export function applyLayoutPlaceholders(slide: Slide, layout: SlideLayout): Slide {
  const slots = layoutSlots(layout)
  if (!slots.length) return { ...slide, layout }

  const usedIds = new Set<string>()
  const replacements = new Map<string, PresentationElement>()
  const additions: PresentationElement[] = []

  for (const slot of slots) {
    const existing = candidateElements(slide, slot).find(
      (element) => !usedIds.has(element.id) && !isElementLocked(element),
    )

    if (!existing) {
      const lockedPlaceholder = lockedPlaceholderForSlot(slide, slot, usedIds)
      if (lockedPlaceholder) {
        usedIds.add(lockedPlaceholder.id)
        continue
      }
    }

    const nextElement = applySlot(existing, slot)

    if (existing) {
      usedIds.add(existing.id)
      replacements.set(existing.id, nextElement)
    } else {
      additions.push(nextElement)
    }
  }

  return {
    ...slide,
    layout,
    title:
      slide.title.trim() ||
      slots.find((slot) => slot.type === "title")?.content ||
      slide.title,
    elements: [
      ...slide.elements.map((element) => replacements.get(element.id) ?? element),
      ...additions,
    ],
  }
}
