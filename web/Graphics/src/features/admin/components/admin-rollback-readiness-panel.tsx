"use client";

import { ClipboardCopy, DatabaseBackup, Download, FileJson2 } from "lucide-react";
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
  AdminRollbackReadinessReport,
  AdminRollbackReadinessStatus,
} from "@/features/admin/admin-rollback-readiness";
import {
  getAdminRollbackReadinessCsv,
  getAdminRollbackReadinessJson,
  getAdminRollbackReadinessMarkdown,
} from "@/features/admin/admin-rollback-readiness-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminRollbackReadinessPanelProps = {
  report: AdminRollbackReadinessReport;
};

export function AdminRollbackReadinessPanel({
  report,
}: AdminRollbackReadinessPanelProps) {
  const rows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"));

  function exportJson() {
    downloadTextFile({
      content: getAdminRollbackReadinessJson(report),
      filename: "restore-rollback-readiness.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminRollbackReadinessCsv(report),
      filename: "restore-rollback-readiness.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminRollbackReadinessMarkdown(report),
      filename: "restore-rollback-readiness.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminRollbackReadinessMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <DatabaseBackup className="size-4" />
            Restore and rollback readiness
          </CardTitle>
          <CardDescription>
            Versions, public shares, database state, and deployment links for
            release recovery.
          </CardDescription>
        </div>
        <Badge variant={getStatusVariant(report.status)}>
          {report.status} {report.score}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Versions" value={report.versionAnchorCount} />
          <Metric label="No versions" value={report.filesWithoutVersions} />
          <Metric label="Stale shares" value={report.staleShareCount} />
          <Metric label="Elevated shares" value={report.elevatedShareCount} />
          <Metric label="Share audits" value={report.shareAuditEventCount} />
          <Metric label="Deploy links" value={report.deploymentLinkCount} />
        </div>

        <div className="grid gap-2 text-xs lg:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.id}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{row.label}</span>
                <Badge variant={getStatusVariant(row.status)}>
                  {row.status}
                </Badge>
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge variant="outline">{row.category}</Badge>
                {row.count > 0 ? (
                  <Badge variant="outline">{row.count} records</Badge>
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

        <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
            <div className="font-medium">Database state</div>
            <div className="mt-2 grid gap-1 text-muted-foreground">
              <span>Kind: {report.database.databaseKind}</span>
              <span>Users: {report.database.users}</span>
              <span>Sessions: {report.database.sessions}</span>
              <span>Active files: {report.database.activeFiles}</span>
              <span>Active shares: {report.database.activeShares}</span>
              <span>Versions: {report.database.versions}</span>
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
            <div className="font-medium">Latest version anchors</div>
            <div className="mt-2 grid gap-1 text-muted-foreground">
              {report.latestVersions.slice(0, 5).map((version) => (
                <span key={version.id} className="truncate">
                  {version.fileName} / {version.versionName}
                </span>
              ))}
              {report.latestVersions.length === 0 ? (
                <span>No recent versions loaded.</span>
              ) : null}
            </div>
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: AdminRollbackReadinessStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
