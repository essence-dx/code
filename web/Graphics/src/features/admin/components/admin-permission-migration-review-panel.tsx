"use client";

import type { ReactNode } from "react";
import { ClipboardCopy, Download, FileJson2, ShieldCheck } from "lucide-react";
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
  AdminPermissionMigrationReviewReport,
  AdminPermissionMigrationStatus,
} from "@/features/admin/admin-permission-migration-review";
import {
  getAdminPermissionMigrationReviewCsv,
  getAdminPermissionMigrationReviewJson,
  getAdminPermissionMigrationReviewMarkdown,
} from "@/features/admin/admin-permission-migration-review";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminPermissionMigrationReviewPanelProps = {
  report: AdminPermissionMigrationReviewReport;
};

export function AdminPermissionMigrationReviewPanel({
  report,
}: AdminPermissionMigrationReviewPanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getAdminPermissionMigrationReviewJson(report),
      filename: "admin-permission-migration-review.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminPermissionMigrationReviewCsv(report),
      filename: "admin-permission-migration-review.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminPermissionMigrationReviewMarkdown(report),
      filename: "admin-permission-migration-review.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminPermissionMigrationReviewMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4" />
            Permission migration review
          </CardTitle>
          <CardDescription>
            Least-privilege migration queue for file roles, public shares,
            release branches, libraries, and component publishing.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
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
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Migrations" value={report.migrationCount} />
          <Metric label="Blocked" value={report.blockedCount} />
          <Metric label="Review" value={report.reviewCount} />
          <Metric label="Files" value={report.fileMigrationCount} />
          <Metric label="Shares" value={report.shareMigrationCount} />
          <Metric
            label="Least privilege"
            value={report.leastPrivilegeRecommendationCount}
          />
        </div>

        <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-5">
          {report.rows.map((row) => (
            <ReviewTile key={row.id} status={row.status} title={row.label}>
              <div className="font-mono text-sm text-foreground">{row.value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{row.detail}</p>
              {row.target ? (
                <Badge className="mt-2" variant="outline">
                  {row.target}
                </Badge>
              ) : null}
            </ReviewTile>
          ))}
        </div>

        <div className="grid gap-2 xl:grid-cols-2">
          {report.migrations.slice(0, 8).map((migration) => (
            <div
              key={migration.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{migration.fileName}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {migration.surface}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={getStatusVariant(migration.status)}>
                    {migration.status}
                  </Badge>
                  <Badge variant="outline">{migration.category}</Badge>
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-xs">
                <AccessRow label="Current" value={migration.currentAccess} />
                <AccessRow label="Target" value={migration.targetAccess} />
                <AccessRow label="Risk" value={migration.risk} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {migration.leastPrivilegeRecommendation}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewTile({
  children,
  status,
  title,
}: {
  children: ReactNode;
  status: AdminPermissionMigrationStatus;
  title: string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2 text-sm font-medium">
        <span>{title}</span>
        <Badge variant={getStatusVariant(status)}>{status}</Badge>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function AccessRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span>{value}</span>
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

function getStatusVariant(status: AdminPermissionMigrationStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
