"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  staleReviewPackageStatusLabel,
  type StaleReviewPackageItemStatus,
  type StaleReviewPackageReport,
  type StaleReviewPackageStatus,
} from "@/lib/projects/stale-review-package";

export function StaleReviewPackagePanel({ report }: { report: StaleReviewPackageReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-muted-foreground" />
            Review freshness
          </span>
          <Badge variant={freshnessBadgeVariant(report.status)}>
            {report.currentCount} current / {report.reviewCount} review / {report.staleCount} stale
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {report.status === "stale"
            ? "Some release proof changed after this review package was created. Refresh the review package before final handoff."
            : report.status === "review"
              ? "Some review proof is missing freshness evidence. Complete the evidence before final handoff."
              : "Review evidence is current against this package creation time."}
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          {report.items.map((item) => (
            <div key={item.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium">{item.label}</div>
                <Badge variant={freshnessBadgeVariant(item.status)}>{staleReviewPackageStatusLabel(item.status)}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
              {item.evidenceAt ? <div className="mt-2 text-xs text-muted-foreground">Evidence: {formatFreshnessTime(item.evidenceAt)}</div> : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function freshnessBadgeVariant(status: StaleReviewPackageStatus | StaleReviewPackageItemStatus) {
  if (status === "stale") return "destructive";
  if (status === "review") return "secondary";
  return "outline";
}

function formatFreshnessTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString();
}
