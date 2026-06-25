"use client";

import { Calculator, CheckCircle2, Gauge, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CostQuotaForecastReport, CostQuotaForecastStatus } from "@/features/projects/cost-quota-forecast-simulator";

function statusVariant(status: CostQuotaForecastStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: CostQuotaForecastStatus }) {
  if (status === "safe") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return <TriangleAlert className="size-3.5" />;
}

export function CostQuotaForecastSimulatorPanel({ report }: { report: CostQuotaForecastReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="size-4" />
              Cost and quota forecast
            </CardTitle>
            <CardDescription>Free-tier pressure simulation for maintenance, public launch, and desktop campaign release plans.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.worstStatus)}>
              <StatusIcon status={report.summary.worstStatus} />
              {report.summary.worstStatus}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.forecastScore}/100 forecast
            </Badge>
            <Badge className="rounded-md" variant={report.summary.maxProjectedUsagePercent >= 100 ? "destructive" : "outline"}>
              {report.summary.maxProjectedUsagePercent}% max load
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Scenarios</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.totalScenarioCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Safe</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.safeScenarioCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Watch</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.watchScenarioCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Blocked</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.blockedScenarioCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Generated</p>
            <p className="mt-2 text-sm font-medium">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.generatedAt))}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scenario</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Projected load</TableHead>
              <TableHead>Pressure signals</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.scenarios.map((scenario) => {
              const blockedProjectionCount = scenario.projections.filter((projection) => projection.status === "blocked").length;
              const watchedProjectionCount = scenario.projections.filter((projection) => projection.status === "watch").length;

              return (
                <TableRow key={scenario.id}>
                  <TableCell className="max-w-[260px] whitespace-normal">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <Gauge className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{scenario.label}</p>
                        <p className="text-xs text-muted-foreground">{scenario.totalDeltaPercent}% average added load</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="gap-1 rounded-md" variant={statusVariant(scenario.status)}>
                      <StatusIcon status={scenario.status} />
                      {scenario.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[220px] whitespace-normal text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{scenario.worstProjectedUsagePercent}% worst resource</p>
                    <p className="mt-1">
                      {blockedProjectionCount} blocked, {watchedProjectionCount} watch
                    </p>
                  </TableCell>
                  <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{scenario.evidence}</p>
                  </TableCell>
                  <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{scenario.nextAction}</p>
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
