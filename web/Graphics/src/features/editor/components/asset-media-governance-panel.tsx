"use client";

import { useMemo, useState } from "react";
import {
  Download,
  FileJson2,
  Image,
  MousePointer2,
  PackageCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  formatAssetMediaBytes,
  type AssetMediaGovernanceCategory,
  type AssetMediaGovernanceReport,
  type AssetMediaGovernanceRow,
  type AssetMediaGovernanceStatus,
} from "@/features/editor/asset-media-governance";
import {
  getAssetMediaGovernanceBundleJson,
  getAssetMediaGovernanceCsv,
  getAssetMediaGovernanceMarkdown,
} from "@/features/editor/asset-media-governance-export";
import { cn } from "@/lib/utils";

type AssetMediaGovernancePanelProps = {
  report: AssetMediaGovernanceReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
};

type AssetMediaGovernanceFilter =
  | "all"
  | "queued"
  | AssetMediaGovernanceStatus
  | AssetMediaGovernanceCategory;

export function AssetMediaGovernancePanel({
  report,
  onRecordActivity,
  onSelectLayers,
}: AssetMediaGovernancePanelProps) {
  const [filter, setFilter] = useState<AssetMediaGovernanceFilter>("all");
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

  function exportCsv() {
    downloadTextFile({
      content: getAssetMediaGovernanceCsv(report, visibleRows),
      filename: `asset-media-governance-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported asset governance CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAssetMediaGovernanceMarkdown(report, visibleRows),
      filename: `asset-media-governance-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported asset governance handoff",
      `${visibleRows.length} rows`,
    );
  }

  function exportJson() {
    downloadTextFile({
      content: getAssetMediaGovernanceBundleJson(report, visibleRows),
      filename: `asset-media-governance-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported asset governance bundle",
      `${visibleRows.length} rows`,
    );
  }

  function selectRows() {
    onSelectLayers(selectableLayerIds);
    onRecordActivity?.(
      "Queued asset media optimization",
      `${selectableLayerIds.length} layers`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <PackageCheck className="size-3.5" />
            Asset media governance
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Images, videos, fonts, source notes, payloads, and export-safe
            optimization queues.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Images" value={report.imageLayerCount} />
        <Metric label="Embed" value={report.embeddedImageCount} />
        <Metric label="Source" value={report.sourceAttributionIssueCount} />
        <Metric label="Queue" value={report.optimizationQueueCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Fonts" value={report.fontFamilyCount} />
        <Metric label="Review" value={report.fontReviewCount} />
        <Metric label="Video" value={report.videoPlaceholderCount} />
        <Metric
          label="Bytes"
          value={formatAssetMediaBytes(report.embeddedImageBytes)}
        />
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
          <Download className="size-3" />
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
          disabled={selectableLayerIds.length === 0}
          onClick={selectRows}
        >
          <MousePointer2 className="size-3" />
          Select
        </Button>
      </div>

      <div className="mt-2 space-y-1">
        {visibleRows.slice(0, 5).map((row) => (
          <AssetMediaRow key={row.id} row={row} />
        ))}
        {visibleRows.length > 5 ? (
          <div className="rounded-sm bg-muted px-2 py-1 text-[10px] text-muted-foreground">
            {visibleRows.length - 5} more asset governance item
            {visibleRows.length - 5 === 1 ? "" : "s"}
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
  { id: "image", label: "Images" },
  { id: "video", label: "Video" },
  { id: "font", label: "Fonts" },
  { id: "source", label: "Source" },
] as const satisfies ReadonlyArray<{
  id: AssetMediaGovernanceFilter;
  label: string;
}>;

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-sm bg-muted px-2 py-1">
      <div>{label}</div>
      <div className="truncate text-xs text-foreground">{value}</div>
    </div>
  );
}

function AssetMediaRow({ row }: { row: AssetMediaGovernanceRow }) {
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
        <Image className="size-3 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
          {row.label}
        </span>
        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {formatRowMetric(row)}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {row.detail}
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {row.recommendation}
      </div>
    </div>
  );
}

function getVisibleRows(
  rows: AssetMediaGovernanceRow[],
  filter: AssetMediaGovernanceFilter,
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

function formatRowMetric(row: AssetMediaGovernanceRow) {
  if (
    row.category === "payload" ||
    row.category === "optimization" ||
    row.category === "video"
  ) {
    return formatAssetMediaBytes(row.metric);
  }

  return Math.round(row.metric).toLocaleString();
}

function getStatusVariant(status: AssetMediaGovernanceStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
