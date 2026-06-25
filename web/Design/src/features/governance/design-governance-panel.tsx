"use client";

import {
  ClipboardCheck,
  History,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  DesignGovernanceReport,
  DesignGovernanceRule,
  DesignGovernanceStatus,
} from "@/features/governance/design-governance";
import { cn } from "@/lib/utils";

type DesignGovernancePanelProps = {
  report: DesignGovernanceReport;
};

export function DesignGovernancePanel({ report }: DesignGovernancePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Design governance
            </CardTitle>
            <CardDescription>
              Organization rules for brand assets, template locks, approvals,
              and governance audit history.
            </CardDescription>
          </div>
          <Badge variant={getStatusVariant(report.status)}>
            {report.score}/100
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4">
          <GovernanceMetric label="Projects" value={report.totals.activeProjects} />
          <GovernanceMetric
            label="Templates"
            value={report.totals.governedTemplates}
          />
          <GovernanceMetric label="Brand assets" value={getBrandAssetTotal(report)} />
          <GovernanceMetric label="Audit events" value={report.totals.auditEvents} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {report.rules.map((rule) => (
            <GovernanceRuleCard key={rule.id} rule={rule} />
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <section className="rounded-md border border-border p-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Approval policies</h3>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {report.approvalPolicies.map((policy) => (
                <div
                  key={policy.scope}
                  className="rounded-md border border-border bg-muted/20 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {policy.scope}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {policy.total} total, {policy.approved} approved
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(policy.status)}>
                      {policy.score}/100
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {policy.inReview} in review, {policy.changesRequested} need
                    changes, {policy.draft} drafts.
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-border p-4">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Template lock rules</h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {report.templateLockRules.map((rule) => (
                <Badge key={rule} variant="outline">
                  {rule}
                </Badge>
              ))}
            </div>
          </section>
        </div>

        <section className="rounded-md border border-border p-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Governance audit trail</h3>
          </div>
          {report.auditTrail.length ? (
            <div className="mt-3 grid gap-2">
              {report.auditTrail.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{event.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.action}
                      {event.actorEmail ? ` by ${event.actorEmail}` : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(event.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Governance-sensitive activity will appear here after approvals,
              ownership, template, or brand cleanup changes.
            </p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function GovernanceRuleCard({ rule }: { rule: DesignGovernanceRule }) {
  return (
    <article className="rounded-md border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{rule.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {rule.description}
          </p>
        </div>
        <Badge variant={getStatusVariant(rule.status)}>{rule.score}/100</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {rule.evidence.map((item) => (
          <Badge
            key={item}
            variant="outline"
            className={cn(
              rule.id === "brand-colors" &&
                item.startsWith("#") &&
                "border-border pl-1",
            )}
          >
            {rule.id === "brand-colors" && item.startsWith("#") ? (
              <span
                className="h-3 w-3 rounded-full border border-border"
                style={{ backgroundColor: item }}
              />
            ) : null}
            {item}
          </Badge>
        ))}
      </div>
    </article>
  );
}

function GovernanceMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function getBrandAssetTotal(report: DesignGovernanceReport) {
  return (
    report.totals.brandColors +
    report.totals.brandFonts +
    report.totals.brandLogos
  );
}

function getStatusVariant(status: DesignGovernanceStatus) {
  if (status === "strong") return "secondary" as const;
  if (status === "needs-work") return "destructive" as const;

  return "outline" as const;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
