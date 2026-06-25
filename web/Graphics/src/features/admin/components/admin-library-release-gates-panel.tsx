"use client";

import { ClipboardCopy, Download, FileJson2, GitPullRequest } from "lucide-react";
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
  AdminLibraryReleaseGateReport,
  AdminLibraryReleaseGateStatus,
} from "@/features/admin/admin-library-release-gates";
import {
  getAdminLibraryReleaseGateCsv,
  getAdminLibraryReleaseGateJson,
  getAdminLibraryReleaseGateMarkdown,
} from "@/features/admin/admin-library-release-gates-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminLibraryReleaseGatesPanelProps = {
  report: AdminLibraryReleaseGateReport;
};

export function AdminLibraryReleaseGatesPanel({
  report,
}: AdminLibraryReleaseGatesPanelProps) {
  const rows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"));

  function exportJson() {
    downloadTextFile({
      content: getAdminLibraryReleaseGateJson(report),
      filename: "organization-library-release-gates.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminLibraryReleaseGateCsv(report),
      filename: "organization-library-release-gates.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminLibraryReleaseGateMarkdown(report),
      filename: "organization-library-release-gates.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminLibraryReleaseGateMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <GitPullRequest className="size-4" />
            Organization library release gates
          </CardTitle>
          <CardDescription>
            Component readiness, token coverage, approval evidence, and rollback
            readiness for design-system releases.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Badge variant={report.canRelease ? "secondary" : "outline"}>
            {report.canRelease ? "release ready" : "release gated"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Library files" value={report.componentFileCount} />
          <Metric label="Components" value={report.componentCount} />
          <Metric
            label="Token coverage"
            value={`${report.tokenCoveragePercent}%`}
          />
          <Metric label="Approvals" value={report.releaseApprovalCount} />
          <Metric label="Rollback score" value={report.rollbackScore} />
          <Metric
            label="Gate rows"
            value={`${report.readyCount}/${report.rows.length}`}
          />
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          {rows.map((row) => (
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

        <div className="grid gap-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium">Library file queue</div>
            <Badge variant="outline">
              {report.readyLibraryFileCount} ready /{" "}
              {report.reviewLibraryFileCount} review /{" "}
              {report.blockedLibraryFileCount} blocked
            </Badge>
          </div>
          {report.files.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-muted-foreground">
              No component-library files were found in the loaded admin window.
            </div>
          ) : (
            <div className="grid gap-2 lg:grid-cols-2">
              {report.files.slice(0, 8).map((file) => (
                <div
                  key={file.fileId}
                  className="rounded-md border border-border bg-muted/20 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{file.fileName}</div>
                      <div className="truncate text-muted-foreground">
                        {file.ownerEmail}
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(file.readinessStatus)}>
                      {file.readinessStatus}
                    </Badge>
                  </div>
                  <div className="mt-2 grid gap-1 text-muted-foreground">
                    <span>Readiness score: {file.readinessScore}</span>
                    <span>Components: {file.componentCount}</span>
                    <span>Token coverage: {file.tokenCoveragePercent}%</span>
                    <span>
                      Pending updates: {file.pendingUpdateInstanceCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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

function getStatusVariant(status: AdminLibraryReleaseGateStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
