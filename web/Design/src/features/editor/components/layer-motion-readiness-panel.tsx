"use client";

import { Clapperboard } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type {
  LayerMotionReadinessReport,
  LayerMotionReadinessStatus,
} from "@/features/editor/layer-motion-advanced";

type LayerMotionReadinessPanelProps = {
  report: LayerMotionReadinessReport;
};

export function LayerMotionReadinessPanel({
  report,
}: LayerMotionReadinessPanelProps) {
  return (
    <section className="rounded-md border border-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-xs font-semibold">
            <Clapperboard className="h-4 w-4" />
            Motion export readiness
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Layer animation packs, keyframes, groups, and GIF/MP4 diagnostics.
          </p>
        </div>
        <Badge variant={getVariant(report.status)}>{report.score}/100</Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {report.checks.map((check) => (
          <div
            key={check.id}
            className="rounded-md border border-border bg-muted/20 p-2"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">{check.label}</p>
              <Badge variant={getVariant(check.status)}>
                {getStatusLabel(check.status)}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {check.detail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function getVariant(
  status: LayerMotionReadinessStatus,
): "secondary" | "outline" | "destructive" {
  if (status === "ready") return "secondary";
  if (status === "attention") return "outline";

  return "destructive";
}

function getStatusLabel(status: LayerMotionReadinessStatus) {
  if (status === "ready") return "Ready";
  if (status === "attention") return "Review";

  return "Blocked";
}
