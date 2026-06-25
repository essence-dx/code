"use client";

import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  ComponentVariableBindingIssue,
  ComponentVariableBindingReview,
} from "@/features/editor/component-variable-binding-review";

type ComponentVariableBindingReviewSectionProps = {
  review: ComponentVariableBindingReview;
  onRemoveStaleBindings: (issueCount: number) => void;
};

export function ComponentVariableBindingReviewSection({
  review,
  onRemoveStaleBindings,
}: ComponentVariableBindingReviewSectionProps) {
  if (review.bindingCount === 0) {
    return null;
  }

  if (review.issueCount === 0) {
    return (
      <section className="rounded-md border border-border bg-background p-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          <ShieldCheck className="size-3.5 text-emerald-300" />
          Variable bindings
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {review.readyBindingCount} component source bindings are valid.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-2 rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium">
            <ShieldAlert className="size-3.5 text-amber-300" />
            Variable bindings
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {review.issueCount} stale component source binding
            {review.issueCount === 1 ? "" : "s"} need cleanup.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 shrink-0 px-2 text-xs"
          onClick={() => onRemoveStaleBindings(review.issueCount)}
        >
          Clean
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <BindingMetric label="Ready" value={review.readyBindingCount} />
        <BindingMetric label="Missing" value={review.missingVariableCount} />
        <BindingMetric label="Type" value={review.typeMismatchCount} />
      </div>
      <div className="space-y-1.5">
        {review.issues.slice(0, 4).map((issue) => (
          <BindingIssueRow key={issue.id} issue={issue} />
        ))}
      </div>
    </section>
  );
}

function BindingMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card px-2 py-1.5">
      <div className="truncate text-[10px] text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  );
}

function BindingIssueRow({ issue }: { issue: ComponentVariableBindingIssue }) {
  return (
    <div className="rounded-md border border-border bg-card p-2 text-xs">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="truncate font-medium">{issue.layerName}</span>
        <Badge variant="outline">{issue.type.replaceAll("-", " ")}</Badge>
      </div>
      <div className="mt-1 truncate text-muted-foreground">
        {issue.propertyLabel} / {issue.detail}
      </div>
      <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
        {issue.componentName} / {issue.variableId}
      </div>
    </div>
  );
}
