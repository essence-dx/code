"use client";

import { AlertTriangle, CheckCircle2, RefreshCw, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ComponentInstanceReviewReport,
  ComponentInstanceReviewRow,
} from "@/features/editor/component-instance-review";

type ComponentInstanceReviewSectionProps = {
  report: ComponentInstanceReviewReport;
  onAcceptLibraryUpdate: (componentId: string) => void;
};

export function ComponentInstanceReviewSection({
  report,
  onAcceptLibraryUpdate,
}: ComponentInstanceReviewSectionProps) {
  if (report.rows.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-2 text-xs text-muted-foreground">
        <CheckCircle2 className="size-3.5 text-emerald-500" />
        Library-backed instances are current.
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-border bg-background p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle className="size-3.5 text-amber-500" />
          <span className="truncate text-xs font-medium">Instance review</span>
        </div>
        <Badge variant="outline" className="shrink-0">
          {report.affectedInstanceCount} affected
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <ReviewMetric label="Stale" value={report.staleInstanceCount} />
        <ReviewMetric label="Pending" value={report.pendingUpdateInstanceCount} />
        <ReviewMetric label="Detached" value={report.detachedInstanceCount} />
      </div>
      <div className="space-y-1">
        {report.rows.slice(0, 5).map((row) => (
          <InstanceReviewRow
            key={row.id}
            row={row}
            onAcceptLibraryUpdate={onAcceptLibraryUpdate}
          />
        ))}
        {report.rows.length > 5 ? (
          <div className="rounded-sm bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground">
            {report.rows.length - 5} more affected instances hidden by the compact review.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ReviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/30 px-2 py-1">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-mono text-xs text-foreground">{value}</div>
    </div>
  );
}

function InstanceReviewRow({
  row,
  onAcceptLibraryUpdate,
}: {
  row: ComponentInstanceReviewRow;
  onAcceptLibraryUpdate: (componentId: string) => void;
}) {
  return (
    <div className="rounded-sm border border-border/70 bg-muted/20 p-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{row.componentName}</div>
          <div className="truncate font-mono text-[10px] text-muted-foreground">
            {row.pageName}
            {row.variantName ? ` / ${row.variantName}` : ""} /{" "}
            {row.instanceLayerCount} layers
          </div>
        </div>
        <ReviewStatusBadge row={row} />
      </div>
      <div className="mt-1 truncate text-[11px] text-muted-foreground">
        {row.detail}
      </div>
      <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
        {row.layerNames.join(", ")}
      </div>
      {row.canAcceptUpdate ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-2 h-7 w-full gap-1.5 px-2 text-xs"
          onClick={() => onAcceptLibraryUpdate(row.componentId)}
        >
          <RefreshCw className="size-3.5" />
          Accept update
        </Button>
      ) : null}
    </div>
  );
}

function ReviewStatusBadge({ row }: { row: ComponentInstanceReviewRow }) {
  if (row.status === "pending-update") {
    return (
      <Badge variant="secondary" className="shrink-0 gap-1">
        <RefreshCw className="size-3" />
        Pending
      </Badge>
    );
  }

  if (row.status === "detached") {
    return (
      <Badge variant="outline" className="shrink-0 gap-1">
        <Unlink className="size-3" />
        Detached
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="shrink-0 gap-1">
      <AlertTriangle className="size-3" />
      Stale
    </Badge>
  );
}
