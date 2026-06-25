"use client";

import {
  ClipboardCopy,
  Download,
  FileArchive,
  FileJson2,
  HeartPulse,
  ListChecks,
  ShieldCheck,
  Wrench,
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
  AdminAutomationRunbookCategory,
  AdminAutomationRunbookCenterReport,
  AdminAutomationRunbookStatus,
} from "@/features/admin/admin-automation-runbook-center";
import {
  getAdminAutomationRunbookCenterCsv,
  getAdminAutomationRunbookCenterJson,
  getAdminAutomationRunbookCenterMarkdown,
} from "@/features/admin/admin-automation-runbook-center-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminAutomationRunbookCenterPanelProps = {
  report: AdminAutomationRunbookCenterReport;
};

export function AdminAutomationRunbookCenterPanel({
  report,
}: AdminAutomationRunbookCenterPanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getAdminAutomationRunbookCenterJson(report),
      filename: "automation-runbook-center.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminAutomationRunbookCenterCsv(report),
      filename: "automation-runbook-center.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminAutomationRunbookCenterMarkdown(report),
      filename: "automation-runbook-center.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminAutomationRunbookCenterMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="size-4" />
            Automation runbook center
          </CardTitle>
          <CardDescription>
            Scheduled health checks, repair actions, incident drills, and
            release evidence bundles for production operators.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Badge variant="outline">{report.commandCount} commands</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Health" value={report.scheduledHealthCount} />
          <Metric label="Repairs" value={report.repairActionCount} />
          <Metric label="Drills" value={report.incidentDrillCount} />
          <Metric label="Bundles" value={report.evidenceBundleCount} />
          <Metric label="Review" value={report.reviewCount} />
          <Metric label="Blocked" value={report.blockedCount} />
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {report.runbooks.map((runbook) => {
            const Icon = getCategoryIcon(runbook.category);

            return (
              <div
                key={runbook.id}
                className="rounded-md border border-border bg-muted/20 p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium">
                      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{runbook.title}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="outline">{runbook.category}</Badge>
                      <Badge variant={getStatusVariant(runbook.status)}>
                        {runbook.status}
                      </Badge>
                      <Badge variant="outline">{runbook.cadence}</Badge>
                      <Badge variant="outline">{runbook.owner}</Badge>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {runbook.objective}
                </p>
                <div className="mt-3 grid gap-2 text-xs md:grid-cols-4">
                  <Info label="Rows" value={`${runbook.rowCount}`} />
                  <Info label="Commands" value={`${runbook.commandCount}`} />
                  <Info label="Blocked" value={`${runbook.blockedSignalCount}`} />
                  <Info label="Review" value={`${runbook.reviewSignalCount}`} />
                </div>
                <div className="mt-2 truncate font-mono text-[11px] text-muted-foreground">
                  {runbook.evidenceBundle}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">Highest priority runbook rows</div>
            <Badge variant="outline">{report.rows.length} rows</Badge>
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {report.rows.slice(0, 10).map((row) => (
              <div
                key={row.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate font-medium">{row.label}</div>
                  <Badge variant={getStatusVariant(row.status)}>
                    {row.status}
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="outline">{row.category}</Badge>
                  <Badge variant="outline">{row.cadence}</Badge>
                  <Badge variant="outline">{row.owner}</Badge>
                </div>
                <p className="mt-2 text-muted-foreground">{row.evidence}</p>
                <div className="mt-2 rounded-md border border-border bg-background p-2 font-mono text-[11px] text-muted-foreground">
                  {row.command}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
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

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-foreground">{value}</div>
    </div>
  );
}

function getCategoryIcon(category: AdminAutomationRunbookCategory) {
  if (category === "scheduled-health") {
    return HeartPulse;
  }

  if (category === "repair-action") {
    return Wrench;
  }

  if (category === "incident-drill") {
    return ShieldCheck;
  }

  return FileArchive;
}

function getStatusVariant(status: AdminAutomationRunbookStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
