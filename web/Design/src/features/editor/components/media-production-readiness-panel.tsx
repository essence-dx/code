"use client";

import { CheckCircle2, CircleAlert, ShieldAlert, Volume2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  MediaProductionReadinessReport,
  MediaProductionReadinessStatus,
} from "@/features/editor/media-production-readiness";
import { cn } from "@/lib/utils";

type MediaProductionReadinessPanelProps = {
  report: MediaProductionReadinessReport;
  canApplyAudioDucking: boolean;
  onApplyAudioDucking: () => void;
};

export function MediaProductionReadinessPanel({
  report,
  canApplyAudioDucking,
  onApplyAudioDucking,
}: MediaProductionReadinessPanelProps) {
  return (
    <section className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xs font-semibold text-foreground">
              Production readiness
            </h3>
            <Badge variant={statusBadgeVariant(report.status)}>
              {statusLabel(report.status)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {report.score}/100 with {report.counts.videos} video,{" "}
            {report.counts.audio} audio, and{" "}
            {formatSeconds(report.counts.timelineDurationSeconds)} timeline.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="rounded-md border border-border px-2 py-1 text-xs font-semibold">
            {report.score}
          </div>
          <ReadinessIcon status={report.status} />
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {report.checks.map((check) => (
          <div
            key={check.id}
            className="rounded-md border border-border/70 bg-muted/30 p-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  {check.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {check.detail}
                </p>
              </div>
              <Badge
                variant={statusBadgeVariant(check.status)}
                className="shrink-0"
              >
                {statusLabel(check.status)}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {check.action}
            </p>
          </div>
        ))}
      </div>

      {report.needsAudioDucking ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="mt-3 w-full"
          onClick={onApplyAudioDucking}
          disabled={!canApplyAudioDucking}
        >
          <Volume2 className="h-3.5 w-3.5" />
          Apply ducking
        </Button>
      ) : null}
    </section>
  );
}

function ReadinessIcon({ status }: { status: MediaProductionReadinessStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}

function statusBadgeVariant(status: MediaProductionReadinessStatus) {
  if (status === "ready") return "secondary";
  if (status === "review") return "outline";

  return "destructive";
}

function statusLabel(status: MediaProductionReadinessStatus) {
  if (status === "ready") return "Ready";
  if (status === "review") return "Review";

  return "Blocked";
}

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
