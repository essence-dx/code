"use client";

import { useMemo, useState } from "react";
import { Download, FileJson2, GitCompareArrows } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getBranchCompareMergeWorkbenchCsv,
  getBranchCompareMergeWorkbenchJson,
  getBranchCompareMergeWorkbenchMarkdown,
  type BranchCompareMergeWorkbenchReport,
  type BranchCompareMergeWorkbenchRow,
  type BranchCompareMergeWorkbenchStatus,
} from "@/features/editor/branch-compare-merge-workbench";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import { cn } from "@/lib/utils";

type BranchCompareMergeWorkbenchPanelProps = {
  report: BranchCompareMergeWorkbenchReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type BranchCompareMergeFilter = "all" | BranchCompareMergeWorkbenchStatus;

export function BranchCompareMergeWorkbenchPanel({
  report,
  onRecordActivity,
}: BranchCompareMergeWorkbenchPanelProps) {
  const [filter, setFilter] = useState<BranchCompareMergeFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getBranchCompareMergeWorkbenchCsv(report, visibleRows),
      filename: `branch-compare-merge-workbench-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported branch compare CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getBranchCompareMergeWorkbenchMarkdown(report, visibleRows),
      filename: `branch-compare-merge-workbench-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported branch compare handoff",
      `${visibleRows.length} rows`,
    );
  }

  function exportJson() {
    downloadTextFile({
      content: getBranchCompareMergeWorkbenchJson(report, visibleRows),
      filename: `branch-compare-merge-workbench-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported branch compare evidence",
      `${visibleRows.length} rows`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <GitCompareArrows className="size-3.5" />
            Branch compare
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Visual diffs, merge decisions, reviewer signoff, and rollback anchors.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Versions" value={report.versionCount} />
        <Metric label="Diffs" value={report.visualDiffCount} />
        <Metric label="Conflicts" value={report.unresolvedConflictCount} />
        <Metric label="Anchors" value={report.rollbackAnchorCount} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Selected" value={report.selectedVersionName ?? "none"} />
        <Metric label="Signoff" value={report.reviewerSignoffCount} />
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
          <Download className="size-3" />
          MD
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleRows.length === 0}
          onClick={exportJson}
        >
          <FileJson2 className="size-3" />
          JSON
        </Button>
      </div>

      <div className="mt-2 space-y-1">
        {visibleRows.slice(0, 5).map((row) => (
          <BranchCompareRow key={row.id} row={row} />
        ))}
        {visibleRows.length > 5 ? (
          <div className="rounded-sm bg-muted px-2 py-1 text-[10px] text-muted-foreground">
            {visibleRows.length - 5} more workbench row
            {visibleRows.length - 5 === 1 ? "" : "s"}
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
  id: BranchCompareMergeFilter;
  label: string;
}>;

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="min-w-0 rounded-sm bg-muted px-2 py-1">
      <div className="truncate">{label}</div>
      <div className="truncate text-xs text-foreground">{value}</div>
    </div>
  );
}

function BranchCompareRow({ row }: { row: BranchCompareMergeWorkbenchRow }) {
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
          {row.value}
        </span>
      </div>
      <div className="mt-1 truncate text-[10px] text-muted-foreground">
        {row.versionName ?? row.category}
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {row.detail}
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {row.recommendation}
      </div>
    </div>
  );
}

function getVisibleRows(
  rows: BranchCompareMergeWorkbenchRow[],
  filter: BranchCompareMergeFilter,
) {
  if (filter === "all") {
    return rows;
  }

  return rows.filter((row) => row.status === filter);
}

function getStatusVariant(status: BranchCompareMergeWorkbenchStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
