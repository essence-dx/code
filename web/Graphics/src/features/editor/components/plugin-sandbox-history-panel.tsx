"use client";

import { useMemo } from "react";
import { Download, RotateCcw, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import type {
  EditorPluginApprovalRecord,
  EditorPluginManifest,
  EditorPluginRunHistoryEntry,
} from "@/features/editor/editor-plugin-api";
import {
  getPluginSandboxHistoryCsv,
  getPluginSandboxHistoryMarkdown,
  getPluginSandboxHistoryReview,
  type PluginSandboxRow,
} from "@/features/editor/plugin-sandbox-history";
import { cn } from "@/lib/utils";

type PluginSandboxHistoryPanelProps = {
  approvals: Record<string, EditorPluginApprovalRecord>;
  grants: Record<string, boolean>;
  manifests: EditorPluginManifest[];
  runHistory: EditorPluginRunHistoryEntry[];
  onReplayApprovals: () => void;
  onRecordActivity?: (label: string, detail?: string) => void;
};

export function PluginSandboxHistoryPanel({
  approvals,
  grants,
  manifests,
  runHistory,
  onReplayApprovals,
  onRecordActivity,
}: PluginSandboxHistoryPanelProps) {
  const review = useMemo(
    () =>
      getPluginSandboxHistoryReview({
        approvals,
        grants,
        manifests,
        runHistory,
      }),
    [approvals, grants, manifests, runHistory],
  );

  function exportCsv() {
    downloadTextFile({
      content: getPluginSandboxHistoryCsv(review),
      filename: "plugin-sandbox-history.csv",
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported plugin sandbox history CSV",
      `${review.rows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getPluginSandboxHistoryMarkdown(review),
      filename: "plugin-sandbox-history.md",
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported plugin sandbox history handoff",
      `${review.latestRuns.length} runs`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ShieldAlert className="size-3.5" />
            Sandbox history
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Version-pinned approvals, run history, and replayable grants.
          </div>
        </div>
        <Badge variant={review.versionMismatchCount > 0 ? "destructive" : "secondary"}>
          {review.score}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Pinned" value={review.currentApprovalCount} />
        <Metric label="Mismatch" value={review.versionMismatchCount} />
        <Metric label="Runs" value={review.runCount} />
        <Metric label="Blocked" value={review.blockedRunCount} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={review.approvalCount === 0}
          onClick={onReplayApprovals}
        >
          <RotateCcw className="size-3.5" />
          Replay
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={review.rows.length === 0}
          onClick={exportCsv}
        >
          <Download className="size-3.5" />
          CSV
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={review.rows.length === 0}
          onClick={exportMarkdown}
        >
          MD
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {review.rows.slice(0, 4).map((row) => (
          <SandboxRowCard key={row.id} row={row} />
        ))}
      </div>

      <div className="mt-2 rounded-sm border border-border/70 bg-muted/20 p-2">
        <div className="text-[11px] font-medium text-muted-foreground">
          Latest runs
        </div>
        <div className="mt-1 space-y-1">
          {review.latestRuns.slice(0, 5).map((entry) => (
            <div key={entry.id} className="text-[11px] text-muted-foreground">
              <span className="font-medium text-foreground">
                {entry.pluginName}
              </span>{" "}
              v{entry.manifestVersion} / {entry.action} / {entry.status}
            </div>
          ))}
          {review.latestRuns.length === 0 ? (
            <div className="text-[11px] text-muted-foreground">
              No sandbox runs recorded yet.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SandboxRowCard({ row }: { row: PluginSandboxRow }) {
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
            {row.pluginName}
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
            {row.recommendation}
          </div>
        </div>
        <Badge variant={row.status === "blocked" ? "destructive" : "secondary"}>
          {row.status}
        </Badge>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/40 p-1.5">
      <div>{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}
