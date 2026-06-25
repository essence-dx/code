"use client";

import { AlertTriangle, Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  describeQueuedPublicInteractionActionLabels,
  describeQueuedPublicInteractionAgeStatus,
  describeQueuedPublicInteractionErrorStatus,
  describeQueuedPublicInteractionReviewedRetryStatus,
  describeQueuedPublicInteractionTarget,
  type QueuedPublicInteraction,
} from "./public-interaction-queue";

type PublicInteractionQueueItemProps = {
  editingCommentBody: string;
  editingCommentId: string | null;
  item: QueuedPublicInteraction;
  onCancelEditing: () => void;
  onDiscardOne: (id: string) => void;
  onEditingCommentBodyChange: (body: string) => void;
  onSaveEditedComment: (id: string) => void;
  onStartEditing: (item: QueuedPublicInteraction) => void;
  onSyncOne: (id: string) => void;
  online: boolean;
  queueBusy: boolean;
  replayingId: string | null;
  staleReviewedAt: number | null;
};

const queueItemActionButtonClassName =
  "h-auto min-h-8 w-full gap-2 whitespace-normal px-2 text-center leading-4 sm:w-auto sm:whitespace-nowrap";
const queueItemInlineButtonClassName =
  "h-auto min-h-8 min-w-20 whitespace-normal px-3 text-center leading-4";
const queueItemTextLineClassName = "line-clamp-2 break-words leading-4";
const queueItemTextareaClassName =
  "max-h-40 min-h-20 min-w-0 resize-y overflow-auto break-words";
const queueItemFailedStatusClassName = "break-words leading-4 text-destructive/80";

export function PublicInteractionQueueItem({
  editingCommentBody,
  editingCommentId,
  item,
  onCancelEditing,
  onDiscardOne,
  onEditingCommentBodyChange,
  onSaveEditedComment,
  onStartEditing,
  onSyncOne,
  online,
  queueBusy,
  replayingId,
  staleReviewedAt,
}: PublicInteractionQueueItemProps) {
  const itemLabel = describeQueuedItem(item);
  const itemLabelId = `queue-item-${item.id}`;
  const editFormLabelId = `queue-item-edit-${item.id}`;
  const errorStatus = describeQueuedPublicInteractionErrorStatus({ item });
  const ageStatus = describeQueuedPublicInteractionAgeStatus({ item });
  const reviewedRetryStatus = describeQueuedPublicInteractionReviewedRetryStatus({
    item,
    reviewedAt: staleReviewedAt,
  });
  const actionLabels = describeQueuedPublicInteractionActionLabels({
    item,
    online,
    reviewedAt: staleReviewedAt,
  });

  return (
    <div className="flex flex-col gap-2 rounded-md bg-black/20 p-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 text-xs text-muted-foreground sm:flex-1">
        <p className="font-medium text-foreground" id={itemLabelId}>
          {itemLabel}
        </p>
        <p className={queueItemTextLineClassName}>
          Target: {describeQueuedPublicInteractionTarget(item)}
        </p>
        <p
          aria-label={ageStatus.label}
          className="flex min-w-0 flex-wrap items-center gap-1 break-words leading-4"
        >
          <span>Queued {ageStatus.age}</span>
          {ageStatus.reviewText ? (
            <span className="inline-flex min-w-0 flex-wrap items-center gap-1 text-amber-200">
              <AlertTriangle className="size-3 shrink-0" />
              <span>{ageStatus.reviewText}</span>
            </span>
          ) : null}
        </p>
        {editingCommentId === item.id && item.kind === "comment" ? (
          <div
            aria-labelledby={editFormLabelId}
            className="mt-2 flex min-w-0 flex-col gap-2 rounded-md border border-white/10 bg-black/20 p-2"
            role="group"
          >
            <p
              className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
              id={editFormLabelId}
            >
              Edit queued comment
            </p>
            <Textarea
              className={queueItemTextareaClassName}
              value={editingCommentBody}
              aria-labelledby={editFormLabelId}
              onChange={(event) => onEditingCommentBodyChange(event.target.value)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className={queueItemInlineButtonClassName}
                disabled={queueBusy || !editingCommentBody.trim()}
                aria-label={`Save edited queued ${itemLabel.toLowerCase()}`}
                onClick={() => onSaveEditedComment(item.id)}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={queueItemInlineButtonClassName}
                disabled={queueBusy}
                aria-label={`Cancel editing queued ${itemLabel.toLowerCase()}`}
                onClick={onCancelEditing}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className={queueItemTextLineClassName}>
            {describeQueuedItemPreview(item)}
          </p>
        )}
        {errorStatus ? (
          <div className="space-y-0.5">
            <p className="break-words leading-4 text-destructive">
              {errorStatus.error}
            </p>
            {errorStatus.lastAttempt ? (
              <p className={queueItemFailedStatusClassName}>
                {errorStatus.lastAttempt}
              </p>
            ) : null}
            {reviewedRetryStatus ? (
              <p className={queueItemFailedStatusClassName}>
                {reviewedRetryStatus}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-wrap sm:justify-end">
        {item.kind === "comment" ? (
          <Button
            size="sm"
            variant="ghost"
            className={queueItemActionButtonClassName}
            disabled={queueBusy}
            aria-describedby={itemLabelId}
            aria-label={actionLabels.edit ?? "Edit comment"}
            title={actionLabels.edit ?? "Edit comment"}
            onClick={() => onStartEditing(item)}
          >
            <Pencil className="size-4 shrink-0" />
            <span>{actionLabels.edit}</span>
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          className={queueItemActionButtonClassName}
          disabled={!online || queueBusy}
          title={actionLabels.retryTitle}
          aria-describedby={itemLabelId}
          aria-label={actionLabels.retryAriaLabel}
          onClick={() => onSyncOne(item.id)}
        >
          {replayingId === item.id ? (
            <Loader2 className="size-4 shrink-0 animate-spin" />
          ) : (
            <RotateCcw className="size-4 shrink-0" />
          )}
          <span>{actionLabels.retry}</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className={queueItemActionButtonClassName}
          disabled={queueBusy}
          aria-describedby={itemLabelId}
          aria-label={actionLabels.discard}
          title={actionLabels.discard}
          onClick={() => onDiscardOne(item.id)}
        >
          <Trash2 className="size-4 shrink-0" />
          <span>{actionLabels.discard}</span>
        </Button>
      </div>
    </div>
  );
}

function describeQueuedItem(item: QueuedPublicInteraction) {
  if (item.kind === "comment") {
    return "Comment";
  }

  return item.socialKind === "follow"
    ? "Follow"
    : item.socialKind === "repost"
      ? "Repost"
      : "Like";
}

function describeQueuedItemPreview(item: QueuedPublicInteraction) {
  if (item.kind === "comment") {
    return item.body;
  }

  return `${item.targetType} action queued ${new Date(
    item.createdAt,
  ).toLocaleString()}.`;
}
