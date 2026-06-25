"use client";

import { ClipboardCopy, Download, FileJson2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type AdminOperationalIncidentReport,
  type AdminOperationalIncidentStatus,
} from "@/features/admin/admin-operational-incidents";
import {
  getAdminOperationalIncidentCsv,
  getAdminOperationalIncidentJson,
  getAdminOperationalIncidentMarkdown,
} from "@/features/admin/admin-operational-incidents-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminOperationalIncidentsPanelProps = {
  report: AdminOperationalIncidentReport;
};

export function AdminOperationalIncidentsPanel({
  report,
}: AdminOperationalIncidentsPanelProps) {
  const rows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"))
    .slice(0, 8);

  function exportJson() {
    downloadTextFile({
      content: getAdminOperationalIncidentJson(report),
      filename: "admin-operational-incidents.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminOperationalIncidentCsv(report),
      filename: "admin-operational-incidents.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminOperationalIncidentMarkdown(report),
      filename: "admin-operational-incidents.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminOperationalIncidentMarkdown(report),
    );
  }

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ShieldAlert className="size-4" />
            Operational incident review
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Failed auth telemetry, email delivery, stale sessions, and public
            share risk.
          </p>
        </div>
        <Badge variant={getStatusVariant(report.status)}>
          {report.status} {report.score}
        </Badge>
      </div>

      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
        <Metric label="Auth failures" value={report.failedAuthAttemptCount} />
        <Metric label="Email failed" value={report.failedEmailDeliveryCount} />
        <Metric label="Stale sessions" value={report.staleSessionCount} />
        <Metric label="Risky shares" value={report.riskyShareCount} />
      </div>

      <div className="mt-3 grid gap-2 text-xs lg:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-md border border-border bg-background p-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{row.label}</span>
              <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge variant="outline">{row.kind}</Badge>
              {row.count > 0 ? (
                <Badge variant="outline">{row.count} records</Badge>
              ) : null}
              {row.latestAt ? (
                <Badge variant="outline">{formatDate(row.latestAt)}</Badge>
              ) : null}
            </div>
            <p className="mt-2 line-clamp-2 text-muted-foreground">
              {row.detail}
            </p>
            {row.target ? (
              <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                {row.target}
              </div>
            ) : null}
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

function getStatusVariant(status: AdminOperationalIncidentStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
