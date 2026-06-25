import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileWarning, History, Radar, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectIncident, ProjectIncidentHistory, ProjectIncidentKind, ProjectIncidentSeverity } from "@/features/projects/project-incident-history";

function iconForKind(kind: ProjectIncidentKind) {
  switch (kind) {
    case "blocked-review-gate":
      return <ShieldAlert className="size-4" />;
    case "failed-export":
      return <FileWarning className="size-4" />;
    case "post-deploy-failure":
      return <Radar className="size-4" />;
  }
}

function severityVariant(severity: ProjectIncidentSeverity) {
  return severity === "critical" ? "destructive" : "secondary";
}

function formatDate(value: string | null) {
  if (!value) {
    return "No timestamp";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function IncidentRow({ incident }: { incident: ProjectIncident }) {
  return (
    <div className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground">{iconForKind(incident.kind)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{incident.title}</p>
            <p className="truncate text-xs text-muted-foreground">{incident.projectName}</p>
          </div>
          <Badge className="rounded-md text-[10px]" variant={severityVariant(incident.severity)}>
            {incident.severity}
          </Badge>
          <Badge className="rounded-md text-[10px]" variant="outline">
            {incident.source}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{incident.message}</p>
        {incident.details.length > 0 ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{incident.details.join(" ")}</p> : null}
      </div>
      <div className="flex flex-col gap-3 lg:items-end">
        <Badge className="w-fit rounded-md" variant="outline">
          {incident.count}
        </Badge>
        <div className="text-right text-xs text-muted-foreground">
          <p>{incident.actionLabel}</p>
          <p>{formatDate(incident.occurredAt)}</p>
        </div>
        <Link className={buttonVariants({ className: "w-fit", size: "sm", variant: "outline" })} href={`/?projectId=${encodeURIComponent(incident.projectId)}`}>
          Open scene
        </Link>
      </div>
    </div>
  );
}

export function ProjectIncidentHistoryPanel({ history }: { history: ProjectIncidentHistory }) {
  const visibleIncidents = history.incidents.slice(0, 8);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4" />
              Incident history
            </CardTitle>
            <CardDescription>Project-level export, review-gate, and post-deploy failures that need operational follow-up.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={history.summary.criticalCount > 0 ? "destructive" : "outline"}>
              {history.summary.criticalCount} critical
            </Badge>
            <Badge className="rounded-md" variant="secondary">
              {history.summary.warningCount} warnings
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {history.summary.impactedProjectCount} projects
            </Badge>
          </div>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <span className="rounded-md bg-muted px-2 py-1">{history.summary.failedExportCount} export incidents</span>
          <span className="rounded-md bg-muted px-2 py-1">{history.summary.postDeployFailureCount} deploy incidents</span>
          <span className="rounded-md bg-muted px-2 py-1">{history.summary.blockedReviewCount} review incidents</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {visibleIncidents.length > 0 ? (
          visibleIncidents.map((incident) => <IncidentRow incident={incident} key={incident.id} />)
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-500" />
            No project incidents in the current dashboard scope.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
