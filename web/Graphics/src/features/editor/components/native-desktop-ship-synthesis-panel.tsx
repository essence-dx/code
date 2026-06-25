"use client";

import { useMemo, useState } from "react";
import { Download, FileJson2, MonitorCog, Rocket, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getNativeDesktopShipSynthesisCsv,
  getNativeDesktopShipSynthesisJson,
  getNativeDesktopShipSynthesisMarkdown,
  type NativeDesktopShipSynthesisCategory,
  type NativeDesktopShipSynthesisReport,
  type NativeDesktopShipSynthesisRow,
  type NativeDesktopShipSynthesisStatus,
} from "@/features/editor/native-desktop-ship-synthesis";
import { cn } from "@/lib/utils";

type NativeDesktopShipSynthesisPanelProps = {
  report: NativeDesktopShipSynthesisReport;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type NativeDesktopShipFilter =
  | "all"
  | NativeDesktopShipSynthesisCategory
  | NativeDesktopShipSynthesisStatus;

export function NativeDesktopShipSynthesisPanel({
  report,
  onRecordActivity,
}: NativeDesktopShipSynthesisPanelProps) {
  const [filter, setFilter] = useState<NativeDesktopShipFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );

  function exportJson() {
    downloadTextFile({
      content: getNativeDesktopShipSynthesisJson(report, visibleRows),
      filename: `native-desktop-ship-synthesis-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported native desktop ship JSON",
      `${visibleRows.length} rows`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getNativeDesktopShipSynthesisCsv(report, visibleRows),
      filename: `native-desktop-ship-synthesis-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported native desktop ship CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getNativeDesktopShipSynthesisMarkdown(report, visibleRows),
      filename: `native-desktop-ship-synthesis-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported native desktop ship handoff",
      `${report.releasePacketCount} packets`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MonitorCog className="size-3.5" />
            Native desktop ship
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Desktop release gate for Tauri runtime, canvas scheduler, media pipeline, command automation, and production evidence.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Decision" value={report.desktopShipDecision} />
        <Metric label="Packets" value={report.releasePacketCount} />
        <Metric label="Blockers" value={report.blockerCount} />
        <Metric label="Review" value={report.reviewItemCount} />
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Parity" value={report.desktopParityEvidenceCount} />
        <Metric label="Offline" value={report.offlineEvidenceCount} />
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
          <ShipRow key={row.id} row={row} />
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
  { id: "tauri-runtime", label: "Tauri" },
  { id: "canvas-scheduler", label: "Canvas" },
  { id: "media-pipeline", label: "Media" },
  { id: "command-automation", label: "Commands" },
  { id: "production-evidence", label: "Production" },
  { id: "ship-gate", label: "Gate" },
] as const satisfies ReadonlyArray<{
  id: NativeDesktopShipFilter;
  label: string;
}>;

function ShipRow({ row }: { row: NativeDesktopShipSynthesisRow }) {
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
  rows: NativeDesktopShipSynthesisRow[],
  filter: NativeDesktopShipFilter,
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

function getStatusVariant(status: NativeDesktopShipSynthesisStatus) {
  if (status === "ready") {
    return "secondary";
  }

  if (status === "review") {
    return "outline";
  }

  return "destructive";
}
