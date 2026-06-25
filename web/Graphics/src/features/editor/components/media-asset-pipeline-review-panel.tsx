"use client";

import { useMemo, useState } from "react";
import { Download, FileJson2, MousePointer2, PackageSearch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getMediaAssetPipelineReviewCsv,
  getMediaAssetPipelineReviewJson,
  getMediaAssetPipelineReviewMarkdown,
  type MediaAssetPipelineCategory,
  type MediaAssetPipelineReviewReport,
  type MediaAssetPipelineRow,
  type MediaAssetPipelineStatus,
} from "@/features/editor/media-asset-pipeline-review";
import { formatAssetMediaBytes } from "@/features/editor/asset-media-governance";
import { cn } from "@/lib/utils";

type MediaAssetPipelineReviewPanelProps = {
  report: MediaAssetPipelineReviewReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
};

type MediaAssetPipelineFilter =
  | "all"
  | "queued"
  | MediaAssetPipelineCategory
  | MediaAssetPipelineStatus;

export function MediaAssetPipelineReviewPanel({
  report,
  onRecordActivity,
  onSelectLayers,
}: MediaAssetPipelineReviewPanelProps) {
  const [filter, setFilter] = useState<MediaAssetPipelineFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );
  const selectableLayerIds = useMemo(
    () =>
      Array.from(
        new Set(visibleRows.flatMap((row) => row.layerIds).filter(Boolean)),
      ),
    [visibleRows],
  );

  function exportJson() {
    downloadTextFile({
      content: getMediaAssetPipelineReviewJson(report, visibleRows),
      filename: `media-asset-pipeline-review-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported media asset pipeline JSON",
      `${visibleRows.length} rows`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getMediaAssetPipelineReviewCsv(report, visibleRows),
      filename: `media-asset-pipeline-review-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported media asset pipeline CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getMediaAssetPipelineReviewMarkdown(report, visibleRows),
      filename: `media-asset-pipeline-review-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported media asset pipeline handoff",
      `${visibleRows.length} rows`,
    );
  }

  function selectRows() {
    onSelectLayers(selectableLayerIds);
    onRecordActivity?.(
      "Queued media asset pipeline review",
      `${selectableLayerIds.length} layers`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <PackageSearch className="size-3.5" />
            Media asset pipeline
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Source metadata, replacement tracking, compression targets, upload provenance, and bundle manifests.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Images" value={report.imageAssetCount} />
        <Metric label="Videos" value={report.videoAssetCount} />
        <Metric label="Source" value={report.sourceMetadataIssueCount} />
        <Metric label="Manifest" value={report.exportManifestEntryCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Compress" value={report.compressionCandidateCount} />
        <Metric label="Replace" value={report.replacementTrackedCount} />
        <Metric label="Upload" value={report.uploadProvenanceIssueCount} />
        <Metric label="Bytes" value={formatAssetMediaBytes(report.embeddedSourceBytes)} />
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

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={visibleRows.length === 0}
          onClick={exportJson}
        >
          <FileJson2 className="size-3" />
          JSON
        </Button>
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
          disabled={selectableLayerIds.length === 0}
          onClick={selectRows}
        >
          <MousePointer2 className="size-3" />
          Select
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.slice(0, 4).map((row) => (
          <PipelineRow key={row.id} row={row} />
        ))}
        {visibleRows.length > 4 ? (
          <div className="rounded-sm bg-muted px-2 py-1 text-[10px] text-muted-foreground">
            {visibleRows.length - 4} more pipeline row
            {visibleRows.length - 4 === 1 ? "" : "s"}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const filters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "queued", label: "Queue" },
  { id: "source-metadata", label: "Source" },
  { id: "upload-provenance", label: "Upload" },
  { id: "compression-target", label: "Compress" },
  { id: "export-manifest", label: "Manifest" },
] as const satisfies ReadonlyArray<{
  id: MediaAssetPipelineFilter;
  label: string;
}>;

function PipelineRow({ row }: { row: MediaAssetPipelineRow }) {
  return (
    <div
      className={cn(
        "rounded-sm border px-2 py-1.5",
        row.status === "blocked" && "border-destructive/60",
        row.status === "review" && "border-amber-400/70",
        row.status === "ready" && "border-border",
      )}
    >
      <div className="flex items-center gap-2">
        <Badge
          variant={getStatusVariant(row.status)}
          className="h-5 shrink-0 px-1.5 text-[10px]"
        >
          {row.status}
        </Badge>
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
          {row.label}
        </span>
        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {formatMetric(row)}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {row.detail}
      </div>
      <div className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">
        {row.recommendation}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0 rounded-sm bg-muted/40 p-1.5">
      <div className="truncate">{label}</div>
      <div className="truncate text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

function getVisibleRows(
  rows: MediaAssetPipelineRow[],
  filter: MediaAssetPipelineFilter,
) {
  if (filter === "all") {
    return rows;
  }

  if (filter === "queued") {
    return rows.filter((row) => row.layerIds.length > 0);
  }

  return rows.filter(
    (row) => row.status === filter || row.category === filter,
  );
}

function formatMetric(row: MediaAssetPipelineRow) {
  if (row.category === "compression-target") {
    return formatAssetMediaBytes(row.metric);
  }

  return Math.round(row.metric).toLocaleString();
}

function getStatusVariant(status: MediaAssetPipelineStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
