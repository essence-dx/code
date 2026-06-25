"use client";

import { useState } from "react";
import {
  AtSign,
  CheckCircle2,
  Circle,
  CalendarClock,
  Download,
  LocateFixed,
  MessageSquare,
  Search,
  Send,
  Trash2,
  UserPlus,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  commentMentionsUser,
  countMentionedComments,
} from "@/features/editor/comment-mentions";
import { commentsToCsv, downloadCsv } from "@/features/editor/comment-export";
import type {
  DesignComment,
  DesignCommentNotificationDelivery,
  DesignCommentNotificationPreferences,
  DesignCommentReactionKind,
} from "@/features/editor/types";
import {
  CommentReactionControls,
  getCommentReactionSearchParts,
  isCommentAssignedToUser,
} from "@/features/editor/components/comment-reaction-controls";
import { CommentNotificationSettings } from "@/features/editor/components/comment-notification-settings";
import { cn } from "@/lib/utils";

type CommentFilter =
  | "all"
  | "open"
  | "resolved"
  | "mentions"
  | "assigned"
  | "due";

type CommentsPanelProps = {
  comments: DesignComment[];
  mentionKeys: string[];
  currentUserName: string;
  currentUserEmail: string;
  notificationPreferences: DesignCommentNotificationPreferences;
  notificationDeliveries: DesignCommentNotificationDelivery[];
  selectedCommentId: string | null;
  onSelectComment: (comment: DesignComment) => void;
  onUpdateComment: (
    commentId: string,
    patch: Partial<
      Pick<DesignComment, "text" | "resolved" | "x" | "y" | "dueDate">
    >,
  ) => void;
  onUpdateComments: (
    commentIds: string[],
    patch: Partial<Pick<DesignComment, "resolved">>,
  ) => void;
  onRemoveComment: (commentId: string) => void;
  onToggleCommentReaction: (
    commentId: string,
    kind: DesignCommentReactionKind,
  ) => void;
  onAssignComment: (commentId: string) => void;
  onClearCommentAssignment: (commentId: string) => void;
  onAddCommentReply: (commentId: string, text: string) => void;
  onUpdateCommentReply: (
    commentId: string,
    replyId: string,
    text: string,
  ) => void;
  onRemoveCommentReply: (commentId: string, replyId: string) => void;
  onUpdateNotificationPreferences: (
    patch: Partial<
      Pick<
        DesignCommentNotificationPreferences,
        | "enabled"
        | "newComments"
        | "replies"
        | "assignments"
        | "mentions"
        | "reactions"
        | "acknowledgements"
        | "mutedEmails"
      >
    >,
  ) => void;
};

export function CommentsPanel({
  comments,
  mentionKeys,
  currentUserName,
  currentUserEmail,
  notificationPreferences,
  notificationDeliveries,
  selectedCommentId,
  onSelectComment,
  onUpdateComment,
  onUpdateComments,
  onRemoveComment,
  onToggleCommentReaction,
  onAssignComment,
  onClearCommentAssignment,
  onAddCommentReply,
  onUpdateCommentReply,
  onRemoveCommentReply,
  onUpdateNotificationPreferences,
}: CommentsPanelProps) {
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<CommentFilter>("all");
  const [query, setQuery] = useState("");
  const mentionCount = countMentionedComments(comments, mentionKeys);
  const openCount = comments.filter((comment) => !comment.resolved).length;
  const resolvedCount = comments.length - openCount;
  const assignedCount = comments.filter(
    (comment) =>
      !comment.resolved &&
      isCommentAssignedToUser(comment, currentUserName, currentUserEmail),
  ).length;
  const dueCount = comments.filter(isOpenDueComment).length;
  const visibleComments = getVisibleComments(
    comments,
    filter,
    mentionKeys,
    currentUserName,
    currentUserEmail,
    query,
  );
  const visibleOpenCommentIds = visibleComments
    .filter((comment) => !comment.resolved)
    .map((comment) => comment.id);
  const visibleResolvedCommentIds = visibleComments
    .filter((comment) => comment.resolved)
    .map((comment) => comment.id);

  function submitReply(commentId: string) {
    const text = replyDrafts[commentId]?.trim();

    if (!text) {
      return;
    }

    onAddCommentReply(commentId, text);
    setReplyDrafts((current) => ({ ...current, [commentId]: "" }));
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-2 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 flex-1">Comments</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px]">
              {openCount} open / {resolvedCount} done / {assignedCount} mine
            </span>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-6"
              disabled={visibleComments.length === 0}
              aria-label="Export visible comments as CSV"
              onClick={() =>
                downloadCsv("comments-review.csv", commentsToCsv(visibleComments))
              }
            >
              <Download className="size-3.5" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-1 rounded-md border border-border bg-background p-0.5 normal-case tracking-normal">
          <CommentFilterButton
            active={filter === "all"}
            label="All"
            value={comments.length}
            onClick={() => setFilter("all")}
          />
          <CommentFilterButton
            active={filter === "open"}
            label="Open"
            value={openCount}
            onClick={() => setFilter("open")}
          />
          <CommentFilterButton
            active={filter === "resolved"}
            label="Done"
            value={resolvedCount}
            onClick={() => setFilter("resolved")}
          />
          <Button
            type="button"
            size="sm"
            variant={filter === "mentions" ? "secondary" : "ghost"}
            className="h-6 gap-1 rounded-sm px-1 text-xs"
            onClick={() => setFilter("mentions")}
          >
            <AtSign className="size-3" />
            {mentionCount}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "assigned" ? "secondary" : "ghost"}
            className="h-6 gap-1 rounded-sm px-1 text-xs"
            onClick={() => setFilter("assigned")}
          >
            <UserPlus className="size-3" />
            {assignedCount}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "due" ? "secondary" : "ghost"}
            className="h-6 gap-1 rounded-sm px-1 text-xs"
            onClick={() => setFilter("due")}
          >
            <CalendarClock className="size-3" />
            {dueCount}
          </Button>
        </div>
        <div className="relative normal-case tracking-normal">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            className="h-7 pl-8 text-xs"
            placeholder="Search comments and replies"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-1 normal-case tracking-normal">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-md px-2 text-xs"
            disabled={visibleOpenCommentIds.length === 0}
            onClick={() =>
              onUpdateComments(visibleOpenCommentIds, { resolved: true })
            }
          >
            Resolve visible
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 rounded-md px-2 text-xs"
            disabled={visibleResolvedCommentIds.length === 0}
            onClick={() =>
              onUpdateComments(visibleResolvedCommentIds, { resolved: false })
            }
          >
            Reopen visible
          </Button>
        </div>
        <CommentNotificationSettings
          preferences={notificationPreferences}
          deliveries={notificationDeliveries}
          onUpdatePreferences={onUpdateNotificationPreferences}
        />
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-2">
          {visibleComments.length > 0 ? (
            visibleComments.map((comment) => {
              const isMentioned = commentMentionsUser(comment, mentionKeys);
              const assignedToUser = isCommentAssignedToUser(
                comment,
                currentUserName,
                currentUserEmail,
              );
              const commentNumber =
                comments.findIndex((item) => item.id === comment.id) + 1;

              return (
                <div
                  key={comment.id}
                  className={cn(
                    "rounded-md border border-border bg-background p-2",
                    selectedCommentId === comment.id &&
                      "border-primary bg-primary/5",
                    isMentioned && "border-primary/60",
                    comment.resolved && "opacity-65",
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className="grid size-6 place-items-center rounded-full bg-primary font-mono text-[11px] font-bold text-primary-foreground">
                      {commentNumber}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {Math.round(comment.x)}, {Math.round(comment.y)}
                    </span>
                    {comment.assigneeName ? (
                      <span
                        className={cn(
                          "max-w-20 truncate rounded-sm px-1.5 py-0.5 text-[10px]",
                          assignedToUser
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {comment.assigneeName}
                      </span>
                    ) : null}
                    {comment.dueDate ? (
                      <span
                        className={cn(
                          "max-w-24 truncate rounded-sm px-1.5 py-0.5 text-[10px]",
                          isCommentOverdue(comment)
                            ? "bg-destructive/15 text-destructive"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {formatDueDate(comment.dueDate)}
                      </span>
                    ) : null}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      aria-label={
                        assignedToUser
                          ? "Clear comment assignment"
                          : "Assign comment to me"
                      }
                      onClick={() =>
                        assignedToUser
                          ? onClearCommentAssignment(comment.id)
                          : onAssignComment(comment.id)
                      }
                    >
                      {assignedToUser ? (
                        <UserX className="size-4" />
                      ) : (
                        <UserPlus className="size-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      aria-label="Focus comment on canvas"
                      onClick={() => onSelectComment(comment)}
                    >
                      <LocateFixed className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      aria-label="Delete comment"
                      onClick={() => onRemoveComment(comment.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      aria-label={
                        comment.resolved ? "Reopen comment" : "Resolve comment"
                      }
                      onClick={() =>
                        onUpdateComment(comment.id, {
                          resolved: !comment.resolved,
                        })
                      }
                    >
                      {comment.resolved ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <Circle className="size-4" />
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={comment.text}
                    rows={3}
                    onChange={(event) =>
                      onUpdateComment(comment.id, { text: event.target.value })
                    }
                  />
                  <CommentReactionControls
                    comment={comment}
                    currentUserName={currentUserName}
                    currentUserEmail={currentUserEmail}
                    onToggleReaction={(kind) =>
                      onToggleCommentReaction(comment.id, kind)
                    }
                  />
                  <div className="mt-2 grid grid-cols-[1fr_auto] items-end gap-2">
                    <label className="space-y-1 text-[11px] text-muted-foreground">
                      <span>Due date</span>
                      <Input
                        type="date"
                        value={comment.dueDate ?? ""}
                        className="h-8 text-xs"
                        onChange={(event) =>
                          onUpdateComment(comment.id, {
                            dueDate: event.target.value || null,
                          })
                        }
                      />
                    </label>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-xs"
                      disabled={!comment.dueDate}
                      onClick={() =>
                        onUpdateComment(comment.id, { dueDate: null })
                      }
                    >
                      Clear
                    </Button>
                  </div>
                  {(comment.resolutionHistory ?? []).length > 0 ? (
                    <div className="mt-2 rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">
                      <div className="font-medium text-foreground">
                        Resolution history
                      </div>
                      {(comment.resolutionHistory ?? [])
                        .slice(0, 3)
                        .map((item) => (
                          <div key={item.id} className="mt-1">
                            {item.status} by {item.actorName} at{" "}
                            {formatHistoryDate(item.createdAt)}
                          </div>
                        ))}
                    </div>
                  ) : null}
                  {(comment.replies ?? []).length > 0 ? (
                    <div className="mt-3 space-y-2 border-l border-border pl-3">
                      {(comment.replies ?? []).map((reply) => {
                        const replyMentions = reply.mentions ?? [];

                        return (
                          <div key={reply.id} className="space-y-1">
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {reply.authorName ?? "Reply"}
                              </span>
                              {replyMentions.length > 0 ? (
                                <span className="truncate">
                                  {replyMentions
                                    .map((mention) => `@${mention}`)
                                    .join(", ")}
                                </span>
                              ) : null}
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="ml-auto size-6"
                                aria-label="Delete reply"
                                onClick={() =>
                                  onRemoveCommentReply(comment.id, reply.id)
                                }
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                            <Textarea
                              value={reply.text}
                              rows={2}
                              onChange={(event) =>
                                onUpdateCommentReply(
                                  comment.id,
                                  reply.id,
                                  event.target.value,
                                )
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  <div className="mt-3 flex items-start gap-2">
                    <Textarea
                      value={replyDrafts[comment.id] ?? ""}
                      rows={2}
                      placeholder="Reply"
                      onChange={(event) =>
                        setReplyDrafts((current) => ({
                          ...current,
                          [comment.id]: event.target.value,
                        }))
                      }
                    />
                    <Button
                      type="button"
                      size="icon"
                      className="mt-0.5 size-8"
                      disabled={!replyDrafts[comment.id]?.trim()}
                      aria-label="Add reply"
                      onClick={() => submitReply(comment.id)}
                    >
                      <Send className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          ) : comments.length > 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              {filter === "mentions" ? (
                <AtSign className="size-5" />
              ) : (
                <MessageSquare className="size-5" />
              )}
              {getEmptyFilterLabel(filter, query)}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              <MessageSquare className="size-5" />
              Use the comment tool to pin feedback on the canvas.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function CommentFilterButton({
  active,
  label,
  value,
  onClick,
}: {
  active: boolean;
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      className="h-6 gap-1 rounded-sm px-1 text-xs"
      onClick={onClick}
    >
      <span className="truncate">{label}</span>
      <span className="font-mono text-[10px] text-muted-foreground">
        {value}
      </span>
    </Button>
  );
}

function getVisibleComments(
  comments: DesignComment[],
  filter: CommentFilter,
  mentionKeys: string[],
  currentUserName: string,
  currentUserEmail: string,
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredComments = comments.filter((comment) => {
    if (filter === "open") {
      return !comment.resolved;
    }

    if (filter === "resolved") {
      return comment.resolved;
    }

    if (filter === "mentions") {
      return commentMentionsUser(comment, mentionKeys);
    }

    if (filter === "assigned") {
      return isCommentAssignedToUser(
        comment,
        currentUserName,
        currentUserEmail,
      );
    }

    if (filter === "due") {
      return isOpenDueComment(comment);
    }

    return true;
  });

  if (!normalizedQuery) {
    return filteredComments;
  }

  return filteredComments.filter((comment) =>
    getCommentSearchText(comment).includes(normalizedQuery),
  );
}

function getCommentSearchText(comment: DesignComment) {
  return [
    comment.text,
    `${Math.round(comment.x)}, ${Math.round(comment.y)}`,
    comment.assigneeName ?? "",
    comment.assigneeEmail ?? "",
    comment.dueDate ?? "",
    ...(comment.resolutionHistory ?? []).flatMap((item) => [
      item.status,
      item.actorName,
      item.actorEmail ?? "",
    ]),
    ...(comment.replies ?? []).flatMap((reply) => [
      reply.text,
      reply.authorName ?? "",
      ...(reply.mentions ?? []),
    ]),
    ...getCommentReactionSearchParts(comment),
    ...(comment.mentions ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

function getEmptyFilterLabel(filter: CommentFilter, query: string) {
  if (query.trim()) {
    return "No comments match that search.";
  }

  if (filter === "open") {
    return "No open comments.";
  }

  if (filter === "resolved") {
    return "No resolved comments.";
  }

  if (filter === "mentions") {
    return "No comments mention you.";
  }

  if (filter === "assigned") {
    return "No comments are assigned to you.";
  }

  if (filter === "due") {
    return "No open comments have due dates.";
  }

  return "No comments match this view.";
}

function isOpenDueComment(comment: DesignComment) {
  return !comment.resolved && Boolean(comment.dueDate);
}

function isCommentOverdue(comment: DesignComment) {
  if (!comment.dueDate || comment.resolved) {
    return false;
  }

  return new Date(`${comment.dueDate}T23:59:59`).getTime() < Date.now();
}

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatHistoryDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
