"use client";

import { useMemo, useState } from "react";
import { Code2, MousePointer2, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getDevModeInspectionBundleJson,
  getDevModeInspectionCsv,
  getDevModeInspectionMarkdown,
} from "@/features/editor/dev-mode-inspection-export";
import { getDevModeInspectionReadyPatches } from "@/features/editor/dev-mode-inspection-patches";
import type {
  DevModeInspectionReport,
  DevModeInspectionRow,
} from "@/features/editor/dev-mode-inspection-types";
import type { LayerPatch } from "@/features/editor/document-utils";
import type { DesignDocument, DesignPage } from "@/features/editor/types";
import { cn } from "@/lib/utils";

type DevModeInspectionPanelProps = {
  activePage: DesignPage;
  activePageId: string;
  document: DesignDocument;
  report: DevModeInspectionReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
  onUpdateLayers: (patches: LayerPatch[]) => void;
};

type DevModeInspectionFilter =
  | "all"
  | "blocked"
  | "review"
  | "ready"
  | "active"
  | "assets"
  | "markable"
  | "annotations";

export function DevModeInspectionPanel({
  activePage,
  activePageId,
  document,
  report,
  onRecordActivity,
  onSelectLayers,
  onUpdateLayers,
}: DevModeInspectionPanelProps) {
  const [filter, setFilter] = useState<DevModeInspectionFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, activePageId, filter),
    [activePageId, filter, report.rows],
  );
  const activeRows = useMemo(
    () => visibleRows.filter((row) => row.pageId === activePageId),
    [activePageId, visibleRows],
  );
  const visibleLayerIds = useMemo(
    () => Array.from(new Set(activeRows.map((row) => row.layerId))),
    [activeRows],
  );
  const readyPatches = useMemo(
    () => getDevModeInspectionReadyPatches(activePage, activeRows),
    [activePage, activeRows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getDevModeInspectionCsv(report, visibleRows),
      filename: `dev-mode-inspection-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Dev Mode inspection CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getDevModeInspectionMarkdown(report, visibleRows),
      filename: `dev-mode-inspection-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Dev Mode inspection handoff",
      `${visibleRows.length} rows`,
    );
  }

  function exportBundle() {
    downloadTextFile({
      content: getDevModeInspectionBundleJson(document, report, visibleRows),
      filename: `dev-mode-inspection-bundle-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Dev Mode handoff bundle",
      `${visibleRows.length} layers`,
    );
  }

  function queueVisibleRows() {
    onSelectLayers(visibleLayerIds);
    onRecordActivity?.(
      "Queued Dev Mode inspection overlays",
      `${visibleLayerIds.length} active-page layer${
        visibleLayerIds.length === 1 ? "" : "s"
      }`,
    );
  }

  function markVisibleReady() {
    if (readyPatches.length === 0) {
      return;
    }

    onUpdateLayers(readyPatches);
    onRecordActivity?.(
      "Marked Dev Mode inspection queue ready",
      `${readyPatches.length} active-page layer${
        readyPatches.length === 1 ? "" : "s"
      }`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <PackageCheck className="size-3.5" />
            Dev Mode inspection
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Measurement overlays, asset slices, CSS/iOS/Android exports, annotations, and handoff bundles.
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
        <Metric label="Mark" value={report.markableCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Assets" value={report.assetSliceCount} />
        <Metric label="CSS" value={report.cssExportCount} />
        <Metric label="iOS" value={report.swiftExportCount} />
        <Metric label="Android" value={report.composeExportCount} />
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

      <div className="mt-2 grid grid-cols-5 gap-1.5">
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
          disabled={visibleRows.length === 0}
          onClick={exportBundle}
        >
          JSON
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleLayerIds.length === 0}
          onClick={queueVisibleRows}
        >
          Queue
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={readyPatches.length === 0}
          onClick={markVisibleReady}
        >
          Ready
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.slice(0, 6).map((row) => (
          <InspectionRowCard
            key={row.id}
            activePageId={activePageId}
            row={row}
            onSelectLayers={onSelectLayers}
          />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No Dev Mode inspection rows match this queue.
          </div>
        ) : null}
        {visibleRows.length > 6 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 6} more inspection rows
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InspectionRowCard({
  activePageId,
  row,
  onSelectLayers,
}: {
  activePageId: string;
  row: DevModeInspectionRow;
  onSelectLayers: (layerIds: string[]) => void;
}) {
  const canSelect = row.pageId === activePageId;

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
              {row.layerName}
            </span>
            <Badge variant={getStatusVariant(row.status)} className="shrink-0">
              {row.status}
            </Badge>
          </div>
          <div className="mt-1 truncate text-[11px] opacity-80">
            {row.pageName} / {row.assetKind} / {row.assetSliceName}
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
            {row.summary}. {row.detail}
          </div>
          <div className="mt-1 grid grid-cols-4 gap-1 font-mono text-[10px] opacity-75">
            <span>{row.measurementOverlayLabel}</span>
            <span>CSS {row.cssLineCount}</span>
            <span>iOS {row.swiftLineCount}</span>
            <span>And {row.composeLineCount}</span>
          </div>
          <div className="mt-1 line-clamp-1 font-mono text-[10px] opacity-75">
            {row.spacingLabel}
          </div>
        </div>
        {canSelect ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7 shrink-0"
            aria-label={`Select ${row.layerName}`}
            onClick={() => onSelectLayers(row.layerIds)}
          >
            <MousePointer2 className="size-3.5" />
          </Button>
        ) : (
          <Code2 className="mt-1 size-3.5 shrink-0 opacity-60" />
        )}
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
  { id: "assets", label: "Assets" },
  { id: "markable", label: "Mark" },
  { id: "annotations", label: "Notes" },
] satisfies Array<{ id: DevModeInspectionFilter; label: string }>;

function getVisibleRows(
  rows: DevModeInspectionRow[],
  activePageId: string,
  filter: DevModeInspectionFilter,
) {
  if (filter === "all") {
    return rows;
  }

  if (filter === "active") {
    return rows.filter((row) => row.pageId === activePageId);
  }

  if (filter === "assets") {
    return rows.filter((row) => row.exportable);
  }

  if (filter === "markable") {
    return rows.filter((row) => row.status !== "blocked" && !row.readyForDev);
  }

  if (filter === "annotations") {
    return rows.filter((row) => row.annotationCount > 0);
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

function getStatusVariant(status: DevModeInspectionRow["status"]) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
