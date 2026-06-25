"use client";

import { MousePointer2, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ResponsiveConstraintsReviewRow } from "@/features/editor/responsive-constraints-review-types";
import { cn } from "@/lib/utils";

export type ResponsiveConstraintsFilter =
  | "all"
  | "blocked"
  | "review"
  | "ready"
  | "active"
  | "repairable"
  | "resize"
  | "handoff";

export const responsiveConstraintsFilters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "ready", label: "Ready" },
  { id: "active", label: "Page" },
  { id: "repairable", label: "Fixable" },
  { id: "resize", label: "Resize" },
  { id: "handoff", label: "Inspect" },
] satisfies Array<{ id: ResponsiveConstraintsFilter; label: string }>;

export function getVisibleResponsiveConstraintsRows(
  rows: ResponsiveConstraintsReviewRow[],
  activePageId: string,
  filter: ResponsiveConstraintsFilter,
) {
  if (filter === "all") {
    return rows;
  }

  if (filter === "active") {
    return rows.filter((row) => row.pageId === activePageId);
  }

  if (filter === "repairable") {
    return rows.filter((row) => row.repairable);
  }

  if (filter === "resize") {
    return rows.filter((row) => row.category === "resize-simulation");
  }

  if (filter === "handoff") {
    return rows.filter(
      (row) =>
        row.category === "cross-page" ||
        row.category === "component" ||
        row.category === "grid",
    );
  }

  return rows.filter((row) => row.status === filter);
}

export function ResponsiveConstraintsMetric({
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

export function ResponsiveConstraintsRowCard({
  activePageId,
  row,
  onRunAction,
}: {
  activePageId: string;
  row: ResponsiveConstraintsReviewRow;
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
            <Badge
              variant={getResponsiveConstraintsStatusVariant(row.status)}
              className="shrink-0"
            >
              {row.status}
            </Badge>
          </div>
          <div className="mt-1 truncate text-[11px] opacity-80">
            {row.pageName} / {row.frameName ?? row.previewLabel} /{" "}
            {row.category}
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] opacity-85">
            {row.detail}
          </div>
          <div className="mt-1 grid grid-cols-4 gap-1 font-mono text-[10px] opacity-75">
            <span>{row.previewLabel}</span>
            <span>ov {row.overflowCount}</span>
            <span>unst {row.unstableCount}</span>
            <span>{row.metric}</span>
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

export function getResponsiveConstraintsStatusVariant(
  status: ResponsiveConstraintsReviewRow["status"],
) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
