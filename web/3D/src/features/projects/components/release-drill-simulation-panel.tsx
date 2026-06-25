"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock3, Cpu, Download, FileJson2, History, Loader2, Radar, RotateCcw, Save, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ReleaseDrillHistoryReport } from "@/features/projects/release-drill-history";
import type { ReleaseDrillScenario, ReleaseDrillSimulationReport, ReleaseDrillSimulationRow, ReleaseDrillStatus } from "@/features/projects/release-drill-simulation";

const scenarioIcon: Record<ReleaseDrillScenario, typeof ShieldCheck> = {
  "cad-worker-outage": Cpu,
  "certificate-expiry": ShieldAlert,
  "deploy-smoke-failure": Radar,
  rollback: RotateCcw,
};

function statusVariant(status: ReleaseDrillStatus) {
  if (status === "blocked" || status === "missing") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function statusIcon(status: ReleaseDrillStatus) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  if (status === "watch") {
    return <Clock3 className="size-3.5" />;
  }

  return <TriangleAlert className="size-3.5" />;
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

function formatByteSize(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  return `${Math.round(value / 1024)} KB`;
}

function DrillRow({ row }: { row: ReleaseDrillSimulationRow }) {
  const Icon = scenarioIcon[row.id];

  return (
    <TableRow>
      <TableCell className="max-w-[340px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.label}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{row.blastRadius}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          {statusIcon(row.status)}
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{row.recoveryTargetMinutes} min target</p>
        <p className="mt-1">{row.ownerHint}</p>
      </TableCell>
      <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.evidence}</p>
        <p className="mt-1 line-clamp-2">{row.exercise[0]}</p>
      </TableCell>
      <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.successCriteria[0]}</p>
        <p className="mt-1 line-clamp-2">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function ReleaseDrillSimulationPanel({
  canPersist,
  history,
  report,
  workspaceId,
}: {
  canPersist?: boolean;
  history?: ReleaseDrillHistoryReport | null;
  report: ReleaseDrillSimulationReport;
  workspaceId: string;
}) {
  const [drillHistory, setDrillHistory] = useState(history ?? null);
  const [isSaving, setIsSaving] = useState(false);

  async function saveDrillRun() {
    if (!canPersist || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/release-drill-history`, {
        body: JSON.stringify({ report }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Release drill run could not be saved.");
      }

      const historyResponse = await fetch(`/api/workspaces/${workspaceId}/release-drill-history`, { cache: "no-store" });
      const historyPayload = (await historyResponse.json().catch(() => null)) as { error?: string; history?: ReleaseDrillHistoryReport } | null;

      if (!historyResponse.ok || !historyPayload?.history) {
        throw new Error(historyPayload?.error ?? "Release drill run was saved, but history refresh failed.");
      }

      setDrillHistory(historyPayload.history);
      toast.success("Release drill run saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Release drill run could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radar className="size-4" />
              Release drill simulation
            </CardTitle>
            <CardDescription>Rollback, certificate expiry, deploy-smoke failure, and CAD worker outage readiness from current launch evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.worstStatus)}>
              {statusIcon(report.summary.worstStatus)}
              {report.summary.worstStatus}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.score}/100 drill readiness
            </Badge>
            <Badge className="rounded-md" variant={report.summary.blockedCount > 0 ? "destructive" : "outline"}>
              {report.summary.blockedCount} blocked
            </Badge>
            {canPersist ? (
              <Button className="h-8 gap-2" disabled={isSaving} onClick={saveDrillRun} size="sm" type="button" variant="outline">
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save run
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile icon={<ShieldCheck className="size-4" />} label="Ready drills" value={`${report.summary.readyCount}/${report.summary.totalCount}`} />
          <SummaryTile icon={<Clock3 className="size-4" />} label="Watch drills" value={`${report.summary.watchCount}`} />
          <SummaryTile icon={<TriangleAlert className="size-4" />} label="Missing drills" value={`${report.summary.missingCount}`} />
          <SummaryTile icon={<ShieldAlert className="size-4" />} label="Blocked drills" value={`${report.summary.blockedCount}`} />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scenario</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recovery</TableHead>
              <TableHead>Evidence and exercise</TableHead>
              <TableHead>Criteria and action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <DrillRow key={row.id} row={row} />)}</TableBody>
        </Table>

        {drillHistory ? (
          <div className="grid gap-3 rounded-md border bg-background p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <History className="size-4" />
                  Saved drill history
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {drillHistory.summary.totalRecordCount} saved runs, {drillHistory.summary.totalDrillCount} scenario outcomes, latest saved {formatDate(drillHistory.summary.latestSavedAt)}.
                </p>
              </div>
              {drillHistory.summary.latestContentHash ? (
                <Badge className="max-w-full rounded-md font-mono" variant="outline">
                  <span className="truncate">{drillHistory.summary.latestContentHash}</span>
                </Badge>
              ) : null}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Saved</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Next due</TableHead>
                  <TableHead>Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drillHistory.records.length > 0 ? (
                  drillHistory.records.slice(0, 5).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="whitespace-normal">
                        <p className="font-medium">{formatDate(record.createdAt)}</p>
                        <p className="line-clamp-1 font-mono text-xs text-muted-foreground">{record.contentHash}</p>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <p className="font-medium">{record.actor.name ?? "Unknown actor"}</p>
                        <p className="text-xs text-muted-foreground">{record.actor.email ?? "No email snapshot"}</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <p>{record.score}/100 score</p>
                        <p>{record.readyCount} ready, {record.blockedCount} blocked</p>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(record.drillRows[0]?.dueAt ?? null)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href={`/api/workspaces/${workspaceId}/release-drill-history/${record.id}?format=json`}>
                            <FileJson2 className="size-3.5" />
                            JSON {formatByteSize(record.jsonByteSize)}
                          </a>
                          <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href={`/api/workspaces/${workspaceId}/release-drill-history/${record.id}?format=csv`}>
                            <Download className="size-3.5" />
                            CSV {formatByteSize(record.csvByteSize)}
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={5}>
                      No saved release drill runs yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SummaryTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-xl font-semibold">{value}</p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">{icon}</span>
      </div>
    </div>
  );
}
