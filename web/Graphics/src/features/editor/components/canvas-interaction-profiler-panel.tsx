"use client";

import { useMemo, useState } from "react";
import { Download, FileJson2, Gauge, MousePointer2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getCanvasInteractionProfilerCsv,
  getCanvasInteractionProfilerJson,
  getCanvasInteractionProfilerMarkdown,
  type CanvasInteractionProfilerReport,
  type CanvasInteractionProfilerRow,
  type CanvasInteractionProfilerStatus,
} from "@/features/editor/canvas-interaction-profiler";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import { cn } from "@/lib/utils";

type CanvasInteractionProfilerPanelProps = {
  report: CanvasInteractionProfilerReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
};

type CanvasInteractionProfilerFilter = "all" | CanvasInteractionProfilerStatus;

export function CanvasInteractionProfilerPanel({
  report,
  onRecordActivity,
  onSelectLayers,
}: CanvasInteractionProfilerPanelProps) {
  const [filter, setFilter] = useState<CanvasInteractionProfilerFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );
  const selectableLayerIds = useMemo(
    () =>
      Array.from(
        new Set(visibleRows.flatMap((row) => row.layerIds).filter(Boolean)),
      ),
    [visibleRows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getCanvasInteractionProfilerCsv(report, visibleRows),
      filename: `canvas-interaction-profiler-${report.pageId}-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported canvas interaction profiler CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getCanvasInteractionProfilerMarkdown(report, visibleRows),
      filename: `canvas-interaction-profiler-${report.pageId}-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported canvas interaction profiler handoff",
      `${visibleRows.length} rows`,
    );
  }

  function exportJson() {
    downloadTextFile({
      content: getCanvasInteractionProfilerJson(report, visibleRows),
      filename: `canvas-interaction-profiler-${report.pageId}-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported canvas interaction profiler replay",
      `${visibleRows.length} rows`,
    );
  }

  function selectRows() {
    onSelectLayers(selectableLayerIds);
    onRecordActivity?.(
      "Queued canvas interaction profiler review",
      `${selectableLayerIds.length} layers`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Gauge className="size-3.5" />
            Interaction profiler
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Selection latency, pan/zoom frame budget, hit-test hotspots, and replay notes.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Select" value={`${report.estimatedSelectionLatencyMs}ms`} />
        <Metric label="Frame" value={`${report.panZoomFrameBudgetMs}ms`} />
        <Metric label="Hotspots" value={report.hitTestHotspotCount} />
        <Metric label="Replay" value={report.pointerReplayStepCount} />
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

      <div className="mt-2 grid grid-cols-2 gap-1.5">
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
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={selectableLayerIds.length === 0}
          onClick={selectRows}
        >
          <MousePointer2 className="size-3" />
          Select
        </Button>
      </div>

      <div className="mt-2 space-y-1">
        {visibleRows.slice(0, 4).map((row) => (
          <ProfilerRow key={row.id} row={row} />
        ))}
        {visibleRows.length > 4 ? (
          <div className="rounded-sm bg-muted px-2 py-1 text-[10px] text-muted-foreground">
            {visibleRows.length - 4} more profiler row
            {visibleRows.length - 4 === 1 ? "" : "s"}
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
  id: CanvasInteractionProfilerFilter;
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

function ProfilerRow({ row }: { row: CanvasInteractionProfilerRow }) {
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
          {row.metric.toLocaleString()}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {row.detail}
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {row.optimizationNote}
      </div>
      <div className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">
        {row.replaySteps.join(" ")}
      </div>
    </div>
  );
}

function getVisibleRows(
  rows: CanvasInteractionProfilerRow[],
  filter: CanvasInteractionProfilerFilter,
) {
  if (filter === "all") {
    return rows;
  }

  return rows.filter((row) => row.status === filter);
}

function getStatusVariant(status: CanvasInteractionProfilerStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
