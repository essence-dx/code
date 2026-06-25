"use client";

import { useMemo, useState } from "react";
import { Download, FileJson2, Rocket, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getReleaseReadinessDashboardCsv,
  getReleaseReadinessDashboardJson,
  getReleaseReadinessDashboardMarkdown,
  type ReleaseReadinessDashboard,
  type ReleaseReadinessRow,
  type ReleaseReadinessStatus,
} from "@/features/editor/release-readiness-dashboard";
import { cn } from "@/lib/utils";

type ReleaseReadinessDashboardPanelProps = {
  report: ReleaseReadinessDashboard;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type ReleaseReadinessFilter = "all" | ReleaseReadinessStatus;

export function ReleaseReadinessDashboardPanel({
  report,
  onRecordActivity,
}: ReleaseReadinessDashboardPanelProps) {
  const [filter, setFilter] = useState<ReleaseReadinessFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );

  function exportJson() {
    downloadTextFile({
      content: getReleaseReadinessDashboardJson(report, visibleRows),
      filename: `release-readiness-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported release readiness JSON",
      `${visibleRows.length} sections`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getReleaseReadinessDashboardCsv(report, visibleRows),
      filename: `release-readiness-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported release readiness CSV",
      `${visibleRows.length} sections`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getReleaseReadinessDashboardMarkdown(report, visibleRows),
      filename: `release-readiness-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported release readiness handoff",
      `${visibleRows.length} sections`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Rocket className="size-3.5" />
            Release readiness
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Unified signoff for review approval, variables, components,
            plugins, responsive behavior, visual QA, deploy smoke, and assets.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Ready" value={report.readyCount} />
        <Metric label="Review" value={report.reviewCount} />
        <Metric label="Blocked" value={report.blockedCount} />
        <Metric label="Evidence" value={report.evidenceCount} />
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
          onClick={exportJson}
        >
          <FileJson2 className="size-3" />
          JSON
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          onClick={exportCsv}
        >
          <Download className="size-3" />
          CSV
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          onClick={exportMarkdown}
        >
          MD
        </Button>
      </div>

      <div className="mt-2 space-y-1">
        {visibleRows.map((row) => (
          <ReleaseReadinessRowCard key={row.id} row={row} />
        ))}
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
  id: ReleaseReadinessFilter;
  label: string;
}>;

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-sm bg-muted px-2 py-1">
      <div>{label}</div>
      <div className="truncate text-xs text-foreground">{value}</div>
    </div>
  );
}

function ReleaseReadinessRowCard({ row }: { row: ReleaseReadinessRow }) {
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
        <ShieldCheck className="size-3 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
          {row.label}
        </span>
        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {row.score}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {row.detail}
      </div>
      <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
        <span className="rounded-sm bg-muted px-1.5 py-0.5">
          {row.area}
        </span>
        <span className="rounded-sm bg-muted px-1.5 py-0.5">
          {row.blockedCount} blocked
        </span>
        <span className="rounded-sm bg-muted px-1.5 py-0.5">
          {row.reviewCount} review
        </span>
      </div>
    </div>
  );
}

function getVisibleRows(
  rows: ReleaseReadinessRow[],
  filter: ReleaseReadinessFilter,
) {
  if (filter === "all") {
    return rows;
  }

  return rows.filter((row) => row.status === filter);
}

function getStatusVariant(status: ReleaseReadinessStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
