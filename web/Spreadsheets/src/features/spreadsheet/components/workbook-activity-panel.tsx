"use client";

import { Download, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  auditLogsToCsv,
  createReportFileName,
  workbookAccessReportToCsv,
} from "@/features/audit/audit-report-export";
import type { AuditLogRow } from "@/features/audit/audit-log-service";
import type {
  WorkbookRole,
  WorkbookSharingSummary,
} from "@/features/workbooks/types";

function formatActivityDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
}

function formatMetadataValue(value: string | number | boolean | null) {
  if (value === null) {
    return "none";
  }

  return String(value);
}

function metadataPreview(metadata: AuditLogRow["metadata"]) {
  return Object.entries(metadata)
    .filter(([, value]) => value !== "" && value !== null)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${formatMetadataValue(value)}`)
    .join(" / ");
}

export function WorkbookActivityPanel({
  accessRole,
  logs,
  ownerEmail,
  sharing,
  workbookId,
  workbookName,
}: {
  accessRole: WorkbookRole;
  logs: AuditLogRow[];
  ownerEmail: string;
  sharing?: WorkbookSharingSummary;
  workbookId: string;
  workbookName: string;
}) {
  function downloadAuditCsv() {
    downloadTextFile(
      auditLogsToCsv(logs),
      createReportFileName({
        extension: "csv",
        prefix: `${workbookName} audit-log`,
      }),
      "text/csv;charset=utf-8",
    );
  }

  function downloadAccessCsv() {
    downloadTextFile(
      workbookAccessReportToCsv({
        accessRole,
        ownerEmail,
        sharing,
        workbookId,
        workbookName,
      }),
      createReportFileName({
        extension: "csv",
        prefix: `${workbookName} access-report`,
      }),
      "text/csv;charset=utf-8",
    );
  }

  return (
    <section className="border-t pt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Workbook activity</h2>
        </div>
        <Badge variant="secondary" className="font-mono">
          {logs.length}
        </Badge>
      </div>
      <div className="mb-3 grid gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={downloadAuditCsv}
          disabled={logs.length === 0}
        >
          <Download />
          Download audit CSV
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={downloadAccessCsv}
        >
          <Download />
          Download access report
        </Button>
      </div>
      {logs.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm leading-6 text-muted-foreground">
          No workbook activity has been recorded yet.
        </p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const metadata = metadataPreview(log.metadata);

            return (
              <section key={log.id} className="rounded-lg border bg-card p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="outline">{log.category}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatActivityDate(log.createdAt)}
                  </span>
                </div>
                <p className="text-sm font-medium">{log.summary}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {log.action}
                </p>
                <p className="mt-2 truncate text-xs text-muted-foreground">
                  {log.actorEmail}
                </p>
                {metadata ? (
                  <p className="mt-2 truncate text-xs text-muted-foreground">
                    {metadata}
                  </p>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

function downloadTextFile(content: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
