"use client";

import { useMemo, useState } from "react";
import {
  ClipboardCopy,
  Download,
  FileJson,
  History,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getCommandActionReplayBundleJson,
  getCommandActionReplayCsv,
  getCommandActionReplayMarkdown,
  type CommandActionReplayCategory,
  type CommandActionReplayReport,
  type CommandActionReplayRow,
  type CommandActionReplayStatus,
} from "@/features/editor/command-action-replay";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import { cn } from "@/lib/utils";

type CommandActionReplayPanelProps = {
  report: CommandActionReplayReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type ReplayFilter = "all" | CommandActionReplayStatus | CommandActionReplayCategory;

const replayFilters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "artifact", label: "Artifacts" },
  { id: "telemetry", label: "Telemetry" },
  { id: "undo", label: "Undo" },
] as const satisfies ReadonlyArray<{ id: ReplayFilter; label: string }>;

export function CommandActionReplayPanel({
  report,
  onRecordActivity,
}: CommandActionReplayPanelProps) {
  const [filter, setFilter] = useState<ReplayFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter).slice(0, 5),
    [filter, report.rows],
  );

  function exportCsv() {
    downloadTextFile({
      content: getCommandActionReplayCsv(report),
      filename: "command-action-replay.csv",
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported command replay CSV",
      `${report.artifactCount} artifacts`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getCommandActionReplayMarkdown(report),
      filename: "command-action-replay.md",
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported command replay handoff",
      `${report.status} score ${report.score}`,
    );
  }

  function exportJson() {
    downloadTextFile({
      content: getCommandActionReplayBundleJson(report),
      filename: "command-action-replay.bundle.json",
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported command replay bundle",
      `${report.releaseSafeArtifactCount} release-safe artifacts`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(getCommandActionReplayMarkdown(report));
    onRecordActivity?.(
      "Copied command replay handoff",
      `${report.status} score ${report.score}`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2 normal-case tracking-normal">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <History className="size-3.5" />
            Action replay
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Typed operation artifacts with scoped undo previews and release-safe replay diagnostics.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Events" value={report.eventCount} />
        <Metric label="Replay" value={report.artifactCount} />
        <Metric label="Safe" value={report.releaseSafeArtifactCount} />
        <Metric label="Undo" value={report.scopedUndoPreviewCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Telemetry" value={report.telemetryEventCount} />
        <Metric label="Gaps" value={report.missingTelemetryCount} />
        <Metric label="Failed" value={report.failedCommandCount} />
        <Metric label="Slow" value={report.slowCommandCount} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {replayFilters.map((item) => (
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
          disabled={report.artifactCount === 0}
          onClick={exportCsv}
        >
          <Download className="mr-1 size-3" />
          CSV
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={report.artifactCount === 0}
          onClick={exportMarkdown}
        >
          MD
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={report.artifactCount === 0}
          onClick={exportJson}
        >
          <FileJson className="mr-1 size-3" />
          JSON
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={report.artifactCount === 0}
          onClick={copyMarkdown}
        >
          <ClipboardCopy className="mr-1 size-3" />
          Copy
        </Button>
      </div>

      <div className="mt-2 space-y-1">
        {visibleRows.map((row) => (
          <ReplayRow key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted px-2 py-1">
      <div>{label}</div>
      <div className="text-xs text-foreground">{value}</div>
    </div>
  );
}

function ReplayRow({ row }: { row: CommandActionReplayRow }) {
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
          {row.metric}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {row.detail}
      </div>
      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        {row.category === "undo" ? (
          <RotateCcw className="size-3" />
        ) : (
          <ShieldCheck className="size-3" />
        )}
        <span className="line-clamp-1">{row.recommendation}</span>
      </div>
    </div>
  );
}

function getVisibleRows(
  rows: CommandActionReplayRow[],
  filter: ReplayFilter,
) {
  if (filter === "all") {
    return rows;
  }

  return rows.filter(
    (row) => row.status === filter || row.category === filter,
  );
}

function getStatusVariant(status: CommandActionReplayStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
