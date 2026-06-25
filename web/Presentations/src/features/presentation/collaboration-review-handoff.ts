import { openMentionCount } from "./comment-mentions"
import type { Deck, PresentationElement, SlideComment } from "./types"

export type CollaborationReviewRole = "owner" | "editor" | "viewer"

export type CollaborationReviewHandoffMode =
  | "native-thread"
  | "native-thread-reply"
  | "speaker-note-handoff"

export type CollaborationReviewRolePolicy = {
  canComment: boolean
  canCopyOwnerExport: boolean
  canMerge: boolean
  canResolve: boolean
  canShare: boolean
  mergeStatus: "allowed" | "blocked"
  role: CollaborationReviewRole
}

export type CollaborationReviewHandoffItem = {
  authorName: string
  body: string
  commentId: string
  createdAt: string
  handoffLabel: string
  handoffMode: CollaborationReviewHandoffMode
  mentions: string[]
  ownerAction: string
  slideId: string
  slideNumber: number
  slideTitle: string
  sourceCommentId: string
  sourceParentCommentId: string
  sourceReplyDepth: number
  sourceThreadId: string
  targetLabel: string
  updatedAt: string
}

export type CollaborationReviewHandoffSnapshot = {
  downloadMode: "enabled" | "disabled"
  handoffStatus: "clear" | "needs-handoff"
  manualCommentCount: number
  mentionCount: number
  openCommentCount: number
  policy: CollaborationReviewRolePolicy
  pptxReplyCount: number
  pptxThreadCount: number
  role: CollaborationReviewRole
  slideCount: number
}

type HandoffOptions = {
  allowDownloads?: boolean
  role?: CollaborationReviewRole
}

function deckOpenComments(deck: Deck) {
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

function threadId(comment: SlideComment) {
  return comment.sourceThreadId || comment.sourceCommentId || ""
}

function isPptxReply(comment: SlideComment) {
  return Boolean(comment.sourceParentCommentId || comment.sourceReplyDepth)
}

function handoffMode(comment: SlideComment): CollaborationReviewHandoffMode {
  if (comment.source === "pptx" && isPptxReply(comment)) {
    return "native-thread-reply"
  }

  if (comment.source === "pptx" && threadId(comment)) {
    return "native-thread"
  }

  return "speaker-note-handoff"
}

function handoffLabel(mode: CollaborationReviewHandoffMode) {
  if (mode === "native-thread") return "PowerPoint root thread"
  if (mode === "native-thread-reply") return "PowerPoint reply thread"

  return "Speaker-note handoff"
}

function ownerAction(mode: CollaborationReviewHandoffMode) {
  if (mode === "native-thread") {
    return "Keep as the root item for the PowerPoint comment thread rebuild."
  }

  if (mode === "native-thread-reply") {
    return "Preserve parent, reply depth, and reply author context for thread rebuild."
  }

  return "Carry into export review notes until native PowerPoint comments are authored."
}

function sentence(value: string) {
  if (!value) return ""

  return /[.!?]$/.test(value) ? value : `${value}.`
}

export function collaborationReviewRolePolicy(
  role: CollaborationReviewRole = "owner",
): CollaborationReviewRolePolicy {
  const canWrite = role === "owner" || role === "editor"

  return {
    canComment: true,
    canCopyOwnerExport: role === "owner",
    canMerge: canWrite,
    canResolve: canWrite,
    canShare: role === "owner",
    mergeStatus: canWrite ? "allowed" : "blocked",
    role,
  }
}

export function collaborationReviewHandoffItems(
  deck: Deck,
): CollaborationReviewHandoffItem[] {
  return deckOpenComments(deck).map(({ comment, slide, slideIndex }) => {
    const mode = handoffMode(comment)

    return {
      authorName: comment.authorName,
      body: comment.body.trim(),
      commentId: comment.id,
      createdAt: comment.createdAt,
      handoffLabel: handoffLabel(mode),
      handoffMode: mode,
      mentions: comment.mentions ?? [],
      ownerAction: ownerAction(mode),
      slideId: slide.id,
      slideNumber: slideIndex + 1,
      slideTitle: slide.title || `Slide ${slideIndex + 1}`,
      sourceCommentId: comment.sourceCommentId ?? "",
      sourceParentCommentId: comment.sourceParentCommentId ?? "",
      sourceReplyDepth: comment.sourceReplyDepth ?? 0,
      sourceThreadId: threadId(comment),
      targetLabel: targetLabel(
        slide.elements.find((element) => element.id === comment.targetElementId),
      ),
      updatedAt: comment.updatedAt,
    }
  })
}

export function collaborationReviewHandoffSnapshot(
  deck: Deck,
  options: HandoffOptions = {},
): CollaborationReviewHandoffSnapshot {
  const items = collaborationReviewHandoffItems(deck)
  const comments = deckOpenComments(deck).map(({ comment }) => comment)
  const pptxThreadCount = new Set(
    items
      .filter((item) => item.sourceThreadId)
      .map((item) => item.sourceThreadId),
  ).size
  const pptxReplyCount = items.filter(
    (item) => item.handoffMode === "native-thread-reply",
  ).length
  const manualCommentCount = items.filter(
    (item) => item.handoffMode === "speaker-note-handoff",
  ).length

  return {
    downloadMode: options.allowDownloads === false ? "disabled" : "enabled",
    handoffStatus:
      items.length || pptxThreadCount || pptxReplyCount
        ? "needs-handoff"
        : "clear",
    manualCommentCount,
    mentionCount: openMentionCount(comments),
    openCommentCount: items.length,
    policy: collaborationReviewRolePolicy(options.role),
    pptxReplyCount,
    pptxThreadCount,
    role: options.role ?? "owner",
    slideCount: deck.slides.length,
  }
}

export function serializeCollaborationReviewHandoff(
  deck: Deck,
  options: HandoffOptions = {},
) {
  const snapshot = collaborationReviewHandoffSnapshot(deck, options)
  const items = collaborationReviewHandoffItems(deck)
  const lines = [
    "Collaboration review handoff",
    `Deck: ${deck.title}`,
    `Role: ${snapshot.role}`,
    `Slides: ${snapshot.slideCount}`,
    `Downloads: ${snapshot.downloadMode}`,
    `Open comments: ${snapshot.openCommentCount}`,
    `Mentions: ${snapshot.mentionCount}`,
    `PowerPoint threads: ${snapshot.pptxThreadCount}`,
    `PowerPoint replies: ${snapshot.pptxReplyCount}`,
    `Manual review notes: ${snapshot.manualCommentCount}`,
    `Merge access: ${snapshot.policy.mergeStatus}`,
    `Share access: ${snapshot.policy.canShare ? "allowed" : "blocked"}`,
    `Owner export: ${
      snapshot.policy.canCopyOwnerExport ? "allowed" : "blocked"
    }`,
    `Status: ${snapshot.handoffStatus}`,
  ]

  if (!items.length) {
    return [...lines, "", "No open review threads to hand off."].join("\n")
  }

  return [
    ...lines,
    "",
    "PowerPoint comment-thread plan:",
    ...items.map((item, index) => {
      const mentions = item.mentions.length
        ? ` Mentions: ${item.mentions.map((mention) => `@${mention}`).join(", ")}.`
        : ""
      const thread = item.sourceThreadId
        ? ` Thread: ${item.sourceThreadId}.`
        : ""
      const source = item.sourceCommentId
        ? ` Source comment: ${item.sourceCommentId}.`
        : ""
      const parent = item.sourceParentCommentId
        ? ` Reply to: ${item.sourceParentCommentId}.`
        : ""
      const depth = item.sourceReplyDepth
        ? ` Depth: ${item.sourceReplyDepth}.`
        : ""

      return `${index + 1}. Slide ${item.slideNumber} (${item.slideTitle}) - ${item.targetLabel}; ${item.authorName}: ${sentence(item.body)}${mentions}${thread}${source}${parent}${depth} Handoff: ${item.handoffLabel}. ${item.ownerAction}`
    }),
  ].join("\n")
}
