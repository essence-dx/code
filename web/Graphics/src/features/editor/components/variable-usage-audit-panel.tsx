"use client";

import { MousePointer2, Variable } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { VariableUsageAuditReport } from "@/features/editor/variable-usage-audit";

type VariableUsageAuditPanelProps = {
  report: VariableUsageAuditReport;
  activePageId: string;
  onSelectLayers: (layerIds: string[]) => void;
};

export function VariableUsageAuditPanel({
  report,
  activePageId,
  onSelectLayers,
}: VariableUsageAuditPanelProps) {
  const activeRows = report.rows.filter((row) => row.pageId === activePageId);

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Variable className="size-3.5" />
            Token usage
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Raw values, exact token matches, and bound layer coverage.
          </div>
        </div>
        <Badge variant={report.rawLayerCount > 0 ? "outline" : "secondary"}>
          {report.rawLayerCount}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <AuditMetric label="Layers" value={report.totalLayers} />
        <AuditMetric label="Bound" value={report.boundLayerCount} />
        <AuditMetric label="Raw" value={report.rawPropertyCount} />
        <AuditMetric label="Matches" value={report.matchingPropertyCount} />
      </div>

      <div className="mt-2 space-y-1.5">
        {activeRows.slice(0, 6).map((row) => (
          <div
            key={row.id}
            className="flex items-start gap-2 rounded-sm border border-border/70 bg-muted/20 p-2 text-xs"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{row.layerName}</div>
              <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                {row.rawProperties.join(", ")}
              </div>
              {row.matchingProperties.length > 0 ? (
                <div className="mt-1 text-[11px] text-emerald-600">
                  Exact token match: {row.matchingProperties.join(", ")}
                </div>
              ) : null}
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7 shrink-0"
              aria-label={`Select ${row.layerName}`}
              onClick={() => onSelectLayers([row.layerId])}
            >
              <MousePointer2 className="size-3.5" />
            </Button>
          </div>
        ))}
        {activeRows.length === 0 ? (
          <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs text-muted-foreground">
            No raw token candidates on the active page.
          </div>
        ) : null}
        {activeRows.length > 6 ? (
          <div className="text-[11px] text-muted-foreground">
            +{activeRows.length - 6} more active-page layers with raw values
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AuditMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/40 p-1.5">
      <div>{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}
