"use client";

import {
  ClipboardCheck,
  ClipboardCopy,
  Download,
  FileJson2,
  MonitorDown,
  RotateCcw,
  ServerCog,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  AdminOperatorRehearsalKind,
  AdminOperatorRehearsalReport,
  AdminOperatorRehearsalRun,
  AdminOperatorRehearsalStatus,
} from "@/features/admin/admin-operator-rehearsals";
import {
  getAdminOperatorRehearsalsCsv,
  getAdminOperatorRehearsalsJson,
  getAdminOperatorRehearsalsMarkdown,
} from "@/features/admin/admin-operator-rehearsals-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminOperatorRehearsalsPanelProps = {
  report: AdminOperatorRehearsalReport;
};

export function AdminOperatorRehearsalsPanel({
  report,
}: AdminOperatorRehearsalsPanelProps) {
  const sortedRuns = report.runs
    .filter((run) => run.status !== "ready")
    .concat(report.runs.filter((run) => run.status === "ready"));

  function exportJson() {
    downloadTextFile({
      content: getAdminOperatorRehearsalsJson(report),
      filename: "admin-operator-rehearsals.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminOperatorRehearsalsCsv(report),
      filename: "admin-operator-rehearsals.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminOperatorRehearsalsMarkdown(report),
      filename: "admin-operator-rehearsals.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(getAdminOperatorRehearsalsMarkdown(report));
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="size-4" />
            Operator rehearsals
          </CardTitle>
          <CardDescription>
            Restore, import/export, public share privacy, desktop handoff, and
            self-hosted recovery drills with repeatable evidence and commands.
          </CardDescription>
        </div>
        <Badge variant={getStatusVariant(report.status)}>
          {report.status} {report.score}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Runs" value={report.runCount} />
          <Metric label="Ready" value={report.readyRunCount} />
          <Metric label="Review" value={report.reviewRunCount} />
          <Metric label="Blocked" value={report.blockedRunCount} />
          <Metric label="Steps" value={report.stepCount} />
          <Metric label="Commands" value={report.commandCount} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {sortedRuns.map((run) => (
            <RehearsalRunCard key={run.id} run={run} />
          ))}
        </div>

        <div className="grid gap-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">Rehearsal commands</div>
            <Badge variant="outline">{report.commands.length} commands</Badge>
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {report.commands.slice(0, 10).map((command) => (
              <div
                key={command}
                className="rounded-md border border-border bg-muted/20 p-3 font-mono text-[11px] text-muted-foreground"
              >
                {command}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Button type="button" size="sm" variant="outline" onClick={exportJson}>
            <FileJson2 className="size-3.5" />
            JSON
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={exportCsv}>
            <Download className="size-3.5" />
            CSV
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={exportMarkdown}
          >
            <Download className="size-3.5" />
            MD
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={copyMarkdown}
          >
            <ClipboardCopy className="size-3.5" />
            Copy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RehearsalRunCard({ run }: { run: AdminOperatorRehearsalRun }) {
  const Icon = getRunIcon(run.kind);
  const sortedSteps = run.steps
    .filter((step) => step.status !== "ready")
    .concat(run.steps.filter((step) => step.status === "ready"));

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-medium">
            <Icon className="size-4" />
            <span className="truncate">{run.label}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{run.objective}</p>
        </div>
        <Badge variant={getStatusVariant(run.status)}>{run.status}</Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
        <Metric label="Score" value={run.score} />
        <Metric label="Ready" value={run.readyStepCount} />
        <Metric label="Review" value={run.reviewStepCount} />
        <Metric label="Blocked" value={run.blockedStepCount} />
      </div>

      <div className="mt-3 flex flex-wrap gap-1 text-xs">
        <Badge variant="outline">{run.ownerRole}</Badge>
        <Badge variant="outline">{run.cadence}</Badge>
        <Badge variant="outline">{run.commandCount} commands</Badge>
      </div>

      <div className="mt-3 grid gap-2">
        {sortedSteps.map((step) => (
          <div
            key={step.id}
            className="rounded-md border border-border bg-background/70 p-3 text-xs"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{step.label}</div>
              <Badge variant={getStatusVariant(step.status)}>{step.status}</Badge>
            </div>
            <p className="mt-2 text-muted-foreground">{step.evidence}</p>
            <p className="mt-2">{step.expectedResult}</p>
            {step.command ? (
              <div className="mt-2 rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
                {step.command}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-background/70 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function getRunIcon(kind: AdminOperatorRehearsalKind) {
  if (kind === "restore") {
    return RotateCcw;
  }

  if (kind === "import-export") {
    return Upload;
  }

  if (kind === "desktop-handoff") {
    return MonitorDown;
  }

  if (kind === "self-hosted-recovery") {
    return ServerCog;
  }

  return ShieldCheck;
}

function getStatusVariant(status: AdminOperatorRehearsalStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
