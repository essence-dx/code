"use client";

import { useMemo, useState } from "react";
import { Download, FileJson2, MonitorCog, Rocket, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getEnterpriseDesktopReleaseOperationsSynthesisCsv,
  getEnterpriseDesktopReleaseOperationsSynthesisJson,
  getEnterpriseDesktopReleaseOperationsSynthesisMarkdown,
  type EnterpriseDesktopReleaseOperationsCategory,
  type EnterpriseDesktopReleaseOperationsRow,
  type EnterpriseDesktopReleaseOperationsStatus,
  type EnterpriseDesktopReleaseOperationsSynthesisReport,
} from "@/features/editor/enterprise-desktop-release-operations-synthesis";
import { cn } from "@/lib/utils";

type EnterpriseDesktopReleaseOperationsSynthesisPanelProps = {
  report: EnterpriseDesktopReleaseOperationsSynthesisReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type EnterpriseDesktopReleaseFilter =
  | "all"
  | EnterpriseDesktopReleaseOperationsCategory
  | EnterpriseDesktopReleaseOperationsStatus;

export function EnterpriseDesktopReleaseOperationsSynthesisPanel({
  report,
  onRecordActivity,
}: EnterpriseDesktopReleaseOperationsSynthesisPanelProps) {
  const [filter, setFilter] = useState<EnterpriseDesktopReleaseFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );

  function exportJson() {
    downloadTextFile({
      content: getEnterpriseDesktopReleaseOperationsSynthesisJson(
        report,
        visibleRows,
      ),
      filename: `enterprise-desktop-release-operations-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported enterprise desktop release JSON",
      `${visibleRows.length} rows`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getEnterpriseDesktopReleaseOperationsSynthesisCsv(
        report,
        visibleRows,
      ),
      filename: `enterprise-desktop-release-operations-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported enterprise desktop release CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getEnterpriseDesktopReleaseOperationsSynthesisMarkdown(
        report,
        visibleRows,
      ),
      filename: `enterprise-desktop-release-operations-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported enterprise desktop release handoff",
      `${report.releasePacketCount} packets`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MonitorCog className="size-3.5" />
            Enterprise desktop release
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Ship gate for restore drills, workspace operations, plugin sandboxing, collaboration recovery, and production evidence.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Decision" value={report.desktopReleaseDecision} />
        <Metric label="Packets" value={report.releasePacketCount} />
        <Metric label="Blockers" value={report.blockerCount} />
        <Metric label="Review" value={report.reviewItemCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Offline" value={report.offlineReadinessEvidenceCount} />
        <Metric label="Admin" value={report.adminEvidenceCount} />
        <Metric label="Rollback" value={report.rollbackEvidenceCount} />
        <Metric label="Evidence" value={report.evidenceCount} />
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
          <Rocket className="size-3" />
          MD
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.map((row) => (
          <ReleaseRow key={row.id} row={row} />
        ))}
      </div>

      <div className="mt-2 rounded-sm bg-muted/30 p-2 text-[10px] text-muted-foreground">
        <div className="font-medium text-foreground">Release packets</div>
        <div className="mt-1 line-clamp-2">
          {report.releasePackets.map((packet) => packet.label).join(", ")}
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
  { id: "restore-drills", label: "Restore" },
  { id: "workspace-operations", label: "Files" },
  { id: "plugin-sandbox", label: "Plugins" },
  { id: "collaboration-recovery", label: "Recovery" },
  { id: "production-evidence", label: "Production" },
  { id: "ship-gate", label: "Gate" },
] as const satisfies ReadonlyArray<{
  id: EnterpriseDesktopReleaseFilter;
  label: string;
}>;

function ReleaseRow({ row }: { row: EnterpriseDesktopReleaseOperationsRow }) {
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
          {row.sourceScore}
        </span>
      </div>
      <div className="mt-1 truncate text-[10px] text-muted-foreground">
        {row.category}
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
  rows: EnterpriseDesktopReleaseOperationsRow[],
  filter: EnterpriseDesktopReleaseFilter,
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

function getStatusVariant(status: EnterpriseDesktopReleaseOperationsStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "outline" : "secondary";
}
