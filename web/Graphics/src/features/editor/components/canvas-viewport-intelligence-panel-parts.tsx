"use client";

import { MousePointer2, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  CanvasViewportIntelligenceRow,
} from "@/features/editor/canvas-viewport-intelligence-types";
import { cn } from "@/lib/utils";

export type CanvasViewportFilter =
  | "all"
  | "blocked"
  | "review"
  | "ready"
  | "active"
  | "render"
  | "hit-test"
  | "repairable";

export const canvasViewportFilters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "ready", label: "Ready" },
  { id: "active", label: "Page" },
  { id: "render", label: "Render" },
  { id: "hit-test", label: "Hit" },
  { id: "repairable", label: "Fixable" },
] satisfies Array<{ id: CanvasViewportFilter; label: string }>;

export function getVisibleCanvasViewportRows(
  rows: CanvasViewportIntelligenceRow[],
  activePageId: string,
  filter: CanvasViewportFilter,
) {
  if (filter === "all") {
    return rows;
  }

  if (filter === "active") {
    return rows.filter((row) => row.pageId === activePageId);
  }

  if (filter === "render") {
    return rows.filter((row) => row.category === "render-window");
  }

  if (filter === "hit-test") {
    return rows.filter((row) => row.category === "hit-test");
  }

  if (filter === "repairable") {
    return rows.filter((row) => row.repairable);
  }

  return rows.filter((row) => row.status === filter);
}

export function CanvasViewportMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-sm bg-muted/40 p-1.5">
      <div>{label}</div>
      <div className="text-foreground">{value.toLocaleString()}</div>
    </div>
  );
}

export function CanvasViewportRowCard({
  activePageId,
  row,
  onRunAction,
}: {
  activePageId: string;
  row: CanvasViewportIntelligenceRow;
  onRunAction: () => void;
}) {
  const canRun = row.pageId === activePageId;

  return (
    <div
      className={cn(
        "rounded-sm border border-border/70 bg-muted/20 p-2 text-xs",
        row.status === "blocked" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        row.status === "review" && "border-primary/30 bg-primary/10 text-primary",
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate font-medium">
              {row.label}
            </span>
            <Badge variant={getCanvasViewportStatusVariant(row.status)} className="shrink-0">
              {row.status}
            </Badge>
          </div>
          <div className="mt-1 truncate text-[11px] opacity-80">
            {row.pageName} / {row.renderWindowLabel} / {row.category}
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
            {row.detail}
          </div>
          <div className="mt-1 grid grid-cols-4 gap-1 font-mono text-[10px] opacity-75">
            <span>cost {row.estimatedRenderCost}</span>
            <span>ptr {row.interactionCost}</span>
            <span>pairs {row.hitTestPairCount}</span>
            <span>depth {row.stackDepth}</span>
          </div>
          {row.layerNames.length > 0 ? (
            <div className="mt-1 line-clamp-1 text-[10px] opacity-75">
              {row.layerNames.join(" / ")}
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 shrink-0"
          disabled={!canRun}
          aria-label={row.actionLabel}
          onClick={onRunAction}
        >
          {row.action === "select" ? (
            <MousePointer2 className="size-3.5" />
          ) : (
            <Wrench className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function getCanvasViewportStatusVariant(
  status: CanvasViewportIntelligenceRow["status"],
) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
