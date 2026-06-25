"use client";

import { useMemo, useState } from "react";
import { FileJson, Keyboard, MousePointer2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getInteractionTestHarnessCsv,
  getInteractionTestHarnessJson,
  getInteractionTestHarnessMarkdown,
} from "@/features/editor/interaction-test-harness-export";
import type {
  InteractionHarnessCategory,
  InteractionHarnessRow,
  InteractionTestHarnessReport,
} from "@/features/editor/interaction-test-harness-types";
import { cn } from "@/lib/utils";

type InteractionTestHarnessPanelProps = {
  report: InteractionTestHarnessReport;
  activePageId: string;
  onSelectLayers: (layerIds: string[]) => void;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type HarnessFilter =
  | "all"
  | "blocked"
  | "review"
  | "ready"
  | "active"
  | InteractionHarnessCategory;

export function InteractionTestHarnessPanel({
  report,
  activePageId,
  onSelectLayers,
  onRecordActivity,
}: InteractionTestHarnessPanelProps) {
  const [filter, setFilter] = useState<HarnessFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, activePageId, filter),
    [activePageId, filter, report.rows],
  );
  const activeLayerIds = useMemo(
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

  function exportJson() {
    downloadTextFile({
      content: getInteractionTestHarnessJson(report, visibleRows),
      filename: `interaction-test-harness-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported interaction test harness JSON",
      `${visibleRows.length} rows`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getInteractionTestHarnessCsv(report, visibleRows),
      filename: `interaction-test-harness-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported interaction test harness CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getInteractionTestHarnessMarkdown(report, visibleRows),
      filename: `interaction-test-harness-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported interaction test harness handoff",
      `${visibleRows.length} rows`,
    );
  }

  function queueVisibleRows() {
    onSelectLayers(activeLayerIds);
    onRecordActivity?.(
      "Queued interaction test harness layers",
      `${activeLayerIds.length} active-page layer${activeLayerIds.length === 1 ? "" : "s"}`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Keyboard className="size-3.5" />
            Interaction test harness
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Keyboard, pointer, selection, resize, text edit, prototype, and export command flow evidence.
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
        <Metric label="Layers" value={report.selectableLayerCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Key" value={report.keyboardFlowCount} />
        <Metric label="Pointer" value={report.pointerFlowCount} />
        <Metric label="Text" value={report.textEditFlowCount} />
        <Metric label="Export" value={report.exportFlowCount} />
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
          onClick={exportJson}
        >
          <FileJson className="size-3.5" />
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
          MD
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={activeLayerIds.length === 0}
          onClick={queueVisibleRows}
        >
          Queue
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.slice(0, 6).map((row) => (
          <HarnessRowCard
            key={row.id}
            activePageId={activePageId}
            row={row}
            onSelectLayers={onSelectLayers}
          />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No interaction harness rows match this queue.
          </div>
        ) : null}
        {visibleRows.length > 6 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 6} more interaction test rows
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HarnessRowCard({
  activePageId,
  row,
  onSelectLayers,
}: {
  activePageId: string;
  row: InteractionHarnessRow;
  onSelectLayers: (layerIds: string[]) => void;
}) {
  const canSelect = row.pageId === activePageId && row.layerIds.length > 0;

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
              {row.label}
            </span>
            <Badge variant={getStatusVariant(row.status)} className="shrink-0">
              {row.status}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
              {row.category}
            </span>
            <span className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {row.pageName}
            </span>
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
            {row.detail}
          </div>
          <div className="mt-1 line-clamp-1 font-mono text-[10px] opacity-75">
            {row.evidence}
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] opacity-80">
            {row.steps[0]}
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 shrink-0"
          disabled={!canSelect}
          aria-label={`Select layers for ${row.label}`}
          onClick={() => onSelectLayers(row.layerIds)}
        >
          <MousePointer2 className="size-3.5" />
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
  { id: "keyboard", label: "Key" },
  { id: "pointer", label: "Pointer" },
  { id: "selection", label: "Select" },
  { id: "resize", label: "Resize" },
  { id: "text-edit", label: "Text" },
  { id: "prototype", label: "Proto" },
  { id: "export", label: "Export" },
] satisfies Array<{ id: HarnessFilter; label: string }>;

function getVisibleRows(
  rows: InteractionHarnessRow[],
  activePageId: string,
  filter: HarnessFilter,
) {
  if (filter === "all") {
    return rows;
  }

  if (filter === "active") {
    return rows.filter((row) => row.pageId === activePageId);
  }

  if (filter === "blocked" || filter === "review" || filter === "ready") {
    return rows.filter((row) => row.status === filter);
  }

  return rows.filter((row) => row.category === filter);
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/40 p-1.5">
      <div>{label}</div>
      <div className="text-foreground">{value.toLocaleString()}</div>
    </div>
  );
}

function getStatusVariant(status: InteractionHarnessRow["status"]) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
