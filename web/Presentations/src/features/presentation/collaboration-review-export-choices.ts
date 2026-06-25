import {
  collaborationReviewHandoffSnapshot,
  serializeCollaborationReviewHandoff,
  type CollaborationReviewRole,
} from "./collaboration-review-handoff"
import {
  pptxCommentThreadPlan,
  serializePptxCommentThreadPlan,
} from "./pptx-comment-thread-plan"
import {
  pptxCommentXmlAuthoring,
  serializePptxCommentXmlAuthoring,
} from "./pptx-comment-xml-authoring"
import {
  serializeSharedViewReviewReport,
  sharedViewReviewSnapshot,
} from "./shared-view-review"
import type { Deck } from "./types"

export type CollaborationReviewExportChoiceId =
  | "owner-review-handoff"
  | "pptx-comment-thread-plan"
  | "pptx-comment-xml-authoring"
  | "shared-review-report"

export type CollaborationReviewExportFormat = "text" | "xml-plan"

export type CollaborationReviewExportChoice = {
  detail: string
  enabled: boolean
  format: CollaborationReviewExportFormat
  id: CollaborationReviewExportChoiceId
  label: string
  reason: string
}

type CollaborationReviewExportOptions = {
  allowDownloads?: boolean
  role?: CollaborationReviewRole
}

function exportBlockedReason(input: {
  allowDownloads?: boolean
  hasContent: boolean
  ownerOnly?: boolean
  role: CollaborationReviewRole
}) {
  if (input.allowDownloads === false) {
    return "Deck downloads are disabled for this shared view."
  }

  if (input.ownerOnly && input.role !== "owner") {
    return "Only owners can copy owner-level PowerPoint review exports."
  }

  if (!input.hasContent) {
    return "No matching review content is available for this export."
  }

  return "Ready to copy."
}

function canExport(input: {
  allowDownloads?: boolean
  hasContent: boolean
  ownerOnly?: boolean
  role: CollaborationReviewRole
}) {
  return (
    input.allowDownloads !== false &&
    input.hasContent &&
    (!input.ownerOnly || input.role === "owner")
  )
}

export function collaborationReviewExportChoices(
  deck: Deck,
  options: CollaborationReviewExportOptions = {},
): CollaborationReviewExportChoice[] {
  const role = options.role ?? "owner"
  const handoff = collaborationReviewHandoffSnapshot(deck, options)
  const commentPlan = pptxCommentThreadPlan(deck)
  const xmlAuthoring = pptxCommentXmlAuthoring(deck)
  const sharedReview = sharedViewReviewSnapshot(deck, options)
  const ownerHandoffAvailable = handoff.openCommentCount > 0
  const threadPlanAvailable = commentPlan.items.length > 0
  const xmlPlanAvailable =
    xmlAuthoring.totalPartCount > 0 ||
    commentPlan.manualHandoffCount > 0 ||
    commentPlan.missingAnchorCount > 0
  const sharedReportAvailable =
    sharedReview.openCommentCount > 0 || sharedReview.notesSlideCount > 0

  return [
    {
      detail: `${handoff.openCommentCount} open comment(s), ${handoff.pptxThreadCount} PowerPoint thread(s), ${handoff.manualCommentCount} manual handoff(s).`,
      enabled: canExport({
        allowDownloads: options.allowDownloads,
        hasContent: ownerHandoffAvailable,
        ownerOnly: true,
        role,
      }),
      format: "text",
      id: "owner-review-handoff",
      label: "Owner review handoff",
      reason: exportBlockedReason({
        allowDownloads: options.allowDownloads,
        hasContent: ownerHandoffAvailable,
        ownerOnly: true,
        role,
      }),
    },
    {
      detail: `${commentPlan.nativeThreadCount} native thread group(s), ${commentPlan.nativeReplyCount} reply item(s), ${commentPlan.manualHandoffCount} manual handoff(s).`,
      enabled: canExport({
        allowDownloads: options.allowDownloads,
        hasContent: threadPlanAvailable,
        ownerOnly: true,
        role,
      }),
      format: "text",
      id: "pptx-comment-thread-plan",
      label: "PowerPoint thread plan",
      reason: exportBlockedReason({
        allowDownloads: options.allowDownloads,
        hasContent: threadPlanAvailable,
        ownerOnly: true,
        role,
      }),
    },
    {
      detail: `${xmlAuthoring.readyPartCount}/${xmlAuthoring.totalPartCount} XML package part(s), ${xmlAuthoring.nativeCommentCount} native comment(s), ${xmlAuthoring.manualHandoffCount} manual handoff(s).`,
      enabled: canExport({
        allowDownloads: options.allowDownloads,
        hasContent: xmlPlanAvailable,
        ownerOnly: true,
        role,
      }),
      format: "xml-plan",
      id: "pptx-comment-xml-authoring",
      label: "Comment XML authoring",
      reason: exportBlockedReason({
        allowDownloads: options.allowDownloads,
        hasContent: xmlPlanAvailable,
        ownerOnly: true,
        role,
      }),
    },
    {
      detail: `${sharedReview.openCommentCount} open comment(s), ${sharedReview.mentionCount} mention(s), ${sharedReview.notesSlideCount} slide(s) with notes.`,
      enabled: canExport({
        allowDownloads: options.allowDownloads,
        hasContent: sharedReportAvailable,
        role,
      }),
      format: "text",
      id: "shared-review-report",
      label: "Shared review report",
      reason: exportBlockedReason({
        allowDownloads: options.allowDownloads,
        hasContent: sharedReportAvailable,
        role,
      }),
    },
  ]
}

export function collaborationReviewExportText(
  deck: Deck,
  choiceId: CollaborationReviewExportChoiceId,
  options: CollaborationReviewExportOptions = {},
) {
  if (choiceId === "pptx-comment-thread-plan") {
    return serializePptxCommentThreadPlan(deck)
  }

  if (choiceId === "pptx-comment-xml-authoring") {
    return serializePptxCommentXmlAuthoring(deck)
  }

  if (choiceId === "shared-review-report") {
    return serializeSharedViewReviewReport(deck, options)
  }

  return serializeCollaborationReviewHandoff(deck, options)
}
