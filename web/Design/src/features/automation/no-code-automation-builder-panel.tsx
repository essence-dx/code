"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  FileJson,
  GitBranch,
  ListChecks,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  Workflow,
  XCircle,
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
  NoCodeAutomationAction,
  NoCodeAutomationBuilderCenter,
  NoCodeAutomationBuilderFlow,
  NoCodeAutomationBuilderStatus,
  NoCodeAutomationCondition,
} from "@/features/automation/no-code-automation-builder";
import { cn } from "@/lib/utils";

type NoCodeAutomationBuilderPanelProps = {
  center: NoCodeAutomationBuilderCenter;
};

const statusLabels: Record<NoCodeAutomationBuilderStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  NoCodeAutomationBuilderStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function NoCodeAutomationBuilderPanel({
  center,
}: NoCodeAutomationBuilderPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              No-code automation builder
            </CardTitle>
            <CardDescription>
              Typed triggers, conditions, actions, dry-runs, rollback notes, and
              audit-backed execution plans for recipe and workflow rollout.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.executionPlans.toLocaleString()} plans
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="Flows" value={center.totals.flows} />
          <Metric label="Recipes" value={center.totals.recipeFlows} />
          <Metric label="Templates" value={center.totals.templateFlows} />
          <Metric label="Triggers" value={center.totals.typedTriggers} />
          <Metric label="Conditions" value={center.totals.typedConditions} />
          <Metric label="Actions" value={center.totals.typedActions} />
          <Metric label="Dry-runs" value={center.totals.dryRuns} />
          <Metric label="Rollback" value={center.totals.rollbackNotes} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <PanelBlock
            badge={`${center.totals.blockedFlows} blocked / ${center.totals.reviewFlows} review`}
            title="Builder flows"
          >
            {center.flows.map((flow) => (
              <BuilderFlowCard flow={flow} key={flow.id} />
            ))}
          </PanelBlock>

          <div className="space-y-4">
            <PanelBlock
              badge={`${center.totals.auditEvidence} audit events`}
              title="Execution packets"
            >
              {center.flows.slice(0, 5).map((flow) => (
                <ExecutionPlanRow flow={flow} key={flow.executionPlan.id} />
              ))}
            </PanelBlock>

            {center.nextActions.length ? (
              <PanelBlock
                badge={`${center.nextActions.length} actions`}
                title="Builder next actions"
              >
                {center.nextActions.map((action) => (
                  <p
                    className="flex gap-2 text-xs text-muted-foreground"
                    key={action}
                  >
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{action}</span>
                  </p>
                ))}
              </PanelBlock>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BuilderFlowCard({ flow }: { flow: NoCodeAutomationBuilderFlow }) {
  const visibleConditions = flow.conditions.slice(0, 4);
  const visibleActions = flow.actions.slice(0, 4);

  return (
    <article className="rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIcon status={flow.status} />
            <h3 className="truncate text-sm font-semibold">{flow.title}</h3>
            <Badge variant="outline">{flow.sourceKind}</Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {flow.description}
          </p>
        </div>
        <Badge variant={statusVariants[flow.status]}>
          {flow.score}/100 {statusLabels[flow.status]}
        </Badge>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <MiniMetric label="Conditions" value={flow.conditions.length} />
        <MiniMetric label="Actions" value={flow.actions.length} />
        <MiniMetric label="Artifacts" value={flow.dryRun.estimatedArtifacts} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <SectionPreview
          badge={flow.trigger.kind}
          icon={<PlayCircle className="h-4 w-4 text-muted-foreground" />}
          title="Trigger"
        >
          <p className="text-xs font-medium">{flow.trigger.label}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {flow.trigger.detail}
          </p>
        </SectionPreview>

        <SectionPreview
          badge={`${flow.conditions.length} checks`}
          icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
          title="Conditions"
        >
          <div className="grid gap-2">
            {visibleConditions.map((condition) => (
              <ConditionRow condition={condition} key={condition.id} />
            ))}
          </div>
        </SectionPreview>

        <SectionPreview
          badge={`${flow.actions.length} actions`}
          icon={<ListChecks className="h-4 w-4 text-muted-foreground" />}
          title="Actions"
        >
          <div className="grid gap-2">
            {visibleActions.map((action) => (
              <ActionRow action={action} key={action.id} />
            ))}
          </div>
        </SectionPreview>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <SectionPreview
          badge={statusLabels[flow.dryRun.status]}
          icon={<GitBranch className="h-4 w-4 text-muted-foreground" />}
          title="Dry-run"
        >
          <p className="text-xs text-muted-foreground">{flow.dryRun.detail}</p>
          {flow.dryRun.blockedReasons.length ? (
            <div className="mt-2 grid gap-1">
              {flow.dryRun.blockedReasons.slice(0, 2).map((reason) => (
                <p
                  className="flex gap-2 text-xs text-muted-foreground"
                  key={reason}
                >
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                  <span>{reason}</span>
                </p>
              ))}
            </div>
          ) : null}
          {flow.dryRun.warnings.length ? (
            <div className="mt-2 grid gap-1">
              {flow.dryRun.warnings.slice(0, 2).map((warning) => (
                <p
                  className="flex gap-2 text-xs text-muted-foreground"
                  key={warning}
                >
                  <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <span>{warning}</span>
                </p>
              ))}
            </div>
          ) : null}
        </SectionPreview>

        <SectionPreview
          badge={`${flow.rollbackNotes.length} notes`}
          icon={<RotateCcw className="h-4 w-4 text-muted-foreground" />}
          title="Rollback"
        >
          <div className="grid gap-1">
            {flow.rollbackNotes.slice(0, 3).map((note) => (
              <p
                className="flex gap-2 text-xs text-muted-foreground"
                key={note}
              >
                <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{note}</span>
              </p>
            ))}
          </div>
        </SectionPreview>
      </div>
    </article>
  );
}

function ConditionRow({ condition }: { condition: NoCodeAutomationCondition }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium">{condition.label}</p>
        <StatusIcon status={condition.status} />
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {condition.detail}
      </p>
    </div>
  );
}

function ActionRow({ action }: { action: NoCodeAutomationAction }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium">{action.label}</p>
        <Badge variant="outline">{action.kind}</Badge>
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
        {action.detail}
      </p>
    </div>
  );
}

function ExecutionPlanRow({ flow }: { flow: NoCodeAutomationBuilderFlow }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-muted-foreground" />
            <p className="truncate text-sm font-medium">{flow.title}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {flow.conditions.length} conditions / {flow.actions.length} actions
            / {flow.auditEvidenceIds.length} audit links
          </p>
        </div>
        <Badge variant={statusVariants[flow.executionPlan.status]}>
          {statusLabels[flow.executionPlan.status]}
        </Badge>
      </div>
      <Button asChild className="mt-3" size="sm" variant="outline">
        <a
          download={flow.executionPlan.fileName}
          href={flow.executionPlan.dataUrl}
        >
          <Download className="h-4 w-4" />
          Plan
        </a>
      </Button>
    </div>
  );
}

function PanelBlock({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {badge ? <Badge variant="outline">{badge}</Badge> : null}
      </div>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

function SectionPreview({
  title,
  badge,
  icon,
  children,
}: {
  title: string;
  badge: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-background p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-xs font-semibold">
          {icon}
          {title}
        </h4>
        <Badge variant="outline">{badge}</Badge>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function StatusIcon({ status }: { status: NoCodeAutomationBuilderStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <XCircle className={className} />;

  return <CircleAlert className={className} />;
}
