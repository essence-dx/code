"use client";

import { Archive, CheckCircle2, ClipboardList, DatabaseBackup, Download, FileClock, ShieldAlert, TriangleAlert, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ReleaseArchiveExplorerId, ReleaseArchiveExplorerReport, ReleaseArchiveExplorerStatus } from "@/features/projects/release-archive-explorer";

const archiveIcon: Record<ReleaseArchiveExplorerId, typeof Archive> = {
  "incident-postmortems": ClipboardList,
  "release-drill-history": FileClock,
  "release-evidence-bundles": Archive,
  "resource-guardrail-snapshots": WalletCards,
  "restore-rehearsals": DatabaseBackup,
};

function statusVariant(status: ReleaseArchiveExplorerStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: ReleaseArchiveExplorerStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return <TriangleAlert className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No archive activity";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function ReleaseArchiveExplorerPanel({ report }: { report: ReleaseArchiveExplorerReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Archive className="size-4" />
              Release archive explorer
            </CardTitle>
            <CardDescription>Unified archive view for release evidence, postmortems, drill history, restore rehearsals, and resource guardrails.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.worstStatus)}>
              <StatusIcon status={report.summary.worstStatus} />
              {report.summary.worstStatus}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.governanceScore}/100 governance
            </Badge>
            <Badge className="rounded-md" variant={report.summary.blockedCount > 0 ? "destructive" : "outline"}>
              {report.summary.blockedCount} blocked
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Archives</p>
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
            <p className="text-xs text-muted-foreground">Records</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.evidenceRecordCount}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Latest activity</p>
            <p className="mt-2 text-sm font-medium">{formatDate(report.summary.latestActivityAt)}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Archive</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Records</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Next action</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((row) => {
              const Icon = archiveIcon[row.id];

              return (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[300px] whitespace-normal">
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
                  <TableCell className="whitespace-normal text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{row.recordCount}</p>
                    <p className="mt-1">{formatDate(row.latestActivityAt)}</p>
                  </TableCell>
                  <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{row.evidence}</p>
                  </TableCell>
                  <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{row.nextAction}</p>
                  </TableCell>
                  <TableCell>
                    {row.downloadHref ? (
                      <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href={row.downloadHref}>
                        <Download className="size-4" />
                        Open
                      </a>
                    ) : (
                      <Badge className="gap-1 rounded-md" variant="outline">
                        <ShieldAlert className="size-3.5" />
                        In dashboard
                      </Badge>
                    )}
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
