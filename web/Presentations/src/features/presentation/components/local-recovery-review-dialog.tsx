"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ClipboardCopy,
  Download,
  History,
  RotateCcw,
  Trash2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"

import { downloadTextFile } from "../browser-downloads"
import type { LocalDeckRecoverySnapshot } from "../local-deck-recovery"
import {
  localDeckRecoverySnapshotFileName,
  localDeckRecoveryReviews,
  serializeLocalDeckRecoveryReviewText,
  serializeLocalDeckRecoverySnapshotJson,
  type LocalDeckRecoveryReview,
} from "../local-deck-recovery-review"
import type { Deck } from "../types"

type LocalRecoveryReviewDialogProps = {
  currentDeck: Deck
  snapshots: LocalDeckRecoverySnapshot[]
  onClearSnapshots: () => void
  onDeleteSnapshot: (snapshotId: string) => void
  onRestoreSnapshot: (snapshotId: string) => string | void
}

function capturedLabel(value: string) {
  return new Date(value).toLocaleString()
}

function signed(value: number) {
  if (value > 0) return `+${value}`
  return String(value)
}

function slideChangeLabel(
  status: LocalDeckRecoveryReview["slideDeltas"][number]["status"],
) {
  if (status === "added") return "Added"
  if (status === "removed") return "Removed"
  if (status === "changed") return "Changed"
  return "Unchanged"
}

function recommendationLabel(
  recommendation: LocalDeckRecoveryReview["recommendation"],
) {
  if (recommendation === "same-content") return "Current content"
  if (recommendation === "current-deck") return "Same deck"
  return "Older deck"
}

export function LocalRecoveryReviewDialog({
  currentDeck,
  snapshots,
  onClearSnapshots,
  onDeleteSnapshot,
  onRestoreSnapshot,
}: LocalRecoveryReviewDialogProps) {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState("")
  const [message, setMessage] = useState("")
  const reviews = useMemo(
    () => localDeckRecoveryReviews(currentDeck, snapshots),
    [currentDeck, snapshots],
  )
  const selectedReview =
    reviews.find((review) => review.snapshotId === selectedSnapshotId) ??
    reviews[0] ??
    null
  const hasSnapshots = snapshots.length > 0
  const selectedSnapshot = snapshots.find(
    (snapshot) => snapshot.id === selectedReview?.snapshotId,
  )
  const changedSlides =
    selectedReview?.slideDeltas.filter(
      (slide) => slide.status !== "unchanged",
    ) ?? []

  async function copySelectedReview() {
    if (!selectedReview || !navigator.clipboard) return

    try {
      await navigator.clipboard.writeText(
        serializeLocalDeckRecoveryReviewText(selectedReview),
      )
      setMessage("Copied recovery summary.")
    } catch {
      setMessage("Copy unavailable.")
    }
  }

  function downloadSelectedSnapshot() {
    if (!selectedSnapshot) return

    downloadTextFile(
      localDeckRecoverySnapshotFileName(selectedSnapshot),
      serializeLocalDeckRecoverySnapshotJson(selectedSnapshot),
      "application/json;charset=utf-8",
    )
    setMessage("Downloaded recovery JSON.")
  }

  useEffect(() => {
    if (!reviews.length) {
      setSelectedSnapshotId("")
      return
    }

    if (!reviews.some((review) => review.snapshotId === selectedSnapshotId)) {
      setSelectedSnapshotId(reviews[0]?.snapshotId ?? "")
    }
  }, [reviews, selectedSnapshotId])

  useEffect(() => {
    setMessage("")
  }, [selectedSnapshotId])

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!hasSnapshots}
          />
        }
      >
        <History className="size-4" />
        Recovery
        {hasSnapshots ? (
          <Badge variant="secondary" className="ml-1">
            {snapshots.length}
          </Badge>
        ) : null}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Recovery snapshots</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          <div className="min-w-0 space-y-3">
            <div className="rounded-md border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {selectedReview?.title ?? "No snapshot selected"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedReview
                      ? capturedLabel(selectedReview.capturedAt)
                      : "No recovery snapshots available."}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedReview ? (
                    <Badge variant="outline">
                      {recommendationLabel(selectedReview.recommendation)}
                    </Badge>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!selectedReview}
                    onClick={() => void copySelectedReview()}
                  >
                    <ClipboardCopy className="size-4" />
                    Copy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!selectedSnapshot}
                    onClick={downloadSelectedSnapshot}
                  >
                    <Download className="size-4" />
                    Download
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!selectedReview}
                    onClick={() => {
                      if (selectedReview) {
                        const restoreMessage = onRestoreSnapshot(
                          selectedReview.snapshotId,
                        )

                        if (restoreMessage) {
                          setMessage(restoreMessage)
                        }
                      }
                    }}
                  >
                    <RotateCcw className="size-4" />
                    Restore
                  </Button>
                </div>
              </div>
              {message ? (
                <div className="mt-2 text-xs text-muted-foreground">
                  {message}
                </div>
              ) : null}
            </div>

            {selectedReview ? (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Slides</div>
                    <div className="text-lg font-semibold">
                      {selectedReview.snapshot.slideCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {signed(selectedReview.slideDelta)} vs current
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Objects</div>
                    <div className="text-lg font-semibold">
                      {selectedReview.snapshot.elementCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {signed(selectedReview.elementDelta)} vs current
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Notes</div>
                    <div className="text-lg font-semibold">
                      {selectedReview.snapshot.notesSlideCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {signed(selectedReview.notesSlideDelta)} vs current
                    </div>
                  </div>
                  <div className="rounded-md border p-3">
                    <div className="text-xs text-muted-foreground">Comments</div>
                    <div className="text-lg font-semibold">
                      {selectedReview.snapshot.commentCount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {signed(selectedReview.commentDelta)} vs current
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Slide changes</div>
                  <ScrollArea className="h-40 rounded-md border">
                    <div className="space-y-2 p-2">
                      {changedSlides.length ? (
                        changedSlides.map((slide, index) => (
                          <div
                            key={`${slide.status}-${index}-${slide.snapshotTitle}`}
                            className="rounded-md border bg-background p-2 text-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate font-medium">
                                {slide.snapshotTitle ||
                                  slide.currentTitle ||
                                  "Untitled slide"}
                              </span>
                              <Badge variant="outline">
                                {slideChangeLabel(slide.status)}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {slide.currentElementCount} to{" "}
                              {slide.snapshotElementCount} objects
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                          No slide title or object-count changes.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </>
            ) : null}
          </div>

          <div className="min-w-0 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium">Available snapshots</div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasSnapshots}
                onClick={onClearSnapshots}
              >
                <Trash2 className="size-4" />
                Clear
              </Button>
            </div>
            <ScrollArea className="h-80 rounded-md border">
              <div className="space-y-2 p-2">
                {reviews.length ? (
                  reviews.map((review) => (
                    <button
                      key={review.snapshotId}
                      type="button"
                      className="flex w-full items-start gap-2 rounded-md border bg-background p-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-70"
                      disabled={review.snapshotId === selectedReview?.snapshotId}
                      onClick={() => setSelectedSnapshotId(review.snapshotId)}
                    >
                      <History className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {review.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {capturedLabel(review.capturedAt)}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                    No recovery snapshots.
                  </div>
                )}
              </div>
            </ScrollArea>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!selectedReview}
              onClick={() => {
                if (selectedReview) {
                  onDeleteSnapshot(selectedReview.snapshotId)
                }
              }}
            >
              <Trash2 className="size-4" />
              Delete selected
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
