"use client";

import { ClipboardCopy, Download, FileJson2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type CollaborationSyncReplayReport,
  type CollaborationSyncReplayRow,
  type CollaborationSyncReplayStatus,
} from "@/features/editor/collaboration-sync-replay";
import {
  getCollaborationSyncReplayCsv,
  getCollaborationSyncReplayJson,
  getCollaborationSyncReplayMarkdown,
} from "@/features/editor/collaboration-sync-replay-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import { cn } from "@/lib/utils";

type CollaborationSyncReplayPanelProps = {
  report: CollaborationSyncReplayReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

export function CollaborationSyncReplayPanel({
  report,
  onRecordActivity,
}: CollaborationSyncReplayPanelProps) {
  const previewRows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"))
    .slice(0, 4);

  function exportJson() {
    downloadTextFile({
      content: getCollaborationSyncReplayJson(report),
      filename: "collaboration-sync-replay.json",
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported collaboration sync replay JSON",
      `${report.status} score ${report.score}`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getCollaborationSyncReplayCsv(report),
      filename: "collaboration-sync-replay.csv",
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported collaboration sync replay CSV",
      `${report.rows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getCollaborationSyncReplayMarkdown(report),
      filename: "collaboration-sync-replay.md",
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported collaboration sync replay handoff",
      `${report.status} score ${report.score}`,
    );
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getCollaborationSyncReplayMarkdown(report),
    );
    onRecordActivity?.(
      "Copied collaboration sync replay handoff",
      `${report.status} score ${report.score}`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <RefreshCw className="size-3.5" />
            Sync replay
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Room snapshot, conflict replay, and presence recovery checks.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Chat" value={report.chatMessageCount} />
        <Metric label="Events" value={report.presenceEventCount} />
        <Metric label="Ops" value={report.operationConflictCount} />
        <Metric label="Targets" value={report.targetConflictCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Queue" value={report.offlineReplayQueueCount} />
        <Metric label="Drift" value={report.eventDriftCount} />
        <Metric label="Reconnect" value={report.reconnectQualityScore} />
        <Metric label="Review" value={report.reviewCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Left" value={report.disconnectCount} />
        <Metric label="Recovered" value={report.recoveredPeerCount} />
        <Metric label="Open" value={report.unrecoveredPeerCount} />
        <Metric label="Latency" value={getLatencyScore(report.roomLatencyStatus)} />
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
          aria-label="Copy collaboration sync replay handoff"
          onClick={copyMarkdown}
        >
          <ClipboardCopy className="size-3" />
        </Button>
      </div>

      <div className="mt-2 space-y-1">
        {previewRows.map((row) => (
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

function ReplayRow({ row }: { row: CollaborationSyncReplayRow }) {
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
          {row.eventCount}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {row.detail}
      </div>
    </div>
  );
}

function getStatusVariant(status: CollaborationSyncReplayStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function getLatencyScore(status: CollaborationSyncReplayStatus) {
  if (status === "blocked") {
    return 0;
  }

  return status === "review" ? 50 : 100;
}
