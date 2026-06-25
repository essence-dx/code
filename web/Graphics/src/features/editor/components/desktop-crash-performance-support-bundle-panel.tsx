"use client";

import { useMemo, useState } from "react";
import { Activity, Download, FileJson2, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getDesktopCrashPerformanceSupportBundleCsv,
  getDesktopCrashPerformanceSupportBundleJson,
  getDesktopCrashPerformanceSupportBundleMarkdown,
  type DesktopCrashPerformanceSupportBundleReport,
  type DesktopSupportBundleCategory,
  type DesktopSupportBundleRow,
  type DesktopSupportBundleStatus,
} from "@/features/editor/desktop-crash-performance-support-bundle";
import { cn } from "@/lib/utils";

type DesktopCrashPerformanceSupportBundlePanelProps = {
  report: DesktopCrashPerformanceSupportBundleReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type SupportBundleFilter =
  | "all"
  | DesktopSupportBundleCategory
  | DesktopSupportBundleStatus;

export function DesktopCrashPerformanceSupportBundlePanel({
  report,
  onRecordActivity,
}: DesktopCrashPerformanceSupportBundlePanelProps) {
  const [filter, setFilter] = useState<SupportBundleFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );

  function exportJson() {
    downloadTextFile({
      content: getDesktopCrashPerformanceSupportBundleJson(report, visibleRows),
      filename: `desktop-crash-performance-support-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported desktop support bundle JSON",
      `${visibleRows.length} rows`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getDesktopCrashPerformanceSupportBundleCsv(report, visibleRows),
      filename: `desktop-crash-performance-support-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported desktop support bundle CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getDesktopCrashPerformanceSupportBundleMarkdown(
        report,
        visibleRows,
      ),
      filename: `desktop-crash-performance-support-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported desktop support bundle handoff",
      `${report.supportPacketCount} packets`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Activity className="size-3.5" />
            Desktop support bundles
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Crash and performance triage for cold start, file open, canvas resume, plugin run, and memory pressure.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Signals" value={report.signalCount} />
        <Metric label="Crashes" value={report.crashCount} />
        <Metric label="Slow" value={report.slowSignalCount} />
        <Metric label="Packets" value={report.supportPacketCount} />
      </div>

      <div className="mt-2 grid grid-cols-5 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Start" value={report.coldStartCount} />
        <Metric label="Open" value={report.fileOpenCount} />
        <Metric label="Resume" value={report.canvasResumeCount} />
        <Metric label="Plugin" value={report.pluginRunCount} />
        <Metric label="Memory" value={report.memoryPressureCount} />
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
          disabled={visibleRows.length === 0}
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
          disabled={visibleRows.length === 0}
          onClick={exportMarkdown}
        >
          MD
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.map((row) => (
          <SupportRow key={row.id} row={row} />
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
  { id: "cold-start", label: "Start" },
  { id: "file-open", label: "Open" },
  { id: "canvas-resume", label: "Resume" },
  { id: "plugin-run", label: "Plugin" },
  { id: "memory-pressure", label: "Memory" },
  { id: "support-gate", label: "Gate" },
] as const satisfies ReadonlyArray<{
  id: SupportBundleFilter;
  label: string;
}>;

function SupportRow({ row }: { row: DesktopSupportBundleRow }) {
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
        <Gauge className="size-3 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
          {row.label}
        </span>
        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {row.metric}
        </span>
      </div>
      <div className="mt-1 truncate text-[10px] text-muted-foreground">
        {row.category} / threshold {row.threshold}
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {row.detail}
      </div>
      <div className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">
        {row.recommendation}
      </div>
    </div>
  );
}

function getVisibleRows(
  rows: DesktopSupportBundleRow[],
  filter: SupportBundleFilter,
) {
  if (filter === "all") {
    return rows;
  }

  return rows.filter((row) => row.status === filter || row.category === filter);
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="min-w-0 rounded-sm bg-muted px-1.5 py-1">
      <div className="truncate uppercase">{label}</div>
      <div className="truncate text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: DesktopSupportBundleStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
