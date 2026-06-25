"use client";

import {
  CheckCircle2,
  CircleAlert,
  Download,
  ExternalLink,
  GitPullRequestArrow,
  ShieldAlert,
  TimerReset,
  Workflow,
} from "lucide-react";
import Link from "next/link";
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
import {
  approvalStatusLabels,
  getApprovalStatusBadgeVariant,
} from "@/features/review/approval-status";
import type {
  EnterpriseApprovalEscalationRule,
  EnterpriseApprovalGovernanceReport,
  EnterpriseApprovalStageOwner,
  EnterpriseApprovalWorkflowCenter,
  EnterpriseApprovalWorkflowStatus,
  EnterpriseApprovalWorkflowSubject,
  EnterpriseApprovalWorkflowTemplate,
} from "@/features/review/enterprise-approval-workflows";
import { cn } from "@/lib/utils";

type EnterpriseApprovalWorkflowsPanelProps = {
  center: EnterpriseApprovalWorkflowCenter;
};

const statusLabels: Record<EnterpriseApprovalWorkflowStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  EnterpriseApprovalWorkflowStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function EnterpriseApprovalWorkflowsPanel({
  center,
}: EnterpriseApprovalWorkflowsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              Enterprise approval workflows
            </CardTitle>
            <CardDescription>
              Approval templates, stage owners, escalation rules, reviewer SLAs,
              and governance packet reporting.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-7">
          <Metric
            label="Templates"
            value={center.totals.workflowTemplates}
          />
          <Metric label="Pending" value={center.totals.pendingSubjects} />
          <Metric label="Owners" value={center.totals.stageOwners} />
          <Metric label="Rules" value={center.totals.escalationRules} />
          <Metric label="Overdue" value={center.totals.overdueReviewerItems} />
          <Metric label="Due soon" value={center.totals.dueSoonReviewerItems} />
          <Metric label="Audit" value={center.totals.auditEvents} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4">
            <WorkflowTemplates workflows={center.workflowTemplates} />
          </section>
          <section className="space-y-4">
            <GovernanceReports reports={center.governanceReports} />
            <GovernancePacket center={center} />
          </section>
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CircleAlert className="h-4 w-4 text-muted-foreground" />
              Next approval actions
            </div>
            <div className="mt-2 grid gap-2">
              {center.nextActions.map((action) => (
                <p key={action} className="text-xs text-muted-foreground">
                  {action}
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function WorkflowTemplates({
  workflows,
}: {
  workflows: EnterpriseApprovalWorkflowTemplate[];
}) {
  return (
    <PanelBlock
      title="Workflow templates"
      badge={`${workflows.length} templates`}
    >
      {workflows.map((workflow) => (
        <WorkflowTemplateRow key={workflow.id} workflow={workflow} />
      ))}
    </PanelBlock>
  );
}

function WorkflowTemplateRow({
  workflow,
}: {
  workflow: EnterpriseApprovalWorkflowTemplate;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={workflow.status} />
            <p className="truncate text-sm font-semibold">{workflow.title}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {workflow.description}
          </p>
        </div>
        <Badge variant={statusVariants[workflow.status]}>
          {workflow.score}/100
        </Badge>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <Metric label="Pending" value={workflow.subjects.length} compact />
        <Metric
          label="Owners"
          value={workflow.stageOwners.length}
          compact
        />
        <Metric
          label="Rules"
          value={workflow.escalationRules.length}
          compact
        />
        <Metric
          label="SLA"
          value={
            workflow.reviewerSla.overdueCount
              ? `${workflow.reviewerSla.overdueCount} late`
              : `${workflow.reviewerSla.openCount} open`
          }
          compact
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {workflow.governanceDetail}
      </p>

      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <StageOwners owners={workflow.stageOwners} />
        <ReviewerSla workflow={workflow} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <Subjects subjects={workflow.subjects} />
        <EscalationRules rules={workflow.escalationRules} />
      </div>
    </div>
  );
}

function StageOwners({ owners }: { owners: EnterpriseApprovalStageOwner[] }) {
  return (
    <div className="rounded-md border border-border bg-background/70 p-3">
      <h4 className="text-xs font-semibold uppercase text-muted-foreground">
        Stage owners
      </h4>
      <div className="mt-2 grid gap-2">
        {owners.map((owner) => (
          <div
            key={owner.id}
            className="flex items-start justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{owner.stage}</p>
              <p className="truncate text-xs text-muted-foreground">
                {owner.ownerLabel} / {owner.role}
              </p>
            </div>
            <Badge variant={owner.coverage === "missing" ? "destructive" : "outline"}>
              {owner.coverage}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewerSla({
  workflow,
}: {
  workflow: EnterpriseApprovalWorkflowTemplate;
}) {
  return (
    <div className="rounded-md border border-border bg-background/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground">
          Reviewer SLA
        </h4>
        <Badge variant={statusVariants[workflow.reviewerSla.status]}>
          {workflow.reviewerSla.hours}h
        </Badge>
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <Metric
          label="Open"
          value={workflow.reviewerSla.openCount}
          compact
        />
        <Metric
          label="Overdue"
          value={workflow.reviewerSla.overdueCount}
          compact
        />
        <Metric
          label="Due soon"
          value={workflow.reviewerSla.dueSoonCount}
          compact
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {workflow.reviewerSla.detail}
      </p>
    </div>
  );
}

function Subjects({
  subjects,
}: {
  subjects: EnterpriseApprovalWorkflowSubject[];
}) {
  return (
    <div className="rounded-md border border-border bg-background/70 p-3">
      <h4 className="text-xs font-semibold uppercase text-muted-foreground">
        Approval queue
      </h4>
      <div className="mt-2 grid gap-2">
        {subjects.length ? (
          subjects.slice(0, 4).map((subject) => (
            <div
              key={subject.id}
              className="rounded-md border border-border bg-muted/20 p-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {subject.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {subject.ownerLabel} / {subject.kind}
                  </p>
                </div>
                <Badge variant={getApprovalStatusBadgeVariant(subject.approvalStatus)}>
                  {approvalStatusLabels[subject.approvalStatus]}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge variant="outline">{subject.openTaskCount} tasks</Badge>
                <Badge
                  variant={
                    subject.overdueTaskCount ? "destructive" : "outline"
                  }
                >
                  {subject.overdueTaskCount} overdue
                </Badge>
                {subject.targetHref ? (
                  <Button asChild size="sm" variant="ghost" className="h-6">
                    <Link href={subject.targetHref}>
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <EmptyState text="No approval subjects are pending in this workflow." />
        )}
      </div>
    </div>
  );
}

function EscalationRules({
  rules,
}: {
  rules: EnterpriseApprovalEscalationRule[];
}) {
  return (
    <div className="rounded-md border border-border bg-background/70 p-3">
      <h4 className="text-xs font-semibold uppercase text-muted-foreground">
        Escalation rules
      </h4>
      <div className="mt-2 grid gap-2">
        {rules.length ? (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-md border border-border bg-muted/20 p-2"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{rule.title}</p>
                <Badge variant={statusVariants[rule.status]}>
                  {statusLabels[rule.status]}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {rule.trigger}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {rule.action}
              </p>
            </div>
          ))
        ) : (
          <EmptyState text="No escalation rules are active for this workflow." />
        )}
      </div>
    </div>
  );
}

function GovernanceReports({
  reports,
}: {
  reports: EnterpriseApprovalGovernanceReport[];
}) {
  return (
    <PanelBlock title="Governance reporting" badge={`${reports.length} checks`}>
      {reports.map((report) => (
        <div
          key={report.id}
          className="rounded-md border border-border bg-muted/20 p-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <StatusIcon status={report.status} />
                <p className="truncate text-sm font-medium">{report.label}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {report.detail}
              </p>
            </div>
            <Badge variant={statusVariants[report.status]}>
              {report.score}/100
            </Badge>
          </div>
          <div className="mt-2 grid gap-1">
            {report.evidence.slice(0, 3).map((item) => (
              <p key={item} className="text-xs text-muted-foreground">
                {item}
              </p>
            ))}
          </div>
        </div>
      ))}
    </PanelBlock>
  );
}

function GovernancePacket({
  center,
}: {
  center: EnterpriseApprovalWorkflowCenter;
}) {
  return (
    <PanelBlock title="Governance packet" badge={statusLabels[center.status]}>
      <div className="rounded-md border border-border bg-muted/20 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <GitPullRequestArrow className="h-4 w-4 text-muted-foreground" />
              <p className="truncate text-sm font-medium">
                Enterprise approval workflow packet
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {center.governancePacket.workflowTemplateIds.length} workflow
              templates / {center.governancePacket.auditLogIds.length} audit
              events.
            </p>
          </div>
          <Badge variant={statusVariants[center.governancePacket.status]}>
            {statusLabels[center.governancePacket.status]}
          </Badge>
        </div>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <a
            href={center.governancePacket.download.href}
            download={center.governancePacket.download.fileName}
          >
            <Download className="h-4 w-4" />
            Packet
          </a>
        </Button>
      </div>
    </PanelBlock>
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
      <div className="mt-3 grid gap-2">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: number | string;
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <TimerReset className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className={cn("mt-1 font-semibold", compact ? "text-sm" : "text-lg")}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function StatusIcon({ status }: { status: EnterpriseApprovalWorkflowStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <ShieldAlert className={className} />;

  return <CircleAlert className={className} />;
}
