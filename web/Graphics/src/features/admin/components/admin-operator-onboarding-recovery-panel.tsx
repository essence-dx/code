"use client";

import {
  ClipboardCheck,
  ClipboardCopy,
  Download,
  FileJson2,
  LifeBuoy,
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
  AdminOperatorOnboardingRecoveryReport,
  AdminOperatorOnboardingRecoveryStatus,
} from "@/features/admin/admin-operator-onboarding-recovery";
import {
  getAdminOperatorOnboardingRecoveryCsv,
  getAdminOperatorOnboardingRecoveryJson,
  getAdminOperatorOnboardingRecoveryMarkdown,
} from "@/features/admin/admin-operator-onboarding-recovery";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminOperatorOnboardingRecoveryPanelProps = {
  report: AdminOperatorOnboardingRecoveryReport;
};

export function AdminOperatorOnboardingRecoveryPanel({
  report,
}: AdminOperatorOnboardingRecoveryPanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getAdminOperatorOnboardingRecoveryJson(report),
      filename: "admin-operator-onboarding-recovery.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminOperatorOnboardingRecoveryCsv(report),
      filename: "admin-operator-onboarding-recovery.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminOperatorOnboardingRecoveryMarkdown(report),
      filename: "admin-operator-onboarding-recovery.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminOperatorOnboardingRecoveryMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <LifeBuoy className="size-4" />
            Operator onboarding and recovery
          </CardTitle>
          <CardDescription>
            Prerequisite checks, sample-data health, restore drills, and
            exportable handoff packets for admin operators.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Badge variant="outline">{report.playbookCount} playbooks</Badge>
          <Badge variant="outline">{report.handoffExportCount} exports</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-4">
          <Metric label="Blocked playbooks" value={report.blockedPlaybookCount} />
          <Metric label="Review playbooks" value={report.reviewPlaybookCount} />
          <Metric label="Blocked steps" value={report.blockedStepCount} />
          <Metric label="Sample issues" value={report.sampleDataIssueCount} />
        </div>

        <div className="grid gap-2 xl:grid-cols-2">
          {report.playbooks.map((playbook) => (
            <div
              key={playbook.id}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{playbook.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">{playbook.track}</Badge>
                    <Badge variant={getStatusVariant(playbook.status)}>
                      {playbook.status}
                    </Badge>
                    <Badge variant="outline">{playbook.owner}</Badge>
                  </div>
                </div>
                <Badge variant="outline">{playbook.stepCount} steps</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {playbook.objective}
              </p>
              <div className="mt-3 grid gap-2">
                {playbook.steps.map((step) => (
                  <div
                    key={step.id}
                    className="rounded-md border border-border bg-background p-2 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-medium">{step.label}</div>
                      <Badge variant={getStatusVariant(step.status)}>
                        {step.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {step.evidence}
                    </p>
                    <p className="mt-1">{step.expectedResult}</p>
                    {step.command ? (
                      <div className="mt-2 break-words rounded border border-border bg-muted/30 px-2 py-1 font-mono text-[11px]">
                        {step.command}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-2 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <ClipboardCheck className="size-3.5" />
            Handoff exports
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {report.handoffExports.map((handoff) => (
              <div
                key={handoff.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{handoff.label}</div>
                  <Badge variant={getStatusVariant(handoff.status)}>
                    {handoff.status}
                  </Badge>
                </div>
                <p className="mt-2 text-muted-foreground">{handoff.summary}</p>
                <div className="mt-2 break-words font-mono text-[11px]">
                  {handoff.filename}
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

function getStatusVariant(status: AdminOperatorOnboardingRecoveryStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
