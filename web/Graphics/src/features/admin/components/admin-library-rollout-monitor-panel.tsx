"use client";

import { ClipboardCopy, Download, FileJson2, Library } from "lucide-react";
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
  AdminLibraryRolloutMonitorReport,
  AdminLibraryRolloutStatus,
} from "@/features/admin/admin-library-rollout-monitor";
import {
  getAdminLibraryRolloutMonitorCsv,
  getAdminLibraryRolloutMonitorJson,
  getAdminLibraryRolloutMonitorMarkdown,
} from "@/features/admin/admin-library-rollout-monitor-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminLibraryRolloutMonitorPanelProps = {
  report: AdminLibraryRolloutMonitorReport;
};

export function AdminLibraryRolloutMonitorPanel({
  report,
}: AdminLibraryRolloutMonitorPanelProps) {
  const rows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"));

  function exportJson() {
    downloadTextFile({
      content: getAdminLibraryRolloutMonitorJson(report),
      filename: "organization-library-rollout-monitor.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminLibraryRolloutMonitorCsv(report),
      filename: "organization-library-rollout-monitor.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminLibraryRolloutMonitorMarkdown(report),
      filename: "organization-library-rollout-monitor.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminLibraryRolloutMonitorMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Library className="size-4" />
            Organization library rollout monitor
          </CardTitle>
          <CardDescription>
            Subscription drift, available updates, detached components, and
            release adoption across library publisher and subscriber files.
          </CardDescription>
        </div>
        <Badge variant={getStatusVariant(report.status)}>
          {report.status} {report.score}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Libraries" value={report.publishedLibraryCount} />
          <Metric label="Subscriber files" value={report.subscribedFileCount} />
          <Metric label="Components" value={report.subscribedComponentCount} />
          <Metric label="Instances" value={report.subscribedInstanceCount} />
          <Metric label="Updates" value={report.updateAvailableComponentCount} />
          <Metric label="Adoption" value={`${report.releaseAdoptionPercent}%`} />
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
                    <Badge variant="outline">{row.kind}</Badge>
                    <Badge variant={getStatusVariant(row.status)}>
                      {row.status}
                    </Badge>
                    <Badge variant="outline">{row.value}</Badge>
                    {row.latestAt ? (
                      <Badge variant="outline">{formatDate(row.latestAt)}</Badge>
                    ) : null}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">Library rollout queue</div>
            <Badge variant="outline">{report.libraries.length} libraries</Badge>
          </div>
          {report.libraries.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-muted-foreground">
              No published or subscribed libraries are loaded in the admin file
              window.
            </div>
          ) : (
            <div className="grid gap-2 lg:grid-cols-2">
              {report.libraries.slice(0, 8).map((library) => (
                <div
                  key={library.libraryId}
                  className="rounded-md border border-border bg-muted/20 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {library.libraryName}
                      </div>
                      <div className="truncate text-muted-foreground">
                        {library.teamName} / v{library.latestVersion}
                      </div>
                    </div>
                    <Badge variant={getStatusVariant(library.status)}>
                      {library.status}
                    </Badge>
                  </div>
                  <div className="mt-2 grid gap-1 text-muted-foreground">
                    <span>Adoption: {library.releaseAdoptionPercent}%</span>
                    <span>Subscriber files: {library.subscribedFileCount}</span>
                    <span>Components: {library.subscribedComponentCount}</span>
                    <span>Instances: {library.subscribedInstanceCount}</span>
                    <span>Updates: {library.updateAvailableComponentCount}</span>
                    <span>Detached: {library.detachedComponentCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium">File adoption queue</div>
            <Badge variant="outline">{report.files.length} files</Badge>
          </div>
          {report.files.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-muted-foreground">
              No library publisher or subscriber files are loaded.
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
                    <Badge variant={getStatusVariant(file.status)}>
                      {file.status}
                    </Badge>
                  </div>
                  <div className="mt-2 grid gap-1 text-muted-foreground">
                    <span>Adoption: {file.releaseAdoptionPercent}%</span>
                    <span>Subscriptions: {file.librarySubscriptionCount}</span>
                    <span>Components: {file.subscribedComponentCount}</span>
                    <span>Instances: {file.subscribedInstanceCount}</span>
                    <span>Drift: {file.subscriptionDriftCount}</span>
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

function getStatusVariant(status: AdminLibraryRolloutStatus) {
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
