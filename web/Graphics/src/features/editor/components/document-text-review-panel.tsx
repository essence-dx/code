"use client";

import { useMemo, useState } from "react";
import { Download, Maximize2, MousePointer2, TextCursorInput } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import type { LayerPatch } from "@/features/editor/document-utils";
import {
  getDocumentTextReviewCsv,
  getDocumentTextReviewMarkdown,
  type DocumentTextReviewReport,
  type DocumentTextReviewRow,
} from "@/features/editor/document-text-review";
import {
  getTextLayerFitPatches,
  getTextLayerNormalizePatches,
  getTextLayerReadyPatches,
} from "@/features/editor/text-layer-review";
import type { DesignLayer } from "@/features/editor/types";
import { cn } from "@/lib/utils";

type DocumentTextReviewPanelProps = {
  report: DocumentTextReviewReport;
  activePageId: string;
  activePageLayers: DesignLayer[];
  onSelectLayers: (layerIds: string[]) => void;
  onUpdateLayers: (patches: LayerPatch[]) => void;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type DocumentTextReviewFilter = "all" | "blocked" | "review" | "active";

export function DocumentTextReviewPanel({
  report,
  activePageId,
  activePageLayers,
  onSelectLayers,
  onUpdateLayers,
  onRecordActivity,
}: DocumentTextReviewPanelProps) {
  const [filter, setFilter] = useState<DocumentTextReviewFilter>("all");
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
  const activeFitPatches = useMemo(
    () => getTextLayerFitPatches(activePageLayers),
    [activePageLayers],
  );
  const activeNormalizePatches = useMemo(
    () => getTextLayerNormalizePatches(activePageLayers),
    [activePageLayers],
  );
  const activeReadyPatches = useMemo(
    () => getTextLayerReadyPatches(activePageLayers),
    [activePageLayers],
  );

  function exportCsv() {
    downloadTextFile({
      content: getDocumentTextReviewCsv(report, visibleRows),
      filename: `document-text-review-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.("Exported text review CSV", `${visibleRows.length} rows`);
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getDocumentTextReviewMarkdown(report, visibleRows),
      filename: `document-text-review-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported text review handoff",
      `${visibleRows.length} rows`,
    );
  }

  function applyPatches(label: string, patches: LayerPatch[]) {
    onUpdateLayers(patches);
    onRecordActivity?.(label, `${patches.length} layers`);
  }

  function queueReview() {
    onSelectLayers(visibleLayerIds);
    onRecordActivity?.(
      "Queued text review",
      `${visibleLayerIds.length} layers`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <TextCursorInput className="size-3.5" />
            Text review
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Text overflow, resize modes, fonts, typography, and token handoff.
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
        <Metric label="Fonts" value={report.fontFamilyCount} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Layers" value={report.textLayerCount} />
        <Metric label="Font rev" value={report.fontReviewCount} />
        <Metric label="Tokens" value={report.tokenMatchCount} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={activeFitPatches.length === 0}
          onClick={() => applyPatches("Fit active-page text", activeFitPatches)}
        >
          <Maximize2 className="size-3.5" />
          Fit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={activeNormalizePatches.length === 0}
          onClick={() =>
            applyPatches("Normalized active-page text", activeNormalizePatches)
          }
        >
          Normalize
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={activeReadyPatches.length === 0 || report.blockedCount > 0}
          onClick={() =>
            applyPatches("Marked active-page text ready", activeReadyPatches)
          }
        >
          Ready
        </Button>
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
          <Download className="size-3.5" />
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
          <TextReviewRowCard
            key={row.id}
            row={row}
            activePageId={activePageId}
            onSelectLayers={onSelectLayers}
          />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No text review issues match this queue.
          </div>
        ) : null}
        {visibleRows.length > 5 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 5} more text review issues
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TextReviewRowCard({
  row,
  activePageId,
  onSelectLayers,
}: {
  row: DocumentTextReviewRow;
  activePageId: string;
  onSelectLayers: (layerIds: string[]) => void;
}) {
  const canSelect = row.pageId === activePageId;

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
          {row.pageName} / {row.layerName}
        </div>
        <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
          {row.detail}
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
  );
}

const filters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "active", label: "Page" },
] satisfies Array<{ id: DocumentTextReviewFilter; label: string }>;

function getVisibleRows(
  rows: DocumentTextReviewRow[],
  activePageId: string,
  filter: DocumentTextReviewFilter,
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
