"use client";

import { useMemo, useState } from "react";
import { Download, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getResponsiveConstraintsStatusVariant,
  getVisibleResponsiveConstraintsRows,
  ResponsiveConstraintsMetric,
  responsiveConstraintsFilters,
  ResponsiveConstraintsRowCard,
  type ResponsiveConstraintsFilter,
} from "@/features/editor/components/responsive-constraints-review-panel-parts";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getResponsiveConstraintsReviewCsv,
  getResponsiveConstraintsReviewMarkdown,
} from "@/features/editor/responsive-constraints-review-export";
import {
  getResponsiveConstraintsReviewPatches,
} from "@/features/editor/responsive-constraints-review-patches";
import type {
  ResponsiveConstraintsReviewReport,
  ResponsiveConstraintsReviewRow,
} from "@/features/editor/responsive-constraints-review-types";
import type { LayerPatch } from "@/features/editor/document-utils";
import type { DesignPage } from "@/features/editor/types";

type ResponsiveConstraintsReviewPanelProps = {
  activePage: DesignPage;
  activePageId: string;
  report: ResponsiveConstraintsReviewReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
  onUpdateLayers: (patches: LayerPatch[]) => void;
};

export function ResponsiveConstraintsReviewPanel({
  activePage,
  activePageId,
  report,
  onRecordActivity,
  onSelectLayers,
  onUpdateLayers,
}: ResponsiveConstraintsReviewPanelProps) {
  const [filter, setFilter] = useState<ResponsiveConstraintsFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleResponsiveConstraintsRows(report.rows, activePageId, filter),
    [activePageId, filter, report.rows],
  );
  const activeRows = useMemo(
    () => visibleRows.filter((row) => row.pageId === activePageId),
    [activePageId, visibleRows],
  );
  const visibleLayerIds = useMemo(
    () => Array.from(new Set(activeRows.flatMap((row) => row.layerIds))),
    [activeRows],
  );
  const repairRows = useMemo(
    () => activeRows.filter((row) => row.repairable),
    [activeRows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getResponsiveConstraintsReviewCsv(report, visibleRows),
      filename: `responsive-constraints-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported responsive constraints CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getResponsiveConstraintsReviewMarkdown(report, visibleRows),
      filename: `responsive-constraints-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported responsive constraints handoff",
      `${visibleRows.length} rows`,
    );
  }

  function queueVisibleRows() {
    onSelectLayers(visibleLayerIds);
    onRecordActivity?.(
      "Queued responsive constraints review",
      `${visibleLayerIds.length} active-page layer${
        visibleLayerIds.length === 1 ? "" : "s"
      }`,
    );
  }

  function repairVisibleRows() {
    const patches = getResponsiveConstraintsReviewPatches(activePage, repairRows);

    if (patches.length === 0) {
      return;
    }

    onUpdateLayers(patches);
    onRecordActivity?.(
      "Applied responsive constraints fixes",
      `${patches.length} active-page layer patch${
        patches.length === 1 ? "" : "es"
      }`,
    );
  }

  function runRowAction(row: ResponsiveConstraintsReviewRow) {
    if (row.pageId !== activePageId) {
      return;
    }

    if (row.action === "select") {
      onSelectLayers(row.layerIds);
      onRecordActivity?.("Selected responsive constraints row", row.label);
      return;
    }

    const patches = getResponsiveConstraintsReviewPatches(activePage, [row]);

    if (patches.length === 0) {
      return;
    }

    onUpdateLayers(patches);
    onRecordActivity?.(
      `Applied responsive fix: ${row.actionLabel}`,
      `${patches.length} layer patch${patches.length === 1 ? "" : "es"}`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Ruler className="size-3.5" />
            Responsive constraints
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Resize previews, constraints, nested frames, groups, components, masks, grids, and cross-page handoff.
          </div>
        </div>
        <Badge variant={getResponsiveConstraintsStatusVariant(report.status)}>
          {report.score}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <ResponsiveConstraintsMetric label="Frames" value={report.frameCount} />
        <ResponsiveConstraintsMetric label="Overflow" value={report.overflowCount} />
        <ResponsiveConstraintsMetric label="Unstable" value={report.unstableCount} />
        <ResponsiveConstraintsMetric label="Fix" value={report.repairableCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <ResponsiveConstraintsMetric label="Cons" value={report.missingConstraintCount} />
        <ResponsiveConstraintsMetric label="Comp" value={report.componentIssueCount} />
        <ResponsiveConstraintsMetric label="Mask" value={report.maskIssueCount} />
        <ResponsiveConstraintsMetric label="Cross" value={report.crossPageIssueCount} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {responsiveConstraintsFilters.map((item) => (
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
          <Download className="size-3" />
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
          <ResponsiveConstraintsRowCard
            key={row.id}
            activePageId={activePageId}
            row={row}
            onRunAction={() => runRowAction(row)}
          />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No responsive constraint rows match this queue.
          </div>
        ) : null}
        {visibleRows.length > 6 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 6} more responsive rows
          </div>
        ) : null}
      </div>
    </div>
  );
}
