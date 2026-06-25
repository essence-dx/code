"use client";

import { Download, GitCompareArrows } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DesignTokenDriftReport } from "@/features/editor/design-token-drift-review";
import { getDesignTokenDriftCsv } from "@/features/editor/design-token-drift-review";

type DesignTokenDriftReviewPanelProps = {
  report: DesignTokenDriftReport;
};

export function DesignTokenDriftReviewPanel({
  report,
}: DesignTokenDriftReviewPanelProps) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <GitCompareArrows className="size-3.5" />
            Token drift
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Style properties compared with active-mode variables.
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge variant={report.driftCount > 0 ? "outline" : "secondary"}>
            {report.driftCount}
          </Badge>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6"
            aria-label="Download token drift CSV"
            onClick={() => downloadTokenDriftCsv(report)}
          >
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <DriftMetric label="Styles" value={report.styleCount} />
        <DriftMetric label="Synced" value={report.syncedCount} />
        <DriftMetric label="Drift" value={report.driftCount} />
        <DriftMetric label="Unpaired" value={report.unpairedCount} />
      </div>

      <div className="mt-2 space-y-1.5">
        {report.rows.slice(0, 6).map((row) => (
          <div
            key={row.id}
            className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{row.styleName}</div>
                <div className="truncate font-mono text-[10px] text-muted-foreground">
                  {row.category} / {row.property}
                </div>
              </div>
              <Badge
                variant={row.status === "drift" ? "outline" : "secondary"}
                className="shrink-0 capitalize"
              >
                {row.status}
              </Badge>
            </div>
            <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
              Style: {row.styleValue}
              {row.variableName
                ? ` / ${row.variableName}: ${row.variableValue}`
                : " / no matching variable"}
            </div>
            <div className="mt-1 line-clamp-2 text-[11px] text-primary">
              {row.suggestion}
            </div>
          </div>
        ))}
        {report.rows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No token drift found in saved styles.
          </div>
        ) : null}
        {report.rows.length > 6 ? (
          <div className="text-[11px] text-muted-foreground">
            +{report.rows.length - 6} more drift or pairing issues
          </div>
        ) : null}
      </div>
    </div>
  );
}

function downloadTokenDriftCsv(report: DesignTokenDriftReport) {
  const csv = getDesignTokenDriftCsv(report);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "design-token-drift.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function DriftMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/40 p-1.5">
      <div>{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}
