"use client";

import {
  ClipboardCopy,
  Download,
  FileJson2,
  Rocket,
  ShieldCheck,
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
  AdminReleasePublicationGateReport,
  AdminReleasePublicationGateStatus,
} from "@/features/admin/admin-release-publication-gates";
import {
  getAdminReleasePublicationGateCsv,
  getAdminReleasePublicationGateJson,
  getAdminReleasePublicationGateMarkdown,
} from "@/features/admin/admin-release-publication-gates-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminReleasePublicationGatesPanelProps = {
  report: AdminReleasePublicationGateReport;
};

export function AdminReleasePublicationGatesPanel({
  report,
}: AdminReleasePublicationGatesPanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getAdminReleasePublicationGateJson(report),
      filename: "release-publication-gates.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminReleasePublicationGateCsv(report),
      filename: "release-publication-gates.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminReleasePublicationGateMarkdown(report),
      filename: "release-publication-gates.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminReleasePublicationGateMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            Release publication gates
          </CardTitle>
          <CardDescription>
            Deploy smoke, publish channels, public links, access budget,
            collaboration handoff, and approval evidence in one signoff view.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Badge variant={report.canPublish ? "secondary" : "outline"}>
            <Rocket className="size-3" />
            {report.canPublish ? "publish ready" : "publication gated"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Deploy" value={report.deploySmokeScore} />
          <Metric label="Channels" value={report.publishChannelScore} />
          <Metric label="Links" value={report.publicLinkScore} />
          <Metric label="Access" value={report.accessBudgetScore} />
          <Metric label="Collab" value={report.collaborationScore} />
          <Metric label="Approvals" value={report.approvalSnapshotCount} />
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          {report.rows.map((row) => (
            <div
              key={row.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{row.label}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">{row.category}</Badge>
                    <Badge variant={getStatusVariant(row.status)}>
                      {row.status}
                    </Badge>
                    <Badge variant="outline">{row.value}</Badge>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{row.detail}</p>
              <p className="mt-2 text-xs">{row.recommendation}</p>
              {row.target ? (
                <div className="mt-2 truncate font-mono text-[10px] text-muted-foreground">
                  {row.target}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="grid gap-2 text-xs md:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Ready channels"
            value={report.readyPublishChannelCount}
          />
          <Metric
            label="Release-safe links"
            value={report.releaseSafeSurfaceCount}
          />
          <Metric
            label="Collab escalations"
            value={report.escalationQueueCount}
          />
          <Metric label="Risky shares" value={report.riskyShareCount} />
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

function getStatusVariant(status: AdminReleasePublicationGateStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
