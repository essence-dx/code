"use client";

import { CheckCircle2, ClipboardList, FileCheck2, Flame, Radar, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectIncidentPostmortemReport, ProjectIncidentPostmortemStatus, ProjectIncidentPostmortemTemplate } from "@/features/projects/project-incident-postmortem";

function statusVariant(status: ProjectIncidentPostmortemStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: ProjectIncidentPostmortemStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  if (status === "watch") {
    return <TriangleAlert className="size-3.5" />;
  }

  return <Flame className="size-3.5" />;
}

function TemplateRow({ template }: { template: ProjectIncidentPostmortemTemplate }) {
  const firstSmokeCheck = template.failedSmokeChecks[0];
  const firstDrill = template.relatedReleaseDrills[0];
  const firstRemediation = template.completedRemediations[0];

  return (
    <TableRow>
      <TableCell className="max-w-[360px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <ClipboardList className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{template.incident.title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{template.incident.message}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge className="rounded-md text-[10px]" variant={template.incident.severity === "critical" ? "destructive" : "secondary"}>
                {template.incident.severity}
              </Badge>
              <Badge className="rounded-md text-[10px]" variant="outline">
                {template.incident.source}
              </Badge>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(template.status)}>
          <StatusIcon status={template.status} />
          {template.readinessScore}/100
        </Badge>
      </TableCell>
      <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
        {firstSmokeCheck ? (
          <>
            <p className="font-medium text-foreground">{firstSmokeCheck.label}</p>
            <p className="mt-1 line-clamp-2">{firstSmokeCheck.issues.join(" ")}</p>
          </>
        ) : (
          <p>No failed smoke check linked.</p>
        )}
      </TableCell>
      <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
        {firstDrill ? (
          <>
            <p className="font-medium text-foreground">{firstDrill.label}</p>
            <p className="mt-1 line-clamp-2">
              {firstDrill.outcome} - {firstDrill.nextAction}
            </p>
          </>
        ) : (
          <p>No saved drill linked.</p>
        )}
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        {firstRemediation ? (
          <>
            <p className="font-medium text-foreground">{firstRemediation.title}</p>
            <p className="mt-1 line-clamp-2">{firstRemediation.evidence.join(" ")}</p>
          </>
        ) : (
          <p>{template.followUpActions[0] ?? "Add remediation before closure."}</p>
        )}
      </TableCell>
    </TableRow>
  );
}

export function ProjectIncidentPostmortemPanel({ report }: { report: ProjectIncidentPostmortemReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCheck2 className="size-4" />
              Incident postmortems
            </CardTitle>
            <CardDescription>Templates linking incidents to failed smoke checks, release drills, and completed remediation evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={report.summary.blockedCount > 0 ? "destructive" : "outline"}>
              {report.summary.blockedCount} blocked
            </Badge>
            <Badge className="rounded-md" variant="secondary">
              {report.summary.watchCount} watch
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.readyCount} ready
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Templates</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.templateCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Failed smoke checks</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.failedSmokeCheckCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Linked drills</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.linkedDrillCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Completed remediation</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.completedRemediationCount}</p>
          </div>
        </div>

        {report.templates.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident</TableHead>
                <TableHead>Readiness</TableHead>
                <TableHead>Smoke signal</TableHead>
                <TableHead>Release drill</TableHead>
                <TableHead>Remediation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{report.templates.map((template) => <TemplateRow key={template.id} template={template} />)}</TableBody>
          </Table>
        ) : (
          <div className="flex items-center gap-2 rounded-md border bg-background p-3 text-sm text-muted-foreground">
            <Radar className="size-4 text-emerald-500" />
            No incident postmortem templates are needed for the current dashboard scope.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
