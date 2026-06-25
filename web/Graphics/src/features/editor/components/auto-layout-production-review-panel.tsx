"use client";

import { useMemo, useState } from "react";
import { Grid2X2, MousePointer2, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import type { LayerPatch } from "@/features/editor/document-utils";
import {
  getAutoLayoutProductionReviewCsv,
  getAutoLayoutProductionReviewMarkdown,
} from "@/features/editor/auto-layout-production-review-export";
import { getAutoLayoutProductionReviewPatches } from "@/features/editor/auto-layout-production-review-patches";
import type {
  AutoLayoutProductionReviewReport,
  AutoLayoutProductionReviewRow,
} from "@/features/editor/auto-layout-production-review-types";
import type { DesignPage } from "@/features/editor/types";
import { cn } from "@/lib/utils";

type AutoLayoutProductionReviewPanelProps = {
  activePage: DesignPage;
  activePageId: string;
  report: AutoLayoutProductionReviewReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
  onUpdateLayers: (patches: LayerPatch[]) => void;
};

type AutoLayoutProductionFilter =
  | "all"
  | "blocked"
  | "review"
  | "ready"
  | "active"
  | "repairable"
  | "wrap-grid";

export function AutoLayoutProductionReviewPanel({
  activePage,
  activePageId,
  report,
  onRecordActivity,
  onSelectLayers,
  onUpdateLayers,
}: AutoLayoutProductionReviewPanelProps) {
  const [filter, setFilter] = useState<AutoLayoutProductionFilter>("all");
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
        new Set(activeRows.flatMap((row) => row.layerIds)),
      ),
    [activeRows],
  );
  const repairRows = useMemo(
    () => activeRows.filter((row) => row.repairable),
    [activeRows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getAutoLayoutProductionReviewCsv(report, visibleRows),
      filename: `auto-layout-production-review-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported auto layout production CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAutoLayoutProductionReviewMarkdown(report, visibleRows),
      filename: `auto-layout-production-review-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported auto layout production handoff",
      `${visibleRows.length} rows`,
    );
  }

  function queueVisibleRows() {
    onSelectLayers(visibleLayerIds);
    onRecordActivity?.(
      "Queued auto layout production review",
      `${visibleLayerIds.length} active-page layer${
        visibleLayerIds.length === 1 ? "" : "s"
      }`,
    );
  }

  function repairVisibleRows() {
    const patches = getAutoLayoutProductionReviewPatches(activePage, repairRows);

    if (patches.length === 0) {
      return;
    }

    onUpdateLayers(patches);
    onRecordActivity?.(
      "Applied auto layout production fixes",
      `${patches.length} active-page layer patch${
        patches.length === 1 ? "" : "es"
      }`,
    );
  }

  function runRowAction(row: AutoLayoutProductionReviewRow) {
    if (row.pageId !== activePageId) {
      return;
    }

    if (row.action === "select") {
      onSelectLayers(row.layerIds);
      onRecordActivity?.("Selected auto layout review row", row.frameName);
      return;
    }

    const patches = getAutoLayoutProductionReviewPatches(activePage, [row]);

    if (patches.length === 0) {
      return;
    }

    onUpdateLayers(patches);
    onRecordActivity?.(
      `Applied auto layout fix: ${row.actionLabel}`,
      row.frameName,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Grid2X2 className="size-3.5" />
            Auto layout production
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Wrap/grid readiness, migration diagnostics, nested responsiveness, and regression evidence.
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
        <Metric label="Wrap" value={report.wrapFrameCount} />
        <Metric label="Grid" value={report.gridFrameCount} />
        <Metric label="Nested" value={report.nestedAutoLayoutCount} />
        <Metric label="Migrate" value={report.migrationCount} />
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
          <AutoLayoutProductionRowCard
            key={row.id}
            activePageId={activePageId}
            row={row}
            onRunAction={() => runRowAction(row)}
          />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No auto-layout production rows match this queue.
          </div>
        ) : null}
        {visibleRows.length > 6 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 6} more auto-layout rows
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AutoLayoutProductionRowCard({
  activePageId,
  row,
  onRunAction,
}: {
  activePageId: string;
  row: AutoLayoutProductionReviewRow;
  onRunAction: () => void;
}) {
  const canRun = row.pageId === activePageId;

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
            {row.pageName} / {row.frameName}
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
            {row.detail}
          </div>
          <div className="mt-1 grid grid-cols-4 gap-1 font-mono text-[10px] opacity-75">
            <span>{row.childCount} child</span>
            <span>{row.visibleGridCount}/{row.gridCount} grid</span>
            <span>{row.nestedDepth} depth</span>
            <span>{row.responsiveScore} score</span>
          </div>
          {row.regressionPatchCount > 0 ? (
            <div className="mt-1 line-clamp-1 font-mono text-[10px] opacity-75">
              {row.regressionEvidence}
            </div>
          ) : null}
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
  { id: "wrap-grid", label: "Wrap/Grid" },
] satisfies Array<{ id: AutoLayoutProductionFilter; label: string }>;

function getVisibleRows(
  rows: AutoLayoutProductionReviewRow[],
  activePageId: string,
  filter: AutoLayoutProductionFilter,
) {
  if (filter === "all") {
    return rows;
  }

  if (filter === "active") {
    return rows.filter((row) => row.pageId === activePageId);
  }

  if (filter === "repairable") {
    return rows.filter((row) => row.repairable);
  }

  if (filter === "wrap-grid") {
    return rows.filter(
      (row) => row.category === "wrap" || row.category === "grid",
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

function getStatusVariant(status: AutoLayoutProductionReviewRow["status"]) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
