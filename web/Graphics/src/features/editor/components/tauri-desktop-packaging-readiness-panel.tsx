"use client";

import { useMemo, useState } from "react";
import { Download, FileJson2, MonitorCog, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getTauriDesktopPackagingReadinessCsv,
  getTauriDesktopPackagingReadinessJson,
  getTauriDesktopPackagingReadinessMarkdown,
  type TauriDesktopPackagingReadinessReport,
  type TauriDesktopPackagingReadinessRow,
  type TauriDesktopPackagingReadinessStatus,
} from "@/features/editor/tauri-desktop-packaging-readiness";
import { cn } from "@/lib/utils";

type TauriDesktopPackagingReadinessPanelProps = {
  report: TauriDesktopPackagingReadinessReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type TauriDesktopPackagingFilter =
  | "all"
  | TauriDesktopPackagingReadinessStatus;

export function TauriDesktopPackagingReadinessPanel({
  report,
  onRecordActivity,
}: TauriDesktopPackagingReadinessPanelProps) {
  const [filter, setFilter] = useState<TauriDesktopPackagingFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );

  function exportJson() {
    downloadTextFile({
      content: getTauriDesktopPackagingReadinessJson(report, visibleRows),
      filename: `tauri-desktop-packaging-readiness-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Tauri desktop readiness JSON",
      `${visibleRows.length} rows`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getTauriDesktopPackagingReadinessCsv(report, visibleRows),
      filename: `tauri-desktop-packaging-readiness-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Tauri desktop readiness CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getTauriDesktopPackagingReadinessMarkdown(report, visibleRows),
      filename: `tauri-desktop-packaging-readiness-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported Tauri desktop readiness handoff",
      `${visibleRows.length} rows`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MonitorCog className="size-3.5" />
            Tauri desktop packaging
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Rust command health, filesystem permissions, offline bundle parity, updater evidence, and release packets.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Rust" value={report.rustCommandStatus} />
        <Metric label="FS" value={report.filesystemPermissionStatus} />
        <Metric label="Offline" value={report.offlineBundleStatus} />
        <Metric label="Updater" value={report.updaterStatus} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Commands" value={report.commandHandlerCount} />
        <Metric label="Icons" value={report.iconCount} />
        <Metric label="Evidence" value={report.releasePacketEvidenceCount} />
        <Metric label="Packet" value={report.releasePacketStatus} />
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
          <DesktopPackagingRow key={row.id} row={row} />
        ))}
      </div>

      <div className="mt-2 rounded-sm bg-muted/30 p-2 text-[10px] text-muted-foreground">
        <div className="font-medium text-foreground">Release packet</div>
        <div className="mt-1 line-clamp-2">
          {report.releasePacketEvidence.join(" ")}
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
] as const satisfies ReadonlyArray<{
  id: TauriDesktopPackagingFilter;
  label: string;
}>;

function DesktopPackagingRow({
  row,
}: {
  row: TauriDesktopPackagingReadinessRow;
}) {
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
          {row.evidenceCount}
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
  rows: TauriDesktopPackagingReadinessRow[],
  filter: TauriDesktopPackagingFilter,
) {
  if (filter === "all") {
    return rows;
  }

  return rows.filter((row) => row.status === filter);
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0 rounded-sm bg-muted/40 p-1.5">
      <div className="truncate">{label}</div>
      <div className="truncate text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: TauriDesktopPackagingReadinessStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
