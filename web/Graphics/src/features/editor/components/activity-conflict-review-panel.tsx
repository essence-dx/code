"use client";

import { useMemo, useState } from "react";
import { ClipboardCopy, Download, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getActivityConflictReview,
  getActivityConflictReviewCsv,
  getActivityConflictReviewMarkdown,
  type ActivityConflictReviewRow,
  type ActivityConflictReviewStatus,
} from "@/features/editor/activity-conflict-review";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import type { DesignActivityEvent } from "@/features/editor/types";
import { cn } from "@/lib/utils";

type ActivityConflictReviewPanelProps = {
  events: DesignActivityEvent[];
  onRecordActivity?: (label: string, detail?: string) => void;
};

type ActivityConflictFilter = "all" | "blocked" | "review" | "ready";

export function ActivityConflictReviewPanel({
  events,
  onRecordActivity,
}: ActivityConflictReviewPanelProps) {
  const [filter, setFilter] = useState<ActivityConflictFilter>("all");
  const report = useMemo(() => getActivityConflictReview(events), [events]);
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );
  const previewRows = visibleRows.slice(0, 4);

  function exportCsv() {
    downloadTextFile({
      content: getActivityConflictReviewCsv(report, visibleRows),
      filename: `activity-conflict-review-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported activity conflict CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getActivityConflictReviewMarkdown(report, visibleRows),
      filename: `activity-conflict-review-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported activity conflict handoff",
      `${visibleRows.length} rows`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getActivityConflictReviewMarkdown(report, visibleRows),
    );
    onRecordActivity?.(
      "Copied activity conflict handoff",
      `${visibleRows.length} rows`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2 normal-case tracking-normal">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {report.blockedCount > 0 ? (
              <ShieldAlert className="size-3.5" />
            ) : (
              <ShieldCheck className="size-3.5" />
            )}
            Conflict review
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Simultaneous edits, operation sequences, stale exports, and review history.
          </div>
        </div>
        <Badge variant={report.blockedCount > 0 ? "destructive" : "secondary"}>
          {report.score}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-5 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Events" value={report.eventCount} />
        <Metric label="Ops" value={report.operationConflictCount} />
        <Metric label="Targets" value={report.targetConflictCount} />
        <Metric label="Bursts" value={report.burstCount} />
        <Metric label="Stale" value={report.staleExportCount} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {filters.map((item) => (
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

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleRows.length === 0}
          onClick={exportCsv}
        >
          <Download className="mr-1 size-3" />
          CSV
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleRows.length === 0}
          onClick={exportMarkdown}
        >
          MD
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleRows.length === 0}
          onClick={copyMarkdown}
        >
          <ClipboardCopy className="mr-1 size-3" />
          Copy
        </Button>
      </div>

      <div className="mt-2 space-y-1">
        {previewRows.map((row) => (
          <ConflictRow key={row.id} row={row} />
        ))}
        {visibleRows.length > previewRows.length ? (
          <div className="rounded-sm bg-muted px-2 py-1 text-[10px] text-muted-foreground">
            {visibleRows.length - previewRows.length} more review item
            {visibleRows.length - previewRows.length === 1 ? "" : "s"}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const filters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "ready", label: "Ready" },
] as const satisfies ReadonlyArray<{
  id: ActivityConflictFilter;
  label: string;
}>;

function ConflictRow({ row }: { row: ActivityConflictReviewRow }) {
  return (
    <div
      className={cn(
        "rounded-sm border px-2 py-1.5",
        row.status === "blocked" && "border-destructive/60",
        row.status === "review" && "border-amber-400/70",
        row.status === "ready" && "border-border",
      )}
    >
      <div className="flex items-center gap-2">
        <Badge
          variant={getStatusVariant(row.status)}
          className="h-5 shrink-0 px-1.5 text-[10px]"
        >
          {row.status}
        </Badge>
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
          {row.label}
        </span>
        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {row.eventCount}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {row.detail}
      </div>
      {row.operationLabels?.length ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {row.operationLabels.slice(0, 3).map((operation) => (
            <span
              key={operation}
              className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {operation}
            </span>
          ))}
        </div>
      ) : null}
      {row.resolutionHint ? (
        <div className="mt-1 text-[10px] text-muted-foreground">
          {row.resolutionHint}
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted px-2 py-1">
      <div>{label}</div>
      <div className="text-xs text-foreground">{value}</div>
    </div>
  );
}

function getVisibleRows(
  rows: ActivityConflictReviewRow[],
  filter: ActivityConflictFilter,
) {
  if (filter === "all") {
    return rows;
  }

  return rows.filter((row) => row.status === filter);
}

function getStatusVariant(status: ActivityConflictReviewStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
