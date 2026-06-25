"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  Download,
  MessageSquare,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { commentsToCsv, downloadCsv } from "@/features/editor/comment-export";
import type { DesignComment } from "@/features/editor/types";

type SharedCommentFilter = "all" | "open" | "resolved";

type SharedCommentHandoffProps = {
  comments: DesignComment[];
};

export function SharedCommentHandoff({ comments }: SharedCommentHandoffProps) {
  const [filter, setFilter] = useState<SharedCommentFilter>("all");
  const [query, setQuery] = useState("");
  const openCount = comments.filter((comment) => !comment.resolved).length;
  const resolvedCount = comments.length - openCount;
  const visibleComments = getVisibleComments(comments, filter, query);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Active Page Comments
        </h2>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">
            {openCount} open
          </span>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6"
            disabled={visibleComments.length === 0}
            aria-label="Export visible comments as CSV"
            onClick={() =>
              downloadCsv("shared-comments.csv", commentsToCsv(visibleComments))
            }
          >
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-background p-0.5">
        <FilterButton
          active={filter === "all"}
          label="All"
          value={comments.length}
          onClick={() => setFilter("all")}
        />
        <FilterButton
          active={filter === "open"}
          label="Open"
          value={openCount}
          onClick={() => setFilter("open")}
        />
        <FilterButton
          active={filter === "resolved"}
          label="Done"
          value={resolvedCount}
          onClick={() => setFilter("resolved")}
        />
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          className="h-7 pl-8 text-xs"
          placeholder="Search comments"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        {visibleComments.length > 0 ? (
          visibleComments.map((comment, index) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              index={comments.findIndex((item) => item.id === comment.id) + 1}
              fallbackIndex={index + 1}
            />
          ))
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
            {comments.length > 0
              ? getEmptyLabel(filter, query)
              : "No comments on this page."}
          </div>
        )}
      </div>
    </section>
  );
}

function FilterButton({
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

function CommentCard({
  comment,
  index,
  fallbackIndex,
}: {
  comment: DesignComment;
  index: number;
  fallbackIndex: number;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="grid size-6 place-items-center rounded-full bg-primary font-mono text-[11px] font-bold text-primary-foreground">
          {index > 0 ? index : fallbackIndex}
        </div>
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
          {Math.round(comment.x)}, {Math.round(comment.y)}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {comment.resolved ? (
            <CheckCircle2 className="size-3.5" />
          ) : (
            <Circle className="size-3.5" />
          )}
          {comment.resolved ? "Done" : "Open"}
        </span>
      </div>
      <p className="line-clamp-4 whitespace-pre-wrap text-sm">{comment.text}</p>
      {(comment.replies ?? []).length > 0 ? (
        <div className="mt-3 space-y-2 border-l border-border pl-3">
          {(comment.replies ?? []).slice(0, 2).map((reply) => (
            <div key={reply.id} className="space-y-0.5">
              <div className="text-[11px] font-medium text-muted-foreground">
                {reply.authorName ?? "Reply"}
              </div>
              <p className="line-clamp-3 whitespace-pre-wrap text-xs">
                {reply.text}
              </p>
            </div>
          ))}
          {(comment.replies ?? []).length > 2 ? (
            <div className="text-xs text-muted-foreground">
              +{(comment.replies ?? []).length - 2} more replies
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function getVisibleComments(
  comments: DesignComment[],
  filter: SharedCommentFilter,
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
    ...(comment.mentions ?? []),
    ...(comment.replies ?? []).flatMap((reply) => [
      reply.text,
      reply.authorName ?? "",
      ...(reply.mentions ?? []),
    ]),
  ]
    .join(" ")
    .toLowerCase();
}

function getEmptyLabel(filter: SharedCommentFilter, query: string) {
  if (query.trim()) {
    return "No comments match that search.";
  }

  if (filter === "open") {
    return "No open comments.";
  }

  if (filter === "resolved") {
    return "No resolved comments.";
  }

  return "No comments match this view.";
}
