"use client";

import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Gauge,
  ShieldAlert,
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
  OrganizationUsageArea,
  OrganizationUsageGovernance,
  OrganizationUsageStatus,
} from "@/features/governance/organization-usage-governance";
import { cn } from "@/lib/utils";

type OrganizationUsageGovernancePanelProps = {
  center: OrganizationUsageGovernance;
};

const statusLabels: Record<OrganizationUsageStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  OrganizationUsageStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function OrganizationUsageGovernancePanel({
  center,
}: OrganizationUsageGovernancePanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Organization usage governance
            </CardTitle>
            <CardDescription>
              Storage, export, publishing, email, automation, and team-seat
              pressure before scale changes become operational surprises.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.pressureAreas.toLocaleString()} pressure areas
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Areas" value={center.totals.areas} />
          <Metric label="Blocked" value={center.totals.blockedAreas} />
          <Metric label="Review" value={center.totals.reviewAreas} />
          <Metric label="Pressure" value={center.totals.pressureAreas} />
          <Metric
            label="Avg use"
            value={`${center.totals.averageUsagePercent.toFixed(1)}%`}
          />
          <Metric label="Plans" value={center.remediationPlans.length} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {center.areas.map((area) => (
            <UsageAreaCard key={area.id} area={area} />
          ))}
        </div>

        {center.remediationPlans.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              Quota remediation plans
            </div>
            <div className="mt-2 grid gap-2">
              {center.remediationPlans.slice(0, 5).map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-md border border-border bg-background p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{plan.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {plan.detail}
                      </p>
                    </div>
                    <Badge variant={statusVariants[plan.severity]}>
                      {statusLabels[plan.severity]}
                    </Badge>
                  </div>
                  <div className="mt-2 grid gap-1">
                    {plan.actions.slice(0, 3).map((action) => (
                      <p
                        key={action}
                        className="flex gap-2 text-xs text-muted-foreground"
                      >
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{action}</span>
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function UsageAreaCard({ area }: { area: OrganizationUsageArea }) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <StatusIcon status={area.status} />
            {area.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {area.description}
          </p>
        </div>
        <Badge variant={statusVariants[area.status]}>
          {statusLabels[area.status]}
        </Badge>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">{area.metricLabel}</span>
          <span className="font-medium">{area.usagePercent.toFixed(1)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", {
              "bg-emerald-500": area.status === "ready",
              "bg-amber-500": area.status === "review",
              "bg-destructive": area.status === "blocked",
            })}
            style={{ width: `${Math.min(area.usagePercent, 100)}%` }}
          />
        </div>
      </div>
      <div className="mt-3 grid gap-1">
        {area.signals.slice(0, 3).map((signal) => (
          <p key={signal} className="flex gap-2 text-xs text-muted-foreground">
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{signal}</span>
          </p>
        ))}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <BarChart3 className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function StatusIcon({ status }: { status: OrganizationUsageStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "blocked") return <ShieldAlert className={className} />;

  return <CircleAlert className={className} />;
}
