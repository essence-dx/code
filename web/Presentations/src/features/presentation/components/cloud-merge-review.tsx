import { AlertTriangle, GitCompareArrows } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import { cloudSyncTestIds } from "../cloud-sync-test-ids"
import type { DeckMergeResult } from "../deck-merge"
import { deckMergeSafetyReport } from "../deck-merge-safety"

type CloudMergeReviewProps = {
  accessRole?: "owner" | "editor" | "viewer"
  disabled?: boolean
  result: DeckMergeResult | null
  onMerge: () => void
}

export function CloudMergeReview({
  accessRole,
  disabled,
  result,
  onMerge,
}: CloudMergeReviewProps) {
  if (!result) return null

  const safety = deckMergeSafetyReport(result, {
    role: accessRole ?? "owner",
  })

  if (result.status === "merged") {
    return (
      <section
        className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-emerald-300 bg-emerald-50/70 p-2 text-xs text-emerald-950"
        data-testid={cloudSyncTestIds.mergeReviewClean}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge variant="secondary">
            <GitCompareArrows className="size-3" />
            Clean merge
          </Badge>
          <span>{safety.summary}</span>
          {safety.mergedAssets ? (
            <span>{safety.mergedAssets} asset changes</span>
          ) : null}
          <Badge variant="outline">
            {safety.state === "blocked" ? "review only" : safety.role}
          </Badge>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={disabled || !safety.canMerge}
          data-testid={cloudSyncTestIds.mergeReviewDialogButton}
          onClick={onMerge}
        >
          {safety.canMerge ? "Merge" : "Review only"}
        </Button>
      </section>
    )
  }

  return (
    <section
      className="space-y-2 rounded-md border border-amber-300 bg-amber-50/70 p-2 text-xs text-amber-950"
      data-testid={cloudSyncTestIds.mergeReviewConflict}
    >
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="size-3.5" />
        {safety.summary}
        <Badge variant="outline">{safety.role}</Badge>
      </div>
      {safety.conflictAreas.length ? (
        <div className="flex flex-wrap gap-1">
          {safety.conflictAreas.map((area) => (
            <Badge key={area.area} variant="outline">
              {area.label}
            </Badge>
          ))}
        </div>
      ) : null}
      <div className="grid gap-1">
        {safety.visibleConflicts.map((conflict) => (
          <div
            key={`${conflict.area}-${conflict.id ?? conflict.reason}`}
            className="truncate rounded border border-amber-200 bg-background/60 px-2 py-1"
            data-testid={cloudSyncTestIds.mergeReviewConflictItem}
          >
            {conflict.reason}
          </div>
        ))}
      </div>
    </section>
  )
}
