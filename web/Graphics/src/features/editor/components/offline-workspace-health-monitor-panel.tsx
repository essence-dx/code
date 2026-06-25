"use client";

import { useMemo, useState } from "react";
import { DatabaseZap, Download, FileJson2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getOfflineWorkspaceHealthMonitorCsv,
  getOfflineWorkspaceHealthMonitorJson,
  getOfflineWorkspaceHealthMonitorMarkdown,
  type OfflineWorkspaceHealthCategory,
  type OfflineWorkspaceHealthMonitorReport,
  type OfflineWorkspaceHealthRow,
  type OfflineWorkspaceHealthStatus,
} from "@/features/editor/offline-workspace-health-monitor";
import { formatAssetMediaBytes } from "@/features/editor/asset-media-governance";
import { cn } from "@/lib/utils";

type OfflineWorkspaceHealthMonitorPanelProps = {
  report: OfflineWorkspaceHealthMonitorReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type OfflineWorkspaceHealthFilter =
  | "all"
  | OfflineWorkspaceHealthCategory
  | OfflineWorkspaceHealthStatus;

export function OfflineWorkspaceHealthMonitorPanel({
  report,
  onRecordActivity,
}: OfflineWorkspaceHealthMonitorPanelProps) {
  const [filter, setFilter] = useState<OfflineWorkspaceHealthFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );

  function exportJson() {
    downloadTextFile({
      content: getOfflineWorkspaceHealthMonitorJson(report, visibleRows),
      filename: `offline-workspace-health-${report.fileId}-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported offline workspace health JSON",
      `${visibleRows.length} rows`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getOfflineWorkspaceHealthMonitorCsv(report, visibleRows),
      filename: `offline-workspace-health-${report.fileId}-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported offline workspace health CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getOfflineWorkspaceHealthMonitorMarkdown(report, visibleRows),
      filename: `offline-workspace-health-${report.fileId}-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported offline workspace health handoff",
      `${report.userSafeRepairCount} user-safe packets`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <DatabaseZap className="size-3.5" />
            Offline workspace health
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Local database integrity, autosave drift, media cache pressure, and user-safe repair packets.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="DB" value={report.localDatabaseIssueCount} />
        <Metric label="Drift" value={report.autosaveDriftCount} />
        <Metric label="Cache" value={formatAssetMediaBytes(report.mediaCachePressureBytes)} />
        <Metric label="Safe" value={report.userSafeRepairCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Failed" value={report.failedOfflineSaveCount} />
        <Metric label="Retry" value={report.retryableOfflineSaveCount} />
        <Metric label="Media" value={report.mediaCachePressureCount} />
        <Metric label="Packets" value={report.repairPacketCount} />
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
          <HealthRow key={row.id} row={row} />
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
  { id: "local-database-integrity", label: "DB" },
  { id: "autosave-drift", label: "Drift" },
  { id: "media-cache-pressure", label: "Media" },
  { id: "repair-packets", label: "Repair" },
] as const satisfies ReadonlyArray<{
  id: OfflineWorkspaceHealthFilter;
  label: string;
}>;

function HealthRow({ row }: { row: OfflineWorkspaceHealthRow }) {
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
        {row.category} / threshold {row.threshold}
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
  rows: OfflineWorkspaceHealthRow[],
  filter: OfflineWorkspaceHealthFilter,
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

function getStatusVariant(status: OfflineWorkspaceHealthStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
