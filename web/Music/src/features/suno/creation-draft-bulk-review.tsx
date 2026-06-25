"use client";

import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type CreationDraftBulkReviewProps = {
  deleteReviewOpen: boolean;
  onCancelDelete: () => void;
  onClearSelected: () => void;
  onConfirmDelete: () => void;
  onExportSelected: () => void;
  onReviewDelete: () => void;
  onSelectVisible: () => void;
  selectableCount: number;
  selectedCount: number;
};

export function CreationDraftBulkReview({
  deleteReviewOpen,
  onCancelDelete,
  onClearSelected,
  onConfirmDelete,
  onExportSelected,
  onReviewDelete,
  onSelectVisible,
  selectableCount,
  selectedCount,
}: CreationDraftBulkReviewProps) {
  return (
    <div
      className="mt-3 rounded-md border border-white/10 bg-black/20 p-2"
      role="group"
      aria-label="Creation draft bulk cleanup controls"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!selectableCount}
          title="Select visible unpinned drafts"
          onClick={onSelectVisible}
        >
          Select visible
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!selectedCount}
          title="Clear selected visible drafts"
          onClick={onClearSelected}
        >
          Clear selected
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={!selectedCount}
          title="Review selected draft deletion"
          onClick={onReviewDelete}
        >
          Review delete ({selectedCount})
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!selectedCount}
          title="Export selected visible drafts"
          onClick={onExportSelected}
        >
          Export selected
        </Button>
        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck className="size-3" />
          Pinned drafts require manual selection.
        </span>
      </div>
      {deleteReviewOpen ? (
        <div className="mt-2 flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive sm:flex-row sm:items-center sm:justify-between">
          <span>
            Delete {selectedCount} selected visible draft
            {selectedCount === 1 ? "" : "s"}?
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              title="Delete selected visible drafts"
              onClick={onConfirmDelete}
            >
              Delete selected
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              title="Cancel selected draft deletion"
              onClick={onCancelDelete}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
