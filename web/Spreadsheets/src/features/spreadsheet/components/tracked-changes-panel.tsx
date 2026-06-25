"use client";

import { Check, GitPullRequestArrow, MapPin, X } from "lucide-react";
import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseCellKey } from "@/features/workbooks/addresses";
import { rangeAddress } from "@/features/spreadsheet/multi-range-selection";
import type {
  WorkbookTrackedChange,
  WorkbookTrackedChangeStatus,
} from "@/features/workbooks/types";

function formatChangeDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
}

type BadgeVariant = ComponentProps<typeof Badge>["variant"];

function statusVariant(status: WorkbookTrackedChangeStatus): BadgeVariant {
  if (status === "accepted") {
    return "secondary";
  }

  if (status === "rejected") {
    return "destructive";
  }

  return "outline";
}

function cellAddress(cellKey: string) {
  const position = parseCellKey(cellKey);

  if (!position) {
    return cellKey;
  }

  return rangeAddress({
    startRowIndex: position.rowIndex,
    startColumnIndex: position.columnIndex,
    endRowIndex: position.rowIndex,
    endColumnIndex: position.columnIndex,
  });
}

function cellPreview(change: WorkbookTrackedChange) {
  if (change.beforeCell?.raw !== change.afterCell?.raw) {
    return `${change.beforeCell?.raw || "blank"} -> ${
      change.afterCell?.raw || "blank"
    }`;
  }

  return change.summary;
}

export function TrackedChangesPanel({
  canReview,
  changes,
  onReviewChange,
  onSelectChange,
}: {
  canReview: boolean;
  changes: WorkbookTrackedChange[];
  onReviewChange: (
    trackedChangeId: string,
    decision: "accepted" | "rejected",
  ) => void;
  onSelectChange: (change: WorkbookTrackedChange) => void;
}) {
  const pendingCount = changes.filter((change) => change.status === "pending")
    .length;

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GitPullRequestArrow className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Tracked changes</h2>
        </div>
        <Badge variant="secondary" className="font-mono">
          {pendingCount}
        </Badge>
      </div>
      {changes.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm leading-6 text-muted-foreground">
          No tracked cell edits yet.
        </p>
      ) : (
        <div className="space-y-2">
          {changes.slice(0, 30).map((change) => (
            <section key={change.id} className="rounded-lg border bg-card p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-medium">
                    {change.sheetName} {cellAddress(change.cellKey)}
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground">
                    {formatChangeDate(change.createdAt)}
                  </p>
                </div>
                <Badge variant={statusVariant(change.status)} className="capitalize">
                  {change.status}
                </Badge>
              </div>
              <p className="truncate text-sm">{cellPreview(change)}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {change.actorName} / {change.actorEmail}
              </p>
              {change.reviewedAt ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  Reviewed by {change.reviewedByName ?? "Workbook owner"}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectChange(change)}
                >
                  <MapPin />
                  Select
                </Button>
                {change.status === "pending" ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={!canReview}
                      onClick={() => onReviewChange(change.id, "accepted")}
                    >
                      <Check />
                      Accept
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={!canReview}
                      onClick={() => onReviewChange(change.id, "rejected")}
                    >
                      <X />
                      Reject
                    </Button>
                  </>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
