"use client";

import {
  Clock,
  MessageSquare,
  Reply,
  Send,
  ShieldOff,
  Trash2,
  UserX,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ReportContentButton } from "@/features/moderation/report-content-button";
import {
  getOnlineActionTitle,
  useOnlineActionGuard,
} from "@/features/system/online-action-guard";
import { PublicInteractionQueuePanel } from "@/features/social/public-interaction-queue-panel";
import {
  formatQueuedPublicInteractionAge,
  isQueuedPublicInteractionStale,
  listQueuedPublicCommentsForTarget,
  subscribePublicInteractionReplay,
  type QueuedPublicComment,
  type SyncedQueuedPublicComment,
} from "@/features/social/public-interaction-queue";
import { usePublicInteractionQueue } from "@/features/social/use-public-interaction-queue";
import { usePublicInteractionRouteRefresh } from "@/features/social/use-public-interaction-route-refresh";
import { authClient } from "@/lib/auth-client";
import type {
  PublicCommentRow,
  PublicCommentTargetType,
} from "@/lib/comments";

type PublicCommentsPanelProps = {
  comments: PublicCommentRow[];
  targetId: string;
  targetOwnerId: string | null;
  targetType: PublicCommentTargetType;
};

export function PublicCommentsPanel({
  comments,
  targetId,
  targetOwnerId,
  targetType,
}: PublicCommentsPanelProps) {
  const { data: session } = authClient.useSession();
  const onlineGuard = useOnlineActionGuard();
  const publicInteractionQueue = usePublicInteractionQueue();
  const connectionDisabled = !onlineGuard.canUseConnectionActions;
  const publicActionTitle = (title: string) =>
    getOnlineActionTitle(onlineGuard, "public-interaction", title);
  const [body, setBody] = useState("");
  const [items, setItems] = useState(comments);
  const [replyTo, setReplyTo] = useState<PublicCommentRow | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const queueScope = useMemo(
    () => ({
      targetId,
      targetType,
    }),
    [targetId, targetType],
  );
  const roots = useMemo(
    () => items.filter((comment) => !comment.parentId),
    [items],
  );
  const queuedComments = useMemo(
    () =>
      listQueuedPublicCommentsForTarget(
        targetType,
        targetId,
        publicInteractionQueue.items,
      ),
    [publicInteractionQueue.items, targetId, targetType],
  );
  const queuedRootComments = useMemo(
    () => queuedComments.filter((comment) => !comment.parentId),
    [queuedComments],
  );
  usePublicInteractionRouteRefresh(queueScope);

  useEffect(
    () =>
      subscribePublicInteractionReplay((summary) => {
        const syncedComments = summary.syncedItems
          .filter(
            (synced): synced is SyncedQueuedPublicComment =>
              synced.kind === "comment" &&
              synced.item.targetType === targetType &&
              synced.item.targetId === targetId,
          )
          .map((synced) => synced.comment);

        if (!syncedComments.length) {
          return;
        }

        setItems((current) => {
          const currentIds = new Set(current.map((comment) => comment.id));
          const newComments = syncedComments.filter(
            (comment) => !currentIds.has(comment.id),
          );

          return newComments.length ? [...current, ...newComments] : current;
        });
      }),
    [targetId, targetType],
  );

  async function submitComment() {
    if (connectionDisabled) {
      publicInteractionQueue.queueComment({
        body,
        parentId: replyTo?.id,
        targetId,
        targetType,
      });
      setBody("");
      setReplyTo(undefined);
      toast.success("Comment saved locally and will sync when you reconnect.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body,
          parentId: replyTo?.id,
          targetId,
          targetType,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Could not post comment.");
      }

      const payload = (await response.json()) as { comment: PublicCommentRow };
      setItems((current) => [...current, payload.comment]);
      setBody("");
      setReplyTo(undefined);
      toast.success("Comment posted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not post comment.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function updateComment(id: string, action: "delete" | "hide" | "restore") {
    if (connectionDisabled) {
      toast.error(onlineGuard.publicInteractionDisabledReason);
      return;
    }

    try {
      const response =
        action === "delete"
          ? await fetch("/api/comments", {
              method: "DELETE",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ id }),
            })
          : await fetch("/api/comments", {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ action, id }),
            });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Could not update comment.");
      }

      setItems((current) => current.filter((comment) => comment.id !== id));
      toast.success(action === "delete" ? "Comment deleted." : "Comment hidden.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update comment.",
      );
    }
  }

  async function blockUser(blockedUserId: string) {
    if (connectionDisabled) {
      toast.error(onlineGuard.publicInteractionDisabledReason);
      return;
    }

    try {
      const response = await fetch("/api/profile/blocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ blockedUserId }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Could not update block.");
      }

      setItems((current) =>
        current.filter((comment) => comment.authorId !== blockedUserId),
      );
      toast.success("Public interactions blocked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update block.");
    }
  }

  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="size-4 text-emerald-200" />
          Comments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {session?.user ? (
          <div className="space-y-3 rounded-md border border-white/10 bg-slate-950/50 p-3">
            <PublicInteractionQueuePanel scope={queueScope} />
            {replyTo ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 p-2 text-sm">
                <span className="line-clamp-1">Replying to {replyTo.authorName}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setReplyTo(undefined)}
                >
                  Cancel
                </Button>
              </div>
            ) : null}
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Add a public comment"
            />
            <Button
              className="gap-2"
              disabled={submitting || !body.trim()}
              title={
                connectionDisabled
                  ? "Save comment locally for retry"
                  : publicActionTitle("Post comment")
              }
              onClick={() => {
                void submitComment();
              }}
            >
              <Send className="size-4" />
              Post comment
            </Button>
          </div>
        ) : (
          <div className="rounded-md border border-white/10 bg-slate-950/50 p-3 text-sm text-muted-foreground">
            Sign in to comment.
          </div>
        )}

        <div className="space-y-3">
          {roots.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              replies={items.filter((item) => item.parentId === comment.id)}
              queuedReplies={queuedComments.filter(
                (item) => item.parentId === comment.id,
              )}
              currentUserId={session?.user.id}
              targetOwnerId={targetOwnerId}
              canHide={session?.user.id === targetOwnerId}
              connectionDisabled={connectionDisabled}
              canDelete={
                session?.user.id === comment.authorId ||
                session?.user.id === targetOwnerId
              }
              publicActionTitle={publicActionTitle}
              onDelete={() => {
                void updateComment(comment.id, "delete");
              }}
              onHide={() => {
                void updateComment(comment.id, "hide");
              }}
              onReplyDelete={(replyId) => {
                void updateComment(replyId, "delete");
              }}
              onReplyHide={(replyId) => {
                void updateComment(replyId, "hide");
              }}
              onBlock={(blockedUserId) => {
                void blockUser(blockedUserId);
              }}
              onReply={() => setReplyTo(comment)}
            />
          ))}
          {queuedRootComments.map((comment) => (
            <QueuedCommentItem key={comment.id} comment={comment} />
          ))}
          {!items.length && !queuedComments.length ? (
            <p className="rounded-md border border-white/10 bg-slate-950/50 p-4 text-sm text-muted-foreground">
              No comments yet.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function CommentItem({
  canDelete,
  canHide,
  comment,
  connectionDisabled,
  currentUserId,
  onDelete,
  onHide,
  onBlock,
  onReplyDelete,
  onReplyHide,
  onReply,
  publicActionTitle,
  queuedReplies,
  replies,
  targetOwnerId,
}: {
  canDelete: boolean;
  canHide: boolean;
  comment: PublicCommentRow;
  connectionDisabled: boolean;
  currentUserId?: string;
  onDelete: () => void;
  onHide: () => void;
  onBlock: (blockedUserId: string) => void;
  onReplyDelete: (replyId: string) => void;
  onReplyHide: (replyId: string) => void;
  onReply: () => void;
  queuedReplies: QueuedPublicComment[];
  replies: PublicCommentRow[];
  targetOwnerId: string | null;
  publicActionTitle: (title: string) => string | undefined;
}) {
  return (
    <div className="space-y-3 rounded-md border border-white/10 bg-slate-950/50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-medium">{comment.authorName}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(comment.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" className="gap-2" onClick={onReply}>
            <Reply className="size-4" />
            Reply
          </Button>
          <ReportContentButton
            targetId={comment.id}
            targetLabel={comment.body.slice(0, 80) || "Comment"}
            targetType="comment"
          />
          {canHide ? (
            <Button
              size="sm"
              variant="secondary"
              className="gap-2"
              disabled={connectionDisabled}
              title={publicActionTitle("Hide comment")}
              onClick={onHide}
            >
              <ShieldOff className="size-4" />
              Hide
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              size="sm"
              variant="ghost"
              className="gap-2"
              disabled={connectionDisabled}
              title={publicActionTitle("Delete comment")}
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          ) : null}
          {canHide && currentUserId !== comment.authorId ? (
            <Button
              size="sm"
              variant="ghost"
              className="gap-2"
              disabled={connectionDisabled}
              title={publicActionTitle("Block commenter")}
              onClick={() => onBlock(comment.authorId)}
            >
              <UserX className="size-4" />
              Block
            </Button>
          ) : null}
        </div>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
        {comment.body}
      </p>
      {replies.length || queuedReplies.length ? (
        <div className="ml-4 space-y-2 border-l border-white/10 pl-4">
          {replies.map((reply) => (
            <div key={reply.id} className="rounded-md bg-black/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{reply.authorName}</p>
                <div className="flex flex-wrap gap-2">
                  <ReportContentButton
                    targetId={reply.id}
                    targetLabel={reply.body.slice(0, 80) || "Comment"}
                    targetType="comment"
                  />
                  {currentUserId === targetOwnerId ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-2"
                      disabled={connectionDisabled}
                      title={publicActionTitle("Hide reply")}
                      onClick={() => onReplyHide(reply.id)}
                    >
                      <ShieldOff className="size-4" />
                      Hide
                    </Button>
                  ) : null}
                  {currentUserId === targetOwnerId ||
                  currentUserId === reply.authorId ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-2"
                      disabled={connectionDisabled}
                      title={publicActionTitle("Delete reply")}
                      onClick={() => onReplyDelete(reply.id)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  ) : null}
                  {currentUserId === targetOwnerId &&
                  currentUserId !== reply.authorId ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-2"
                      disabled={connectionDisabled}
                      title={publicActionTitle("Block commenter")}
                      onClick={() => onBlock(reply.authorId)}
                    >
                      <UserX className="size-4" />
                      Block
                    </Button>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {reply.body}
              </p>
            </div>
          ))}
          {queuedReplies.map((reply) => (
            <QueuedCommentItem key={reply.id} comment={reply} compact />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function QueuedCommentItem({
  comment,
  compact = false,
}: {
  comment: QueuedPublicComment;
  compact?: boolean;
}) {
  const stale = isQueuedPublicInteractionStale(comment);

  return (
    <div
      className={
        compact
          ? "rounded-md border border-dashed border-amber-300/30 bg-amber-300/5 p-3"
          : "space-y-3 rounded-md border border-dashed border-amber-300/30 bg-amber-300/5 p-4"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">You</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            Queued {formatQueuedPublicInteractionAge(comment.createdAt)}
          </p>
        </div>
        <Badge
          variant={comment.lastError ? "destructive" : "outline"}
          className={stale && !comment.lastError ? "border-amber-300/40 text-amber-100" : ""}
        >
          {comment.lastError ? "Retry failed" : stale ? "Review" : "Queued"}
        </Badge>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
        {comment.body}
      </p>
      {comment.lastError ? (
        <p className="text-xs text-destructive">{comment.lastError}</p>
      ) : null}
    </div>
  );
}
