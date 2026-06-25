"use client";

import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ComponentUsageAnalytics } from "@/features/editor/component-analytics";
import {
  getComponentDocumentationReadiness,
  type ComponentDocumentationStatus,
} from "@/features/editor/component-documentation-readiness";
import type { DesignComponent } from "@/features/editor/types";
import { cn } from "@/lib/utils";

type ComponentDocumentationReadinessSectionProps = {
  component: DesignComponent;
  analytics?: ComponentUsageAnalytics;
};

export function ComponentDocumentationReadinessSection({
  component,
  analytics,
}: ComponentDocumentationReadinessSectionProps) {
  const readiness = getComponentDocumentationReadiness(component, analytics);

  return (
    <div className="mt-2 space-y-2 rounded-sm border border-border/70 bg-muted/20 p-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Documentation readiness
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {readiness.readyCount} ready / {readiness.reviewCount} review /{" "}
            {readiness.missingCount} missing
          </div>
        </div>
        <Badge
          variant={readiness.missingCount > 0 ? "destructive" : "secondary"}
          className="shrink-0"
        >
          {readiness.score}% {readiness.label}
        </Badge>
      </div>
      <div className="grid gap-1.5">
        {readiness.items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-sm bg-background px-2 py-1.5"
          >
            <ReadinessIcon status={item.status} />
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-foreground">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-[10px] font-medium uppercase tracking-wide",
                    item.status === "ready" && "text-emerald-600",
                    item.status === "review" && "text-amber-600",
                    item.status === "missing" && "text-destructive",
                  )}
                >
                  {item.status}
                </span>
              </div>
              <div className="line-clamp-2 text-muted-foreground">
                {item.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadinessIcon({ status }: { status: ComponentDocumentationStatus }) {
  const className = cn(
    "mt-0.5 size-3.5",
    status === "ready" && "text-emerald-600",
    status === "review" && "text-amber-600",
    status === "missing" && "text-destructive",
  );

  if (status === "ready") {
    return <CheckCircle2 className={className} />;
  }

  if (status === "missing") {
    return <AlertTriangle className={className} />;
  }

  return <CircleDashed className={className} />;
}
