"use client";

import { useMemo, useState } from "react";
import { MousePointer2, Presentation, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import type { LayerPatch } from "@/features/editor/document-utils";
import {
  getPrototypeInteractionInspectorCsv,
  getPrototypeInteractionInspectorMarkdown,
} from "@/features/editor/prototype-interaction-inspector-export";
import { getPrototypeInteractionInspectorLayerPatches } from "@/features/editor/prototype-interaction-inspector-patches";
import type {
  PrototypeInteractionInspectorReport,
  PrototypeInteractionInspectorRow,
} from "@/features/editor/prototype-interaction-inspector-types";
import type { DesignPage } from "@/features/editor/types";
import { cn } from "@/lib/utils";

type PrototypeInteractionInspectorPanelProps = {
  activePage: DesignPage;
  activePageId: string;
  report: PrototypeInteractionInspectorReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
  onSetPrototypeStartPage: (pageId: string) => void;
  onUpdateLayers: (patches: LayerPatch[]) => void;
};

type PrototypeInteractionFilter =
  | "all"
  | "blocked"
  | "review"
  | "ready"
  | "active"
  | "repairable"
  | "route"
  | "motion";

export function PrototypeInteractionInspectorPanel({
  activePage,
  activePageId,
  report,
  onRecordActivity,
  onSelectLayers,
  onSetPrototypeStartPage,
  onUpdateLayers,
}: PrototypeInteractionInspectorPanelProps) {
  const [filter, setFilter] = useState<PrototypeInteractionFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, activePageId, filter),
    [activePageId, filter, report.rows],
  );
  const activeRows = useMemo(
    () => visibleRows.filter((row) => row.pageId === activePageId),
    [activePageId, visibleRows],
  );
  const visibleLayerIds = useMemo(
    () =>
      Array.from(
        new Set(
          activeRows.flatMap((row) => row.layerIds),
        ),
      ),
    [activeRows],
  );
  const repairRows = useMemo(
    () => activeRows.filter((row) => row.repairable),
    [activeRows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getPrototypeInteractionInspectorCsv(report, visibleRows),
      filename: `prototype-interaction-inspector-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported prototype interaction CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getPrototypeInteractionInspectorMarkdown(report, visibleRows),
      filename: `prototype-interaction-inspector-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported prototype interaction handoff",
      `${visibleRows.length} rows`,
    );
  }

  function queueVisibleRows() {
    onSelectLayers(visibleLayerIds);
    onRecordActivity?.(
      "Queued prototype interaction review",
      `${visibleLayerIds.length} active-page hotspot${
        visibleLayerIds.length === 1 ? "" : "s"
      }`,
    );
  }

  function repairVisibleRows() {
    const patches = getPrototypeInteractionInspectorLayerPatches(
      activePage,
      repairRows,
    );

    if (patches.length === 0) {
      return;
    }

    onUpdateLayers(patches);
    onRecordActivity?.(
      "Applied prototype interaction fixes",
      `${patches.length} active-page layer patch${
        patches.length === 1 ? "" : "es"
      }`,
    );
  }

  function runRowAction(row: PrototypeInteractionInspectorRow) {
    if (row.action === "set-start") {
      onSetPrototypeStartPage(row.pageId);
      onRecordActivity?.("Set prototype start from inspector", row.pageName);
      return;
    }

    if (row.pageId !== activePageId) {
      return;
    }

    if (row.action === "select") {
      onSelectLayers(row.layerIds);
      onRecordActivity?.(
        "Selected prototype interaction row",
        row.layerName ?? row.pageName,
      );
      return;
    }

    const patches = getPrototypeInteractionInspectorLayerPatches(activePage, [
      row,
    ]);

    if (patches.length === 0) {
      return;
    }

    onUpdateLayers(patches);
    onRecordActivity?.(
      `Applied prototype fix: ${row.actionLabel}`,
      row.layerName ?? row.pageName,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Presentation className="size-3.5" />
            Interaction inspector
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Overlay behavior, scroll replay, transition timing, start health, and shared route evidence.
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
        <Metric label="Repair" value={report.repairableCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Route" value={report.presentationRouteIssueCount} />
        <Metric label="Trigger" value={report.unsupportedTriggerCount} />
        <Metric label="Motion" value={report.transitionReviewCount} />
        <Metric label="Overlay" value={report.overlayReviewCount} />
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
          onClick={queueVisibleRows}
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
          Fix
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.slice(0, 6).map((row) => (
          <InteractionInspectorRowCard
            key={row.id}
            activePageId={activePageId}
            row={row}
            onRunAction={() => runRowAction(row)}
          />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No prototype interaction rows match this queue.
          </div>
        ) : null}
        {visibleRows.length > 6 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 6} more interaction rows
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InteractionInspectorRowCard({
  activePageId,
  row,
  onRunAction,
}: {
  activePageId: string;
  row: PrototypeInteractionInspectorRow;
  onRunAction: () => void;
}) {
  const canRun = row.pageId === activePageId || row.action === "set-start";

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
            <Badge variant={getStatusVariant(row.status)} className="shrink-0">
              {row.status}
            </Badge>
          </div>
          <div className="mt-1 truncate text-[11px] opacity-80">
            {row.layerName ? `${row.pageName} / ${row.layerName}` : row.pageName}
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
            {row.detail}
          </div>
          <div className="mt-1 grid grid-cols-4 gap-1 font-mono text-[10px] opacity-75">
            <span>{row.trigger}</span>
            <span>{row.prototypeAction}</span>
            <span>{row.transition}</span>
            <span>{row.durationMs}ms</span>
          </div>
          <div className="mt-1 line-clamp-1 font-mono text-[10px] opacity-75">
            {row.routeEvidence}
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
  { id: "repairable", label: "Fixable" },
  { id: "route", label: "Route" },
  { id: "motion", label: "Motion" },
] satisfies Array<{ id: PrototypeInteractionFilter; label: string }>;

function getVisibleRows(
  rows: PrototypeInteractionInspectorRow[],
  activePageId: string,
  filter: PrototypeInteractionFilter,
) {
  if (filter === "all") {
    return rows;
  }

  if (filter === "active") {
    return rows.filter((row) => row.pageId === activePageId);
  }

  if (filter === "repairable") {
    return rows.filter((row) => row.repairable || row.action === "set-start");
  }

  if (filter === "route") {
    return rows.filter(
      (row) =>
        row.category === "presentation-route" ||
        row.category === "starting-point",
    );
  }

  if (filter === "motion") {
    return rows.filter(
      (row) =>
        row.category === "transition" ||
        row.category === "overlay" ||
        row.category === "scroll",
    );
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

function getStatusVariant(status: PrototypeInteractionInspectorRow["status"]) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
