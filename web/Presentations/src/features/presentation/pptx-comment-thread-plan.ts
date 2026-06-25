import { openMentionCount } from "./comment-mentions"
import type { Deck, PresentationElement, SlideComment } from "./types"

export type PptxCommentThreadPlanMode =
  | "native-thread"
  | "speaker-note-handoff"

export type PptxCommentThreadAnchorStatus = "ready" | "missing"

export type PptxCommentThreadPlanItem = {
  anchorStatus: PptxCommentThreadAnchorStatus
  authorNames: string[]
  commentCount: number
  commentIds: string[]
  handoffReason: string
  id: string
  mentionCount: number
  mode: PptxCommentThreadPlanMode
  replyCount: number
  rootCommentId: string
  rootSourceCommentId: string
  slideId: string
  slideNumber: number
  slideTitle: string
  sourceThreadId: string
  targetElementId: string
  targetLabel: string
}

export type PptxCommentThreadPlan = {
  anchorReadyCount: number
  items: PptxCommentThreadPlanItem[]
  manualHandoffCount: number
  mentionCount: number
  missingAnchorCount: number
  nativeReplyCount: number
  nativeThreadCount: number
  totalOpenComments: number
}

type OpenCommentRecord = {
  comment: SlideComment
  slide: Deck["slides"][number]
  slideIndex: number
}

function openCommentRecords(deck: Deck): OpenCommentRecord[] {
  return deck.slides.flatMap((slide, slideIndex) =>
    (slide.comments ?? [])
      .filter((comment) => !comment.resolved)
      .map((comment) => ({ comment, slide, slideIndex })),
  )
}

function targetLabel(element: PresentationElement | undefined) {
  if (!element) return "Slide"
  if (element.type === "image") return element.alt || "Image"
  if (element.type === "video") return element.alt || "Video"
  if (element.type === "audio") return element.alt || "Audio"
  if (element.type === "chart") return "Chart"
  if (element.type === "table") return "Table"
  if (element.type === "shape") return "Shape"

  return element.content.trim().split(/\r?\n/)[0] || element.type
}

function sourceThreadId(comment: SlideComment) {
  return comment.sourceThreadId || comment.sourceCommentId || ""
}

function nativeCommentKey(comment: SlideComment) {
  return sourceThreadId(comment) || comment.id
}

function isNativeThreadCandidate(comment: SlideComment) {
  return comment.source === "pptx" && Boolean(sourceThreadId(comment))
}

function isReplyComment(comment: SlideComment) {
  return Boolean(comment.sourceParentCommentId || comment.sourceReplyDepth)
}

function earliestFirst(
  first: OpenCommentRecord,
  second: OpenCommentRecord,
) {
  return (
    first.comment.createdAt.localeCompare(second.comment.createdAt) ||
    first.comment.id.localeCompare(second.comment.id)
  )
}

function rootRecord(records: OpenCommentRecord[]) {
  const sortedRecords = [...records].sort(earliestFirst)
  return (
    sortedRecords.find((record) => !isReplyComment(record.comment)) ??
    sortedRecords[0]
  )
}

function uniqueNonEmpty(values: string[]) {
  return Array.from(
    values.reduce((seen, value) => {
      const trimmed = value.trim()
      if (trimmed) seen.add(trimmed)
      return seen
    }, new Set<string>()),
  )
}

function hasUsableAnchor(
  records: OpenCommentRecord[],
  slideElements: PresentationElement[],
) {
  return records.some(({ comment }) => {
    if (comment.sourceAnchor) return true

    return Boolean(
      comment.targetElementId &&
        slideElements.some((element) => element.id === comment.targetElementId),
    )
  })
}

function manualHandoffReason(comment: SlideComment) {
  if (comment.source !== "pptx") {
    return "Manual Essence comments do not have native PowerPoint comment ids yet."
  }

  return "Imported PowerPoint comment is missing a reusable thread or comment id."
}

function nativeHandoffReason(
  records: OpenCommentRecord[],
  anchorStatus: PptxCommentThreadAnchorStatus,
) {
  const replyCount = records.filter((record) =>
    isReplyComment(record.comment),
  ).length
  const anchorText =
    anchorStatus === "ready"
      ? "anchored to source coordinates or a target element"
      : "needs anchor review before native XML authoring"

  if (replyCount) {
    return `Native PowerPoint comment XML candidate with ${replyCount} reply item(s), ${anchorText}.`
  }

  return `Native PowerPoint root comment XML candidate, ${anchorText}.`
}

function planItemFromRecords(
  id: string,
  mode: PptxCommentThreadPlanMode,
  records: OpenCommentRecord[],
): PptxCommentThreadPlanItem {
  const root = rootRecord(records)
  const slide = root.slide
  const comments = records.map((record) => record.comment)
  const targetElementId =
    comments.find((comment) => comment.targetElementId)?.targetElementId ?? ""
  const anchorStatus: PptxCommentThreadAnchorStatus = hasUsableAnchor(
    records,
    slide.elements,
  )
    ? "ready"
    : "missing"
  const replyCount = comments.filter(isReplyComment).length

  return {
    anchorStatus,
    authorNames: uniqueNonEmpty(comments.map((comment) => comment.authorName)),
    commentCount: comments.length,
    commentIds: comments.map((comment) => comment.id),
    handoffReason:
      mode === "native-thread"
        ? nativeHandoffReason(records, anchorStatus)
        : manualHandoffReason(root.comment),
    id,
    mentionCount: openMentionCount(comments),
    mode,
    replyCount,
    rootCommentId: root.comment.id,
    rootSourceCommentId: root.comment.sourceCommentId ?? "",
    slideId: slide.id,
    slideNumber: root.slideIndex + 1,
    slideTitle: slide.title || `Slide ${root.slideIndex + 1}`,
    sourceThreadId: mode === "native-thread" ? sourceThreadId(root.comment) : "",
    targetElementId,
    targetLabel: targetLabel(
      slide.elements.find((element) => element.id === targetElementId),
    ),
  }
}

function itemSortValue(mode: PptxCommentThreadPlanMode) {
  return mode === "native-thread" ? 0 : 1
}

export function pptxCommentThreadPlan(deck: Deck): PptxCommentThreadPlan {
  const records = openCommentRecords(deck)
  const nativeGroups = new Map<string, OpenCommentRecord[]>()
  const items: PptxCommentThreadPlanItem[] = []

  for (const record of records) {
    if (!isNativeThreadCandidate(record.comment)) {
      items.push(
        planItemFromRecords(
          `manual:${record.slide.id}:${record.comment.id}`,
          "speaker-note-handoff",
          [record],
        ),
      )
      continue
    }

    const key = `${record.slide.id}:${nativeCommentKey(record.comment)}`
    nativeGroups.set(key, [...(nativeGroups.get(key) ?? []), record])
  }

  for (const [key, groupRecords] of nativeGroups) {
    items.push(planItemFromRecords(`native:${key}`, "native-thread", groupRecords))
  }

  items.sort(
    (first, second) =>
      first.slideNumber - second.slideNumber ||
      itemSortValue(first.mode) - itemSortValue(second.mode) ||
      first.rootCommentId.localeCompare(second.rootCommentId),
  )

  const nativeThreadCount = items.filter(
    (item) => item.mode === "native-thread",
  ).length
  const manualHandoffCount = items
    .filter((item) => item.mode === "speaker-note-handoff")
    .reduce((total, item) => total + item.commentCount, 0)
  const nativeReplyCount = items
    .filter((item) => item.mode === "native-thread")
    .reduce((total, item) => total + item.replyCount, 0)
  const missingAnchorCount = items.filter(
    (item) => item.anchorStatus === "missing",
  ).length
  const mentionCount = items.reduce(
    (total, item) => total + item.mentionCount,
    0,
  )

  return {
    anchorReadyCount: items.length - missingAnchorCount,
    items,
    manualHandoffCount,
    mentionCount,
    missingAnchorCount,
    nativeReplyCount,
    nativeThreadCount,
    totalOpenComments: records.length,
  }
}

export function serializePptxCommentThreadPlan(deck: Deck) {
  const plan = pptxCommentThreadPlan(deck)
  const lines = [
    "PowerPoint comment XML plan",
    `Deck: ${deck.title}`,
    `Open comments: ${plan.totalOpenComments}`,
    `Mentions: ${plan.mentionCount}`,
    `Native threads: ${plan.nativeThreadCount}`,
    `Native replies: ${plan.nativeReplyCount}`,
    `Manual comment handoffs: ${plan.manualHandoffCount}`,
    `Anchor-ready groups: ${plan.anchorReadyCount}/${plan.items.length}`,
  ]

  if (!plan.items.length) {
    return [...lines, "", "No open comments need native XML planning."].join("\n")
  }

  return [
    ...lines,
    "",
    "Thread rebuild queue:",
    ...plan.items.map((item, index) => {
      const authors = item.authorNames.length
        ? ` Authors: ${item.authorNames.join(", ")}.`
        : ""
      const thread = item.sourceThreadId
        ? ` Thread: ${item.sourceThreadId}.`
        : ""
      const source = item.rootSourceCommentId
        ? ` Root source comment: ${item.rootSourceCommentId}.`
        : ""

      return `${index + 1}. Slide ${item.slideNumber} (${item.slideTitle}) - ${item.targetLabel}; ${item.mode}; comments ${item.commentCount}; replies ${item.replyCount}; anchor ${item.anchorStatus}.${authors}${thread}${source} ${item.handoffReason}`
    }),
  ].join("\n")
}
