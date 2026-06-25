"use client";

import { GaugeCircle, MousePointer2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LayerPatch } from "@/features/editor/document-utils";
import {
  getSafeModeLayerPatch,
  type LargeDocumentSafeModeReport,
  type LargeDocumentSafeModeRow,
  type LargeDocumentSafeModeStatus,
} from "@/features/editor/large-document-safe-mode";
import { cn } from "@/lib/utils";

type LargeDocumentSafeModePanelProps = {
  report: LargeDocumentSafeModeReport;
  onRecordActivity?: (label: string, detail?: string) => void;
  onSelectLayers: (layerIds: string[]) => void;
  onUpdateLayers: (patches: LayerPatch[]) => void;
};

export function LargeDocumentSafeModePanel({
  report,
  onRecordActivity,
  onSelectLayers,
  onUpdateLayers,
}: LargeDocumentSafeModePanelProps) {
  function runRowAction(row: LargeDocumentSafeModeRow) {
    const patch = getSafeModeLayerPatch(row.action);

    if (!patch) {
      onSelectLayers(row.layerIds);
      onRecordActivity?.(
        "Queued safe-mode review",
        `${row.layerIds.length} layers`,
      );
      return;
    }

    onUpdateLayers(
      row.layerIds.map((layerId) => ({
        layerId,
        patch,
      })),
    );
    onRecordActivity?.(
      `Applied safe-mode action: ${row.actionLabel}`,
      `${row.layerIds.length} layers`,
    );
  }

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Large-document safe mode
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Quick review actions for dense files and render-heavy pages.
          </div>
        </div>
        <Badge variant={getStatusVariant(report.status)}>{report.score}</Badge>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <Metric label="Doc" value={report.documentLayerCount} />
        <Metric label="Visible" value={report.activeVisibleLayerCount} />
        <Metric label="Cost" value={report.renderCost} />
        <Metric label="Effects" value={report.effectLayerCount} />
      </div>

      <div className="mt-2 space-y-1">
        {report.rows.slice(0, 4).map((row) => (
          <SafeModeRow
            key={row.id}
            row={row}
            onRunAction={() => runRowAction(row)}
          />
        ))}
        {report.rows.length > 4 ? (
          <div className="rounded-sm bg-muted px-2 py-1 text-[10px] text-muted-foreground">
            {report.rows.length - 4} more safe-mode item
            {report.rows.length - 4 === 1 ? "" : "s"}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted px-2 py-1">
      <div>{label}</div>
      <div className="text-xs text-foreground">{value.toLocaleString()}</div>
    </div>
  );
}

function SafeModeRow({
  row,
  onRunAction,
}: {
  row: LargeDocumentSafeModeRow;
  onRunAction: () => void;
}) {
  const canRunAction = row.layerIds.length > 0 && row.status !== "ready";

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
          {Math.round(row.metric).toLocaleString()}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {row.detail}
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {row.recommendation}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-2 h-7 w-full px-2 text-[11px]"
        disabled={!canRunAction}
        onClick={onRunAction}
      >
        {row.action === "select" ? (
          <MousePointer2 className="size-3" />
        ) : (
          <GaugeCircle className="size-3" />
        )}
        {row.actionLabel}
      </Button>
    </div>
  );
}

function getStatusVariant(status: LargeDocumentSafeModeStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
