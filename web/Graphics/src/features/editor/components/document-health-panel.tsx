"use client";

import { CheckCircle2, MousePointer2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  DocumentHealthCheck,
  DocumentHealthReport,
  DocumentHealthStatus,
} from "@/features/editor/document-health";
import { cn } from "@/lib/utils";

type DocumentHealthPanelProps = {
  report: DocumentHealthReport;
  onSelectLayers: (layerIds: string[]) => void;
  onMarkReadyLayers: (layerIds: string[]) => void;
  onClearPrototypeLinks: (layerIds: string[]) => void;
  onResolveComments: (commentIds: string[]) => void;
};

export function DocumentHealthPanel({
  report,
  onSelectLayers,
  onMarkReadyLayers,
  onClearPrototypeLinks,
  onResolveComments,
}: DocumentHealthPanelProps) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ShieldAlert className="size-3.5" />
            Document health
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            Accessibility, review, prototype, handoff, and library readiness.
          </div>
        </div>
        <Badge variant={report.status === "critical" ? "destructive" : "secondary"}>
          {report.score}
        </Badge>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5 font-mono text-[10px] text-muted-foreground">
        <HealthMetric label="Pass" value={report.passCount} />
        <HealthMetric label="Warn" value={report.warningCount} />
        <HealthMetric label="Stop" value={report.criticalCount} />
      </div>

      <div className="mt-2 space-y-1.5">
        {report.checks.map((check) => (
          <HealthCheckRow
            key={check.id}
            check={check}
            onSelectLayers={onSelectLayers}
            onMarkReadyLayers={onMarkReadyLayers}
            onClearPrototypeLinks={onClearPrototypeLinks}
            onResolveComments={onResolveComments}
          />
        ))}
      </div>
    </div>
  );
}

function HealthCheckRow({
  check,
  onSelectLayers,
  onMarkReadyLayers,
  onClearPrototypeLinks,
  onResolveComments,
}: {
  check: DocumentHealthCheck;
  onSelectLayers: (layerIds: string[]) => void;
  onMarkReadyLayers: (layerIds: string[]) => void;
  onClearPrototypeLinks: (layerIds: string[]) => void;
  onResolveComments: (commentIds: string[]) => void;
}) {
  const hasLayerTargets = Boolean(check.layerIds?.length);
  const hasFixAction =
    (check.fixAction === "mark-ready" && hasLayerTargets) ||
    (check.fixAction === "clear-prototype" && hasLayerTargets) ||
    (check.fixAction === "resolve-comments" && check.commentIds?.length);

  return (
    <div className="rounded-sm border border-border/70 bg-muted/20 p-2">
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
            check.status === "pass" && "bg-emerald-500/15 text-emerald-500",
            check.status === "warning" && "bg-primary/15 text-primary",
            check.status === "critical" &&
              "bg-destructive/15 text-destructive",
          )}
        >
          <CheckCircle2 className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-xs font-medium">
              {check.label}
            </span>
            <StatusBadge status={check.status} />
          </div>
          <div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
            {check.detail}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {hasFixAction ? (
            <Button
              type="button"
              size="xs"
              variant="secondary"
              onClick={() => {
                if (check.fixAction === "mark-ready") {
                  onMarkReadyLayers(check.layerIds ?? []);
                }

                if (check.fixAction === "clear-prototype") {
                  onClearPrototypeLinks(check.layerIds ?? []);
                }

                if (check.fixAction === "resolve-comments") {
                  onResolveComments(check.commentIds ?? []);
                }
              }}
            >
              {check.fixLabel ?? "Fix"}
            </Button>
          ) : null}
          {hasLayerTargets ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label={`Select ${check.label} layers`}
              onClick={() => onSelectLayers(check.layerIds ?? [])}
            >
              <MousePointer2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DocumentHealthStatus }) {
  if (status === "critical") {
    return <Badge variant="destructive">Fix</Badge>;
  }

  if (status === "warning") {
    return <Badge variant="outline">Review</Badge>;
  }

  return <Badge variant="secondary">Ready</Badge>;
}

function HealthMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm bg-muted/40 p-1.5">
      <div>{label}</div>
      <div className="text-foreground">{value}</div>
    </div>
  );
}
