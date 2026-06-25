"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Code2,
  Download,
  FileWarning,
  ShieldAlert,
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
  PolicyAsCodeDryRunReport,
  PolicyAsCodeGovernanceCenter,
  PolicyAsCodeRule,
  PolicyAsCodeStatus,
} from "@/features/governance/policy-as-code-governance";
import { cn } from "@/lib/utils";

type PolicyAsCodeGovernancePanelProps = {
  center: PolicyAsCodeGovernanceCenter;
};

const statusLabels: Record<PolicyAsCodeStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  PolicyAsCodeStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function PolicyAsCodeGovernancePanel({
  center,
}: PolicyAsCodeGovernancePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Policy-as-code governance
            </CardTitle>
            <CardDescription>
              Dry-run enforcement for sharing, publishing, assets, approvals,
              and retention before policies affect live workspace data.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.violations.toLocaleString()} exceptions
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-7">
          <Metric label="Domains" value={center.totals.policyDomains} />
          <Metric label="Rules" value={center.totals.rules} />
          <Metric label="Dry runs" value={center.totals.dryRunReports} />
          <Metric label="Blocked" value={center.totals.blockedRules} />
          <Metric label="Review" value={center.totals.reviewRules} />
          <Metric label="Actions" value={center.totals.plannedActions} />
          <Metric label="Audit" value={center.totals.auditEvents} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4">
            <PanelBlock title="Policy rules" badge={`${center.rules.length} rules`}>
              {center.rules.map((rule) => (
                <RuleCard key={rule.id} rule={rule} />
              ))}
            </PanelBlock>
          </section>
          <section className="space-y-4">
            <PanelBlock
              title="Dry-run reports"
              badge={`${center.dryRunReports.length} reports`}
            >
              {center.dryRunReports.map((report) => (
                <DryRunCard key={report.id} report={report} />
              ))}
            </PanelBlock>
            <EnforcementPacket center={center} />
          </section>
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileWarning className="h-4 w-4 text-muted-foreground" />
              Next enforcement actions
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

function RuleCard({ rule }: { rule: PolicyAsCodeRule }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={rule.status} />
            <p className="truncate text-sm font-medium">{rule.title}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {rule.description}
          </p>
        </div>
        <Badge variant={statusVariants[rule.status]}>{rule.score}/100</Badge>
      </div>
      <div className="mt-3 rounded-md border border-border bg-background p-2">
        <code className="break-words text-xs text-muted-foreground">
          {rule.policyExpression}
        </code>
      </div>
      <div className="mt-2 grid gap-1">
        {rule.evidence.slice(0, 2).map((item) => (
          <p key={item} className="text-xs text-muted-foreground">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function DryRunCard({ report }: { report: PolicyAsCodeDryRunReport }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={report.status} />
            <p className="truncate text-sm font-medium">{report.title}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {report.summary}
          </p>
        </div>
        <Badge variant={statusVariants[report.status]}>
          {statusLabels[report.status]}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Metric
          label="Affected"
          value={report.affectedItems.length}
          compact
        />
        <Metric label="Actions" value={report.plannedActions.length} compact />
        <Metric label="Audit" value={report.auditLogIds.length} compact />
      </div>
      {report.affectedItems.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {report.affectedItems.slice(0, 4).map((item) => (
            <Badge key={item.id} variant="outline">
              {item.kind}: {item.name}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function EnforcementPacket({
  center,
}: {
  center: PolicyAsCodeGovernanceCenter;
}) {
  return (
    <PanelBlock
      title="Enforcement packet"
      badge={statusLabels[center.enforcementPacket.status]}
    >
      <div className="rounded-md border border-border bg-muted/20 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <p className="truncate text-sm font-medium">
                Policy dry-run packet
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {center.enforcementPacket.violationCount} exceptions /{" "}
              {center.enforcementPacket.plannedActionCount} planned actions.
            </p>
          </div>
          <Badge variant={statusVariants[center.enforcementPacket.status]}>
            {statusLabels[center.enforcementPacket.status]}
          </Badge>
        </div>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <a
            href={center.enforcementPacket.download.href}
            download={center.enforcementPacket.download.fileName}
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
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-semibold", compact ? "text-sm" : "text-lg")}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function StatusIcon({ status }: { status: PolicyAsCodeStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <ShieldAlert className={className} />;

  return <CircleAlert className={className} />;
}
