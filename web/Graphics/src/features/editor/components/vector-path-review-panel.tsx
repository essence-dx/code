"use client";

import { useMemo, useState } from "react";
import { Download, MousePointer2, PenTool, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import type { LayerPatch } from "@/features/editor/document-utils";
import {
  getVectorPathReviewCsv,
  getVectorPathReviewMarkdown,
  getVectorPathReviewPatches,
  type VectorPathReviewReport,
  type VectorPathReviewRow,
} from "@/features/editor/vector-path-review";
import type { DesignDocument } from "@/features/editor/types";
import { cn } from "@/lib/utils";

type VectorPathReviewPanelProps = {
  activePageId: string;
  document: DesignDocument;
  report: VectorPathReviewReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
  onUpdateLayers: (patches: LayerPatch[]) => void;
};

type VectorPathReviewFilter =
  | "all"
  | "blocked"
  | "review"
  | "ready"
  | "active"
  | "selected";

export function VectorPathReviewPanel({
  activePageId,
  document,
  report,
  onRecordActivity,
  onSelectLayers,
  onUpdateLayers,
}: VectorPathReviewPanelProps) {
  const [filter, setFilter] = useState<VectorPathReviewFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, activePageId, filter),
    [activePageId, filter, report.rows],
  );
  const visibleLayerIds = useMemo(
    () =>
      Array.from(
        new Set(visibleRows.map((row) => row.layerId)),
      ),
    [visibleRows],
  );
  const repairRows = useMemo(
    () => visibleRows.filter((row) => row.action !== "select"),
    [visibleRows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getVectorPathReviewCsv(report, visibleRows),
      filename: `vector-path-review-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported vector path CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getVectorPathReviewMarkdown(report, visibleRows),
      filename: `vector-path-review-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported vector path handoff",
      `${visibleRows.length} rows`,
    );
  }

  function queueReview() {
    onSelectLayers(visibleLayerIds);
    onRecordActivity?.(
      "Queued vector path review",
      `${visibleLayerIds.length} layers`,
    );
  }

  function repairVisibleRows() {
    const patches = getVectorPathReviewPatches(document, repairRows);

    if (patches.length === 0) {
      return;
    }

    onUpdateLayers(patches);
    onRecordActivity?.(
      "Repaired vector path queue",
      `${patches.length} layer${patches.length === 1 ? "" : "s"}`,
    );
  }

  function runRowAction(row: VectorPathReviewRow) {
    if (row.action === "select") {
      onSelectLayers([row.layerId]);
      onRecordActivity?.("Selected vector path", row.layerName);
      return;
    }

    const patches = getVectorPathReviewPatches(document, [row]);

    if (patches.length === 0) {
      return;
    }

    onUpdateLayers(patches);
    onRecordActivity?.(
      `Repaired vector path: ${row.actionLabel}`,
      row.layerName,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <PenTool className="size-3.5" />
            Vector path review
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Node handles, boolean repairs, viewBox health, and export-safe path diagnostics.
          </div>
        </div>
        <Badge variant={report.blockedCount > 0 ? "destructive" : "secondary"}>
          {report.score}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Safe" value={report.exportSafeLayerCount} />
        <Metric label="Review" value={report.reviewCount} />
        <Metric label="Blocked" value={report.blockedCount} />
        <Metric label="Repair" value={report.repairableCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Anchors" value={report.anchorCount} />
        <Metric label="Handles" value={report.controlHandleCount} />
        <Metric label="Cmds" value={report.commandCount} />
        <Metric label="Boolean" value={report.booleanReviewCount} />
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

      <div className="mt-2 grid grid-cols-4 gap-1.5">
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
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={repairRows.length === 0}
          onClick={repairVisibleRows}
        >
          Repair
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.slice(0, 6).map((row) => (
          <VectorPathRowCard
            key={row.id}
            row={row}
            activePageId={activePageId}
            onRunAction={() => runRowAction(row)}
          />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No vector path rows match this queue.
          </div>
        ) : null}
        {visibleRows.length > 6 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 6} more vector path rows
          </div>
        ) : null}
      </div>
    </div>
  );
}

function VectorPathRowCard({
  activePageId,
  row,
  onRunAction,
}: {
  activePageId: string;
  row: VectorPathReviewRow;
  onRunAction: () => void;
}) {
  const canRun = row.pageId === activePageId || row.action !== "select";

  return (
    <div
      className={cn(
        "rounded-sm border border-border/70 bg-muted/20 p-2 text-xs",
        row.status === "blocked" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        row.status === "review" && "border-primary/30 bg-primary/10 text-primary",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-medium">
              {row.label}
            </span>
            <Badge variant={getStatusVariant(row.status)}>
              {row.status}
            </Badge>
          </div>
          <div className="mt-1 truncate text-[11px] opacity-80">
            {row.pageName} / {row.layerName}
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
            {row.detail}
          </div>
          <div className="mt-1 font-mono text-[10px] opacity-75">
            {row.anchorCount} anchors / {row.controlHandleCount} handles / {row.commandCount} cmds
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 shrink-0"
          disabled={!canRun}
          aria-label={row.actionLabel}
          onClick={onRunAction}
        >
          {row.action === "select" ? (
            <MousePointer2 className="size-3.5" />
          ) : row.action === "normalize" ? (
            <Download className="size-3.5" />
          ) : (
            <Wrench className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

const filters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "ready", label: "Ready" },
  { id: "active", label: "Page" },
  { id: "selected", label: "Selected" },
] satisfies Array<{ id: VectorPathReviewFilter; label: string }>;

function getVisibleRows(
  rows: VectorPathReviewRow[],
  activePageId: string,
  filter: VectorPathReviewFilter,
) {
  if (filter === "all") {
    return rows;
  }

  if (filter === "active") {
    return rows.filter((row) => row.pageId === activePageId);
  }

  if (filter === "selected") {
    return rows.filter((row) => row.selected);
  }

  return rows.filter((row) => row.status === filter);
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/40 p-1.5">
      <div>{label}</div>
      <div className="text-foreground">{value.toLocaleString()}</div>
    </div>
  );
}

function getStatusVariant(status: VectorPathReviewRow["status"]) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
