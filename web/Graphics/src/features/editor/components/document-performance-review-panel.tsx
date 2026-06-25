"use client";

import { useMemo, useState } from "react";
import { Download, Gauge, MousePointer2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getDocumentPerformanceReviewCsv,
  getDocumentPerformanceReviewMarkdown,
  type DocumentPerformanceReview,
  type DocumentPerformanceReviewRow,
  type DocumentPerformanceStatus,
} from "@/features/editor/document-performance-review";
import { cn } from "@/lib/utils";

type DocumentPerformanceReviewPanelProps = {
  report: DocumentPerformanceReview;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
};

type PerformanceFilter = "all" | DocumentPerformanceStatus;

export function DocumentPerformanceReviewPanel({
  report,
  onRecordActivity,
  onSelectLayers,
}: DocumentPerformanceReviewPanelProps) {
  const [filter, setFilter] = useState<PerformanceFilter>("all");
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
      content: getDocumentPerformanceReviewCsv(report, visibleRows),
      filename: `document-performance-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported performance CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getDocumentPerformanceReviewMarkdown(report, visibleRows),
      filename: `document-performance-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported performance handoff",
      `${visibleRows.length} rows`,
    );
  }

  function selectRows() {
    onSelectLayers(selectableLayerIds);
    onRecordActivity?.(
      "Queued performance review",
      `${selectableLayerIds.length} layers`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Gauge className="size-3.5" />
            Performance readiness
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Page, layer, payload, image, vector, and effects budgets.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Pages" value={report.pageCount} />
        <Metric label="Layers" value={report.layerCount} />
        <Metric label="Images" value={report.imageLayerCount} />
        <Metric label="Effects" value={report.effectLayerCount} />
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
          <PerformanceRow key={row.id} row={row} />
        ))}
        {visibleRows.length > 4 ? (
          <div className="rounded-sm bg-muted px-2 py-1 text-[10px] text-muted-foreground">
            {visibleRows.length - 4} more performance item
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
  id: PerformanceFilter;
  label: string;
}>;

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted px-2 py-1">
      <div>{label}</div>
      <div className="text-xs text-foreground">{value}</div>
    </div>
  );
}

function PerformanceRow({ row }: { row: DocumentPerformanceReviewRow }) {
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
          {Math.round(row.metric).toLocaleString()}
        </span>
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
  rows: DocumentPerformanceReviewRow[],
  filter: PerformanceFilter,
) {
  if (filter === "all") {
    return rows;
  }

  return rows.filter((row) => row.status === filter);
}

function getStatusVariant(status: DocumentPerformanceStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
