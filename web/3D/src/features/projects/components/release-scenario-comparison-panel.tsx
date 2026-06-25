import { Activity, Download, GitCompareArrows, Route, ShieldCheck, TriangleAlert, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ReleaseScenarioComparisonReport, ReleaseScenarioComparisonRow, ReleaseScenarioComparisonStatus } from "@/features/projects/release-scenario-comparison";

function statusVariant(status: ReleaseScenarioComparisonStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: ReleaseScenarioComparisonStatus }) {
  if (status === "ready") {
    return <ShieldCheck className="size-3.5" />;
  }

  return status === "watch" ? <Activity className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function SummaryTile({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function OwnerActionList({ row }: { row: ReleaseScenarioComparisonRow }) {
  if (row.ownerActions.length === 0) {
    return <p className="text-xs text-muted-foreground">No owner actions are mapped to this path.</p>;
  }

  return (
    <div className="grid gap-1.5">
      {row.ownerActions.slice(0, 2).map((action) => (
        <div className="grid gap-0.5" key={`${row.id}:${action.ownerName}:${action.dueAt}`}>
          <p className="line-clamp-1 text-xs font-medium">{action.ownerName}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">{action.action}</p>
        </div>
      ))}
    </div>
  );
}

function ScenarioRow({ row }: { row: ReleaseScenarioComparisonRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Route className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.label}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{row.description}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.readinessScore}/100</p>
      </TableCell>
      <TableCell className="whitespace-normal text-xs text-muted-foreground">
        <p>{row.costScore}/100 cost</p>
        <p className="mt-1">{row.riskScore}/100 risk</p>
        <p className="mt-1">{row.rollbackScore}/100 drill</p>
      </TableCell>
      <TableCell className="max-w-[280px] whitespace-normal">
        <OwnerActionList row={row} />
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{row.nextAction}</p>
        <p className="mt-1">
          {row.blockerCount} blockers, {row.warningCount} watch signals
        </p>
      </TableCell>
    </TableRow>
  );
}

export function ReleaseScenarioComparisonPanel({ report }: { report: ReleaseScenarioComparisonReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitCompareArrows className="size-4" />
              Release scenario comparison
            </CardTitle>
            <CardDescription>Board-level ranking for launch, maintenance, desktop campaign, and rollback paths.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.scenarioScore}/100
            </Badge>
            <Badge className="rounded-md" variant={report.summary.blockedCount > 0 ? "destructive" : "outline"}>
              {report.summary.blockedCount} blocked
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail={report.summary.status} label="Scenario score" value={`${report.summary.scenarioScore}/100`} />
          <SummaryTile detail="recommended path" label="Recommended" value={report.recommendedScenario.label} />
          <SummaryTile detail="ready paths" label="Ready" value={`${report.summary.readyCount}/${report.summary.totalCount}`} />
          <SummaryTile detail="watch paths" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="blocked paths" label="Blocked" value={`${report.summary.blockedCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Users className="size-4" />
            Recommended next action
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scenario</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Scores</TableHead>
              <TableHead>Owner actions</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <ScenarioRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
