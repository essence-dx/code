"use client";

import { Download, Gauge, Link2Off } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getComponentVariableCoverageCsv,
  type ComponentVariableCoverageReport,
  type ComponentVariableCoverageRow,
} from "@/features/editor/component-variable-coverage";

type ComponentVariableCoverageSectionProps = {
  report: ComponentVariableCoverageReport;
  onBindMatchingVariables: () => void;
};

export function ComponentVariableCoverageSection({
  report,
  onBindMatchingVariables,
}: ComponentVariableCoverageSectionProps) {
  if (report.componentCount === 0) {
    return null;
  }

  return (
    <section className="space-y-2 rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Gauge className="size-3.5 text-sky-300" />
            Variable coverage
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {report.coveragePercent}% of source properties are bound to variables.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 shrink-0 px-2 text-xs"
          onClick={() =>
            downloadTextFile({
              content: getComponentVariableCoverageCsv(report),
              filename: "component-variable-coverage.csv",
              type: "text/csv;charset=utf-8",
            })
          }
        >
          <Download className="size-3" />
          CSV
        </Button>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-8 w-full justify-center text-xs"
        disabled={report.matchingRawPropertyCount === 0}
        onClick={onBindMatchingVariables}
      >
        Bind matching variables
        {report.matchingRawPropertyCount > 0
          ? ` (${report.matchingRawPropertyCount})`
          : ""}
      </Button>
      <div className="grid grid-cols-4 gap-1.5">
        <CoverageMetric label="Bound" value={report.boundPropertyCount} />
        <CoverageMetric label="Props" value={report.bindablePropertyCount} />
        <CoverageMetric label="Ready" value={report.readyComponentCount} />
        <CoverageMetric label="Missing" value={report.missingComponentCount} />
      </div>
      {report.rows.some((row) => row.status !== "ready") ? (
        <div className="space-y-1.5">
          {report.rows
            .filter((row) => row.status !== "ready")
            .slice(0, 4)
            .map((row) => (
              <CoverageRow key={row.componentId} row={row} />
            ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-border bg-card p-2 text-xs text-muted-foreground">
          <Gauge className="size-3.5 text-emerald-300" />
          Component sources meet the current variable coverage goal.
        </div>
      )}
    </section>
  );
}

function CoverageMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card px-2 py-1.5">
      <div className="truncate text-[10px] text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}

function CoverageRow({ row }: { row: ComponentVariableCoverageRow }) {
  return (
    <div className="rounded-md border border-border bg-card p-2 text-xs">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate font-medium">{row.componentName}</span>
        <Badge variant={row.status === "missing" ? "destructive" : "outline"}>
          {row.coveragePercent}%
        </Badge>
      </div>
      <div className="mt-1 truncate text-muted-foreground">{row.detail}</div>
      {row.matchingProperties.length > 0 ? (
        <div className="mt-1 flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
          <Link2Off className="size-3 shrink-0" />
          <span className="truncate">
            Ready to bind: {row.matchingProperties.join(", ")}
          </span>
        </div>
      ) : null}
    </div>
  );
}
