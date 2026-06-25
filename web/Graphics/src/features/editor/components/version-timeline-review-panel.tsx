"use client";

import { useMemo, useState } from "react";
import { ClipboardCopy, Download, ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getVersionTimelineReview,
  getVersionTimelineReviewCsv,
  getVersionTimelineReviewMarkdown,
  type VersionTimelineReviewRow,
  type VersionTimelineReviewStatus,
} from "@/features/editor/version-timeline-review";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import type { DesignDocument } from "@/features/editor/types";
import type { DesignFileVersionSummary } from "@/features/files/actions";
import { cn } from "@/lib/utils";

type VersionTimelineReviewPanelProps = {
  currentDocument: DesignDocument;
  onRecordActivity?: (label: string, detail?: string) => void;
  versions: DesignFileVersionSummary[];
};

type VersionTimelineFilter = "all" | "blocked" | "review" | "ready";

export function VersionTimelineReviewPanel({
  currentDocument,
  onRecordActivity,
  versions,
}: VersionTimelineReviewPanelProps) {
  const [filter, setFilter] = useState<VersionTimelineFilter>("all");
  const report = useMemo(
    () =>
      getVersionTimelineReview({
        currentDocument,
        versions,
      }),
    [currentDocument, versions],
  );
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );
  const previewRows = visibleRows.slice(0, 3);

  function exportCsv() {
    downloadTextFile({
      content: getVersionTimelineReviewCsv(report, visibleRows),
      filename: `version-timeline-review-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported version timeline CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getVersionTimelineReviewMarkdown(report, visibleRows),
      filename: `version-timeline-review-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported version timeline handoff",
      `${visibleRows.length} rows`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getVersionTimelineReviewMarkdown(report, visibleRows),
    );
    onRecordActivity?.(
      "Copied version timeline handoff",
      `${visibleRows.length} rows`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {report.blockedCount > 0 ? (
              <ShieldAlert className="size-3.5" />
            ) : (
              <ShieldCheck className="size-3.5" />
            )}
            Timeline review
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Restore, branch, merge, duplicate, and stale checkpoint risk.
          </div>
        </div>
        <Badge variant={report.blockedCount > 0 ? "destructive" : "secondary"}>
          {report.score}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Saved" value={report.versionCount} />
        <Metric label="High" value={report.highRiskCount} />
        <Metric label="Med" value={report.mediumRiskCount} />
        <Metric label="Stale" value={report.staleVersionCount} />
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
          <TimelineRow key={row.id} row={row} />
        ))}
        {visibleRows.length > previewRows.length ? (
          <div className="rounded-sm bg-muted px-2 py-1 text-[10px] text-muted-foreground">
            {visibleRows.length - previewRows.length} more timeline item
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
  id: VersionTimelineFilter;
  label: string;
}>;

function TimelineRow({ row }: { row: VersionTimelineReviewRow }) {
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
          {row.changeCount}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {row.detail}
      </div>
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
  rows: VersionTimelineReviewRow[],
  filter: VersionTimelineFilter,
) {
  if (filter === "all") {
    return rows;
  }

  return rows.filter((row) => row.status === filter);
}

function getStatusVariant(status: VersionTimelineReviewStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
