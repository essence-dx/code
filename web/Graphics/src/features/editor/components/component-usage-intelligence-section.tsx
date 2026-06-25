"use client";

import { useMemo, useState } from "react";
import { BarChart3, Download, FileJson2, MousePointer2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getComponentUsageIntelligenceBundleJson,
  getComponentUsageIntelligenceCsv,
  getComponentUsageIntelligenceMarkdown,
  type ComponentUsageIntelligenceCategory,
  type ComponentUsageIntelligenceReport,
  type ComponentUsageIntelligenceRow,
  type ComponentUsageIntelligenceStatus,
} from "@/features/editor/component-usage-intelligence";
import { cn } from "@/lib/utils";

type ComponentUsageIntelligenceSectionProps = {
  report: ComponentUsageIntelligenceReport;
  onSelectLayers: (layerIds: string[]) => void;
};

type ComponentUsageFilter =
  | "all"
  | ComponentUsageIntelligenceStatus
  | ComponentUsageIntelligenceCategory
  | "queued";

const filters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "adoption", label: "Adopt" },
  { id: "variant", label: "Variant" },
  { id: "library", label: "Library" },
  { id: "queued", label: "Queue" },
] satisfies Array<{ id: ComponentUsageFilter; label: string }>;

export function ComponentUsageIntelligenceSection({
  report,
  onSelectLayers,
}: ComponentUsageIntelligenceSectionProps) {
  const [filter, setFilter] = useState<ComponentUsageFilter>("all");
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
      content: getComponentUsageIntelligenceCsv(report, visibleRows),
      filename: `component-usage-intelligence-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getComponentUsageIntelligenceMarkdown(report, visibleRows),
      filename: `component-usage-intelligence-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
  }

  function exportBundle() {
    downloadTextFile({
      content: getComponentUsageIntelligenceBundleJson(report, visibleRows),
      filename: `component-usage-intelligence-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <BarChart3 className="size-3.5" />
            Usage intelligence
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Adoption, variants, detached libraries, orphan instances, and release evidence.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Used" value={report.usedComponentCount} />
        <Metric label="Unused" value={report.unusedComponentCount} />
        <Metric label="Orphan" value={report.orphanInstanceCount} />
        <Metric label="Trend" value={report.adoptionTrendEventCount} />
      </div>

      <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Variant" value={report.variantDriftCount} />
        <Metric label="Props" value={report.propertyDriftCount} />
        <Metric label="Update" value={report.updateAvailableCount} />
        <Metric label="Detach" value={report.detachedLibraryCount} />
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
          <UsageRowCard
            key={row.id}
            row={row}
            onSelectLayers={onSelectLayers}
          />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No component usage rows match this queue.
          </div>
        ) : null}
        {visibleRows.length > 5 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 5} more usage intelligence rows
          </div>
        ) : null}
      </div>
    </div>
  );
}

function UsageRowCard({
  row,
  onSelectLayers,
}: {
  row: ComponentUsageIntelligenceRow;
  onSelectLayers: (layerIds: string[]) => void;
}) {
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
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 shrink-0"
          disabled={row.layerIds.length === 0}
          aria-label={`Queue ${row.label}`}
          onClick={() => onSelectLayers(row.layerIds)}
        >
          <MousePointer2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function getVisibleRows(
  rows: ComponentUsageIntelligenceRow[],
  filter: ComponentUsageFilter,
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

function getStatusVariant(status: ComponentUsageIntelligenceStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
