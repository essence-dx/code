"use client";

import { GitCompareArrows } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChangeSummary } from "@/features/editor/version-compare";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getVersionCompareReview,
  getVersionCompareReviewCsv,
  getVersionCompareReviewMarkdown,
  type VersionCompareReview,
} from "@/features/editor/version-compare-review";
import type { DesignFileVersionSummary } from "@/features/files/actions";
import type { DesignDocument } from "@/features/editor/types";
import { cn } from "@/lib/utils";

type VersionCompareDialogProps = {
  currentDocument: DesignDocument;
  version: DesignFileVersionSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecordActivity?: (label: string, detail?: string) => void;
};

export function VersionCompareDialog({
  currentDocument,
  version,
  open,
  onOpenChange,
  onRecordActivity,
}: VersionCompareDialogProps) {
  const review = useMemo(
    () =>
      version
        ? getVersionCompareReview(currentDocument, version.document)
        : null,
    [currentDocument, version],
  );
  const comparison = review?.comparison ?? null;

  function exportCsv() {
    if (!review || !version) {
      return;
    }

    downloadTextFile({
      content: getVersionCompareReviewCsv(review),
      filename: `version-compare-${toFilename(version.name)}.csv`,
      type: "text/csv;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported version compare CSV",
      `${review.totalChangeCount} changes`,
    );
  }

  function exportMarkdown() {
    if (!review || !version) {
      return;
    }

    downloadTextFile({
      content: getVersionCompareReviewMarkdown(review, version.name),
      filename: `version-compare-${toFilename(version.name)}.md`,
      type: "text/markdown;charset=utf-8",
    });
    onRecordActivity?.(
      "Exported version compare handoff",
      `${review.totalChangeCount} changes`,
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompareArrows className="size-4" />
            Compare version
          </DialogTitle>
          <DialogDescription>
            {version
              ? `${version.name} from ${formatDate(version.createdAt)}`
              : "Choose a named version to compare."}
          </DialogDescription>
        </DialogHeader>

        {comparison && review ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-[11px] text-muted-foreground">
                Current / named version
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-xs"
                  onClick={exportCsv}
                >
                  CSV
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2 text-xs"
                  onClick={exportMarkdown}
                >
                  MD
                </Button>
              </div>
            </div>
            <VersionCompareReviewSummary review={review} />
            <div className="grid grid-cols-4 gap-2">
              {comparison.metrics.map((metric) => (
                <div
                  key={metric.id}
                  className="rounded-md border border-border bg-background p-2"
                >
                  <div className="text-[11px] text-muted-foreground">
                    {metric.label}
                  </div>
                  <div className="mt-1 font-mono text-sm">
                    {metric.current}
                    <span className="mx-1 text-muted-foreground">/</span>
                    <span className="text-muted-foreground">
                      {metric.previous}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <ScrollArea className="h-[360px] rounded-md border border-border">
              <div className="space-y-4 p-3">
                <ChangeSection
                  title="Layers"
                  emptyLabel="No layer changes."
                  changes={comparison.layerChanges}
                />
                <ChangeSection
                  title="Components"
                  emptyLabel="No component changes."
                  changes={comparison.componentChanges}
                />
              </div>
            </ScrollArea>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function VersionCompareReviewSummary({
  review,
}: {
  review: VersionCompareReview;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            Compare risk
            <Badge variant={review.risk === "high" ? "destructive" : "secondary"}>
              {review.risk}
            </Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {review.summary}
          </div>
        </div>
        <div className="shrink-0 font-mono text-sm">
          {review.totalChangeCount}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px] text-muted-foreground">
        <ReviewMetric label="Layout" value={review.layoutChangeCount} />
        <ReviewMetric label="System" value={review.designSystemChangeCount} />
        <ReviewMetric label="Inspect" value={review.handoffChangeCount} />
      </div>
    </div>
  );
}

function ReviewMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/40 p-1.5">
      <div>{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}

function ChangeSection({
  title,
  emptyLabel,
  changes,
}: {
  title: string;
  emptyLabel: string;
  changes: ChangeSummary[];
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        <span className="font-mono text-[11px] text-muted-foreground">
          {changes.length}
        </span>
      </div>
      {changes.length > 0 ? (
        <div className="space-y-2">
          {changes.slice(0, 24).map((change) => (
            <div
              key={change.id}
              className="rounded-md border border-border bg-background p-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase",
                    change.status === "added" &&
                      "bg-emerald-500/15 text-emerald-300",
                    change.status === "removed" &&
                      "bg-destructive/15 text-destructive",
                    change.status === "changed" && "bg-primary/15 text-primary",
                  )}
                >
                  {change.status}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {change.name}
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {change.details.slice(0, 4).map((detail) => (
                  <div
                    key={detail}
                    className="truncate font-mono text-[11px] text-muted-foreground"
                  >
                    {detail}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {changes.length > 24 ? (
            <div className="text-xs text-muted-foreground">
              +{changes.length - 24} more changes
            </div>
          ) : null}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      )}
    </section>
  );
}

function toFilename(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "version"
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
