"use client";

import {
  AlertTriangle,
  Clock3,
  CloudUpload,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNetworkStatus } from "@/features/system/use-network-status";
import {
  countQueuedPublicInteractionsOutsideScope,
  countReviewableStaleQueuedPublicInteractions,
  describePublicInteractionBulkReplayToast,
  describePublicInteractionBulkSyncConfirmationCopy,
  describePublicInteractionQueueErrorSummary,
  describePublicInteractionQueueFailedReviewStatus,
  describePublicInteractionQueueReadinessHint,
  describePublicInteractionQueueReviewSummary,
  describePublicInteractionQueueReviewStatus,
  describePublicInteractionQueueRecoveryHint,
  describePublicInteractionQueueSyncHint,
  describePublicInteractionReplaySummary,
  describeQueuedPublicInteractionRetryToast,
  getPublicInteractionQueueMembershipKey,
  groupQueuedPublicInteractions,
  listQueuedPublicInteractionsForTarget,
  shouldGuardPublicInteractionBulkReplay,
  shouldResetPublicInteractionReviewAfterBulkSync,
  type PublicInteractionReplayScope,
  type QueuedPublicInteraction,
} from "./public-interaction-queue";
import { PublicInteractionQueueItem } from "./public-interaction-queue-item";
import { usePublicInteractionQueue } from "./use-public-interaction-queue";

type PublicInteractionQueuePanelProps = {
  scope?: PublicInteractionReplayScope;
};

export function PublicInteractionQueuePanel({
  scope,
}: PublicInteractionQueuePanelProps) {
  const { online } = useNetworkStatus();
  const {
    items,
    pendingCount,
    remove,
    replay,
    replayItem,
    replaying,
    replayingId,
    updateComment,
  } = usePublicInteractionQueue();
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [staleReviewedAt, setStaleReviewedAt] = useState<number | null>(null);
  const queueBusy = replaying || Boolean(replayingId);
  const visibleItems = useMemo(
    () =>
      scope
        ? listQueuedPublicInteractionsForTarget(
            scope.targetType,
            scope.targetId,
            items,
          )
        : items,
    [items, scope],
  );
  const visiblePendingCount = visibleItems.length;
  const otherPendingCount = scope
    ? countQueuedPublicInteractionsOutsideScope(scope, items)
    : 0;
  const queuedGroups = useMemo(
    () => groupQueuedPublicInteractions(visibleItems),
    [visibleItems],
  );
  const visibleQueueMembershipKey =
    getPublicInteractionQueueMembershipKey(visibleItems);
  const errorSummary = describePublicInteractionQueueErrorSummary(visibleItems);
  const failedReviewStatus = describePublicInteractionQueueFailedReviewStatus({
    failedCount: visibleItems.filter((item) => item.lastError).length,
    reviewedAt: staleReviewedAt,
  });
  const reviewSummary = describePublicInteractionQueueReviewSummary(visibleItems);
  const reviewableStaleCount =
    countReviewableStaleQueuedPublicInteractions(visibleItems);
  const staleReviewRequired = shouldGuardPublicInteractionBulkReplay({
    items: visibleItems,
    reviewed: Boolean(staleReviewedAt),
  });
  const staleReviewStatus = describePublicInteractionQueueReviewStatus(
    staleReviewedAt,
  );
  const bulkSyncCopy = describePublicInteractionBulkSyncConfirmationCopy({
    pendingCount: visiblePendingCount,
    reviewedStaleCount: staleReviewedAt ? reviewableStaleCount : 0,
  });
  const recoveryHint = describePublicInteractionQueueRecoveryHint({
    online,
    pendingCount: visiblePendingCount,
  });
  const readinessHint = describePublicInteractionQueueReadinessHint({
    online,
    pendingCount: visiblePendingCount,
  });
  const syncHint = describePublicInteractionQueueSyncHint({
    pendingCount: visiblePendingCount,
    replaying,
    replayingId,
  });
  const visibleRecoveryHint = syncHint ? null : recoveryHint;
  const visibleReadinessHint = syncHint ? null : readinessHint;

  useEffect(() => {
    setStaleReviewedAt(null);
  }, [visibleQueueMembershipKey]);

  if (!pendingCount) {
    return null;
  }

  if (!visiblePendingCount) {
    return (
      <div className="rounded-md border border-white/10 bg-slate-950/50 p-3 text-sm text-muted-foreground">
        <span role="status" aria-live="polite">
          {formatPendingCount(otherPendingCount)} waiting on other public pages.
        </span>
      </div>
    );
  }

  async function syncPending() {
    if (staleReviewRequired) {
      toast.warning("Review stale public actions before syncing.");
      return;
    }

    try {
      const summary = await replay(scope);
      const message = describePublicInteractionBulkReplayToast(summary);

      if (summary.failed) {
        toast.error(message);
        return;
      }

      if (
        shouldResetPublicInteractionReviewAfterBulkSync({
          failed: summary.failed,
          reviewedAt: staleReviewedAt,
          reviewedStaleCount: reviewableStaleCount,
        })
      ) {
        setStaleReviewedAt(null);
      }

      toast.success(message);
    } catch {
      toast.error("Could not sync pending public actions.");
    }
  }

  async function syncOne(id: string) {
    const queuedItem = visibleItems.find((item) => item.id === id);

    try {
      const summary = await replayItem(id);
      const message = describePublicInteractionReplaySummary(summary);
      const retryMessage = queuedItem
        ? describeQueuedPublicInteractionRetryToast({
            failed: Boolean(summary.failed),
            item: summary.failedItems[0] ?? queuedItem,
            message,
            reviewedAt: staleReviewedAt,
          })
        : message;

      if (summary.failed) {
        toast.error(retryMessage);
        return;
      }

      toast.success(retryMessage);
    } catch {
      toast.error("Could not sync pending public action.");
    }
  }

  function discardOne(id: string) {
    remove(id);
    if (editingCommentId === id) {
      setEditingCommentId(null);
      setEditingCommentBody("");
    }
    toast.success("Pending public action discarded.");
  }

  function startEditing(item: QueuedPublicInteraction) {
    if (item.kind !== "comment") {
      return;
    }

    setEditingCommentId(item.id);
    setEditingCommentBody(item.body);
  }

  function saveEditedComment(id: string) {
    const updated = updateComment(id, editingCommentBody);

    if (!updated) {
      toast.error("Comment cannot be empty.");
      return;
    }

    setEditingCommentId(null);
    setEditingCommentBody("");
    toast.success("Queued comment updated.");
  }

  return (
    <div
      className="space-y-2 rounded-md border border-white/10 bg-slate-950/50 p-3 text-sm"
      aria-busy={queueBusy}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-muted-foreground" role="status" aria-live="polite">
          {visiblePendingCount} public action
          {visiblePendingCount === 1 ? "" : "s"} waiting to sync.
        </span>
        <Button
          size="sm"
          variant="secondary"
          className="w-full gap-2 sm:w-auto"
          disabled={!online || queueBusy || staleReviewRequired}
          title={
            staleReviewRequired
              ? "Review stale actions before syncing"
              : online
                ? bulkSyncCopy
                : "Reconnect before syncing"
          }
          aria-label={bulkSyncCopy}
          onClick={() => {
            void syncPending();
          }}
        >
          {replaying ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CloudUpload className="size-4" />
          )}
          Sync now
        </Button>
      </div>
      {otherPendingCount ? (
        <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {formatPendingCount(otherPendingCount)} waiting on other public pages.
        </p>
      ) : null}
      {errorSummary ? (
        <div
          className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <div
            className="flex min-w-0 items-start gap-2"
            role="status"
            aria-live="polite"
          >
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>{errorSummary}</span>
          </div>
          {failedReviewStatus ? (
            <Badge
              variant="outline"
              className="max-w-full shrink-0 justify-start whitespace-normal border-destructive/40 text-left leading-4 text-destructive sm:max-w-[15rem]"
            >
              {failedReviewStatus}
            </Badge>
          ) : null}
        </div>
      ) : null}
      {reviewSummary ? (
        <div
          className="flex flex-col gap-2 rounded-md border border-orange-300/20 bg-orange-300/5 p-2 text-xs text-orange-100 sm:flex-row sm:items-center sm:justify-between"
        >
          <div
            className="flex min-w-0 items-start gap-2"
            role="status"
            aria-live="polite"
          >
            <Clock3 className="mt-0.5 size-3.5 shrink-0" />
            <span>{reviewSummary}</span>
          </div>
          {staleReviewRequired ? (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-full shrink-0 sm:w-auto"
              onClick={() => setStaleReviewedAt(Date.now())}
            >
              Mark reviewed
            </Button>
          ) : (
            <Badge
              variant="outline"
              className="w-fit shrink-0 border-orange-300/30 text-orange-100"
            >
              {staleReviewStatus}
            </Badge>
          )}
        </div>
      ) : null}
      {syncHint ? (
        <div
          className="flex items-start gap-2 rounded-md border border-sky-300/20 bg-sky-300/5 p-2 text-xs text-sky-100"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" />
          <span>{syncHint}</span>
        </div>
      ) : null}
      {visibleRecoveryHint ? (
        <div
          className="flex items-start gap-2 rounded-md border border-amber-300/20 bg-amber-300/5 p-2 text-xs text-amber-100"
          role="status"
          aria-live="polite"
        >
          <WifiOff className="mt-0.5 size-3.5 shrink-0" />
          <span>{visibleRecoveryHint}</span>
        </div>
      ) : null}
      {visibleReadinessHint ? (
        <div
          className="flex items-start gap-2 rounded-md border border-emerald-300/20 bg-emerald-300/5 p-2 text-xs text-emerald-100"
          role="status"
          aria-live="polite"
        >
          <Wifi className="mt-0.5 size-3.5 shrink-0" />
          <span>{visibleReadinessHint}</span>
        </div>
      ) : null}
      <div className="space-y-3 border-t border-white/10 pt-2">
        {queuedGroups.map((group) => (
          <section key={group.id} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-semibold text-muted-foreground">
                {group.label}
              </h4>
              <div className="flex flex-wrap justify-end gap-1">
                {group.failedCount ? (
                  <Badge variant="destructive">
                    {group.failedCount} failed
                  </Badge>
                ) : null}
                {group.staleCount ? (
                  <Badge
                    variant="outline"
                    className="border-amber-300/40 text-amber-100"
                  >
                    {group.staleCount} stale
                  </Badge>
                ) : null}
                <Badge variant="secondary" className="bg-white/5">
                  {group.items.length}
                </Badge>
              </div>
            </div>
            {group.items.map((item) => (
              <PublicInteractionQueueItem
                key={item.id}
                editingCommentBody={editingCommentBody}
                editingCommentId={editingCommentId}
                item={item}
                onCancelEditing={() => {
                  setEditingCommentId(null);
                  setEditingCommentBody("");
                }}
                onDiscardOne={discardOne}
                onEditingCommentBodyChange={setEditingCommentBody}
                onSaveEditedComment={saveEditedComment}
                onStartEditing={startEditing}
                onSyncOne={(id) => {
                  void syncOne(id);
                }}
                online={online}
                queueBusy={queueBusy}
                replayingId={replayingId}
                staleReviewedAt={staleReviewedAt}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

function formatPendingCount(count: number) {
  return `${count} public action${count === 1 ? "" : "s"}`;
}
