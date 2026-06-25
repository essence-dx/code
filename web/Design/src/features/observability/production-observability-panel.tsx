"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  MailWarning,
  RadioTower,
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
import { Separator } from "@/components/ui/separator";
import type {
  ProductionObservabilityGroup,
  ProductionObservabilityReport,
  ProductionObservabilityStatus,
} from "@/features/observability/production-observability";

type ProductionObservabilityPanelProps = {
  report: ProductionObservabilityReport;
};

const statusLabels: Record<ProductionObservabilityStatus, string> = {
  healthy: "Healthy",
  watch: "Watch",
  critical: "Critical",
};

const statusVariants: Record<
  ProductionObservabilityStatus,
  "secondary" | "outline" | "destructive"
> = {
  healthy: "secondary",
  watch: "outline",
  critical: "destructive",
};

const statusIcons: Record<ProductionObservabilityStatus, typeof CheckCircle2> =
  {
    healthy: CheckCircle2,
    watch: AlertTriangle,
    critical: MailWarning,
  };

export function ProductionObservabilityPanel({
  report,
}: ProductionObservabilityPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RadioTower className="h-5 w-5" />
              Production observability
            </CardTitle>
            <CardDescription>
              Export reliability, email delivery, publishing, storage, and
              collaboration signals.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={statusVariants[report.status]}>
              {statusLabels[report.status]} - {report.score}/100
            </Badge>
            <Badge variant="outline">
              {report.totals.incidents} incidents
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3">
          <ObservabilityMetric label="Critical" value={report.totals.critical} />
          <ObservabilityMetric label="Watch" value={report.totals.watch} />
          <ObservabilityMetric
            label="Checked"
            value={formatTime(report.checkedAt)}
          />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {report.groups.map((group) => (
            <ObservabilityGroupCard key={group.id} group={group} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ObservabilityGroupCard({
  group,
}: {
  group: ProductionObservabilityGroup;
}) {
  const Icon = statusIcons[group.status];

  return (
    <article className="overflow-hidden rounded-md border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="h-4 w-4" />
            {group.title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {group.description}
          </p>
        </div>
        <Badge variant={statusVariants[group.status]}>
          {group.score}/100
        </Badge>
      </div>
      <Separator />
      <div className="divide-y divide-border">
        {group.incidents.slice(0, 5).map((incident) => {
          const IncidentIcon = statusIcons[incident.status];

          return (
            <div
              key={incident.id}
              className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <IncidentIcon className="h-4 w-4 shrink-0" />
                  {incident.title}
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {incident.detail}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Badge variant="outline">{incident.metric}</Badge>
                <Badge variant={statusVariants[incident.status]}>
                  {statusLabels[incident.status]}
                </Badge>
                {incident.href ? (
                  <Button
                    asChild
                    size="icon"
                    variant="ghost"
                    aria-label={`Open ${incident.title}`}
                  >
                    <a href={incident.href}>
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function ObservabilityMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "now";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
