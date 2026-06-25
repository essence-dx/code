"use client";

import {
  CalendarCheck2,
  Check,
  CheckCircle2,
  Heart,
  MessageSquarePlus,
  ThumbsUp,
  UserRound,
} from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { splitCommentMentions } from "@/features/editor/comment-mentions";
import {
  getReviewTaskStatusLabel,
  isReviewTaskOverdue,
} from "@/features/review/review-tasks";
import type {
  CommentReactionKind,
  DesignElement,
  ProjectCommentSummary,
} from "@/features/editor/types";

type CreateCommentInput = {
  body: string;
  pageId: string;
  elementId: string | null;
  taskStatus?: ProjectCommentSummary["taskStatus"];
  taskAssigneeName?: string | null;
  taskDueAt?: string | null;
};

type CommentsSheetProps = {
  open: boolean;
  comments: ProjectCommentSummary[];
  activePageId: string;
  activePageName: string;
  selectedElement: DesignElement | null;
  commentState: "idle" | "saving" | "error";
  onOpenChange: (open: boolean) => void;
  onCreateComment: (input: CreateCommentInput) => Promise<boolean>;
  onToggleReaction: (commentId: string, reaction: CommentReactionKind) => void;
  onResolveComment: (commentId: string) => void;
};

const reactionOptions: {
  kind: CommentReactionKind;
  label: string;
  Icon: typeof ThumbsUp;
}[] = [
  { kind: "like", label: "Like", Icon: ThumbsUp },
  { kind: "agree", label: "Agree", Icon: Check },
  { kind: "love", label: "Love", Icon: Heart },
];

export function CommentsSheet({
  open,
  comments,
  activePageId,
  activePageName,
  selectedElement,
  commentState,
  onOpenChange,
  onCreateComment,
  onToggleReaction,
  onResolveComment,
}: CommentsSheetProps) {
  const [draft, setDraft] = useState("");
  const [createTask, setCreateTask] = useState(false);
  const [taskAssigneeName, setTaskAssigneeName] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const currentPageComments = useMemo(
    () =>
      comments.filter(
        (comment) => comment.pageId === activePageId && !comment.resolved,
      ),
    [activePageId, comments],
  );
  const targetLabel = selectedElement
    ? getElementLabel(selectedElement)
    : activePageName;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const body = draft.trim();

    if (!body) return;

    const created = await onCreateComment({
      body,
      pageId: activePageId,
      elementId: selectedElement?.id ?? null,
      ...(createTask
        ? {
            taskStatus: "todo",
            taskAssigneeName,
            taskDueAt,
          }
        : {}),
    });

    if (created) {
      setDraft("");
      setTaskAssigneeName("");
      setTaskDueAt("");
      setCreateTask(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[380px] sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Comments</SheetTitle>
          <SheetDescription>
            Leave notes on the active page or selected layer.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between gap-3">
              <Badge variant="outline" className="min-w-0 truncate">
                {targetLabel}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {currentPageComments.length} open
              </span>
            </div>
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add a comment... use @name to mention someone"
              maxLength={1000}
              rows={4}
            />
            <div className="rounded-md border border-border p-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={createTask}
                  onChange={(event) => setCreateTask(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Create a review task
              </label>
              {createTask ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="comment-task-owner">Owner</Label>
                    <Input
                      id="comment-task-owner"
                      value={taskAssigneeName}
                      onChange={(event) =>
                        setTaskAssigneeName(event.target.value)
                      }
                      placeholder="@name or teammate"
                      maxLength={80}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comment-task-due">Due date</Label>
                    <Input
                      id="comment-task-due"
                      type="date"
                      value={taskDueAt}
                      onChange={(event) => setTaskDueAt(event.target.value)}
                    />
                  </div>
                </div>
              ) : null}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={commentState === "saving" || !draft.trim()}
            >
              <MessageSquarePlus className="h-4 w-4" />
              {commentState === "saving" ? "Adding..." : "Add comment"}
            </Button>
            {commentState === "error" ? (
              <p className="text-xs text-destructive">
                Could not save this comment. Please try again.
              </p>
            ) : null}
          </form>
          <ScrollArea className="min-h-0 flex-1">
            {currentPageComments.length ? (
              <div className="space-y-3 pr-3">
                {currentPageComments.map((comment) => (
                  <article
                    key={comment.id}
                    className="rounded-md border border-border bg-card p-3"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {comment.authorName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {comment.elementId ? "Layer comment" : "Page comment"}{" "}
                          - {formatCommentDate(comment.createdAt)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onResolveComment(comment.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Resolve
                      </Button>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-6">
                      {splitCommentMentions(comment.body).map((part, index) =>
                        part.mention ? (
                          <span
                            key={`${comment.id}-mention-${index}`}
                            className="rounded bg-primary/10 px-1 font-medium text-primary"
                          >
                            {part.text}
                          </span>
                        ) : (
                          <span key={`${comment.id}-text-${index}`}>
                            {part.text}
                          </span>
                        ),
                      )}
                    </p>
                    {comment.mentions.length ? (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {comment.mentions.map((mention) => (
                          <Badge key={mention} variant="secondary">
                            @{mention}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {comment.taskStatus !== "none" ? (
                      <div className="mt-3 grid gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              comment.taskStatus === "done"
                                ? "secondary"
                                : isReviewTaskOverdue(comment)
                                  ? "destructive"
                                  : "outline"
                            }
                          >
                            {getReviewTaskStatusLabel(comment.taskStatus)}
                          </Badge>
                          {isReviewTaskOverdue(comment) ? (
                            <Badge variant="destructive">Overdue</Badge>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-3 text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="h-3.5 w-3.5" />
                            {comment.taskAssigneeName ?? "Unassigned"}
                          </span>
                          {comment.taskDueAt ? (
                            <span className="inline-flex items-center gap-1">
                              <CalendarCheck2 className="h-3.5 w-3.5" />
                              {formatCommentDate(comment.taskDueAt)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {reactionOptions.map((option) => {
                        const reaction = comment.reactions.find(
                          (item) => item.kind === option.kind,
                        );
                        const count = reaction?.count ?? 0;
                        const reactedByMe = reaction?.reactedByMe ?? false;
                        const Icon = option.Icon;

                        return (
                          <Button
                            key={option.kind}
                            type="button"
                            variant={reactedByMe ? "secondary" : "outline"}
                            size="sm"
                            onClick={() =>
                              onToggleReaction(comment.id, option.kind)
                            }
                          >
                            <Icon className="h-4 w-4" />
                            {option.label}
                            {count > 0 ? (
                              <span className="tabular-nums">{count}</span>
                            ) : null}
                          </Button>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                No open comments on this page yet.
              </p>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function getElementLabel(element: DesignElement) {
  if (element.type === "text") {
    return `Text: ${element.content.slice(0, 36) || "Untitled"}`;
  }

  if (element.type === "document") {
    return `Document: ${element.title || "Untitled"}`;
  }

  if (element.type === "image") return `Image: ${element.alt || "Untitled"}`;
  if (element.type === "video") return `Video: ${element.title || "Untitled"}`;
  if (element.type === "audio") return `Audio: ${element.title || "Untitled"}`;
  if (element.type === "pdf") return `PDF: ${element.title || "Untitled"}`;
  if (element.type === "svg") return `SVG: ${element.name || "Untitled"}`;
  if (element.type === "draw") return `Draw: ${element.name || "Stroke"}`;
  if (element.type === "path") return `Path: ${element.name || "Bezier path"}`;
  if (element.type === "form")
    return `Form: ${element.label || element.fieldKind}`;
  if (element.type === "embed") return `Embed: ${element.title || element.url}`;
  if (element.type === "timer") return `Timer: ${element.label || "Timer"}`;

  return `${element.type[0].toUpperCase()}${element.type.slice(1)} layer`;
}

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
