"use client";

import { CheckCircle2, Clock3, Code2, Database, KeyRound, PackageCheck, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { RuntimeVersionWatchItemId, RuntimeVersionWatchStatus, RuntimeVersionWatchlistReport } from "@/features/projects/runtime-version-watchlist";

const itemIcon: Record<RuntimeVersionWatchItemId, typeof PackageCheck> = {
  "better-auth": KeyRound,
  bun: Code2,
  drizzle: Database,
  nextjs: PackageCheck,
  tauri: ShieldAlert,
  three: PackageCheck,
  turso: Database,
};

function statusVariant(status: RuntimeVersionWatchStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: RuntimeVersionWatchStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  if (status === "watch") {
    return <Clock3 className="size-3.5" />;
  }

  return <TriangleAlert className="size-3.5" />;
}

export function RuntimeVersionWatchlistPanel({ report }: { report: RuntimeVersionWatchlistReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="size-4" />
              Runtime version watchlist
            </CardTitle>
            <CardDescription>Upgrade readiness for framework, runtime, desktop, auth, database, and 3D renderer dependencies.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.worstStatus)}>
              <StatusIcon status={report.summary.worstStatus} />
              {report.summary.worstStatus}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.weightedScore}/100 readiness
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
            <p className="text-xs text-muted-foreground">Tracked stacks</p>
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
              <TableHead>Stack</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current evidence</TableHead>
              <TableHead>Coverage</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.items.map((item) => {
              const Icon = itemIcon[item.id];

              return (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[320px] whitespace-normal">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <Icon className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.category} - {item.ownerHint}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="gap-1 rounded-md" variant={statusVariant(item.status)}>
                      <StatusIcon status={item.status} />
                      {item.readinessScore}/100
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-2 font-mono">{item.currentVersion}</p>
                    <p className="mt-1 line-clamp-2">{item.upgradeFocus}</p>
                  </TableCell>
                  <TableCell className="max-w-[280px] whitespace-normal text-xs text-muted-foreground">
                    <p>{item.requiredScripts.length} mapped checks</p>
                    {item.missingPackages.length > 0 ? <p className="mt-1 text-destructive">Missing packages: {item.missingPackages.join(", ")}</p> : null}
                    {item.missingScripts.length > 0 ? <p className="mt-1">Missing scripts: {item.missingScripts.join(", ")}</p> : null}
                  </TableCell>
                  <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{item.nextAction}</p>
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
