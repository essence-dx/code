"use client";

import { useMemo, useState } from "react";
import { Download, FileJson2, RadioTower, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getPluginWidgetRuntimeTelemetryDigestCsv,
  getPluginWidgetRuntimeTelemetryDigestJson,
  getPluginWidgetRuntimeTelemetryDigestMarkdown,
  type PluginWidgetTelemetryDigestCategory,
  type PluginWidgetTelemetryDigestReport,
  type PluginWidgetTelemetryDigestRow,
  type PluginWidgetTelemetryDigestStatus,
} from "@/features/editor/plugin-widget-runtime-telemetry-digest";
import { cn } from "@/lib/utils";

type PluginWidgetRuntimeTelemetryDigestPanelProps = {
  report: PluginWidgetTelemetryDigestReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type TelemetryDigestFilter =
  | "all"
  | PluginWidgetTelemetryDigestCategory
  | PluginWidgetTelemetryDigestStatus;

export function PluginWidgetRuntimeTelemetryDigestPanel({
  report,
  onRecordActivity,
}: PluginWidgetRuntimeTelemetryDigestPanelProps) {
  const [filter, setFilter] = useState<TelemetryDigestFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );

  function exportJson() {
    downloadTextFile({
      content: getPluginWidgetRuntimeTelemetryDigestJson(report, visibleRows),
      filename: `plugin-widget-telemetry-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported plugin widget telemetry JSON",
      `${visibleRows.length} rows`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getPluginWidgetRuntimeTelemetryDigestCsv(report, visibleRows),
      filename: `plugin-widget-telemetry-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported plugin widget telemetry CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getPluginWidgetRuntimeTelemetryDigestMarkdown(
        report,
        visibleRows,
      ),
      filename: `plugin-widget-telemetry-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported plugin widget telemetry handoff",
      `${report.adminEscalationQueueCount} escalations`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <RadioTower className="size-3.5" />
            Plugin runtime telemetry
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Permission prompts, blocked runs, replay mismatches, crash isolation, and admin escalation queues.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Prompts" value={report.permissionPromptCount} />
        <Metric label="Blocked" value={report.blockedRunCount} />
        <Metric label="Replay" value={report.replayMismatchCount} />
        <Metric label="Crash" value={report.crashIsolationBlockedCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Queue" value={report.adminEscalationQueueCount} />
        <Metric label="Widgets" value={report.widgetRuntimeCount} />
        <Metric label="Runs" value={report.crashLikeRunCount} />
        <Metric label="Manifests" value={report.manifestCount} />
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
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.map((row) => (
          <DigestRow key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
}

const filters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "ready", label: "Ready" },
  { id: "permission-prompts", label: "Perms" },
  { id: "blocked-runs", label: "Runs" },
  { id: "replay-mismatches", label: "Replay" },
  { id: "crash-isolation", label: "Crash" },
  { id: "admin-escalation", label: "Admin" },
] as const satisfies ReadonlyArray<{
  id: TelemetryDigestFilter;
  label: string;
}>;

function DigestRow({ row }: { row: PluginWidgetTelemetryDigestRow }) {
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
        <ShieldAlert className="size-3 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
          {row.label}
        </span>
        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {row.metric}
        </span>
      </div>
      <div className="mt-1 truncate text-[10px] text-muted-foreground">
        {row.category} / escalations {row.escalationIds.length}
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

function getVisibleRows(
  rows: PluginWidgetTelemetryDigestRow[],
  filter: TelemetryDigestFilter,
) {
  if (filter === "all") {
    return rows;
  }

  return rows.filter((row) => row.status === filter || row.category === filter);
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="min-w-0 rounded-sm bg-muted px-1.5 py-1">
      <div className="truncate uppercase">{label}</div>
      <div className="truncate text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: PluginWidgetTelemetryDigestStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
