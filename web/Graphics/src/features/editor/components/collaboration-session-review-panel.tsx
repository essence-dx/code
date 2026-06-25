"use client";

import { useMemo, useState } from "react";
import {
  ClipboardCopy,
  Download,
  MessageSquareWarning,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  getCollaborationSessionReview,
  getCollaborationSessionReviewCsv,
  getCollaborationSessionReviewMarkdown,
  type CollaborationSessionReviewRow,
  type CollaborationSessionReviewStatus,
} from "@/features/editor/collaboration-session-review";
import type {
  CollaborationChatMessage,
  CollaborationPeer,
  CollaborationPresenceEvent,
} from "@/features/editor/collaboration-presence";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import { cn } from "@/lib/utils";

type CollaborationSessionReviewPanelProps = {
  activePageId: string;
  chatMessages: CollaborationChatMessage[];
  currentUser: {
    email?: string | null;
    name: string;
  };
  lastReadAt: number;
  onRecordActivity?: (label: string, detail?: string) => void;
  peers: CollaborationPeer[];
  presenceEvents: CollaborationPresenceEvent[];
  selfId: string;
};

type CollaborationSessionReviewFilter =
  | "all"
  | "blocked"
  | "review"
  | "ready";

export function CollaborationSessionReviewPanel({
  activePageId,
  chatMessages,
  currentUser,
  lastReadAt,
  onRecordActivity,
  peers,
  presenceEvents,
  selfId,
}: CollaborationSessionReviewPanelProps) {
  const [filter, setFilter] =
    useState<CollaborationSessionReviewFilter>("all");
  const report = useMemo(
    () =>
      getCollaborationSessionReview({
        activePageId,
        chatMessages,
        currentUser,
        lastReadAt,
        peers,
        presenceEvents,
        selfId,
      }),
    [
      activePageId,
      chatMessages,
      currentUser,
      lastReadAt,
      peers,
      presenceEvents,
      selfId,
    ],
  );
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getCollaborationSessionReviewCsv(report, visibleRows),
      filename: `collaboration-session-review-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported collaboration review CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getCollaborationSessionReviewMarkdown(report, visibleRows),
      filename: `collaboration-session-review-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported collaboration review handoff",
      `${visibleRows.length} rows`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getCollaborationSessionReviewMarkdown(report, visibleRows),
    );
    onRecordActivity?.(
      "Copied collaboration review handoff",
      `${visibleRows.length} rows`,
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant={
            report.blockedCount > 0 || report.reviewCount > 0
              ? "secondary"
              : "ghost"
          }
          className="h-8 gap-1.5 px-2"
          title="Collaboration session review"
        >
          {report.blockedCount > 0 ? (
            <ShieldAlert className="size-3.5" />
          ) : (
            <ShieldCheck className="size-3.5" />
          )}
          <span className="font-mono text-[11px]">{report.score}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex h-10 items-center justify-between border-b border-border px-3">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Session review
            <Badge
              variant={report.blockedCount > 0 ? "destructive" : "secondary"}
              className="h-5 px-1.5 text-[10px]"
            >
              {report.score}
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              disabled={visibleRows.length === 0}
              aria-label="Export collaboration review CSV"
              onClick={exportCsv}
            >
              <Download className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              disabled={visibleRows.length === 0}
              aria-label="Export collaboration review Markdown"
              onClick={exportMarkdown}
            >
              <MessageSquareWarning className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              disabled={visibleRows.length === 0}
              aria-label="Copy collaboration review Markdown"
              onClick={copyMarkdown}
            >
              <ClipboardCopy className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 border-b border-border p-2 font-mono text-[10px] text-muted-foreground">
          <Metric label="Peers" value={report.peerCount} />
          <Metric label="Stale" value={report.stalePeerCount} />
          <Metric label="Mentions" value={report.unreadMentionCount} />
          <Metric label="Drops" value={report.disconnectCount} />
        </div>
        <div className="grid grid-cols-4 gap-1.5 border-b border-border p-2 font-mono text-[10px] text-muted-foreground">
          <Metric label="Cursor" value={report.missingCursorCount} />
          <Metric label="View" value={report.missingViewportCount} />
          <Metric label="Pages" value={report.pageSpreadCount} />
          <Metric label="Events" value={report.eventCount} />
        </div>

        <div className="flex flex-wrap gap-1 border-b border-border p-2">
          {reviewFilters.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={filter === item.id ? "secondary" : "ghost"}
              className="h-7 px-2 text-[11px]"
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <ScrollArea className="h-72">
          <div className="space-y-2 p-2">
            {visibleRows.length > 0 ? (
              visibleRows.map((row) => (
                <ReviewRow key={row.id} row={row} />
              ))
            ) : (
              <div className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
                No review items in this queue.
              </div>
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const reviewFilters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "ready", label: "Ready" },
] as const satisfies ReadonlyArray<{
  id: CollaborationSessionReviewFilter;
  label: string;
}>;

function ReviewRow({ row }: { row: CollaborationSessionReviewRow }) {
  return (
    <div
      className={cn(
        "rounded-md border bg-background p-2",
        row.status === "blocked" && "border-destructive/60",
        row.status === "review" && "border-amber-400/70",
        row.status === "ready" && "border-border",
      )}
    >
      <div className="flex items-start gap-2">
        <Badge
          variant={getStatusVariant(row.status)}
          className="h-5 shrink-0 px-1.5 text-[10px]"
        >
          {row.status}
        </Badge>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium">{row.label}</div>
          <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
            {row.detail}
          </div>
        </div>
        {row.createdAt ? (
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {formatReviewTime(row.createdAt)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-background px-2 py-1">
      <div>{label}</div>
      <div className="text-xs text-foreground">{value}</div>
    </div>
  );
}

function getVisibleRows(
  rows: CollaborationSessionReviewRow[],
  filter: CollaborationSessionReviewFilter,
) {
  if (filter === "all") {
    return rows;
  }

  return rows.filter((row) => row.status === filter);
}

function getStatusVariant(status: CollaborationSessionReviewStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function formatReviewTime(value: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
