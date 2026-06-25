"use client";

import { CheckCircle2, CloudCog, Database, MailCheck, RefreshCw, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DeploymentEnvironmentDriftId, DeploymentEnvironmentDriftReport, DeploymentEnvironmentDriftStatus } from "@/features/projects/deployment-environment-drift";

const driftIcon: Record<DeploymentEnvironmentDriftId, typeof CloudCog> = {
  "brevo-sender": MailCheck,
  "turso-target": Database,
  "updater-endpoints": RefreshCw,
  "vercel-env": CloudCog,
};

function statusVariant(status: DeploymentEnvironmentDriftStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: DeploymentEnvironmentDriftStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return <TriangleAlert className="size-3.5" />;
}

export function DeploymentEnvironmentDriftPanel({ report }: { report: DeploymentEnvironmentDriftReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CloudCog className="size-4" />
              Deployment environment drift
            </CardTitle>
            <CardDescription>Vercel env, Turso target, Brevo sender, and desktop updater endpoint drift before release campaigns.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.worstStatus)}>
              <StatusIcon status={report.summary.worstStatus} />
              {report.summary.worstStatus}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.environmentScore}/100 environment
            </Badge>
            <Badge className="rounded-md" variant={report.summary.driftCount > 0 ? "secondary" : "outline"}>
              {report.summary.driftCount} drift signals
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Scopes</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.totalCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Ready</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.readyCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Watch</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.watchCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Blocked</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.blockedCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Generated</p>
            <p className="mt-2 text-sm font-medium">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.generatedAt))}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scope</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Observed</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => {
              const Icon = driftIcon[row.id];

              return (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[280px] whitespace-normal">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{row.label}</p>
                        <p className="text-xs text-muted-foreground">{row.ownerHint}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
                      <StatusIcon status={row.status} />
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{row.expectedState}</p>
                  </TableCell>
                  <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{row.observedState}</p>
                    <p className="mt-1 line-clamp-2">{row.evidence}</p>
                  </TableCell>
                  <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{row.nextAction}</p>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
