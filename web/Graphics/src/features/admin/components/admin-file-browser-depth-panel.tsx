"use client";

import { ClipboardCopy, Download, FileJson2, FolderTree } from "lucide-react";
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
  AdminFileBrowserDepthReport,
  AdminFileBrowserDepthStatus,
} from "@/features/admin/admin-file-browser-depth";
import {
  getAdminFileBrowserDepthCsv,
  getAdminFileBrowserDepthJson,
  getAdminFileBrowserDepthMarkdown,
} from "@/features/admin/admin-file-browser-depth";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminFileBrowserDepthPanelProps = {
  report: AdminFileBrowserDepthReport;
};

export function AdminFileBrowserDepthPanel({
  report,
}: AdminFileBrowserDepthPanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getAdminFileBrowserDepthJson(report),
      filename: "admin-file-browser-depth.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminFileBrowserDepthCsv(report),
      filename: "admin-file-browser-depth.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminFileBrowserDepthMarkdown(report),
      filename: "admin-file-browser-depth.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(getAdminFileBrowserDepthMarkdown(report));
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="size-4" />
            File browser depth
          </CardTitle>
          <CardDescription>
            Team, project, and draft permission matrices with owner-transfer
            readiness, access request queues, and audit-backed exports.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Badge variant="outline">{report.matrixCount} matrices</Badge>
          <Badge variant="outline">{report.accessRequestQueueCount} requests</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-4">
          <Metric label="Blocked files" value={report.blockedFileCount} />
          <Metric label="Review files" value={report.reviewFileCount} />
          <Metric label="Owner transfers" value={report.ownerTransferQueueCount} />
          <Metric label="Audit-backed" value={report.auditBackedFileCount} />
        </div>

        <div className="grid gap-2 xl:grid-cols-2">
          {report.permissionMatrices.map((matrix) => (
            <div
              key={matrix.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{matrix.scopeKey}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant={getStatusVariant(matrix.status)}>
                      {matrix.status}
                    </Badge>
                    <Badge variant="outline">{matrix.scope}</Badge>
                    <Badge variant="outline">{matrix.fileCount} files</Badge>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                <Metric label="Editors" value={matrix.editorCount} />
                <Metric label="Commenters" value={matrix.commenterCount} />
                <Metric label="Viewers" value={matrix.viewerCount} />
                <Metric label="Public" value={matrix.publicShareCount} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {matrix.recommendation}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          <QueueCard
            title="Owner transfer queue"
            count={report.ownerTransferQueue.length}
          >
            {report.ownerTransferQueue.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-border bg-background p-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{item.fileName}</div>
                  <Badge variant={getStatusVariant(item.status)}>
                    {item.status}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{item.reason}</p>
                <p className="mt-1">
                  Candidates: {item.candidateEmails.join(", ") || "none"}
                </p>
              </div>
            ))}
          </QueueCard>

          <QueueCard
            title="Access request queue"
            count={report.accessRequestQueue.length}
          >
            {report.accessRequestQueue.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-border bg-background p-2 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{item.fileName}</div>
                  <Badge variant={getStatusVariant(item.status)}>
                    {item.status}
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">{item.riskReason}</p>
                <p className="mt-1">
                  {item.targetEmail}: {item.currentRole} to {item.requestedRole}
                </p>
              </div>
            ))}
          </QueueCard>
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

function QueueCard({
  children,
  count,
  title,
}: {
  children: React.ReactNode;
  count: number;
  title: string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2 text-sm font-medium">
        <span>{title}</span>
        <Badge variant="outline">{count}</Badge>
      </div>
      <div className="mt-2 grid gap-2">{children}</div>
    </div>
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

function getStatusVariant(status: AdminFileBrowserDepthStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
