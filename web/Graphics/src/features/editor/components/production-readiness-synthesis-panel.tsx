"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, Download, FileJson2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getProductionReadinessSynthesisCsv,
  getProductionReadinessSynthesisJson,
  getProductionReadinessSynthesisMarkdown,
  type ProductionReadinessSynthesisPacket,
  type ProductionReadinessSynthesisRow,
  type ProductionReadinessSynthesisStatus,
} from "@/features/editor/production-readiness-synthesis";
import { cn } from "@/lib/utils";

type ProductionReadinessSynthesisPanelProps = {
  report: ProductionReadinessSynthesisPacket;
  onRecordActivity?: (label: string, detail?: string) => void;
};

type ProductionReadinessSynthesisFilter =
  | "all"
  | ProductionReadinessSynthesisStatus;

export function ProductionReadinessSynthesisPanel({
  report,
  onRecordActivity,
}: ProductionReadinessSynthesisPanelProps) {
  const [filter, setFilter] =
    useState<ProductionReadinessSynthesisFilter>("all");
  const visibleRows = useMemo(
    () => getVisibleRows(report.rows, filter),
    [filter, report.rows],
  );

  function exportJson() {
    downloadTextFile({
      content: getProductionReadinessSynthesisJson(report, visibleRows),
      filename: `production-readiness-synthesis-${filter}.json`,
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported production readiness synthesis JSON",
      `${visibleRows.length} rows`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getProductionReadinessSynthesisCsv(report, visibleRows),
      filename: `production-readiness-synthesis-${filter}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported production readiness synthesis CSV",
      `${visibleRows.length} rows`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getProductionReadinessSynthesisMarkdown(report, visibleRows),
      filename: `production-readiness-synthesis-${filter}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported production readiness synthesis handoff",
      `${visibleRows.length} rows`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ClipboardCheck className="size-3.5" />
            Production synthesis
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            One ship gate for collaboration, canvas, Dev Mode, and admin release evidence.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Decision" value={report.shipDecision} />
        <Metric label="Blocked" value={report.blockerCount} />
        <Metric label="Review" value={report.reviewItemCount} />
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
          <Download className="size-3" />
          CSV
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          onClick={exportMarkdown}
        >
          MD
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleRows.map((row) => (
          <SynthesisRow key={row.id} row={row} />
        ))}
      </div>

      <div className="mt-2 rounded-sm bg-muted/30 p-2 text-[10px] text-muted-foreground">
        <div className="font-medium text-foreground">Signoff checklist</div>
        <div className="mt-1 line-clamp-2">
          {report.signoffChecklist.join(" ")}
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
  id: ProductionReadinessSynthesisFilter;
  label: string;
}>;

function SynthesisRow({ row }: { row: ProductionReadinessSynthesisRow }) {
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
          {row.score}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {row.detail}
      </div>
      <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
        <span className="rounded-sm bg-muted px-1.5 py-0.5">
          {row.area}
        </span>
        <span className="rounded-sm bg-muted px-1.5 py-0.5">
          {row.blockerCount} blockers
        </span>
        <span className="rounded-sm bg-muted px-1.5 py-0.5">
          {row.evidenceCount} evidence
        </span>
      </div>
    </div>
  );
}

function getVisibleRows(
  rows: ProductionReadinessSynthesisRow[],
  filter: ProductionReadinessSynthesisFilter,
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

function getStatusVariant(status: ProductionReadinessSynthesisStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
