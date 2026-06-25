"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatAssetLibraryBytes,
  type AssetLibraryCategory,
  type AssetLibraryManagementRow,
  type AssetLibraryStatus,
} from "@/features/editor/asset-library-management";
import { cn } from "@/lib/utils";

export type AssetLibraryFilter =
  | "all"
  | "queued"
  | AssetLibraryStatus
  | AssetLibraryCategory;

export const assetLibraryFilters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "queued", label: "Queue" },
  { id: "duplicate", label: "Dedupe" },
  { id: "metadata", label: "Metadata" },
  { id: "replacement", label: "Replace" },
  { id: "font", label: "Fonts" },
] as const satisfies ReadonlyArray<{
  id: AssetLibraryFilter;
  label: string;
}>;

export function AssetLibraryMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-sm bg-muted px-2 py-1">
      <div>{label}</div>
      <div className="truncate text-xs text-foreground">{value}</div>
    </div>
  );
}

export function AssetLibraryFilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      className="h-7 px-2 text-[11px]"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

export function AssetLibraryRow({
  active,
  onClick,
  row,
}: {
  active: boolean;
  onClick: () => void;
  row: AssetLibraryManagementRow;
}) {
  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-sm border px-2 py-1.5 text-left transition-colors hover:bg-muted/70",
        active && "bg-muted",
        row.status === "blocked" && "border-destructive/60",
        row.status === "review" && "border-amber-400/70",
        row.status === "ready" && "border-border",
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <Badge
          variant={getAssetLibraryStatusVariant(row.status)}
          className="h-5 shrink-0 px-1.5 text-[10px]"
        >
          {row.status}
        </Badge>
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
          {row.label}
        </span>
        <span className="shrink-0 rounded-sm bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {formatAssetLibraryRowMetric(row)}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {row.detail}
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {row.recommendation}
      </div>
    </button>
  );
}

export function getVisibleAssetLibraryRows(
  rows: AssetLibraryManagementRow[],
  filter: AssetLibraryFilter,
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

export function getAssetLibraryStatusVariant(status: AssetLibraryStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function formatAssetLibraryRowMetric(row: AssetLibraryManagementRow) {
  if (row.category === "replacement" && row.metric > 10_000) {
    return formatAssetLibraryBytes(row.metric);
  }

  return Math.round(row.metric).toLocaleString();
}
