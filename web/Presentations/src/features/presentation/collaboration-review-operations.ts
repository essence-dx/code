import {
  collaborationAuditSummary,
  serializeCollaborationAuditSummary,
  type CollaborationAuditSummary,
} from "./collaboration-audit-summary"
import {
  collaborationReviewHandoffSnapshot,
  type CollaborationReviewHandoffSnapshot,
  type CollaborationReviewRole,
} from "./collaboration-review-handoff"
import {
  collaborationReviewExportChoices,
  type CollaborationReviewExportChoice,
} from "./collaboration-review-export-choices"
import {
  collaborationReviewerMergePreview,
  type CollaborationReviewerMergePreview,
} from "./collaboration-review-merge-preview"
import {
  pptxCommentThreadPlan,
  type PptxCommentThreadPlan,
} from "./pptx-comment-thread-plan"
import {
  pptxCommentXmlAuthoring,
  type PptxCommentXmlAuthoring,
} from "./pptx-comment-xml-authoring"
import {
  sharedViewReviewSnapshot,
  type SharedViewReviewSnapshot,
} from "./shared-view-review"
import type { Deck } from "./types"

export {
  collaborationReviewExportChoices,
  collaborationReviewExportText,
  type CollaborationReviewExportChoice,
  type CollaborationReviewExportChoiceId,
  type CollaborationReviewExportFormat,
} from "./collaboration-review-export-choices"
export {
  collaborationReviewerMergePreview,
  type CollaborationReviewerMergePreview,
  type CollaborationReviewerMergePreviewOptions,
  type CollaborationReviewerMergePreviewStatus,
} from "./collaboration-review-merge-preview"

export type CollaborationReviewOperationsStatus =
  | "attention"
  | "clear"
  | "ready"

export type CollaborationReviewOperationsSnapshot = {
  audit: CollaborationAuditSummary
  commentPlan: PptxCommentThreadPlan
  downloadMode: "enabled" | "disabled"
  exportChoices: CollaborationReviewExportChoice[]
  enabledExportChoiceCount: number
  handoff: CollaborationReviewHandoffSnapshot
  mergePreview: CollaborationReviewerMergePreview
  role: CollaborationReviewRole
  sharedReview: SharedViewReviewSnapshot
  status: CollaborationReviewOperationsStatus
  xmlAuthoring: PptxCommentXmlAuthoring
}

export type CollaborationReviewOperationsOptions = {
  allowDownloads?: boolean
  baseDeck?: Deck | null
  cloudDeck?: Deck | null
  localDeck?: Deck | null
  role?: CollaborationReviewRole
}

function operationsStatus(input: {
  audit: CollaborationAuditSummary
  enabledExportChoiceCount: number
  handoff: CollaborationReviewHandoffSnapshot
  mergePreview: CollaborationReviewerMergePreview
  sharedReview: SharedViewReviewSnapshot
}) {
  if (
    input.audit.status === "needs-review" ||
    input.handoff.handoffStatus === "needs-handoff" ||
    input.mergePreview.status === "blocked" ||
    input.mergePreview.status === "conflict" ||
    input.sharedReview.reviewStatus === "needs-review"
  ) {
    return "attention"
  }

  if (
    input.enabledExportChoiceCount ||
    input.audit.status === "ready" ||
    input.mergePreview.status === "ready"
  ) {
    return "ready"
  }

  return "clear"
}

export function collaborationReviewOperationsSnapshot(
  deck: Deck,
  options: CollaborationReviewOperationsOptions = {},
): CollaborationReviewOperationsSnapshot {
  const role = options.role ?? "owner"
  const mergePreview = collaborationReviewerMergePreview({
    baseDeck: options.baseDeck,
    cloudDeck: options.cloudDeck,
    localDeck: options.localDeck,
    role,
  })
  const handoff = collaborationReviewHandoffSnapshot(deck, {
    allowDownloads: options.allowDownloads,
    role,
  })
  const sharedReview = sharedViewReviewSnapshot(deck, {
    allowDownloads: options.allowDownloads,
  })
  const commentPlan = pptxCommentThreadPlan(deck)
  const xmlAuthoring = pptxCommentXmlAuthoring(deck)
  const audit = collaborationAuditSummary(deck, {
    mergeResult: mergePreview.mergeResult,
    role,
  })
  const exportChoices = collaborationReviewExportChoices(deck, {
    allowDownloads: options.allowDownloads,
    role,
  })
  const enabledExportChoiceCount = exportChoices.filter(
    (choice) => choice.enabled,
  ).length

  return {
    audit,
    commentPlan,
    downloadMode: options.allowDownloads === false ? "disabled" : "enabled",
    exportChoices,
    enabledExportChoiceCount,
    handoff,
    mergePreview,
    role,
    sharedReview,
    status: operationsStatus({
      audit,
      enabledExportChoiceCount,
      handoff,
      mergePreview,
      sharedReview,
    }),
    xmlAuthoring,
  }
}

export function serializeCollaborationReviewOperationsSnapshot(
  deck: Deck,
  options: CollaborationReviewOperationsOptions = {},
) {
  const snapshot = collaborationReviewOperationsSnapshot(deck, options)
  const lines = [
    "Collaboration reviewer operations",
    `Deck: ${deck.title}`,
    `Role: ${snapshot.role}`,
    `Status: ${snapshot.status}`,
    `Downloads: ${snapshot.downloadMode}`,
    `Open comments: ${snapshot.handoff.openCommentCount}`,
    `Mentions: ${snapshot.handoff.mentionCount}`,
    `Native comment threads: ${snapshot.commentPlan.nativeThreadCount}`,
    `Native comment replies: ${snapshot.commentPlan.nativeReplyCount}`,
    `Comment XML parts: ${snapshot.xmlAuthoring.readyPartCount}/${snapshot.xmlAuthoring.totalPartCount}`,
    `Owner export choices: ${snapshot.enabledExportChoiceCount}/${snapshot.exportChoices.length} enabled`,
    `Merge preview: ${snapshot.mergePreview.status}`,
    `Merge summary: ${snapshot.mergePreview.summary}`,
    `Role audit: ${snapshot.audit.status}`,
    `Audit summary: ${snapshot.audit.summary}`,
    "",
    "Export choices:",
    ...snapshot.exportChoices.map(
      (choice, index) =>
        `${index + 1}. ${choice.label}: ${choice.enabled ? "enabled" : "blocked"}; ${choice.format}; ${choice.detail} ${choice.reason}`,
    ),
    "",
    serializeCollaborationAuditSummary(deck, {
      mergeResult: snapshot.mergePreview.mergeResult,
      role: snapshot.role,
    }),
  ]

  return lines.join("\n")
}
