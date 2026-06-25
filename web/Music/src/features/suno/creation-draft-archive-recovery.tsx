"use client";

import { Download, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  CreationDraftRecoveryRestorePreview,
  CreationDraftRecoverySnapshot,
} from "@/features/ai/creation-drafts";

type CreationDraftArchiveRecoveryProps = {
  clearReviewOpen: boolean;
  onCancelClear: () => void;
  onCancelRestore: () => void;
  onConfirmClear: () => void;
  onExport: () => void;
  onExportCurrent: () => void;
  onConfirmRestore: () => void;
  onReviewClear: () => void;
  onReviewRestore: () => void;
  restorePreview: CreationDraftRecoveryRestorePreview;
  restoreReviewOpen: boolean;
  snapshot: CreationDraftRecoverySnapshot;
};

export function CreationDraftArchiveRecovery({
  clearReviewOpen,
  onCancelClear,
  onCancelRestore,
  onConfirmClear,
  onExport,
  onExportCurrent,
  onConfirmRestore,
  onReviewClear,
  onReviewRestore,
  restorePreview,
  restoreReviewOpen,
  snapshot,
}: CreationDraftArchiveRecoveryProps) {
  return (
    <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="size-4 text-emerald-300" />
            Recovery available
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {recoveryReasonLabel(restorePreview.recoverySnapshotReason)}
            </Badge>
            <Badge variant="outline">
              {archiveScopeLabel(restorePreview.archiveScope)}
            </Badge>
            <Badge variant="outline">
              {restorePreview.archiveVersion
                ? `Archive v${restorePreview.archiveVersion}`
                : "Legacy archive"}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {snapshot.draftCount} draft{snapshot.draftCount === 1 ? "" : "s"}{" "}
            saved on{" "}
            <span className="text-foreground">
              {formatSnapshotTime(snapshot.createdAt)}
            </span>
            .
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-2"
          title="Export pre-import recovery snapshot"
          onClick={onExport}
        >
          <Download className="size-4" />
          Export recovery
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-2"
          disabled={!restorePreview.canRestore}
          title="Review recovery restore"
          onClick={onReviewRestore}
        >
          <RotateCcw className="size-4" />
          Review restore
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="gap-2"
          title="Review recovery snapshot dismissal"
          onClick={onReviewClear}
        >
          <Trash2 className="size-4" />
          Dismiss
        </Button>
      </div>
      {clearReviewOpen ? (
        <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <p className="font-medium text-destructive">
            Dismiss this recovery snapshot?
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Current creation drafts stay unchanged. Export recovery first if you
            still need a file copy.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              title="Dismiss recovery snapshot"
              onClick={onConfirmClear}
            >
              Dismiss snapshot
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              title="Cancel recovery snapshot dismissal"
              onClick={onCancelClear}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
      {restoreReviewOpen ? (
        <div className="mt-3 rounded-md border border-amber-400/30 bg-amber-400/10 p-3 text-sm">
          <p className="font-medium text-amber-100">
            Restore this recovery snapshot?
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Current vault: {restorePreview.currentDraftCount} draft
            {restorePreview.currentDraftCount === 1 ? "" : "s"}. Recovery:{" "}
            {restorePreview.recoveryDraftCount} draft
            {restorePreview.recoveryDraftCount === 1 ? "" : "s"}.
          </p>
          {restorePreview.invalid ||
          restorePreview.duplicates ||
          restorePreview.capacityLimited ? (
            <p className="mt-1 text-xs text-amber-100/80">
              Skips:{" "}
              {[
                restorePreview.duplicates
                  ? `${restorePreview.duplicates} duplicate`
                  : "",
                restorePreview.invalid ? `${restorePreview.invalid} invalid` : "",
                restorePreview.capacityLimited
                  ? `${restorePreview.capacityLimited} over limit`
                  : "",
              ]
                .filter(Boolean)
                .join(", ")}
              .
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!restorePreview.currentDraftCount}
              title="Export current draft vault before restore"
              onClick={onExportCurrent}
            >
              Export current
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={!restorePreview.canRestore}
              title="Restore recovery snapshot"
              onClick={onConfirmRestore}
            >
              Restore recovery
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              title="Cancel recovery restore"
              onClick={onCancelRestore}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatSnapshotTime(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function recoveryReasonLabel(
  reason: CreationDraftRecoveryRestorePreview["recoverySnapshotReason"],
) {
  if (reason === "recovery-restore") {
    return "Before recovery restore";
  }

  return "Before archive import";
}

function archiveScopeLabel(
  scope: CreationDraftRecoveryRestorePreview["archiveScope"],
) {
  if (scope === "selected-visible") {
    return "Selected archive";
  }

  if (scope === "full-vault") {
    return "Full archive";
  }

  return "Legacy archive";
}
