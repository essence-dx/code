"use client";

import { useMemo, useState } from "react";
import { Download, FileJson2, Radar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getCanvasViewportIntelligenceBundleJson,
  getCanvasViewportIntelligenceCsv,
  getCanvasViewportIntelligenceMarkdown,
} from "@/features/editor/canvas-viewport-intelligence-export";
import { getCanvasViewportIntelligencePatches } from "@/features/editor/canvas-viewport-intelligence-patches";
import {
  CanvasViewportMetric,
  CanvasViewportRowCard,
  canvasViewportFilters,
  getVisibleCanvasViewportRows,
  getCanvasViewportStatusVariant,
  type CanvasViewportFilter,
} from "@/features/editor/components/canvas-viewport-intelligence-panel-parts";
import type {
  CanvasViewportIntelligenceReport,
  CanvasViewportIntelligenceRow,
} from "@/features/editor/canvas-viewport-intelligence-types";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import type { LayerPatch } from "@/features/editor/document-utils";
import type { DesignDocument, DesignPage } from "@/features/editor/types";

type CanvasViewportIntelligencePanelProps = {
  activePage: DesignPage;
  activePageId: string;
  document: DesignDocument;
  report: CanvasViewportIntelligenceReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
  onUpdateLayers: (patches: LayerPatch[]) => void;
};

export function CanvasViewportIntelligencePanel({
  activePage,
  activePageId,
  document,
  report,
  onRecordActivity,
  onSelectLayers,
  onUpdateLayers,
}: CanvasViewportIntelligencePanelProps) {
  const [filter, setFilter] = useState<CanvasViewportFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleCanvasViewportRows(report.rows, activePageId, filter),
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
      content: getCanvasViewportIntelligenceCsv(report, visibleRows),
      filename: `canvas-viewport-intelligence-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported canvas viewport intelligence CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getCanvasViewportIntelligenceMarkdown(report, visibleRows),
      filename: `canvas-viewport-intelligence-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported canvas viewport intelligence handoff",
      `${visibleRows.length} rows`,
    );
  }

  function exportBundle() {
    downloadTextFile({
      content: getCanvasViewportIntelligenceBundleJson(
        document,
        report,
        visibleRows,
      ),
      filename: `canvas-viewport-intelligence-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported viewport intelligence bundle",
      `${visibleRows.length} rows`,
    );
  }

  function queueVisibleRows() {
    onSelectLayers(visibleLayerIds);
    onRecordActivity?.(
      "Queued canvas viewport intelligence review",
      `${visibleLayerIds.length} active-page layer${
        visibleLayerIds.length === 1 ? "" : "s"
      }`,
    );
  }

  function repairVisibleRows() {
    const patches = getCanvasViewportIntelligencePatches(activePage, repairRows);

    if (patches.length === 0) {
      return;
    }

    onUpdateLayers(patches);
    onRecordActivity?.(
      "Applied viewport intelligence fixes",
      `${patches.length} active-page layer patch${
        patches.length === 1 ? "" : "es"
      }`,
    );
  }

  function runRowAction(row: CanvasViewportIntelligenceRow) {
    if (row.pageId !== activePageId) {
      return;
    }

    if (row.action === "select") {
      onSelectLayers(row.layerIds);
      onRecordActivity?.("Selected viewport review row", row.label);
      return;
    }

    const patches = getCanvasViewportIntelligencePatches(activePage, [row]);

    if (patches.length === 0) {
      return;
    }

    onUpdateLayers(patches);
    onRecordActivity?.(
      `Applied viewport fix: ${row.actionLabel}`,
      `${patches.length} layer patch${patches.length === 1 ? "" : "es"}`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Radar className="size-3.5" />
            Viewport intelligence
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Render-window queues, pointer cost, deep hit-test evidence, and safe-mode thresholds.
          </div>
        </div>
        <Badge variant={getCanvasViewportStatusVariant(report.status)}>
          {report.score}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <CanvasViewportMetric label="Windows" value={report.renderWindowCount} />
        <CanvasViewportMetric label="Off" value={report.offscreenLayerCount} />
        <CanvasViewportMetric label="Pairs" value={report.deepHitTestPairCount} />
        <CanvasViewportMetric label="Safe" value={report.safeModeThresholdCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <CanvasViewportMetric label="Cost" value={report.estimatedRenderCost} />
        <CanvasViewportMetric label="Pointer" value={report.interactionCost} />
        <CanvasViewportMetric label="Stack" value={report.deepHitTestStackDepth} />
        <CanvasViewportMetric label="Fix" value={report.repairableCount} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {canvasViewportFilters.map((item) => (
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
          <Download className="size-3" />
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
          <FileJson2 className="size-3" />
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
          disabled={repairRows.length === 0}
          onClick={repairVisibleRows}
        >
          Fix
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.slice(0, 6).map((row) => (
          <CanvasViewportRowCard
            key={row.id}
            activePageId={activePageId}
            row={row}
            onRunAction={() => runRowAction(row)}
          />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No viewport intelligence rows match this queue.
          </div>
        ) : null}
        {visibleRows.length > 6 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 6} more viewport rows
          </div>
        ) : null}
      </div>
    </div>
  );
}
