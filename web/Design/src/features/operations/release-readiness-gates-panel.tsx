"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  Rocket,
  Route,
  ServerCog,
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
  ReleaseReadinessGate,
  ReleaseReadinessItem,
  ReleaseReadinessReport,
  ReleaseReadinessStatus,
} from "@/features/operations/release-readiness-gates";
import { cn } from "@/lib/utils";

type ReleaseReadinessGatesPanelProps = {
  report: ReleaseReadinessReport;
};

const statusLabels: Record<ReleaseReadinessStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  ReleaseReadinessStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function ReleaseReadinessGatesPanel({
  report,
}: ReleaseReadinessGatesPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Release readiness gates
            </CardTitle>
            <CardDescription>
              Route coverage, environment health, migration drift, seeded
              account verification, and Vercel confidence for the next release.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[report.status]}>
              {report.score}/100 {statusLabels[report.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a href={report.packet.dataUrl} download={report.packet.fileName}>
                <Download className="h-4 w-4" />
                Packet
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric
            label="Routes"
            value={`${report.totals.coveredCriticalRoutes}/${report.totals.criticalRoutes}`}
          />
          <Metric
            label="Env issues"
            value={report.totals.blockedEnvironmentChecks}
          />
          <Metric label="Projects" value={report.totals.activeProjects} />
          <Metric label="Missing snaps" value={report.totals.missingSnapshots} />
          <Metric label="Stale snaps" value={report.totals.staleSnapshots} />
          <Metric label="Vercel signals" value={report.totals.vercelChecks} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {report.gates.map((gate) => (
            <GateCard key={gate.id} gate={gate} />
          ))}
        </div>

        {report.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ServerCog className="h-4 w-4 text-muted-foreground" />
              Next release actions
            </div>
            <div className="mt-2 grid gap-2">
              {report.nextActions.map((action) => (
                <p key={action} className="flex gap-2 text-xs text-muted-foreground">
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

function GateCard({ gate }: { gate: ReleaseReadinessGate }) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <ReadinessIcon status={gate.status} />
            {gate.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {gate.description}
          </p>
        </div>
        <Badge variant={statusVariants[gate.status]}>{gate.score}/100</Badge>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">
          {gate.metricValue} {gate.metricLabel}
        </Badge>
        <Badge variant={statusVariants[gate.status]}>
          {statusLabels[gate.status]}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2">
        {gate.items.map((item) => (
          <GateItem key={`${gate.id}-${item.id}`} item={item} />
        ))}
      </div>
    </section>
  );
}

function GateItem({ item }: { item: ReleaseReadinessItem }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ReadinessIcon status={item.status} />
            <span className="truncate">{item.title}</span>
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {item.detail}
          </p>
        </div>
        <Badge variant={statusVariants[item.status]} className="shrink-0">
          {item.badge}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.meta.slice(0, 3).map((meta) => (
          <Badge key={meta} variant="outline">
            {meta}
          </Badge>
        ))}
      </div>
      {item.href ? (
        <Button asChild size="sm" variant="ghost" className="mt-2 px-0">
          <a href={item.href}>
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Route className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function ReadinessIcon({ status }: { status: ReleaseReadinessStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}
