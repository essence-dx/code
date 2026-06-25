"use client";

import { useMemo, useState } from "react";
import { BarChart3, Download, MousePointer2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getComponentOverrideReviewCsv,
  getComponentOverrideReviewMarkdown,
  type ComponentOverrideReviewReport,
  type ComponentOverrideReviewRow,
} from "@/features/editor/component-override-review";
import { cn } from "@/lib/utils";

type ComponentOverrideReviewSectionProps = {
  activePageId: string;
  report: ComponentOverrideReviewReport;
  onResetComponentInstance: (layerId: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
};

type ComponentOverrideReviewFilter =
  | "all"
  | "blocked"
  | "review"
  | "ready"
  | "active"
  | "resettable";

export function ComponentOverrideReviewSection({
  activePageId,
  report,
  onResetComponentInstance,
  onSelectLayers,
}: ComponentOverrideReviewSectionProps) {
  const [filter, setFilter] = useState<ComponentOverrideReviewFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, activePageId, filter),
    [activePageId, filter, report.rows],
  );
  const visibleLayerIds = useMemo(
    () =>
      Array.from(
        new Set(
          visibleRows
            .filter((row) => row.pageId === activePageId)
            .flatMap((row) => row.layerIds),
        ),
      ),
    [activePageId, visibleRows],
  );
  const resetLayerIds = useMemo(
    () =>
      Array.from(
        new Set(
          visibleRows
            .filter((row) => row.canReset)
            .map((row) => row.resetLayerId)
            .filter((layerId): layerId is string => Boolean(layerId)),
        ),
      ),
    [visibleRows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getComponentOverrideReviewCsv(report, visibleRows),
      filename: `component-override-review-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getComponentOverrideReviewMarkdown(report, visibleRows),
      filename: `component-override-review-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
  }

  function resetVisibleRows() {
    resetLayerIds.forEach(onResetComponentInstance);
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <BarChart3 className="size-3.5" />
            Override review
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Instance diffs, reset previews, slot validation, and adoption metrics.
          </div>
        </div>
        <Badge variant={report.blockedCount > 0 ? "destructive" : "secondary"}>
          {report.score}
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <ReviewMetric label="Ready" value={report.readyCount} />
        <ReviewMetric label="Review" value={report.reviewCount} />
        <ReviewMetric label="Blocked" value={report.blockedCount} />
        <ReviewMetric label="Reset" value={report.resettableCount} />
      </div>

      <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <ReviewMetric label="Diffs" value={report.overrideCount} />
        <ReviewMetric label="Props" value={report.propertyDiffCount} />
        <ReviewMetric label="Slots" value={report.slotIssueCount} />
        <ReviewMetric label="Variants" value={report.variantCoveragePercent} />
      </div>

      <div className="flex flex-wrap gap-1">
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

      <div className="grid grid-cols-4 gap-1.5">
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
          onClick={() => onSelectLayers(visibleLayerIds)}
        >
          Queue
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={resetLayerIds.length === 0}
          onClick={resetVisibleRows}
        >
          Reset
        </Button>
      </div>

      <div className="space-y-1.5">
        {visibleRows.slice(0, 5).map((row) => (
          <OverrideReviewRowCard
            key={row.id}
            activePageId={activePageId}
            row={row}
            onResetComponentInstance={onResetComponentInstance}
            onSelectLayers={onSelectLayers}
          />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No component override rows match this queue.
          </div>
        ) : null}
        {visibleRows.length > 5 ? (
          <div className="rounded-sm bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground">
            {visibleRows.length - 5} more component override rows
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OverrideReviewRowCard({
  activePageId,
  row,
  onResetComponentInstance,
  onSelectLayers,
}: {
  activePageId: string;
  row: ComponentOverrideReviewRow;
  onResetComponentInstance: (layerId: string) => void;
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
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{row.componentName}</div>
          <div className="truncate font-mono text-[10px] opacity-80">
            {row.pageName} / {row.variantName} / {row.instanceLayerCount} layers
          </div>
        </div>
        <Badge variant={getStatusVariant(row.status)} className="shrink-0">
          {row.status}
        </Badge>
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
        {row.detail}
      </div>
      <div className="mt-1 grid grid-cols-4 gap-1 font-mono text-[10px] opacity-80">
        <span>{row.overrideCount} diff</span>
        <span>{row.propertyDiffCount} prop</span>
        <span>{row.slotIssueCount} slot</span>
        <span>{row.variantAdoptionPercent}% use</span>
      </div>

      {row.resetPreview.length > 0 ? (
        <div className="mt-1 space-y-1">
          {row.resetPreview.slice(0, 2).map((preview) => (
            <div
              key={preview.id}
              className="rounded-sm border border-border/60 bg-background/60 p-1.5 text-[11px]"
            >
              <div className="truncate text-muted-foreground">
                {preview.layerName} / {preview.label}
              </div>
              <div className="mt-1 grid grid-cols-2 gap-2 font-mono">
                <span className="truncate">{preview.current}</span>
                <span className="truncate opacity-70">{preview.source}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {row.slotIssues.length > 0 ? (
        <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
          {row.slotIssues[0]?.label}: {row.slotIssues[0]?.detail}
        </div>
      ) : null}

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          disabled={!canSelect}
          onClick={() => onSelectLayers(row.layerIds)}
        >
          <MousePointer2 className="size-3" />
          Queue
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-[11px]"
          disabled={!row.canReset || !row.resetLayerId}
          onClick={() => {
            if (row.resetLayerId) {
              onResetComponentInstance(row.resetLayerId);
            }
          }}
        >
          <RotateCcw className="size-3" />
          Reset
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
  { id: "resettable", label: "Reset" },
] satisfies Array<{ id: ComponentOverrideReviewFilter; label: string }>;

function getVisibleRows(
  rows: ComponentOverrideReviewRow[],
  activePageId: string,
  filter: ComponentOverrideReviewFilter,
) {
  if (filter === "all") {
    return rows;
  }

  if (filter === "active") {
    return rows.filter((row) => row.pageId === activePageId);
  }

  if (filter === "resettable") {
    return rows.filter((row) => row.canReset);
  }

  return rows.filter((row) => row.status === filter);
}

function ReviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/30 px-2 py-1">
      <div>{label}</div>
      <div className="text-xs text-foreground">{value.toLocaleString()}</div>
    </div>
  );
}

function getStatusVariant(status: ComponentOverrideReviewRow["status"]) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
