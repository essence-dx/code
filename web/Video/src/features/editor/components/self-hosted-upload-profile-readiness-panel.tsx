"use client";

import { Badge } from "@/components/ui/badge";
import type { SelfHostedUploadProfileReadinessReport, SelfHostedUploadProfileReadinessStatus } from "@/lib/media/self-hosted-upload-profile-readiness";

type SelfHostedUploadProfileReadinessPanelProps = {
  report: SelfHostedUploadProfileReadinessReport | null;
};

export function SelfHostedUploadProfileReadinessPanel({ report }: SelfHostedUploadProfileReadinessPanelProps) {
  if (!report) return null;

  return (
    <div className="grid gap-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">Profile readiness</div>
          <div className="truncate text-xs text-muted-foreground">{report.probeUrl}</div>
        </div>
        <Badge variant={readinessBadgeVariant(report.status)}>{readinessStatusLabel(report.status)}</Badge>
      </div>
      <div className="grid gap-2">
        {report.steps.map((step) => (
          <div key={step.id} className="rounded-md bg-muted/40 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-xs font-medium">{step.label}</span>
              <Badge variant={readinessBadgeVariant(step.status)}>{readinessStatusLabel(step.status)}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function readinessBadgeVariant(status: SelfHostedUploadProfileReadinessStatus) {
  if (status === "ready") return "default";
  if (status === "failed") return "destructive";
  return "outline";
}

function readinessStatusLabel(status: SelfHostedUploadProfileReadinessStatus) {
  if (status === "ready") return "Ready";
  if (status === "failed") return "Failed";
  return "Limited";
}
