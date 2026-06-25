"use client";

import { useMemo, useState } from "react";
import { Download, FileJson2, MousePointer2, PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getComponentMarketplaceReadinessBundleJson,
  getComponentMarketplaceReadinessCsv,
  getComponentMarketplaceReadinessMarkdown,
  type ComponentMarketplaceCategory,
  type ComponentMarketplaceReadinessReport,
  type ComponentMarketplaceRow,
  type ComponentMarketplaceStatus,
} from "@/features/editor/component-marketplace-readiness";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import { cn } from "@/lib/utils";

type ComponentMarketplaceReadinessSectionProps = {
  report: ComponentMarketplaceReadinessReport;
  onAcceptLibraryUpdate: (componentId: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
};

type ComponentMarketplaceFilter =
  | "all"
  | "queued"
  | ComponentMarketplaceStatus
  | ComponentMarketplaceCategory;

const filters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "listing", label: "Listing" },
  { id: "preview", label: "Preview" },
  { id: "adoption", label: "Adopt" },
  { id: "campaign", label: "Campaign" },
  { id: "queued", label: "Queue" },
] satisfies Array<{ id: ComponentMarketplaceFilter; label: string }>;

export function ComponentMarketplaceReadinessSection({
  report,
  onAcceptLibraryUpdate,
  onSelectLayers,
}: ComponentMarketplaceReadinessSectionProps) {
  const [filter, setFilter] = useState<ComponentMarketplaceFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );
  const queueLayerIds = useMemo(
    () => Array.from(new Set(visibleRows.flatMap((row) => row.layerIds))),
    [visibleRows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getComponentMarketplaceReadinessCsv(report, visibleRows),
      filename: `component-marketplace-readiness-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getComponentMarketplaceReadinessMarkdown(report, visibleRows),
      filename: `component-marketplace-readiness-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
  }

  function exportBundle() {
    downloadTextFile({
      content: getComponentMarketplaceReadinessBundleJson(report, visibleRows),
      filename: `component-marketplace-readiness-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <PackageCheck className="size-3.5" />
            Marketplace readiness
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Publishable listings, preview evidence, adoption analytics, dependencies, and update campaigns.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Listings" value={report.componentCount} />
        <Metric label="Ready" value={report.publishableListingCount} />
        <Metric label="Preview" value={report.previewReadyCount} />
        <Metric label="Adopted" value={report.adoptedComponentCount} />
      </div>

      <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Deps" value={report.dependencyIssueCount} />
        <Metric label="Campaign" value={report.updateCampaignCount} />
        <Metric label="Review" value={report.reviewCount} />
        <Metric label="Blocked" value={report.blockedCount} />
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
          disabled={queueLayerIds.length === 0}
          onClick={() => onSelectLayers(queueLayerIds)}
        >
          Queue
        </Button>
      </div>

      <div className="space-y-1.5">
        {visibleRows.slice(0, 5).map((row) => (
          <MarketplaceRowCard
            key={row.id}
            row={row}
            onAcceptLibraryUpdate={onAcceptLibraryUpdate}
            onSelectLayers={onSelectLayers}
          />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No marketplace readiness rows match this queue.
          </div>
        ) : null}
        {visibleRows.length > 5 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 5} more marketplace rows
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MarketplaceRowCard({
  row,
  onAcceptLibraryUpdate,
  onSelectLayers,
}: {
  row: ComponentMarketplaceRow;
  onAcceptLibraryUpdate: (componentId: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
}) {
  const canAcceptUpdate = row.action === "accept-update" && row.componentId;
  const canQueueLayers = row.layerIds.length > 0;

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
              {row.componentName}
            </span>
            <Badge variant={getStatusVariant(row.status)} className="shrink-0">
              {row.status}
            </Badge>
          </div>
          <div className="mt-1 truncate text-[11px] opacity-80">
            {row.category} / {row.label}
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
            {row.detail}
          </div>
          <div className="mt-1 font-mono text-[10px] opacity-75">
            metric {row.metric}
            {row.pageNames.length > 0 ? ` / ${row.pageNames.join(" / ")}` : ""}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          {canAcceptUpdate ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-[11px]"
              onClick={() => onAcceptLibraryUpdate(row.componentId!)}
            >
              Update
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            disabled={!canQueueLayers}
            aria-label={`Queue ${row.label}`}
            onClick={() => onSelectLayers(row.layerIds)}
          >
            <MousePointer2 className="size-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function getVisibleRows(
  rows: ComponentMarketplaceRow[],
  filter: ComponentMarketplaceFilter,
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/30 px-2 py-1">
      <div>{label}</div>
      <div className="text-xs text-foreground">{value.toLocaleString()}</div>
    </div>
  );
}

function getStatusVariant(status: ComponentMarketplaceStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
