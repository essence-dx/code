"use client";

import { useMemo, useState } from "react";
import { Download, FileJson2, FolderOpen, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getWorkspaceFileOperationsReviewCsv,
  getWorkspaceFileOperationsReviewJson,
  getWorkspaceFileOperationsReviewMarkdown,
  type WorkspaceFileOperationsCategory,
  type WorkspaceFileOperationsReviewReport,
  type WorkspaceFileOperationsRow,
  type WorkspaceFileOperationsStatus,
} from "@/features/editor/workspace-file-operations-review";
import { cn } from "@/lib/utils";

type WorkspaceFileOperationsReviewPanelProps = {
  report: WorkspaceFileOperationsReviewReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type WorkspaceFileOperationsFilter =
  | "all"
  | WorkspaceFileOperationsCategory
  | WorkspaceFileOperationsStatus;

export function WorkspaceFileOperationsReviewPanel({
  report,
  onRecordActivity,
}: WorkspaceFileOperationsReviewPanelProps) {
  const [filter, setFilter] =
    useState<WorkspaceFileOperationsFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );

  function exportJson() {
    downloadTextFile({
      content: getWorkspaceFileOperationsReviewJson(report, visibleRows),
      filename: `workspace-file-operations-review-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported workspace file operations JSON",
      `${visibleRows.length} rows`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getWorkspaceFileOperationsReviewCsv(report, visibleRows),
      filename: `workspace-file-operations-review-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported workspace file operations CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getWorkspaceFileOperationsReviewMarkdown(report, visibleRows),
      filename: `workspace-file-operations-review-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported workspace file operations handoff",
      `${report.operationPackets.length} packets`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <FolderOpen className="size-3.5" />
            Workspace file operations
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Recent files, team/project scopes, permission drift, offline-open readiness, and operator packets.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Recent" value={report.recentFileCount} />
        <Metric label="Teams" value={report.teamScopeCount} />
        <Metric label="Projects" value={report.projectScopeCount} />
        <Metric label="Unscoped" value={report.unscopedFileCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Drift" value={report.permissionDriftCount} />
        <Metric label="Offline" value={report.offlineOpenReadyCount} />
        <Metric label="Blocked" value={report.offlineOpenBlockedCount} />
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
        {visibleRows.map((row) => (
          <OperationsRow key={row.id} row={row} />
        ))}
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
  { id: "recent-files", label: "Recent" },
  { id: "workspace-scope", label: "Scope" },
  { id: "permission-drift", label: "Drift" },
  { id: "offline-open", label: "Offline" },
  { id: "operator-evidence", label: "Evidence" },
] as const satisfies ReadonlyArray<{
  id: WorkspaceFileOperationsFilter;
  label: string;
}>;

function OperationsRow({ row }: { row: WorkspaceFileOperationsRow }) {
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
  rows: WorkspaceFileOperationsRow[],
  filter: WorkspaceFileOperationsFilter,
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

function getStatusVariant(status: WorkspaceFileOperationsStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
