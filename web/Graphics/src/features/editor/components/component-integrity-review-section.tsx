"use client";

import { Download, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";
import {
  getComponentIntegrityCsv,
  type ComponentIntegrityReview,
  type ComponentIntegrityIssue,
} from "@/features/editor/component-integrity-review";

type ComponentIntegrityReviewSectionProps = {
  review: ComponentIntegrityReview;
  repairableReferenceCount: number;
  onRepairActivePageReferences: () => void;
};

export function ComponentIntegrityReviewSection({
  review,
  repairableReferenceCount,
  onRepairActivePageReferences,
}: ComponentIntegrityReviewSectionProps) {
  if (review.issueCount === 0) {
    return (
      <section className="rounded-md border border-border bg-background p-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          <ShieldCheck className="size-3.5 text-emerald-300" />
          Component integrity
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Component sources and instance references are consistent.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-2 rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium">
            <TriangleAlert className="size-3.5 text-amber-300" />
            Component integrity
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {review.issueCount} items need review before library handoff.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 shrink-0 px-2 text-xs"
          onClick={() =>
            downloadTextFile({
              content: getComponentIntegrityCsv(review),
              filename: "component-integrity-review.csv",
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
        disabled={repairableReferenceCount === 0}
        onClick={onRepairActivePageReferences}
      >
        Repair active-page refs
        {repairableReferenceCount > 0 ? ` (${repairableReferenceCount})` : ""}
      </Button>
      <div className="grid grid-cols-4 gap-1.5">
        <IntegrityMetric label="Unused" value={review.unusedComponentCount} />
        <IntegrityMetric label="Empty" value={review.emptySourceCount} />
        <IntegrityMetric
          label="Missing"
          value={review.missingComponentReferenceCount}
        />
        <IntegrityMetric
          label="Variants"
          value={review.missingVariantReferenceCount}
        />
      </div>
      <div className="space-y-1.5">
        {review.issues.slice(0, 4).map((issue) => (
          <IntegrityIssueRow key={issue.id} issue={issue} />
        ))}
      </div>
    </section>
  );
}

function IntegrityMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card px-2 py-1.5">
      <div className="truncate text-[10px] text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}

function IntegrityIssueRow({ issue }: { issue: ComponentIntegrityIssue }) {
  return (
    <div className="rounded-md border border-border bg-card p-2 text-xs">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate font-medium">
          {issue.layerName ?? issue.componentName}
        </span>
        <Badge variant={issue.severity === "review" ? "destructive" : "outline"}>
          {issue.type.replaceAll("-", " ")}
        </Badge>
      </div>
      <div className="mt-1 truncate text-muted-foreground">{issue.detail}</div>
      {issue.pageName ? (
        <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
          {issue.pageName} / {issue.componentName}
        </div>
      ) : null}
    </div>
  );
}
