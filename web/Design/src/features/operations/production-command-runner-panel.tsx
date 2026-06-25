"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  ListChecks,
  PlayCircle,
  RotateCcw,
  ShieldAlert,
  SquareTerminal,
} from "lucide-react";
import type { ReactNode } from "react";

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
  ProductionCommand,
  ProductionCommandBatch,
  ProductionCommandRunnerCenter,
  ProductionCommandRunnerStatus,
} from "@/features/operations/production-command-runner";
import { cn } from "@/lib/utils";

type ProductionCommandRunnerPanelProps = {
  center: ProductionCommandRunnerCenter;
};

const statusLabels: Record<ProductionCommandRunnerStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  ProductionCommandRunnerStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function ProductionCommandRunnerPanel({
  center,
}: ProductionCommandRunnerPanelProps) {
  const primaryReport = center.executionReports[0];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <SquareTerminal className="h-5 w-5" />
              Production command runner
            </CardTitle>
            <CardDescription>
              Deterministic staged commands for policy, release, automation,
              backup, marketplace, and admin operations with dry-run/apply plans
              and rollback evidence.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.commands.toLocaleString()} commands
            </Badge>
            {primaryReport ? (
              <Button asChild size="sm" variant="outline">
                <a
                  download={primaryReport.download.fileName}
                  href={primaryReport.download.href}
                >
                  <Download className="h-4 w-4" />
                  Report
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Batches" value={center.totals.batches} />
          <Metric label="Dry-runs" value={center.totals.dryRunCommands} />
          <Metric
            label="Apply-ready"
            value={center.totals.applyReadyCommands}
          />
          <Metric label="Blocked" value={center.totals.blockedCommands} />
          <Metric label="Rollback notes" value={center.totals.rollbackNotes} />
          <Metric label="Evidence" value={center.totals.auditEvidenceLinks} />
        </div>

        {center.batches.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {center.batches.map((batch) => (
              <CommandBatchCard key={batch.id} batch={batch} />
            ))}
          </div>
        ) : (
          <EmptyLine>No staged production commands are pending.</EmptyLine>
        )}

        {center.commands.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              Command queue
            </div>
            <div className="mt-3 grid gap-2 xl:grid-cols-2">
              {center.commands.slice(0, 8).map((command) => (
                <CommandRow key={command.id} command={command} />
              ))}
            </div>
          </section>
        ) : null}

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Runner next actions
            </div>
            <div className="mt-2 grid gap-2">
              {center.nextActions.map((action) => (
                <p
                  key={action}
                  className="flex gap-2 text-xs text-muted-foreground"
                >
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{action}</span>
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CommandBatchCard({ batch }: { batch: ProductionCommandBatch }) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <StatusIcon status={batch.status} />
            <span className="truncate">{batch.title}</span>
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {batch.commands.length} command
            {batch.commands.length === 1 ? "" : "s"} in {batch.mode} mode.
          </p>
        </div>
        <Badge variant={statusVariants[batch.status]}>
          {statusLabels[batch.status]}
        </Badge>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <PlanBlock
          icon={<ListChecks className="h-3.5 w-3.5" />}
          title="Dry-run plan"
          items={batch.dryRunPlan}
        />
        <PlanBlock
          icon={<PlayCircle className="h-3.5 w-3.5" />}
          title="Apply plan"
          items={batch.applyPlan}
        />
      </div>

      <div className="mt-3 rounded-md border border-border bg-background p-3">
        <p className="flex items-center gap-2 text-xs font-semibold">
          <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
          Rollback notes
        </p>
        <div className="mt-2 grid gap-1">
          {batch.rollbackNotes.slice(0, 2).map((note) => (
            <p key={note} className="text-xs text-muted-foreground">
              {note}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

function CommandRow({ command }: { command: ProductionCommand }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <StatusIcon status={command.status} />
            <span className="truncate">{command.title}</span>
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {command.detail}
          </p>
        </div>
        <Badge variant={statusVariants[command.status]} className="shrink-0">
          {command.mode}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline">{command.area}</Badge>
        <Badge variant="outline">{command.phase}</Badge>
        <Badge variant="outline">{command.risk} risk</Badge>
        <Badge variant="outline">
          {command.auditEvidence.auditLogIds.length +
            command.auditEvidence.packetIds.length}{" "}
          evidence
        </Badge>
      </div>
    </div>
  );
}

function PlanBlock({
  icon,
  items,
  title,
}: {
  icon: ReactNode;
  items: string[];
  title: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="flex items-center gap-2 text-xs font-semibold">
        {icon}
        {title}
      </p>
      <div className="mt-2 grid gap-1">
        {items.slice(0, 3).map((item) => (
          <p key={item} className="line-clamp-2 text-xs text-muted-foreground">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <SquareTerminal className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function StatusIcon({ status }: { status: ProductionCommandRunnerStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}
