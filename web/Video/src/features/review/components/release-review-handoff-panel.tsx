"use client";

import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReleaseReviewHandoffComparison, ReleaseReviewHandoffStatus } from "@/lib/projects/release-review-handoff";

export function ReleaseReviewHandoffPanel({ comparison }: { comparison: ReleaseReviewHandoffComparison }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-muted-foreground" />
            Release Handoff
          </span>
          <Badge variant={handoffBadgeVariant(comparison.status)}>
            {comparison.matchCount} match / {comparison.attentionCount} review / {comparison.mismatchCount} mismatch
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {comparison.status === "match"
            ? "The shared review proof matches the latest local release and desktop evidence."
            : "Refresh the review proof before sharing when release or desktop evidence has moved ahead."}
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          {comparison.items.map((item) => (
            <div key={item.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium">{item.label}</div>
                <Badge variant={handoffBadgeVariant(item.status)}>{handoffStatusLabel(item.status)}</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function handoffBadgeVariant(status: ReleaseReviewHandoffStatus) {
  if (status === "mismatch") return "destructive";
  if (status === "attention") return "secondary";
  return "outline";
}

function handoffStatusLabel(status: ReleaseReviewHandoffStatus) {
  if (status === "mismatch") return "Mismatch";
  if (status === "attention") return "Review";
  return "Match";
}
