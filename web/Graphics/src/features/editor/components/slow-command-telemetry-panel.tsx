"use client";

import { ClipboardCopy, Download, TimerReset } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getSlowCommandTelemetryCsv,
  getSlowCommandTelemetryMarkdown,
  type SlowCommandTelemetryReport,
  type SlowCommandTelemetryRow,
  type SlowCommandTelemetryStatus,
} from "@/features/editor/command-telemetry";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import { cn } from "@/lib/utils";

type SlowCommandTelemetryPanelProps = {
  report: SlowCommandTelemetryReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

export function SlowCommandTelemetryPanel({
  report,
  onRecordActivity,
}: SlowCommandTelemetryPanelProps) {
  const reviewRows = report.rows.slice(0, 4);

  function exportCsv() {
    downloadTextFile({
      content: getSlowCommandTelemetryCsv(report),
      filename: "slow-command-telemetry.csv",
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported slow-command telemetry CSV",
      `${report.telemetryCount} timed commands`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getSlowCommandTelemetryMarkdown(report),
      filename: "slow-command-telemetry.md",
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported slow-command telemetry handoff",
      `${report.status} score ${report.score}`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(getSlowCommandTelemetryMarkdown(report));
    onRecordActivity?.(
      "Copied slow-command telemetry handoff",
      `${report.status} score ${report.score}`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2 normal-case tracking-normal">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <TimerReset className="size-3.5" />
            Command telemetry
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Timed canvas, import, export, and collaboration commands for release review.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Timed" value={report.telemetryCount} />
        <Metric label="Slow" value={report.slowCommandCount} />
        <Metric label="Failed" value={report.failedCommandCount} />
        <Metric label="Sync" value={report.collaborationCommandCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Canvas" value={report.canvasCommandCount} />
        <Metric label="Export" value={report.exportCommandCount} />
        <Metric label="Import" value={report.importCommandCount} />
        <Metric label="Review" value={report.reviewCount} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={report.events.length === 0}
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
          disabled={report.events.length === 0}
          onClick={exportMarkdown}
        >
          MD
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={report.events.length === 0}
          onClick={copyMarkdown}
        >
          <ClipboardCopy className="mr-1 size-3" />
          Copy
        </Button>
      </div>

      <div className="mt-2 space-y-1">
        {reviewRows.map((row) => (
          <TelemetryRow key={row.id} row={row} />
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

function TelemetryRow({ row }: { row: SlowCommandTelemetryRow }) {
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
    </div>
  );
}

function getStatusVariant(status: SlowCommandTelemetryStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
