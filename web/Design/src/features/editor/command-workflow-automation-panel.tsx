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
  EditorCommandWorkflowAutomationCenter,
  EditorCommandWorkflowPermissionCheck,
  EditorCommandWorkflowRunbook,
  EditorCommandWorkflowStatus,
  EditorCommandWorkflowStep,
} from "@/features/editor/command-workflow-automation";
import { cn } from "@/lib/utils";

type EditorCommandWorkflowAutomationPanelProps = {
  center: EditorCommandWorkflowAutomationCenter;
};

const statusLabels: Record<EditorCommandWorkflowStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  EditorCommandWorkflowStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function EditorCommandWorkflowAutomationPanel({
  center,
}: EditorCommandWorkflowAutomationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <SquareTerminal className="h-5 w-5" />
              Editor workflow automation
            </CardTitle>
            <CardDescription>
              Repeatable command macro runbooks with dry-run previews,
              permission checks, and undo-safe execution logs.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a
                download={center.automationPacket.fileName}
                href={center.automationPacket.dataUrl}
              >
                <Download className="h-4 w-4" />
                Packet
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Runbooks" value={center.totals.runbooks} />
          <Metric label="Ready" value={center.totals.readyRunbooks} />
          <Metric label="Blocked" value={center.totals.blockedRunbooks} />
          <Metric label="Dry-runs" value={center.totals.dryRunSteps} />
          <Metric label="Checks" value={center.totals.permissionChecks} />
          <Metric label="Logs" value={center.totals.executionLogs} />
        </div>

        {center.runbooks.length ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {center.runbooks.slice(0, 6).map((runbook) => (
              <RunbookCard key={runbook.id} runbook={runbook} />
            ))}
          </div>
        ) : (
          <EmptyLine>
            Create a project before building workflow automation.
          </EmptyLine>
        )}

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Workflow next actions
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

function RunbookCard({ runbook }: { runbook: EditorCommandWorkflowRunbook }) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIcon status={runbook.status} />
            <h3 className="truncate text-sm font-semibold">
              {runbook.projectName}
            </h3>
            <Badge variant={statusVariants[runbook.status]}>
              {runbook.score}/100
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {runbook.nextAction}
          </p>
        </div>
        <Badge variant="outline">
          {runbook.handoffStatus.replace("-", " ")}
        </Badge>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        {runbook.steps.map((step) => (
          <WorkflowStepCard key={step.id} step={step} />
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        <SectionBlock
          title="Permission checks"
          icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" />}
          badge={`${runbook.permissionChecks.length} checks`}
        >
          <div className="grid gap-2 md:grid-cols-3">
            {runbook.permissionChecks.map((check) => (
              <PermissionCheck key={check.id} check={check} />
            ))}
          </div>
        </SectionBlock>

        <SectionBlock
          title="Undo safety"
          icon={<RotateCcw className="h-4 w-4 text-muted-foreground" />}
          badge={runbook.undoSafety.restorePointKind}
        >
          <div className="rounded-md border border-border bg-background p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">
                  {runbook.undoSafety.restorePointLabel}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {runbook.undoSafety.detail}
                </p>
              </div>
              <StatusIcon status={runbook.undoSafety.status} />
            </div>
          </div>
        </SectionBlock>

        {runbook.executionLogs.length ? (
          <SectionBlock
            title="Execution logs"
            icon={<ListChecks className="h-4 w-4 text-muted-foreground" />}
            badge={`${runbook.executionLogs.length} logs`}
          >
            <div className="grid gap-2">
              {runbook.executionLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-md border border-border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{log.summary}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {log.macroId ?? "unknown macro"} /{" "}
                        {log.changedElementIds.length} changed /{" "}
                        {log.issueCount} issues
                      </p>
                    </div>
                    <Badge variant="outline">{formatDate(log.createdAt)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </SectionBlock>
        ) : null}
      </div>
    </section>
  );
}

function WorkflowStepCard({ step }: { step: EditorCommandWorkflowStep }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <PlayCircle className="h-4 w-4 text-muted-foreground" />
            <p className="truncate text-xs font-semibold">{step.title}</p>
          </div>
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
            {step.dryRunPreview}
          </p>
        </div>
        <StatusIcon status={step.status} />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {step.undoImpact}
      </p>
    </div>
  );
}

function PermissionCheck({
  check,
}: {
  check: EditorCommandWorkflowPermissionCheck;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold">{check.label}</p>
        <StatusIcon status={check.status} />
      </div>
      <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
        {check.detail}
      </p>
    </div>
  );
}

function SectionBlock({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon: ReactNode;
  badge: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 text-sm font-semibold">
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

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function StatusIcon({ status }: { status: EditorCommandWorkflowStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <XCircle className={className} />;

  return <CircleAlert className={className} />;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}
