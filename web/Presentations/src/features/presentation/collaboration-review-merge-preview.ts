import type { CollaborationReviewRole } from "./collaboration-review-handoff"
import {
  compareDeckVersions,
  type DeckConflictPreview,
} from "./deck-conflict-preview"
import {
  mergeDeckVersions,
  type DeckMergeResult,
} from "./deck-merge"
import {
  deckMergeSafetyReport,
  type DeckMergeSafetyReport,
} from "./deck-merge-safety"
import type { Deck } from "./types"

export type CollaborationReviewerMergePreviewStatus =
  | "blocked"
  | "conflict"
  | "not-requested"
  | "ready"

export type CollaborationReviewerMergePreview = {
  canApply: boolean
  cloudUpdatedAt: string
  conflictPreview: DeckConflictPreview | null
  localUpdatedAt: string
  mergeResult: DeckMergeResult | null
  safety: DeckMergeSafetyReport | null
  status: CollaborationReviewerMergePreviewStatus
  summary: string
}

export type CollaborationReviewerMergePreviewOptions = {
  baseDeck?: Deck | null
  cloudDeck?: Deck | null
  localDeck?: Deck | null
  role?: CollaborationReviewRole
}

export function collaborationReviewerMergePreview(
  options: CollaborationReviewerMergePreviewOptions = {},
): CollaborationReviewerMergePreview {
  const role = options.role ?? "owner"

  if (!options.baseDeck || !options.cloudDeck || !options.localDeck) {
    return {
      canApply: false,
      cloudUpdatedAt: "",
      conflictPreview: null,
      localUpdatedAt: "",
      mergeResult: null,
      safety: null,
      status: "not-requested",
      summary: "No cloud merge preview is active.",
    }
  }

  const conflictPreview = compareDeckVersions(
    options.localDeck,
    options.cloudDeck,
  )
  const mergeResult = mergeDeckVersions({
    baseDeck: options.baseDeck,
    cloudDeck: options.cloudDeck,
    localDeck: options.localDeck,
  })
  const safety = deckMergeSafetyReport(mergeResult, { role })
  const status =
    safety.state === "blocked"
      ? "blocked"
      : safety.state === "conflict"
        ? "conflict"
        : "ready"

  return {
    canApply: safety.canMerge,
    cloudUpdatedAt: options.cloudDeck.updatedAt,
    conflictPreview,
    localUpdatedAt: options.localDeck.updatedAt,
    mergeResult,
    safety,
    status,
    summary: safety.summary,
  }
}
