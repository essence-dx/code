"use client";

import { ClipboardCopy, Download, FileJson2, ServerCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type DeployEnvironmentPreflightReport,
  type DeployEnvironmentPreflightStatus,
} from "@/features/admin/deploy-environment-preflight";
import {
  getDeployEnvironmentPreflightCsv,
  getDeployEnvironmentPreflightJson,
  getDeployEnvironmentPreflightMarkdown,
} from "@/features/admin/deploy-environment-preflight-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type DeployEnvironmentPreflightPanelProps = {
  report: DeployEnvironmentPreflightReport;
};

export function DeployEnvironmentPreflightPanel({
  report,
}: DeployEnvironmentPreflightPanelProps) {
  const rows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"))
    .slice(0, 8);

  function exportJson() {
    downloadTextFile({
      content: getDeployEnvironmentPreflightJson(report),
      filename: "deploy-environment-preflight.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getDeployEnvironmentPreflightCsv(report),
      filename: "deploy-environment-preflight.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getDeployEnvironmentPreflightMarkdown(report),
      filename: "deploy-environment-preflight.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getDeployEnvironmentPreflightMarkdown(report),
    );
  }

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ServerCog className="size-4" />
            Deploy environment preflight
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Better Auth, Brevo OTP, Turso, app URL, and Vercel runtime readiness.
          </p>
        </div>
        <Badge variant={getStatusVariant(report.status)}>
          {report.status} {report.score}
        </Badge>
      </div>

      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
        <Metric label="Ready" value={report.readyCount} />
        <Metric label="Review" value={report.reviewCount} />
        <Metric label="Blocked" value={report.blockedCount} />
        <Metric label="Secrets" value={report.secretCount} />
      </div>

      <div className="mt-3 grid gap-2 text-xs lg:grid-cols-2">
        {rows.map((row) => (
          <div key={row.id} className="rounded-md border border-border bg-background p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{row.label}</span>
              <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
            </div>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
              {row.envKeys.join(" + ")}
            </div>
            <p className="mt-1 line-clamp-2 text-muted-foreground">
              {row.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
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
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: DeployEnvironmentPreflightStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
