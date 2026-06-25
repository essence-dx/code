"use client";

import { Archive, CheckCircle2, Download, Gauge, Rocket, SatelliteDish, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  WorkspacePolicySimulationDomain,
  WorkspacePolicySimulationReport,
  WorkspacePolicySimulationStatus,
} from "@/features/projects/workspace-policy-simulator";

const domainIcon: Record<WorkspacePolicySimulationDomain, typeof ShieldCheck> = {
  permission: ShieldCheck,
  quota: Gauge,
  release: Rocket,
  retention: Archive,
  webhook: SatelliteDish,
};

function statusVariant(status: WorkspacePolicySimulationStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: WorkspacePolicySimulationStatus }) {
  return status === "ready" ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function formatTimestamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function SignalList({ blockers, warnings }: { blockers: string[]; warnings: string[] }) {
  if (blockers.length === 0 && warnings.length === 0) {
    return <p className="text-xs text-muted-foreground">No blocking signals.</p>;
  }

  return (
    <div className="grid gap-2">
      {blockers.map((blocker) => (
        <div className="flex items-start gap-2" key={blocker}>
          <Badge className="mt-0.5 rounded-md text-[10px]" variant="destructive">
            block
          </Badge>
          <p className="line-clamp-2 text-xs text-muted-foreground">{blocker}</p>
        </div>
      ))}
      {warnings.map((warning) => (
        <div className="flex items-start gap-2" key={warning}>
          <Badge className="mt-0.5 rounded-md text-[10px]" variant="secondary">
            watch
          </Badge>
          <p className="line-clamp-2 text-xs text-muted-foreground">{warning}</p>
        </div>
      ))}
    </div>
  );
}

export function WorkspacePolicySimulatorPanel({ report }: { report: WorkspacePolicySimulationReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Workspace policy simulator
            </CardTitle>
            <CardDescription>Pre-enforcement checks for permission, retention, release, quota, and webhook policy changes.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.worstStatus)}>
              <StatusIcon status={report.summary.worstStatus} />
              {report.summary.worstStatus}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.simulationScore}/100 simulation
            </Badge>
            <Badge className="rounded-md" variant={report.summary.blockerCount > 0 ? "destructive" : "outline"}>
              {report.summary.blockerCount} blockers
            </Badge>
            <a className={buttonVariants({ className: "gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download data-icon="inline-start" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="policy changes checked" label="Simulations" value={`${report.summary.totalCount}`} />
          <SummaryTile detail="safe to enforce" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="needs owner review" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="must not enforce" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="explicit approvals" label="Approvals" value={`${report.summary.approvalRequiredCount}`} />
          <SummaryTile detail={formatTimestamp(report.generatedAt)} label="Generated" value={report.summary.worstStatus} />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Policy change</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Signals</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => {
              const Icon = domainIcon[row.domain];

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
                  <TableCell className="max-w-[360px] whitespace-normal">
                    <SignalList blockers={row.blockers} warnings={row.warnings} />
                  </TableCell>
                  <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{row.impact}</p>
                    <p className="mt-1 line-clamp-3">{row.evidence}</p>
                    <p className="mt-1">Approval required: {row.approvalRequired ? "yes" : "no"}</p>
                  </TableCell>
                  <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
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
