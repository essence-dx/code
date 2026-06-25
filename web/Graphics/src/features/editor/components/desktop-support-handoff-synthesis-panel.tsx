"use client";

import { useMemo, useState } from "react";
import { Download, FileJson2, LifeBuoy, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getDesktopSupportHandoffSynthesisCsv,
  getDesktopSupportHandoffSynthesisJson,
  getDesktopSupportHandoffSynthesisMarkdown,
  type DesktopSupportHandoffCategory,
  type DesktopSupportHandoffRow,
  type DesktopSupportHandoffStatus,
  type DesktopSupportHandoffSynthesisReport,
} from "@/features/editor/desktop-support-handoff-synthesis";
import { cn } from "@/lib/utils";

type DesktopSupportHandoffSynthesisPanelProps = {
  report: DesktopSupportHandoffSynthesisReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type SupportHandoffFilter =
  | "all"
  | DesktopSupportHandoffCategory
  | DesktopSupportHandoffStatus;

export function DesktopSupportHandoffSynthesisPanel({
  report,
  onRecordActivity,
}: DesktopSupportHandoffSynthesisPanelProps) {
  const [filter, setFilter] = useState<SupportHandoffFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );

  function exportJson() {
    downloadTextFile({
      content: getDesktopSupportHandoffSynthesisJson(report, visibleRows),
      filename: `desktop-support-handoff-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported desktop support handoff JSON",
      `${visibleRows.length} rows`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getDesktopSupportHandoffSynthesisCsv(report, visibleRows),
      filename: `desktop-support-handoff-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported desktop support handoff CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getDesktopSupportHandoffSynthesisMarkdown(report, visibleRows),
      filename: `desktop-support-handoff-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported desktop support handoff",
      `${report.packetCount} packets`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <LifeBuoy className="size-3.5" />
            Desktop support handoff
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Update cohorts, crash/performance bundles, offline health, plugin telemetry, and release operations in one gate.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 rounded-sm bg-muted px-2 py-1.5 text-[11px] text-muted-foreground">
        {report.decision}
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Sources" value={report.sourceCount} />
        <Metric label="Blockers" value={report.blockerCount} />
        <Metric label="Review" value={report.reviewItemCount} />
        <Metric label="Packets" value={report.packetCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Escalate" value={report.escalationCount} />
        <Metric label="Ready" value={report.readyCount} />
        <Metric label="Needs" value={report.reviewCount} />
        <Metric label="Blocked" value={report.blockedCount} />
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
          <HandoffRow key={row.id} row={row} />
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
  { id: "update-cohorts", label: "Update" },
  { id: "crash-performance", label: "Crash" },
  { id: "offline-health", label: "Offline" },
  { id: "plugin-telemetry", label: "Plugin" },
  { id: "release-operations", label: "Release" },
  { id: "support-gate", label: "Gate" },
] as const satisfies ReadonlyArray<{
  id: SupportHandoffFilter;
  label: string;
}>;

function HandoffRow({ row }: { row: DesktopSupportHandoffRow }) {
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
        {row.category} / packets {row.packetCount}
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
  rows: DesktopSupportHandoffRow[],
  filter: SupportHandoffFilter,
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

function getStatusVariant(status: DesktopSupportHandoffStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
