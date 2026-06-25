"use client";

import { Activity, Archive, CheckCircle2, ClipboardList, FileClock, Gauge, ShieldAlert, TriangleAlert, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { GovernanceTimelineReport, GovernanceTimelineSeverity, GovernanceTimelineSource } from "@/features/projects/governance-timeline";

const sourceIcon: Record<GovernanceTimelineSource, typeof Activity> = {
  audit: ClipboardList,
  incident: ShieldAlert,
  postmortem: Archive,
  "release-drill": FileClock,
  "resource-guardrail": WalletCards,
  slo: Gauge,
};

const sourceLabel: Record<GovernanceTimelineSource, string> = {
  audit: "Audit",
  incident: "Incident",
  postmortem: "Postmortem",
  "release-drill": "Release drill",
  "resource-guardrail": "Resource",
  slo: "SLO",
};

function severityVariant(severity: GovernanceTimelineSeverity) {
  if (severity === "critical") {
    return "destructive" as const;
  }

  if (severity === "warning" || severity === "info") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function SeverityIcon({ severity }: { severity: GovernanceTimelineSeverity }) {
  if (severity === "healthy") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return severity === "critical" ? <TriangleAlert className="size-3.5" /> : <ShieldAlert className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No timeline activity";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function GovernanceTimelinePanel({ report }: { report: GovernanceTimelineReport }) {
  const visibleEvents = report.events.slice(0, 18);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="size-4" />
              Governance timeline
            </CardTitle>
            <CardDescription>Correlated chronology for audit events, SLO shifts, incidents, postmortems, drills, and guardrails.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={report.summary.criticalCount > 0 ? "destructive" : "outline"}>
              {report.summary.criticalCount} critical
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.timelineScore}/100 timeline
            </Badge>
            <Badge className="rounded-md" variant={report.summary.correlatedCount > 0 ? "secondary" : "outline"}>
              {report.summary.correlatedCount} correlated
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Events</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.totalCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Warnings</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.warningCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Healthy</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.healthyCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Latest</p>
            <p className="mt-2 text-sm font-medium">{formatDate(report.summary.latestAt)}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Sources</p>
            <p className="mt-2 text-xl font-semibold">{Object.values(report.summary.sourceCounts).filter((count) => count > 0).length}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>When</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Correlations</TableHead>
              <TableHead>Owner</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleEvents.map((event) => {
              const Icon = sourceIcon[event.source];

              return (
                <TableRow key={event.id}>
                  <TableCell className="max-w-[320px] whitespace-normal">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{event.title}</p>
                          <Badge className="rounded-md text-[10px]" variant="outline">
                            {sourceLabel[event.source]}
                          </Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{event.detail}</p>
                        {event.projectName ? <p className="mt-1 text-xs text-muted-foreground">{event.projectName}</p> : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="gap-1 rounded-md" variant={severityVariant(event.severity)}>
                      <SeverityIcon severity={event.severity} />
                      {event.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal text-xs text-muted-foreground">{formatDate(event.occurredAt)}</TableCell>
                  <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{event.statusLabel}</p>
                    <p className="mt-1 line-clamp-3">{event.evidence}</p>
                  </TableCell>
                  <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">
                    <p>{event.correlationCount} related</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {event.relatedSources.map((source) => (
                        <Badge className="rounded-md text-[10px]" key={source} variant="secondary">
                          {sourceLabel[source]}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[220px] whitespace-normal text-xs text-muted-foreground">{event.actorLabel ?? event.ownerHint}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
