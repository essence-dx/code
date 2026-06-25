"use client";

import { useMemo, useState } from "react";
import { Download, FileJson2, RadioTower, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getDesktopUpdateCohortObservabilityCsv,
  getDesktopUpdateCohortObservabilityJson,
  getDesktopUpdateCohortObservabilityMarkdown,
  type DesktopUpdateCohortCategory,
  type DesktopUpdateCohortObservabilityReport,
  type DesktopUpdateCohortRow,
  type DesktopUpdateCohortStatus,
} from "@/features/editor/desktop-update-cohort-observability";
import { cn } from "@/lib/utils";

type DesktopUpdateCohortObservabilityPanelProps = {
  report: DesktopUpdateCohortObservabilityReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type DesktopUpdateFilter =
  | "all"
  | DesktopUpdateCohortCategory
  | DesktopUpdateCohortStatus;

export function DesktopUpdateCohortObservabilityPanel({
  report,
  onRecordActivity,
}: DesktopUpdateCohortObservabilityPanelProps) {
  const [filter, setFilter] = useState<DesktopUpdateFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );

  function exportJson() {
    downloadTextFile({
      content: getDesktopUpdateCohortObservabilityJson(report, visibleRows),
      filename: `desktop-update-cohorts-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported desktop update cohort JSON",
      `${visibleRows.length} rows`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getDesktopUpdateCohortObservabilityCsv(report, visibleRows),
      filename: `desktop-update-cohorts-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported desktop update cohort CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getDesktopUpdateCohortObservabilityMarkdown(report, visibleRows),
      filename: `desktop-update-cohorts-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported desktop update cohort handoff",
      `${report.evidencePackets.length} packets`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <RadioTower className="size-3.5" />
            Desktop update cohorts
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Stable, beta, and canary health with updater failures, rollback cohorts, and signed evidence exports.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Channels" value={report.channelCount} />
        <Metric label="Devices" value={report.totalDeviceCount} />
        <Metric label="Coverage" value={`${report.rolloutCoveragePercent}%`} />
        <Metric label="Failures" value={report.updaterFailureCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Rollback" value={report.rollbackCohortCount} />
        <Metric label="Unsigned" value={report.unsignedDeviceCount} />
        <Metric label="Signed" value={report.signedEvidenceCount} />
        <Metric label="Packets" value={report.evidencePackets.length} />
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
          <CohortRow key={row.id} row={row} />
        ))}
      </div>

      <div className="mt-2 rounded-sm bg-muted/30 p-2 text-[10px] text-muted-foreground">
        <div className="font-medium text-foreground">Cohorts</div>
        <div className="mt-1 line-clamp-2">
          {report.cohorts
            .map(
              (cohort) =>
                `${cohort.channel} ${cohort.updatedDevices}/${cohort.totalDevices}`,
            )
            .join(", ")}
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
  { id: "channel-health", label: "Channels" },
  { id: "updater-failures", label: "Failures" },
  { id: "rollback-cohorts", label: "Rollback" },
  { id: "signed-evidence", label: "Signed" },
  { id: "release-gate", label: "Gate" },
] as const satisfies ReadonlyArray<{
  id: DesktopUpdateFilter;
  label: string;
}>;

function CohortRow({ row }: { row: DesktopUpdateCohortRow }) {
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
        {row.category} / {row.channel}
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
  rows: DesktopUpdateCohortRow[],
  filter: DesktopUpdateFilter,
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

function getStatusVariant(status: DesktopUpdateCohortStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
