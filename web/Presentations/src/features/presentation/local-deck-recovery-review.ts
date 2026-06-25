import { exportedDeckSignature } from "./local-deck-file-state"
import type { LocalDeckRecoverySnapshot } from "./local-deck-recovery"
import type { Deck } from "./types"

export type LocalDeckRecoveryMetrics = {
  assetCount: number
  commentCount: number
  elementCount: number
  notesSlideCount: number
  slideCount: number
}

export type LocalDeckRecoveryReview = {
  assetDelta: number
  capturedAt: string
  commentDelta: number
  current: LocalDeckRecoveryMetrics
  deckMatchesCurrent: boolean
  elementDelta: number
  notesSlideDelta: number
  recommendation: "current-deck" | "older-deck" | "same-content"
  slideDelta: number
  slideDeltas: LocalDeckRecoverySlideDelta[]
  snapshot: LocalDeckRecoveryMetrics
  snapshotId: string
  title: string
}

export type LocalDeckRecoverySlideDelta = {
  currentElementCount: number
  currentTitle: string
  snapshotElementCount: number
  snapshotTitle: string
  status: "added" | "changed" | "removed" | "unchanged"
}

function deckMetrics(deck: Deck): LocalDeckRecoveryMetrics {
  return {
    assetCount: deck.assets.length,
    commentCount: deck.slides.reduce(
      (total, slide) => total + (slide.comments?.length ?? 0),
      0,
    ),
    elementCount: deck.slides.reduce(
      (total, slide) => total + slide.elements.length,
      0,
    ),
    notesSlideCount: deck.slides.filter((slide) => slide.notes.trim()).length,
    slideCount: deck.slides.length,
  }
}

function safeFileStem(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "recovery-snapshot"
  )
}

export function localDeckRecoverySlideDeltas(
  currentDeck: Deck,
  snapshotDeck: Deck,
): LocalDeckRecoverySlideDelta[] {
  const maxLength = Math.max(
    currentDeck.slides.length,
    snapshotDeck.slides.length,
  )

  return Array.from({ length: maxLength }, (_, index) => {
    const currentSlide = currentDeck.slides[index]
    const snapshotSlide = snapshotDeck.slides[index]
    const currentElementCount = currentSlide?.elements.length ?? 0
    const snapshotElementCount = snapshotSlide?.elements.length ?? 0
    const currentTitle = currentSlide?.title ?? ""
    const snapshotTitle = snapshotSlide?.title ?? ""
    const status = !currentSlide
      ? "added"
      : !snapshotSlide
        ? "removed"
        : currentTitle !== snapshotTitle ||
            currentElementCount !== snapshotElementCount
          ? "changed"
          : "unchanged"

    return {
      currentElementCount,
      currentTitle,
      snapshotElementCount,
      snapshotTitle,
      status,
    }
  })
}

export function localDeckRecoveryReview(
  currentDeck: Deck,
  snapshot: LocalDeckRecoverySnapshot,
): LocalDeckRecoveryReview {
  const current = deckMetrics(currentDeck)
  const snapshotDeck = snapshot.exportedDeck.deck
  const snapshotMetrics = deckMetrics(snapshotDeck)
  const deckMatchesCurrent = snapshot.deckId === currentDeck.id
  const sameContent =
    exportedDeckSignature({ version: 1, deck: currentDeck }) ===
    exportedDeckSignature(snapshot.exportedDeck)

  return {
    assetDelta: snapshotMetrics.assetCount - current.assetCount,
    capturedAt: snapshot.capturedAt,
    commentDelta: snapshotMetrics.commentCount - current.commentCount,
    current,
    deckMatchesCurrent,
    elementDelta: snapshotMetrics.elementCount - current.elementCount,
    notesSlideDelta: snapshotMetrics.notesSlideCount - current.notesSlideCount,
    recommendation: sameContent
      ? "same-content"
      : deckMatchesCurrent
        ? "current-deck"
        : "older-deck",
    slideDelta: snapshotMetrics.slideCount - current.slideCount,
    slideDeltas: localDeckRecoverySlideDeltas(currentDeck, snapshotDeck),
    snapshot: snapshotMetrics,
    snapshotId: snapshot.id,
    title: snapshot.title,
  }
}

export function localDeckRecoveryReviews(
  currentDeck: Deck,
  snapshots: LocalDeckRecoverySnapshot[],
) {
  return snapshots.map((snapshot) =>
    localDeckRecoveryReview(currentDeck, snapshot),
  )
}

export function localDeckRecoverySnapshotFileName(
  snapshot: LocalDeckRecoverySnapshot,
) {
  const date = snapshot.capturedAt.slice(0, 10) || "snapshot"

  return `${safeFileStem(snapshot.title)}-${date}-recovery.json`
}

export function serializeLocalDeckRecoverySnapshotJson(
  snapshot: LocalDeckRecoverySnapshot,
) {
  return JSON.stringify(snapshot.exportedDeck, null, 2)
}

export function serializeLocalDeckRecoveryReviewText(
  review: LocalDeckRecoveryReview,
) {
  const lines = [
    "Recovery Snapshot Review",
    `Snapshot: ${review.title}`,
    `Captured: ${review.capturedAt}`,
    `Recommendation: ${review.recommendation}`,
    "",
    `Slides: ${review.snapshot.slideCount} (${review.slideDelta >= 0 ? "+" : ""}${review.slideDelta})`,
    `Objects: ${review.snapshot.elementCount} (${review.elementDelta >= 0 ? "+" : ""}${review.elementDelta})`,
    `Notes slides: ${review.snapshot.notesSlideCount} (${review.notesSlideDelta >= 0 ? "+" : ""}${review.notesSlideDelta})`,
    `Comments: ${review.snapshot.commentCount} (${review.commentDelta >= 0 ? "+" : ""}${review.commentDelta})`,
    "",
    "Slide changes:",
    ...review.slideDeltas
      .filter((slide) => slide.status !== "unchanged")
      .map(
        (slide, index) =>
          `${index + 1}. ${slide.status}: ${
            slide.snapshotTitle || slide.currentTitle || "Untitled slide"
          } (${slide.currentElementCount} -> ${slide.snapshotElementCount} objects)`,
      ),
  ]

  return `${lines.join("\n")}\n`
}
