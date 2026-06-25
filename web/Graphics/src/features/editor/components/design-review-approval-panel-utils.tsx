"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import type {
  DesignReviewApprovalCategory,
  DesignReviewApprovalRow,
  DesignReviewApprovalStatus,
} from "@/features/editor/design-review-approval-types";
import { cn } from "@/lib/utils";

export type DesignReviewApprovalFilter =
  | "all"
  | "queued"
  | DesignReviewApprovalStatus
  | DesignReviewApprovalCategory;

export const designReviewApprovalFilters = [
  { id: "all", label: "All" },
  { id: "blocked", label: "Blocked" },
  { id: "review", label: "Review" },
  { id: "queued", label: "Queue" },
  { id: "assignment", label: "Assign" },
  { id: "due-date", label: "Due" },
  { id: "release-gate", label: "Gates" },
  { id: "comments", label: "Comments" },
] as const satisfies ReadonlyArray<{
  id: DesignReviewApprovalFilter;
  label: string;
}>;

export function DesignReviewMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-sm bg-muted px-2 py-1">
      <div>{label}</div>
      <div className="truncate text-xs text-foreground">{value}</div>
    </div>
  );
}

export function DesignReviewFilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      className="h-7 px-2 text-[11px]"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

export function DesignReviewRowCard({
  active,
  onClick,
  row,
}: {
  active: boolean;
  onClick: () => void;
  row: DesignReviewApprovalRow;
}) {
  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-sm border px-2 py-1.5 text-left transition-colors hover:bg-muted/70",
        active && "bg-muted",
        row.status === "blocked" && "border-destructive/60",
        row.status === "review" && "border-amber-400/70",
        row.status === "ready" && "border-border",
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <Badge
          variant={getDesignReviewStatusVariant(row.status)}
          className="h-5 shrink-0 px-1.5 text-[10px]"
        >
          {row.status}
        </Badge>
        <ShieldCheck className="size-3 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium">
          {row.label}
        </span>
        <span className="shrink-0 rounded-sm bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {Math.round(row.metric).toLocaleString()}
        </span>
      </div>
      <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
        {row.detail}
      </div>
      <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
        <span className="rounded-sm bg-muted px-1.5 py-0.5">
          {row.category}
        </span>
        {row.pageName ? (
          <span className="rounded-sm bg-muted px-1.5 py-0.5">
            {row.pageName}
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function getVisibleDesignReviewRows(
  rows: DesignReviewApprovalRow[],
  filter: DesignReviewApprovalFilter,
) {
  if (filter === "all") {
    return rows;
  }

  if (filter === "queued") {
    return rows.filter(
      (row) => row.layerIds.length > 0 || row.commentIds.length > 0,
    );
  }

  return rows.filter(
    (row) => row.status === filter || row.category === filter,
  );
}

export function getDesignReviewStatusVariant(
  status: DesignReviewApprovalStatus,
) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
