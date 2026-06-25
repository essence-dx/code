import { openMentionCount } from "./comment-mentions"
import type { CollaborationReviewRole } from "./collaboration-review-handoff"
import type { Deck, SlideComment } from "./types"

export type ReviewThreadLifecycleState = "mixed" | "open" | "resolved"

export type ReviewThreadLifecycleMode =
  | "manual-thread"
  | "pptx-root-thread"
  | "pptx-reply-thread"

export type ReviewThreadLifecycleActionId =
  | "copy-handoff"
  | "delete"
  | "reopen"
  | "reply"
  | "resolve"

export type ReviewThreadReplyControlMode =
  | "read-only"
  | "reopen-to-reply"
  | "reply"

export type ReviewThreadLifecycleAction = {
  enabled: boolean
  id: ReviewThreadLifecycleActionId
  label: string
  reason: string
}

export type ReviewThreadReplyControl = {
  enabled: boolean
  label: string
  mode: ReviewThreadReplyControlMode
  nextReplyDepth: number
  parentCommentId: string
  reason: string
  targetCommentId: string
}

export type ReviewThreadLifecycleItem = {
  actions: ReviewThreadLifecycleAction[]
  commentIds: string[]
  id: string
  mentionCount: number
  mode: ReviewThreadLifecycleMode
  openCount: number
  replyControl: ReviewThreadReplyControl
  resolvedCount: number
  slideId: string
  slideNumber: number
  slideTitle: string
  state: ReviewThreadLifecycleState
  threadId: string
}

export type ReviewThreadLifecycleSummary = {
  blockedActionCount: number
  mixedThreadCount: number
  openThreadCount: number
  resolvedThreadCount: number
  role: CollaborationReviewRole
  summary: string
  threadCount: number
}

type ReviewThreadLifecycleOptions = {
  role?: CollaborationReviewRole
}

type ThreadRecord = {
  comments: SlideComment[]
  slideId: string
  slideNumber: number
  slideTitle: string
  threadId: string
}

function threadId(comment: SlideComment) {
  return (
    comment.sourceThreadId ||
    comment.sourceParentCommentId ||
    comment.sourceCommentId ||
    comment.id
  )
}

function threadMode(comments: SlideComment[]): ReviewThreadLifecycleMode {
  if (
    comments.some(
      (comment) => comment.source === "pptx" && comment.sourceParentCommentId,
    )
  ) {
    return "pptx-reply-thread"
  }

  if (comments.some((comment) => comment.source === "pptx")) {
    return "pptx-root-thread"
  }

  return "manual-thread"
}

function lifecycleState(comments: SlideComment[]): ReviewThreadLifecycleState {
  const openCount = comments.filter((comment) => !comment.resolved).length
  const resolvedCount = comments.length - openCount

  if (openCount && resolvedCount) return "mixed"
  if (openCount) return "open"

  return "resolved"
}

function canModerate(role: CollaborationReviewRole) {
  return role === "owner" || role === "editor"
}

function action(
  id: ReviewThreadLifecycleActionId,
  label: string,
  enabled: boolean,
  reason: string,
): ReviewThreadLifecycleAction {
  return { enabled, id, label, reason }
}

function lifecycleActions(
  state: ReviewThreadLifecycleState,
  role: CollaborationReviewRole,
) {
  const moderate = canModerate(role)

  return [
    action(
      "reply",
      "Reply",
      state !== "resolved",
      state === "resolved"
        ? "Resolved threads should be reopened before replies are added."
        : "Add a reply to keep the review thread moving.",
    ),
    action(
      "resolve",
      "Resolve",
      moderate && state !== "resolved",
      moderate
        ? "Resolve open review work in this thread."
        : "Only owners and editors can resolve review threads.",
    ),
    action(
      "reopen",
      "Reopen",
      moderate && state !== "open",
      moderate
        ? "Reopen resolved comments when follow-up is needed."
        : "Only owners and editors can reopen review threads.",
    ),
    action(
      "delete",
      "Delete",
      role === "owner",
      role === "owner"
        ? "Delete the thread when it is no longer useful."
        : "Only owners can delete review threads.",
    ),
    action(
      "copy-handoff",
      "Copy handoff",
      role === "owner",
      role === "owner"
        ? "Copy the PowerPoint handoff details for this thread."
        : "Only owners can copy owner-level PowerPoint handoff reports.",
    ),
  ]
}

function latestComment(comments: SlideComment[]) {
  return [...comments].sort((first, second) => {
    const firstTime = Date.parse(first.updatedAt || first.createdAt)
    const secondTime = Date.parse(second.updatedAt || second.createdAt)
    const safeFirstTime = Number.isFinite(firstTime) ? firstTime : 0
    const safeSecondTime = Number.isFinite(secondTime) ? secondTime : 0

    return safeSecondTime - safeFirstTime || second.id.localeCompare(first.id)
  })[0]
}

function maxReplyDepth(comments: SlideComment[]) {
  return comments.reduce(
    (depth, comment) => Math.max(depth, comment.sourceReplyDepth ?? 0),
    0,
  )
}

function replyControl(
  comments: SlideComment[],
  state: ReviewThreadLifecycleState,
  mode: ReviewThreadLifecycleMode,
  role: CollaborationReviewRole,
): ReviewThreadReplyControl {
  const latest = latestComment(comments)
  const parentCommentId =
    latest?.sourceCommentId || latest?.sourceParentCommentId || latest?.id || ""
  const targetCommentId = latest?.id ?? ""
  const nextReplyDepth =
    mode === "manual-thread" ? 0 : Math.min(12, maxReplyDepth(comments) + 1)

  if (state === "resolved") {
    const enabled = canModerate(role)

    return {
      enabled,
      label: enabled ? "Reopen to reply" : "Read only",
      mode: enabled ? "reopen-to-reply" : "read-only",
      nextReplyDepth,
      parentCommentId,
      reason: enabled
        ? "Resolved threads need to be reopened before new replies are added."
        : "Only owners and editors can reopen resolved threads before replying.",
      targetCommentId,
    }
  }

  return {
    enabled: true,
    label:
      mode === "pptx-reply-thread"
        ? "Reply in PowerPoint thread"
        : mode === "pptx-root-thread"
          ? "Reply to imported thread"
          : "Reply to thread",
    mode: "reply",
    nextReplyDepth,
    parentCommentId,
    reason:
      mode === "manual-thread"
        ? "Add an Essence reply to keep this review thread moving."
        : "Preserve parent, depth, and source-thread context for imported PowerPoint replies.",
    targetCommentId,
  }
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`
}

export function reviewThreadLifecycleItems(
  deck: Deck,
  options: ReviewThreadLifecycleOptions = {},
): ReviewThreadLifecycleItem[] {
  const role = options.role ?? "owner"
  const records = new Map<string, ThreadRecord>()

  deck.slides.forEach((slide, slideIndex) => {
    for (const comment of slide.comments ?? []) {
      const id = threadId(comment)
      const key = `${slide.id}:${id}`
      const record =
        records.get(key) ??
        ({
          comments: [],
          slideId: slide.id,
          slideNumber: slideIndex + 1,
          slideTitle: slide.title || `Slide ${slideIndex + 1}`,
          threadId: id,
        } satisfies ThreadRecord)

      record.comments.push(comment)
      records.set(key, record)
    }
  })

  return Array.from(records.values()).map((record) => {
    const state = lifecycleState(record.comments)
    const mode = threadMode(record.comments)
    const openCount = record.comments.filter((comment) => !comment.resolved).length
    const resolvedCount = record.comments.length - openCount

    return {
      actions: lifecycleActions(state, role),
      commentIds: record.comments.map((comment) => comment.id),
      id: `${record.slideId}:${record.threadId}`,
      mentionCount: openMentionCount(record.comments),
      mode,
      openCount,
      replyControl: replyControl(record.comments, state, mode, role),
      resolvedCount,
      slideId: record.slideId,
      slideNumber: record.slideNumber,
      slideTitle: record.slideTitle,
      state,
      threadId: record.threadId,
    }
  })
}

export function reviewThreadLifecycleSummary(
  deck: Deck,
  options: ReviewThreadLifecycleOptions = {},
): ReviewThreadLifecycleSummary {
  const role = options.role ?? "owner"
  const items = reviewThreadLifecycleItems(deck, { role })
  const openThreadCount = items.filter((item) => item.state === "open").length
  const resolvedThreadCount = items.filter(
    (item) => item.state === "resolved",
  ).length
  const mixedThreadCount = items.filter((item) => item.state === "mixed").length
  const blockedActionCount = items.reduce(
    (total, item) =>
      total + item.actions.filter((action) => !action.enabled).length,
    0,
  )

  return {
    blockedActionCount,
    mixedThreadCount,
    openThreadCount,
    resolvedThreadCount,
    role,
    summary: items.length
      ? `${plural(openThreadCount, "open thread")}, ${plural(
          mixedThreadCount,
          "mixed thread",
        )}, and ${plural(resolvedThreadCount, "resolved thread")} for ${role}.`
      : `No review threads for ${role}.`,
    threadCount: items.length,
  }
}
