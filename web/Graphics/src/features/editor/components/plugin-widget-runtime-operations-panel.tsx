"use client";

import { useMemo, useState } from "react";
import { ClipboardCopy, Download, FileJson2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ReadinessMetric,
  downloadTextFile,
} from "@/features/editor/components/library-release-panel-shared";
import {
  getPluginWidgetRuntimeOperationsCsv,
  getPluginWidgetRuntimeOperationsJson,
  getPluginWidgetRuntimeOperationsMarkdown,
  type PluginWidgetRuntimeOperationsReport,
  type PluginWidgetRuntimeOperationsRow,
  type PluginWidgetRuntimeRowCategory,
  type PluginWidgetRuntimeStatus,
} from "@/features/editor/plugin-widget-runtime-operations";
import { cn } from "@/lib/utils";

type PluginWidgetRuntimeOperationsPanelProps = {
  report: PluginWidgetRuntimeOperationsReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type RuntimeOperationsFilter =
  | "all"
  | PluginWidgetRuntimeRowCategory
  | PluginWidgetRuntimeStatus;

const filters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "sandbox-health", label: "Sandbox" },
  { id: "execution-logs", label: "Logs" },
  { id: "permission-review", label: "Perms" },
  { id: "catalog-publishing", label: "Catalog" },
] satisfies Array<{ id: RuntimeOperationsFilter; label: string }>;

export function PluginWidgetRuntimeOperationsPanel({
  report,
  onRecordActivity,
}: PluginWidgetRuntimeOperationsPanelProps) {
  const [filter, setFilter] = useState<RuntimeOperationsFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );

  function exportJson() {
    downloadTextFile({
      content: getPluginWidgetRuntimeOperationsJson(report),
      filename: "plugin-widget-runtime-operations.json",
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported plugin widget runtime operations JSON",
      `${report.status} score ${report.score}`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getPluginWidgetRuntimeOperationsCsv(report),
      filename: "plugin-widget-runtime-operations.csv",
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported plugin widget runtime operations CSV",
      `${report.rows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getPluginWidgetRuntimeOperationsMarkdown(report),
      filename: "plugin-widget-runtime-operations.md",
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported plugin widget runtime operations handoff",
      `${report.catalogPublishableCount} catalog entries`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getPluginWidgetRuntimeOperationsMarkdown(report),
    );
    onRecordActivity?.(
      "Copied plugin widget runtime operations handoff",
      `${report.executionLogCount} execution logs`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Runtime operations
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Sandbox health, execution logs, permissions, and catalog handoff.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <ReadinessMetric label="Sandbox" value={report.sandboxHealthyCount} />
        <ReadinessMetric label="Logs" value={report.executionLogCount} />
        <ReadinessMetric label="Perms" value={report.permissionReviewCount} />
        <ReadinessMetric label="Catalog" value={report.catalogPublishableCount} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {filters.map((item) => {
          const matchingCount = getVisibleRows(report.rows, item.id).length;

          return (
            <Button
              key={item.id}
              type="button"
              size="sm"
              variant={filter === item.id ? "secondary" : "ghost"}
              className="h-7 px-2 text-[11px]"
              onClick={() => setFilter(item.id)}
            >
              {item.label} {matchingCount}
            </Button>
          );
        })}
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
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
          onClick={copyMarkdown}
        >
          <ClipboardCopy className="size-3" />
          Copy
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {report.catalogPublishingHandoff.entries.slice(0, 4).map((entry) => (
          <div key={entry.id} className="rounded-sm bg-muted px-2 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] font-medium">
                {entry.pluginName}
              </span>
              <Badge variant={getStatusVariant(entry.status)}>
                {entry.surface}
              </Badge>
            </div>
            <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
              {entry.runtimeKind} / {entry.category}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.slice(0, 6).map((row) => (
          <RuntimeRowCard key={row.id} row={row} />
        ))}
        {visibleRows.length > 6 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 6} more runtime operation rows
          </div>
        ) : null}
      </div>
    </div>
  );
}

function RuntimeRowCard({ row }: { row: PluginWidgetRuntimeOperationsRow }) {
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
          <div className="truncate font-medium">{row.label}</div>
          <div className="mt-1 truncate text-[11px] opacity-80">
            {row.pluginName} / {row.category}
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
            {row.detail}
          </div>
        </div>
        <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
      </div>
    </div>
  );
}

function getVisibleRows(
  rows: PluginWidgetRuntimeOperationsRow[],
  filter: RuntimeOperationsFilter,
) {
  if (filter === "all") {
    return rows;
  }

  return rows.filter(
    (row) => row.status === filter || row.category === filter,
  );
}

function getStatusVariant(status: PluginWidgetRuntimeStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
