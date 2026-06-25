"use client";

import { useMemo, useState } from "react";
import { Download, FileJson2, Save, Trash2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getPerformanceBaselineCsv,
  getPerformanceBaselineJson,
  getPerformanceBaselineMarkdown,
  type PerformanceBaselineComparisonRow,
  type PerformanceBaselineReport,
  type PerformanceBaselineStatus,
} from "@/features/editor/performance-baseline";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import { cn } from "@/lib/utils";

type PerformanceBaselinePanelProps = {
  report: PerformanceBaselineReport;
  onSaveBaseline: (name: string) => void;
  onRemoveBaseline: (baselineId: string) => void;
  onRecordActivity?: (label: string, detail?: string) => void;
};

export function PerformanceBaselinePanel({
  report,
  onSaveBaseline,
  onRemoveBaseline,
  onRecordActivity,
}: PerformanceBaselinePanelProps) {
  const [name, setName] = useState("");
  const previewRows = useMemo(
    () =>
      report.rows
        .filter((row) => row.status !== "ready")
        .concat(report.rows.filter((row) => row.status === "ready"))
        .slice(0, 4),
    [report.rows],
  );
  const hasBaseline = Boolean(report.baseline);

  function saveBaseline() {
    onSaveBaseline(name);
    setName("");
  }

  function exportJson() {
    downloadTextFile({
      content: getPerformanceBaselineJson(report),
      filename: "performance-baseline-comparison.json",
      type: "application/json;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported performance baseline JSON",
      `${report.status} score ${report.score}`,
    );
  }

  function exportCsv() {
    downloadTextFile({
      content: getPerformanceBaselineCsv(report),
      filename: "performance-baseline-comparison.csv",
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported performance baseline CSV",
      `${report.rows.length} metrics`,
    );
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getPerformanceBaselineMarkdown(report),
      filename: "performance-baseline-comparison.md",
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported performance baseline handoff",
      `${report.status} score ${report.score}`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <TrendingUp className="size-3.5" />
            Performance baseline
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {report.baseline
              ? `${report.baseline.name} / ${formatDate(report.baseline.createdAt)}`
              : "No saved baseline for this file."}
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Saved" value={report.baselineCount} />
        <Metric label="Blocked" value={report.blockedCount} />
        <Metric label="Review" value={report.reviewCount} />
        <Metric label="Ready" value={report.readyCount} />
      </div>

      <div className="mt-2 flex gap-1.5">
        <Input
          value={name}
          className="h-8 min-w-0 flex-1 text-xs"
          placeholder="Baseline name"
          onChange={(event) => setName(event.target.value)}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8 px-2 text-[11px]"
          onClick={saveBaseline}
        >
          <Save className="size-3" />
          Save
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={!hasBaseline}
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
          disabled={!hasBaseline}
          onClick={exportCsv}
        >
          CSV
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          disabled={!hasBaseline}
          onClick={exportMarkdown}
        >
          <Download className="size-3" />
          MD
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 px-2 text-[11px]"
          aria-label="Remove latest performance baseline"
          disabled={!report.baseline}
          onClick={() =>
            report.baseline ? onRemoveBaseline(report.baseline.id) : undefined
          }
        >
          <Trash2 className="size-3" />
        </Button>
      </div>

      <div className="mt-2 space-y-1">
        {previewRows.map((row) => (
          <BaselineRow key={row.id} row={row} />
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted px-2 py-1">
      <div>{label}</div>
      <div className="text-xs text-foreground">{value}</div>
    </div>
  );
}

function BaselineRow({ row }: { row: PerformanceBaselineComparisonRow }) {
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
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
          {row.label}
        </span>
        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {formatDelta(row.delta)}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {formatMetric(row.baselineValue)} to {formatMetric(row.currentValue)} / {formatDelta(row.percentChange)}%
      </div>
    </div>
  );
}

function getStatusVariant(status: PerformanceBaselineStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function formatMetric(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
}

function formatDelta(value: number) {
  const rounded = Math.round(value * 10) / 10;

  return `${rounded > 0 ? "+" : ""}${formatMetric(rounded)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
