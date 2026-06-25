import { openMentionCount } from "./comment-mentions"
import type { Deck, SlideComment } from "./types"

export type SharedViewReviewSnapshot = {
  downloadMode: "enabled" | "disabled"
  mentionCount: number
  notesSlideCount: number
  openCommentCount: number
  pptxThreadCount: number
  reviewStatus: "clear" | "needs-review"
  slideCount: number
}

export type SharedViewReviewItem = {
  authorName: string
  body: string
  mentions: string[]
  slideNumber: number
  slideTitle: string
  sourceThreadId: string
  targetLabel: string
  updatedAt: string
}

function deckComments(deck: Deck) {
  return deck.slides.flatMap((slide) => slide.comments ?? [])
}

function openComments(deck: Deck) {
  return deckComments(deck).filter((comment) => !comment.resolved)
}

function pptxThreadCount(comments: SlideComment[]) {
  return new Set(
    comments
      .filter((comment) => comment.source === "pptx")
      .map((comment) => comment.sourceThreadId || comment.sourceCommentId || "")
      .filter(Boolean),
  ).size
}

function commentTargetLabel(
  slide: Deck["slides"][number],
  targetElementId: string,
) {
  if (!targetElementId) return "Slide"

  const target = slide.elements.find((element) => element.id === targetElementId)
  if (!target) return "Object"
  if (target.type === "image") return target.alt || "Image"
  if (target.type === "video") return target.alt || "Video"
  if (target.type === "audio") return target.alt || "Audio"
  if (target.type === "chart") return "Chart"
  if (target.type === "table") return "Table"
  if (target.type === "shape") return "Shape"

  return target.content.trim().split(/\r?\n/)[0] || target.type
}

function sentence(value: string) {
  if (!value) return ""

  return /[.!?]$/.test(value) ? value : `${value}.`
}

export function sharedViewReviewSnapshot(
  deck: Deck,
  options: { allowDownloads?: boolean } = {},
): SharedViewReviewSnapshot {
  const unresolved = openComments(deck)
  const mentionCount = openMentionCount(unresolved)
  const unresolvedThreadCount = pptxThreadCount(unresolved)

  return {
    downloadMode: options.allowDownloads === false ? "disabled" : "enabled",
    mentionCount,
    notesSlideCount: deck.slides.filter((slide) => slide.notes.trim()).length,
    openCommentCount: unresolved.length,
    pptxThreadCount: unresolvedThreadCount,
    reviewStatus:
      unresolved.length || mentionCount || unresolvedThreadCount
        ? "needs-review"
        : "clear",
    slideCount: deck.slides.length,
  }
}

export function sharedViewReviewItems(deck: Deck): SharedViewReviewItem[] {
  return deck.slides.flatMap((slide, slideIndex) =>
    (slide.comments ?? [])
      .filter((comment) => !comment.resolved)
      .map((comment) => ({
        authorName: comment.authorName,
        body: comment.body.trim(),
        mentions: comment.mentions ?? [],
        slideNumber: slideIndex + 1,
        slideTitle: slide.title || `Slide ${slideIndex + 1}`,
        sourceThreadId: comment.sourceThreadId || comment.sourceCommentId || "",
        targetLabel: commentTargetLabel(slide, comment.targetElementId),
        updatedAt: comment.updatedAt,
      })),
  )
}

export function serializeSharedViewReviewReport(
  deck: Deck,
  options: { allowDownloads?: boolean } = {},
) {
  const snapshot = sharedViewReviewSnapshot(deck, options)
  const items = sharedViewReviewItems(deck)
  const lines = [
    "Shared deck review report",
    `Deck: ${deck.title}`,
    `Slides: ${snapshot.slideCount}`,
    `Downloads: ${snapshot.downloadMode}`,
    `Open comments: ${snapshot.openCommentCount}`,
    `Mentions: ${snapshot.mentionCount}`,
    `PPTX threads: ${snapshot.pptxThreadCount}`,
    `Slides with notes: ${snapshot.notesSlideCount}`,
    `Status: ${snapshot.reviewStatus}`,
  ]

  if (!items.length) {
    return [...lines, "", "No open review comments."].join("\n")
  }

  return [
    ...lines,
    "",
    "Open review comments:",
    ...items.map((item, index) => {
      const mentions = item.mentions.length
        ? ` Mentions: ${item.mentions.map((mention) => `@${mention}`).join(", ")}.`
        : ""
      const thread = item.sourceThreadId
        ? ` PPTX thread: ${item.sourceThreadId}.`
        : ""

      return `${index + 1}. Slide ${item.slideNumber} (${item.slideTitle}) - ${item.targetLabel}; ${item.authorName}: ${sentence(item.body)}${mentions}${thread}`
    }),
  ].join("\n")
}
