"use client";

import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getLayerHandoffChecklist } from "@/features/editor/layer-handoff-checklist";
import type {
  DesignComment,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";
import { cn } from "@/lib/utils";

type LayerHandoffChecklistSectionProps = {
  layer: DesignLayer;
  pages: DesignPage[];
  variables: Record<string, string>;
  comments: DesignComment[];
};

export function LayerHandoffChecklistSection({
  layer,
  pages,
  variables,
  comments,
}: LayerHandoffChecklistSectionProps) {
  const checklist = useMemo(
    () => getLayerHandoffChecklist({ layer, pages, variables, comments }),
    [layer, pages, variables, comments],
  );

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/50 p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Inspect checklist
          </div>
          <div className="mt-1 text-muted-foreground">
            {checklist.passCount} passed / {checklist.reviewCount} review /{" "}
            {checklist.missingCount} blocked
          </div>
        </div>
        <Badge
          variant={checklist.missingCount > 0 ? "destructive" : "secondary"}
          className="shrink-0"
        >
          {checklist.score}% {checklist.label}
        </Badge>
      </div>
      <div className="space-y-1.5">
        {checklist.items.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-md border border-border bg-card px-2 py-1.5"
          >
            <StatusIcon status={item.status} />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate font-medium text-foreground">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-[10px] font-medium uppercase tracking-wide",
                    item.status === "pass" && "text-emerald-600",
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

function StatusIcon({
  status,
}: {
  status: "pass" | "review" | "missing";
}) {
  const className = cn(
    "mt-0.5 size-3.5",
    status === "pass" && "text-emerald-600",
    status === "review" && "text-amber-600",
    status === "missing" && "text-destructive",
  );

  if (status === "pass") {
    return <CheckCircle2 className={className} />;
  }

  if (status === "missing") {
    return <AlertTriangle className={className} />;
  }

  return <CircleDashed className={className} />;
}
