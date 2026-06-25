"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Code2, MousePointer2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getDevModeReadyLayerIds,
  getDevModeReviewCsv,
  getDevModeReviewMarkdown,
  type DevModeReviewReport,
  type DevModeReviewRow,
} from "@/features/editor/dev-mode-review";
import { cn } from "@/lib/utils";

type DevModeReviewPanelProps = {
  report: DevModeReviewReport;
  activePageId: string;
  onSelectLayers: (layerIds: string[]) => void;
  onMarkReadyLayers: (layerIds: string[]) => void;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type DevModeReviewFilter = "all" | "blocked" | "review" | "ready" | "active";

export function DevModeReviewPanel({
  report,
  activePageId,
  onSelectLayers,
  onMarkReadyLayers,
  onRecordActivity,
}: DevModeReviewPanelProps) {
  const [filter, setFilter] = useState<DevModeReviewFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, activePageId, filter),
    [activePageId, filter, report.rows],
  );
  const visibleLayerIds = useMemo(
    () => Array.from(new Set(visibleRows.map((row) => row.layerId))),
    [visibleRows],
  );
  const readyLayerIds = useMemo(
    () => Array.from(new Set(getDevModeReadyLayerIds(visibleRows))),
    [visibleRows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getDevModeReviewCsv(report, visibleRows),
      filename: `dev-mode-review-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.("Exported Dev Mode CSV", `${visibleRows.length} rows`);
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getDevModeReviewMarkdown(report, visibleRows),
      filename: `dev-mode-review-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Dev Mode handoff",
      `${visibleRows.length} rows`,
    );
  }

  function queueReview() {
    onSelectLayers(visibleLayerIds);
    onRecordActivity?.(
      "Queued Dev Mode review",
      `${visibleLayerIds.length} layers`,
    );
  }

  function markVisibleReady() {
    onMarkReadyLayers(readyLayerIds);
    onRecordActivity?.(
      "Marked Dev Mode queue ready",
      `${readyLayerIds.length} layers`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Code2 className="size-3.5" />
            Dev Mode review
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Ready flags, assets, tokens, Code Connect, links, and annotations.
          </div>
        </div>
        <Badge variant={report.blockedCount > 0 ? "destructive" : "secondary"}>
          {report.score}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <ReviewMetric label="Ready" value={report.readyForHandoffCount} />
        <ReviewMetric label="Review" value={report.reviewCount} />
        <ReviewMetric label="Blocked" value={report.blockedCount} />
        <ReviewMetric label="Layers" value={report.visibleLayerCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <ReviewMetric label="Code" value={report.codeConnectCount} />
        <ReviewMetric label="Links" value={report.devLinkCount} />
        <ReviewMetric label="Tokens" value={report.tokenMatchedLayerCount} />
        <ReviewMetric label="Notes" value={report.openAnnotationCount} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {reviewFilters.map((item) => (
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
          disabled={readyLayerIds.length === 0}
          onClick={markVisibleReady}
        >
          Ready
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.slice(0, 6).map((row) => (
          <DevModeReviewRowCard
            key={row.id}
            row={row}
            activePageId={activePageId}
            onSelectLayers={onSelectLayers}
          />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No Dev Mode rows match this queue.
          </div>
        ) : null}
        {visibleRows.length > 6 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 6} more Dev Mode rows
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DevModeReviewRowCard({
  row,
  activePageId,
  onSelectLayers,
}: {
  row: DevModeReviewRow;
  activePageId: string;
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
        <span
          className={cn(
            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
            row.status === "ready" && "bg-emerald-500/15 text-emerald-500",
            row.status === "review" && "bg-primary/15 text-primary",
            row.status === "blocked" && "bg-destructive/15 text-destructive",
          )}
        >
          <CheckCircle2 className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-medium">
              {row.layerName}
            </span>
            <Badge
              variant={row.status === "blocked" ? "destructive" : "secondary"}
              className="shrink-0"
            >
              {row.status}
            </Badge>
          </div>
          <div className="mt-1 truncate text-[11px] opacity-80">
            {row.pageName} / {row.assetKind} / {row.recommendedFormat}
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
            {row.summary}. {row.detail}
          </div>
        </div>
        {canSelect ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7 shrink-0"
            aria-label={`Select ${row.layerName}`}
            onClick={() => onSelectLayers([row.layerId])}
          >
            <MousePointer2 className="size-3.5" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

const reviewFilters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "ready", label: "Ready" },
  { id: "active", label: "Page" },
] satisfies Array<{ id: DevModeReviewFilter; label: string }>;

function getVisibleRows(
  rows: DevModeReviewRow[],
  activePageId: string,
  filter: DevModeReviewFilter,
) {
  if (filter === "all") {
    return rows;
  }

  if (filter === "active") {
    return rows.filter((row) => row.pageId === activePageId);
  }

  return rows.filter((row) => row.status === filter);
}

function ReviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/40 p-1.5">
      <div>{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}
