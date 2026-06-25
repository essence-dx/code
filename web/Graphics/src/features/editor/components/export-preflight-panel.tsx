"use client";

import { useMemo, useState } from "react";
import { Download, MousePointer2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getExportPreflightCsv,
  getExportPreflightMarkdown,
  type ExportPreflightReview,
  type ExportPreflightRow,
} from "@/features/editor/export-preflight-review";
import { cn } from "@/lib/utils";

type ExportPreflightPanelProps = {
  report: ExportPreflightReview;
  activePageId: string;
  onSelectLayers: (layerIds: string[]) => void;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type ExportPreflightFilter = "all" | "blocked" | "review" | "active";

export function ExportPreflightPanel({
  report,
  activePageId,
  onSelectLayers,
  onRecordActivity,
}: ExportPreflightPanelProps) {
  const [filter, setFilter] = useState<ExportPreflightFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, activePageId, filter),
    [activePageId, filter, report.rows],
  );
  const visibleLayerIds = useMemo(
    () =>
      Array.from(
        new Set(
          visibleRows
            .map((row) => row.layerId)
            .filter((layerId): layerId is string => Boolean(layerId)),
        ),
      ),
    [visibleRows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getExportPreflightCsv(report, visibleRows),
      filename: `export-preflight-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported export preflight CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getExportPreflightMarkdown(report, visibleRows),
      filename: `export-preflight-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported export preflight handoff",
      `${visibleRows.length} rows`,
    );
  }

  function queueReview() {
    onSelectLayers(visibleLayerIds);
    onRecordActivity?.(
      "Queued export preflight review",
      `${visibleLayerIds.length} layers`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Download className="size-3.5" />
            Export preflight
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Asset blockers, font drift, raster risks, and batch preset readiness.
          </div>
        </div>
        <Badge variant={report.blockedCount > 0 ? "destructive" : "secondary"}>
          {report.score}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Ready" value={report.readyCount} />
        <Metric label="Review" value={report.reviewCount} />
        <Metric label="Blocked" value={report.blockedCount} />
        <Metric label="Hidden" value={report.hiddenLayerCount} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Exportable" value={report.exportableLayerCount} />
        <Metric label="Fonts" value={report.fontReviewCount} />
        <Metric label="Raster" value={report.rasterRiskCount} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {report.presetReadiness.map((preset) => (
          <div
            key={preset.id}
            className={cn(
              "rounded-sm border border-border/70 bg-muted/20 p-2 text-xs",
              preset.status === "blocked" &&
                "border-destructive/30 bg-destructive/10",
              preset.status === "review" && "border-primary/30 bg-primary/10",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{preset.label}</span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {preset.fileCount}
              </span>
            </div>
            <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
              {preset.detail}
            </div>
          </div>
        ))}
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
          MD
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleLayerIds.length === 0}
          onClick={queueReview}
        >
          Queue
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.slice(0, 5).map((row) => (
          <PreflightRowCard
            key={row.id}
            row={row}
            activePageId={activePageId}
            onSelectLayers={onSelectLayers}
          />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No export preflight issues match this queue.
          </div>
        ) : null}
        {visibleRows.length > 5 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 5} more export preflight issues
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PreflightRowCard({
  row,
  activePageId,
  onSelectLayers,
}: {
  row: ExportPreflightRow;
  activePageId: string;
  onSelectLayers: (layerIds: string[]) => void;
}) {
  const canSelect = row.pageId === activePageId && Boolean(row.layerId);

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-sm border border-border/70 bg-muted/20 p-2 text-xs",
        row.status === "blocked" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        row.status === "review" && "border-primary/30 bg-primary/10 text-primary",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-medium">
            {row.label}
          </span>
          <Badge variant={row.status === "blocked" ? "destructive" : "secondary"}>
            {row.status}
          </Badge>
        </div>
        <div className="mt-1 truncate text-[11px] opacity-80">
          {row.layerName ? `${row.pageName} / ${row.layerName}` : row.pageName}
        </div>
        <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
          {row.detail}
        </div>
      </div>
      {canSelect && row.layerId ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 shrink-0"
          aria-label={`Select ${row.layerName ?? row.label}`}
          onClick={() => {
            if (row.layerId) {
              onSelectLayers([row.layerId]);
            }
          }}
        >
          <MousePointer2 className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

const filters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "active", label: "Page" },
] satisfies Array<{ id: ExportPreflightFilter; label: string }>;

function getVisibleRows(
  rows: ExportPreflightRow[],
  activePageId: string,
  filter: ExportPreflightFilter,
) {
  if (filter === "all") {
    return rows;
  }

  if (filter === "active") {
    return rows.filter((row) => row.pageId === activePageId);
  }

  return rows.filter((row) => row.status === filter);
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/40 p-1.5">
      <div>{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}
