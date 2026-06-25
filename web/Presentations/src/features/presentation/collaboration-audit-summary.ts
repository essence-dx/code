import type { CollaborationReviewRole } from "./collaboration-review-handoff"
import type { DeckMergeResult } from "./deck-merge"
import {
  deckMergeSafetyReport,
  type DeckMergeResolutionChoice,
  type DeckMergeSafetyReport,
} from "./deck-merge-safety"
import {
  reviewThreadLifecycleItems,
  reviewThreadLifecycleSummary,
  type ReviewThreadLifecycleItem,
} from "./review-thread-lifecycle"
import type { Deck } from "./types"

export type CollaborationAuditStatus = "clear" | "needs-review" | "ready"

export type CollaborationAuditSummary = {
  blockedReplyControlCount: number
  conflictChoiceCount: number
  conflictCount: number
  enabledConflictChoiceCount: number
  mergeSafety: DeckMergeSafetyReport | null
  mixedThreadCount: number
  openThreadCount: number
  readyReplyControlCount: number
  replyControls: ReviewThreadLifecycleItem[]
  resolutionChoices: DeckMergeResolutionChoice[]
  resolvedThreadCount: number
  role: CollaborationReviewRole
  status: CollaborationAuditStatus
  summary: string
  threadCount: number
}

export type CollaborationAuditOptions = {
  mergeResult?: DeckMergeResult | null
  role?: CollaborationReviewRole
}

function plural(count: number, singular: string, pluralLabel = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralLabel}`
}

function auditStatus(input: {
  blockedReplyControlCount: number
  conflictCount: number
  mergeSafety: DeckMergeSafetyReport | null
  openThreadCount: number
}) {
  if (input.conflictCount || input.blockedReplyControlCount) {
    return "needs-review"
  }

  if (input.openThreadCount || input.mergeSafety) return "ready"

  return "clear"
}

function auditSummaryText(input: {
  conflictCount: number
  openThreadCount: number
  readyReplyControlCount: number
  role: CollaborationReviewRole
  status: CollaborationAuditStatus
  threadCount: number
}) {
  if (input.status === "clear") {
    return `No active collaboration work for ${input.role}.`
  }

  const threadPart = `${plural(input.threadCount, "review thread")} with ${plural(
    input.openThreadCount,
    "open thread",
  )}`
  const replyPart = `${plural(input.readyReplyControlCount, "reply control")} ready`
  const conflictPart = input.conflictCount
    ? ` and ${plural(input.conflictCount, "merge conflict")} needing choices`
    : ""

  return `${threadPart}, ${replyPart}${conflictPart} for ${input.role}.`
}

export function collaborationAuditSummary(
  deck: Deck,
  options: CollaborationAuditOptions = {},
): CollaborationAuditSummary {
  const role = options.role ?? "owner"
  const threadSummary = reviewThreadLifecycleSummary(deck, { role })
  const replyControls = reviewThreadLifecycleItems(deck, { role })
  const mergeSafety = options.mergeResult
    ? deckMergeSafetyReport(options.mergeResult, { role })
    : null
  const readyReplyControlCount = replyControls.filter(
    (item) => item.replyControl.enabled,
  ).length
  const blockedReplyControlCount = replyControls.length - readyReplyControlCount
  const conflictCount = mergeSafety?.conflictCount ?? 0
  const status = auditStatus({
    blockedReplyControlCount,
    conflictCount,
    mergeSafety,
    openThreadCount: threadSummary.openThreadCount,
  })
  const resolutionChoices = mergeSafety?.resolutionChoices ?? []
  const enabledConflictChoiceCount = resolutionChoices.filter(
    (choice) => choice.enabled,
  ).length

  return {
    blockedReplyControlCount,
    conflictChoiceCount: resolutionChoices.length,
    conflictCount,
    enabledConflictChoiceCount,
    mergeSafety,
    mixedThreadCount: threadSummary.mixedThreadCount,
    openThreadCount: threadSummary.openThreadCount,
    readyReplyControlCount,
    replyControls,
    resolutionChoices,
    resolvedThreadCount: threadSummary.resolvedThreadCount,
    role,
    status,
    summary: auditSummaryText({
      conflictCount,
      openThreadCount: threadSummary.openThreadCount,
      readyReplyControlCount,
      role,
      status,
      threadCount: threadSummary.threadCount,
    }),
    threadCount: threadSummary.threadCount,
  }
}

export function serializeCollaborationAuditSummary(
  deck: Deck,
  options: CollaborationAuditOptions = {},
) {
  const audit = collaborationAuditSummary(deck, options)
  const lines = [
    "Collaboration operation audit",
    `Deck: ${deck.title}`,
    `Role: ${audit.role}`,
    `Status: ${audit.status}`,
    `Summary: ${audit.summary}`,
    `Review threads: ${audit.threadCount}`,
    `Open/mixed/resolved: ${audit.openThreadCount}/${audit.mixedThreadCount}/${audit.resolvedThreadCount}`,
    `Reply controls: ${audit.readyReplyControlCount}/${audit.replyControls.length}`,
    `Merge conflicts: ${audit.conflictCount}`,
    `Conflict choices: ${audit.enabledConflictChoiceCount}/${audit.conflictChoiceCount}`,
  ]

  return [
    ...lines,
    "",
    "Thread reply controls:",
    ...(audit.replyControls.length
      ? audit.replyControls.map(
          (item, index) =>
            `${index + 1}. Slide ${item.slideNumber} (${item.slideTitle}) - ${item.replyControl.label}; ${item.replyControl.mode}; depth ${item.replyControl.nextReplyDepth}; ${item.replyControl.reason}`,
        )
      : ["None"]),
    "",
    "Conflict resolution choices:",
    ...(audit.resolutionChoices.length
      ? audit.resolutionChoices.map(
          (choice, index) =>
            `${index + 1}. ${choice.label}: ${choice.enabled ? "enabled" : "blocked"}; risk ${choice.risk}; ${choice.detail}`,
        )
      : ["None"]),
  ].join("\n")
}
