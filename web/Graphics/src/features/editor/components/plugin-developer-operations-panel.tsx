"use client";

import { useMemo, useState } from "react";
import { Code2, Download, FileJson2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import type {
  EditorPluginApprovalRecord,
  EditorPluginManifest,
  EditorPluginRunHistoryEntry,
} from "@/features/editor/editor-plugin-api";
import {
  getPluginDeveloperOpsBundleJson,
  getPluginDeveloperOpsCsv,
  getPluginDeveloperOpsMarkdown,
  getPluginDeveloperOpsReport,
  type PluginDeveloperOpsCategory,
  type PluginDeveloperOpsReport,
  type PluginDeveloperOpsRow,
  type PluginDeveloperOpsStatus,
} from "@/features/editor/plugin-developer-operations";
import { cn } from "@/lib/utils";

type PluginDeveloperOperationsPanelProps = {
  approvals: Record<string, EditorPluginApprovalRecord>;
  grants: Record<string, boolean>;
  manifests: EditorPluginManifest[];
  runHistory: EditorPluginRunHistoryEntry[];
  onReplayApprovals: () => void;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type PluginDeveloperOpsFilter =
  | "all"
  | PluginDeveloperOpsStatus
  | PluginDeveloperOpsCategory;

const filters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "manifest", label: "Manifest" },
  { id: "permissions", label: "Perms" },
  { id: "replay", label: "Replay" },
  { id: "artifacts", label: "Artifacts" },
] satisfies Array<{ id: PluginDeveloperOpsFilter; label: string }>;

export function PluginDeveloperOperationsPanel({
  approvals,
  grants,
  manifests,
  runHistory,
  onReplayApprovals,
  onRecordActivity,
}: PluginDeveloperOperationsPanelProps) {
  const [filter, setFilter] = useState<PluginDeveloperOpsFilter>("all");
  const report = useMemo(
    () =>
      getPluginDeveloperOpsReport({
        approvals,
        grants,
        manifests,
        runHistory,
      }),
    [approvals, grants, manifests, runHistory],
  );
  const visibleRows = useMemo(
    () => getVisibleRows(report, filter),
    [filter, report],
  );

  function exportCsv() {
    downloadTextFile({
      content: getPluginDeveloperOpsCsv({ ...report, rows: visibleRows }),
      filename: `plugin-developer-operations-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported plugin developer operations CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getPluginDeveloperOpsMarkdown({ ...report, rows: visibleRows }),
      filename: `plugin-developer-operations-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported plugin developer operations handoff",
      `${visibleRows.length} rows`,
    );
  }

  function exportBundle() {
    downloadTextFile({
      content: getPluginDeveloperOpsBundleJson({ ...report, rows: visibleRows }),
      filename: `plugin-developer-operations-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported plugin developer operations bundle",
      `${visibleRows.length} rows`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Code2 className="size-3.5" />
            Developer operations
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Manifest validation, command permissions, replay health, artifacts, and sandbox diagnostics.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Mani" value={report.manifestCount} />
        <Metric label="Write" value={report.writeCommandCount} />
        <Metric label="Replay" value={report.replayableApprovalCount} />
        <Metric label="Runs" value={report.runCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Invalid" value={report.invalidManifestCount} />
        <Metric label="Blocked" value={report.blockedRunCount} />
        <Metric label="Artifacts" value={report.resultArtifactCount} />
        <Metric label="Rows" value={report.rows.length} />
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
          disabled={report.blockedReplayCount === 0}
          onClick={onReplayApprovals}
        >
          <RotateCcw className="size-3" />
          Replay
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
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.slice(0, 5).map((row) => (
          <DeveloperOpsRowCard key={row.id} row={row} />
        ))}
        {visibleRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No plugin developer-operation rows match this queue.
          </div>
        ) : null}
        {visibleRows.length > 5 ? (
          <div className="text-[11px] text-muted-foreground">
            +{visibleRows.length - 5} more plugin operation rows
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DeveloperOpsRowCard({ row }: { row: PluginDeveloperOpsRow }) {
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
  report: PluginDeveloperOpsReport,
  filter: PluginDeveloperOpsFilter,
) {
  if (filter === "all") {
    return report.rows;
  }

  return report.rows.filter(
    (row) => row.status === filter || row.category === filter,
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

function getStatusVariant(status: PluginDeveloperOpsStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
