"use client";

import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleAlert,
  Download,
  History,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AutomationRunHistoryCenter,
  AutomationRunHistoryItem,
  AutomationRunHistoryStatus,
  AutomationRunStatus,
} from "@/features/automation/automation-run-history";
import { toPlannerDatetimeLocalInputValue } from "@/features/content-planner/content-calendar";
import { cn } from "@/lib/utils";

type ServerAction = (formData: FormData) => Promise<void> | void;
type AutomationDisplayStatus = AutomationRunHistoryStatus | AutomationRunStatus;

type AutomationRunHistoryPanelProps = {
  center: AutomationRunHistoryCenter;
  applyRecipeAction: ServerAction;
};

const statusLabels: Record<AutomationDisplayStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
  failed: "Failed",
};

const statusVariants: Record<
  AutomationDisplayStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
  failed: "destructive",
};

export function AutomationRunHistoryPanel({
  center,
  applyRecipeAction,
}: AutomationRunHistoryPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Automation run history
            </CardTitle>
            <CardDescription>
              Audit-backed automation runs, retry readiness, failure
              diagnostics, schedule visibility, and downloadable recovery
              packets.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.retryableRuns.toLocaleString()} retryable
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Runs" value={center.totals.runs} />
          <Metric label="Failed" value={center.totals.failedRuns} />
          <Metric label="Review" value={center.totals.reviewRuns} />
          <Metric label="Retryable" value={center.totals.retryableRuns} />
          <Metric label="Schedules" value={center.totals.scheduledItems} />
          <Metric label="Packets" value={center.totals.recoveryPackets} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {center.runs.length ? (
            center.runs.map((run) => (
              <AutomationRunCard
                key={run.id}
                run={run}
                applyRecipeAction={applyRecipeAction}
              />
            ))
          ) : (
            <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground xl:col-span-2">
              No automation runs have been recorded in the workspace audit log
              yet.
            </p>
          )}
        </div>

        {center.recoveryPackets.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              Recovery packets
            </div>
            <div className="mt-2 grid gap-2 xl:grid-cols-2">
              {center.recoveryPackets.slice(0, 4).map((packet) => (
                <div
                  key={packet.id}
                  className="rounded-md border border-border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {packet.summary}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {packet.diagnostics.length} diagnostics /{" "}
                        {packet.auditLogIds.length} audit logs
                      </p>
                    </div>
                    <Badge variant={statusVariants[packet.status]}>
                      {statusLabels[packet.status]}
                    </Badge>
                  </div>
                  <Button asChild size="sm" variant="outline" className="mt-3">
                    <a
                      href={packet.download.href}
                      download={packet.download.fileName}
                    >
                      <Download className="h-4 w-4" />
                      Packet
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AutomationRunCard({
  run,
  applyRecipeAction,
}: {
  run: AutomationRunHistoryItem;
  applyRecipeAction: ServerAction;
}) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <StatusIcon status={run.status} />
            <span className="truncate">{run.recipeTitle}</span>
          </h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {run.summary}
          </p>
        </div>
        <Badge variant={statusVariants[run.status]}>
          {statusLabels[run.status]}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{run.ownerEmail ?? "Workspace"}</Badge>
        <Badge variant="outline">{run.createdCount} created</Badge>
        <Badge variant={run.retry.available ? "outline" : "secondary"}>
          {run.retry.available ? "Retry available" : "No retry"}
        </Badge>
      </div>

      {run.diagnostics.length ? (
        <div className="mt-3 grid gap-1">
          {run.diagnostics.slice(0, 3).map((diagnostic) => (
            <p
              key={diagnostic.id}
              className="flex gap-2 text-xs text-muted-foreground"
            >
              <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{diagnostic.detail}</span>
            </p>
          ))}
        </div>
      ) : null}

      {run.scheduleVisibility.length ? (
        <div className="mt-3 rounded-md border border-border bg-background p-2">
          <p className="text-xs font-medium">Schedule visibility</p>
          <div className="mt-1 grid gap-1">
            {run.scheduleVisibility.slice(0, 3).map((item) => (
              <p key={item.id} className="text-xs text-muted-foreground">
                {item.title} / {item.channel} / {item.status}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {run.retry.available && run.retry.recipeId && run.retry.targetId ? (
        <form action={applyRecipeAction} className="mt-3 flex justify-end">
          <input type="hidden" name="recipeId" value={run.retry.recipeId} />
          <input type="hidden" name="targetId" value={run.retry.targetId} />
          <input
            type="hidden"
            name="startAt"
            value={toPlannerDatetimeLocalInputValue(
              run.retry.scheduledFor ?? run.createdAt,
            )}
          />
          <input
            type="hidden"
            name="cadenceDays"
            value={run.retry.cadenceDays ?? ""}
          />
          <Button type="submit" size="sm" variant="outline">
            <RotateCcw className="h-4 w-4" />
            Retry
          </Button>
        </form>
      ) : null}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Bot className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: AutomationRunStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "failed",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "failed") return <ShieldAlert className={className} />;

  return <CircleAlert className={className} />;
}
