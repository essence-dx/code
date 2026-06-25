"use client";

import { useMemo, useState } from "react";
import { Download, FileJson2, MonitorCog, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getNativePluginSandboxOperationsCsv,
  getNativePluginSandboxOperationsJson,
  getNativePluginSandboxOperationsMarkdown,
  type NativePluginSandboxCategory,
  type NativePluginSandboxOperationsReport,
  type NativePluginSandboxRow,
  type NativePluginSandboxStatus,
} from "@/features/editor/native-plugin-sandbox-operations";
import { cn } from "@/lib/utils";

type NativePluginSandboxOperationsPanelProps = {
  report: NativePluginSandboxOperationsReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type NativePluginSandboxFilter =
  | "all"
  | NativePluginSandboxCategory
  | NativePluginSandboxStatus;

export function NativePluginSandboxOperationsPanel({
  report,
  onRecordActivity,
}: NativePluginSandboxOperationsPanelProps) {
  const [filter, setFilter] = useState<NativePluginSandboxFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );

  function exportJson() {
    downloadTextFile({
      content: getNativePluginSandboxOperationsJson(report, visibleRows),
      filename: `native-plugin-sandbox-operations-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported native plugin sandbox JSON",
      `${visibleRows.length} rows`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getNativePluginSandboxOperationsCsv(report, visibleRows),
      filename: `native-plugin-sandbox-operations-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported native plugin sandbox CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getNativePluginSandboxOperationsMarkdown(report, visibleRows),
      filename: `native-plugin-sandbox-operations-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported native plugin sandbox handoff",
      `${report.operationPackets.length} packets`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MonitorCog className="size-3.5" />
            Native plugin sandbox
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Permission prompts, offline policy, crash isolation, replay evidence, and operator packets.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Prompts" value={report.permissionPromptCount} />
        <Metric label="Offline" value={report.offlinePolicyReadyCount} />
        <Metric label="Crashes" value={report.crashLikeRunCount} />
        <Metric label="Replay" value={report.replayEvidenceReadyCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Widgets" value={report.widgetManifestCount} />
        <Metric label="Blocked" value={report.blockedCount} />
        <Metric label="Runs" value={report.blockedRunCount} />
        <Metric label="Evidence" value={report.operatorEvidenceCount} />
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
        {visibleRows.slice(0, 7).map((row) => (
          <SandboxRow key={row.id} row={row} />
        ))}
        {visibleRows.length > 7 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 7} more native sandbox rows
          </div>
        ) : null}
      </div>

      <div className="mt-2 rounded-sm bg-muted/30 p-2 text-[10px] text-muted-foreground">
        <div className="font-medium text-foreground">Operation packets</div>
        <div className="mt-1 line-clamp-2">
          {report.operationPackets.map((packet) => packet.label).join(", ")}
        </div>
      </div>
    </div>
  );
}

const filters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "ready", label: "Ready" },
  { id: "permission-prompts", label: "Prompts" },
  { id: "offline-execution", label: "Offline" },
  { id: "crash-isolation", label: "Crash" },
  { id: "replay-evidence", label: "Replay" },
  { id: "operator-evidence", label: "Evidence" },
] as const satisfies ReadonlyArray<{
  id: NativePluginSandboxFilter;
  label: string;
}>;

function SandboxRow({ row }: { row: NativePluginSandboxRow }) {
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
        <ShieldCheck className="size-3 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
          {row.label}
        </span>
        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {row.metric}
        </span>
      </div>
      <div className="mt-1 truncate text-[10px] text-muted-foreground">
        {row.pluginName} / {row.category}
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
  rows: NativePluginSandboxRow[],
  filter: NativePluginSandboxFilter,
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

function getStatusVariant(status: NativePluginSandboxStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
