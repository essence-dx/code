"use client";

import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Flame,
  ListChecks,
  RadioTower,
  ShieldAlert,
  UserRoundCheck,
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
  EnterpriseIncidentResponseCommandCenter,
  EnterpriseIncidentResponseItem,
  EnterpriseIncidentResponseStatus,
  EnterpriseIncidentSeverity,
} from "@/features/support/enterprise-incident-response-command-center";
import { cn } from "@/lib/utils";

type EnterpriseIncidentResponseCommandCenterPanelProps = {
  center: EnterpriseIncidentResponseCommandCenter;
};

const statusLabels: Record<EnterpriseIncidentResponseStatus, string> = {
  ready: "Ready",
  active: "Active",
  critical: "Critical",
};

const statusVariants: Record<
  EnterpriseIncidentResponseStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  active: "outline",
  critical: "destructive",
};

const severityLabels: Record<EnterpriseIncidentSeverity, string> = {
  sev1: "SEV1",
  sev2: "SEV2",
  sev3: "SEV3",
  watch: "Watch",
};

const severityVariants: Record<
  EnterpriseIncidentSeverity,
  "secondary" | "outline" | "destructive"
> = {
  sev1: "destructive",
  sev2: "outline",
  sev3: "outline",
  watch: "secondary",
};

export function EnterpriseIncidentResponseCommandCenterPanel({
  center,
}: EnterpriseIncidentResponseCommandCenterPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RadioTower className="h-5 w-5" />
              Enterprise incident response
            </CardTitle>
            <CardDescription>
              Severity routing, owner assignment, timeline evidence, and
              recovery playbooks across support, release, automation, and
              observability signals.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.incidents.toLocaleString()} incidents
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="Incidents" value={center.totals.incidents} />
          <Metric label="SEV1" value={center.totals.sev1} />
          <Metric label="SEV2" value={center.totals.sev2} />
          <Metric label="SEV3" value={center.totals.sev3} />
          <Metric label="Watch" value={center.totals.watch} />
          <Metric label="Assigned" value={center.totals.assignedIncidents} />
          <Metric label="Timeline" value={center.totals.timelineEvents} />
          <Metric label="Playbooks" value={center.totals.playbooks} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-4">
            <PanelBlock
              title="Active incidents"
              badge={`${center.incidents.length} routed`}
            >
              {center.incidents.length ? (
                center.incidents.map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} />
                ))
              ) : (
                <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                  No incident response routes are active.
                </p>
              )}
            </PanelBlock>
          </section>
          <section className="space-y-4">
            <PanelBlock title="Severity routes" badge="owners">
              {center.severityRoutes.map((route) => (
                <div
                  key={route.severity}
                  className="rounded-md border border-border bg-muted/20 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{route.label}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {route.ownerEmail ?? "Workspace admins"}
                      </p>
                    </div>
                    <Badge variant={severityVariants[route.severity]}>
                      {route.count}
                    </Badge>
                  </div>
                </div>
              ))}
            </PanelBlock>
            <ResponsePacket center={center} />
            {center.nextActions.length ? (
              <PanelBlock
                title="Next response actions"
                badge={`${center.nextActions.length} actions`}
              >
                {center.nextActions.map((action) => (
                  <p
                    key={action}
                    className="flex gap-2 text-xs text-muted-foreground"
                  >
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{action}</span>
                  </p>
                ))}
              </PanelBlock>
            ) : null}
          </section>
        </div>
      </CardContent>
    </Card>
  );
}

function IncidentCard({
  incident,
}: {
  incident: EnterpriseIncidentResponseItem;
}) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <SeverityIcon severity={incident.severity} />
            <span className="truncate">{incident.title}</span>
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {incident.detail}
          </p>
        </div>
        <Badge variant={severityVariants[incident.severity]}>
          {severityLabels[incident.severity]}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant="outline">{incident.source}</Badge>
        <Badge variant="outline">{incident.metric}</Badge>
        <Badge
          variant={
            incident.ownerAssignment.ownerEmail ? "secondary" : "outline"
          }
        >
          {incident.ownerAssignment.ownerEmail ?? "Unassigned"}
        </Badge>
        {incident.href ? (
          <Button asChild size="sm" variant="ghost" className="h-7 px-2">
            <a href={incident.href}>
              Open
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        ) : null}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <IncidentTimeline incident={incident} />
        <IncidentPlaybook incident={incident} />
      </div>
    </article>
  );
}

function IncidentTimeline({
  incident,
}: {
  incident: EnterpriseIncidentResponseItem;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="flex items-center gap-2 text-xs font-medium">
        <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
        Timeline evidence
      </p>
      <div className="mt-2 grid gap-2">
        {incident.timeline.slice(-4).map((event) => (
          <p key={event.id} className="text-xs text-muted-foreground">
            {formatDate(event.occurredAt)} / {event.label}: {event.detail}
          </p>
        ))}
      </div>
    </div>
  );
}

function IncidentPlaybook({
  incident,
}: {
  incident: EnterpriseIncidentResponseItem;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="flex items-center gap-2 text-xs font-medium">
        <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
        {incident.recoveryPlaybook.title}
      </p>
      <div className="mt-2 grid gap-1">
        {incident.recoveryPlaybook.steps.slice(0, 4).map((step) => (
          <p key={step} className="flex gap-2 text-xs text-muted-foreground">
            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{step}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

function ResponsePacket({
  center,
}: {
  center: EnterpriseIncidentResponseCommandCenter;
}) {
  return (
    <PanelBlock title="Response packet" badge={statusLabels[center.status]}>
      <div className="rounded-md border border-border bg-muted/20 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Download className="h-4 w-4 text-muted-foreground" />
              Incident response packet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {center.responsePacket.incidentIds.length} incidents /{" "}
              {center.responsePacket.auditLogIds.length} audit events /{" "}
              {center.responsePacket.playbookIds.length} playbooks.
            </p>
          </div>
          <Badge variant={statusVariants[center.responsePacket.status]}>
            {statusLabels[center.responsePacket.status]}
          </Badge>
        </div>
        <Button asChild size="sm" variant="outline" className="mt-3">
          <a
            href={center.responsePacket.download.href}
            download={center.responsePacket.download.fileName}
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: EnterpriseIncidentSeverity }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": severity === "watch",
    "text-amber-600": severity === "sev2" || severity === "sev3",
    "text-destructive": severity === "sev1",
  });

  if (severity === "watch") return <CheckCircle2 className={className} />;
  if (severity === "sev1") return <ShieldAlert className={className} />;
  if (severity === "sev2") return <Flame className={className} />;

  return <UserRoundCheck className={className} />;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Now";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
