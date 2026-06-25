"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ClipboardCopy,
  Download,
  FileArchive,
  FileJson2,
  HardDriveDownload,
  Upload,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AdminDashboardData } from "@/features/admin/admin-data";
import {
  createAdminOfflineVaultPackage,
  validateAdminOfflineVaultPackage,
  type AdminOfflineVaultImportReport,
} from "@/features/admin/admin-offline-vault";
import {
  getAdminOfflineVaultCsv,
  getAdminOfflineVaultJson,
  getAdminOfflineVaultMarkdown,
} from "@/features/admin/admin-offline-vault-export";
import { createAdminSupportBundleFromDashboard } from "@/features/admin/admin-support-bundle";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminOfflineVaultPanelProps = {
  data: AdminDashboardData;
};

export function AdminOfflineVaultPanel({ data }: AdminOfflineVaultPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importReport, setImportReport] =
    useState<AdminOfflineVaultImportReport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const generatedAt = data.selfHostedBackupReadiness.generatedAt;
  const packageId = useMemo(
    () => `vault-${generatedAt.replace(/[^0-9a-z]/gi, "").toLowerCase()}`,
    [generatedAt],
  );
  const supportBundle = useMemo(
    () =>
      createAdminSupportBundleFromDashboard({
        data,
        generatedAt,
        scope: "workspace",
      }),
    [data, generatedAt],
  );
  const vault = useMemo(
    () =>
      createAdminOfflineVaultPackage({
        backupSnapshot: {
          productionDeploySmoke: data.productionDeploySmoke,
          releaseApprovalSnapshots: data.releaseApprovalSnapshots,
          retentionPrivacy: data.retentionPrivacy,
          rollbackReadiness: data.rollbackReadiness,
          selfHostedBackupReadiness: data.selfHostedBackupReadiness,
        },
        designFiles: data.offlineVaultDesignFiles,
        exportedBy: data.currentUser.email,
        generatedAt,
        packageId,
        supportBundle,
      }),
    [
      data.currentUser.email,
      data.offlineVaultDesignFiles,
      data.productionDeploySmoke,
      data.releaseApprovalSnapshots,
      data.retentionPrivacy,
      data.rollbackReadiness,
      data.selfHostedBackupReadiness,
      generatedAt,
      packageId,
      supportBundle,
    ],
  );
  const vaultReport = useMemo(
    () => validateAdminOfflineVaultPackage(vault),
    [vault],
  );
  const visibleRows = vaultReport.rows
    .filter((row) => row.status !== "ready")
    .concat(vaultReport.rows.filter((row) => row.status === "ready"));

  function exportJson() {
    downloadTextFile({
      content: getAdminOfflineVaultJson(vault),
      filename: `${packageId}.json`,
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminOfflineVaultCsv(vault),
      filename: `${packageId}.csv`,
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminOfflineVaultMarkdown(vault),
      filename: `${packageId}.md`,
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(getAdminOfflineVaultMarkdown(vault));
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setImportError(null);
    setImportReport(null);

    if (!file) {
      return;
    }

    try {
      const packageText = await file.text();
      setImportReport(validateAdminOfflineVaultPackage(JSON.parse(packageText)));
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "The selected vault package could not be parsed.",
      );
    } finally {
      event.target.value = "";
    }
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <HardDriveDownload className="size-4" />
            Offline vault
          </CardTitle>
          <CardDescription>
            Export design files with support, backup, rollback, deploy smoke,
            release, and privacy snapshots for desktop or self-hosted recovery.
          </CardDescription>
        </div>
        <Badge variant={getStatusVariant(vaultReport.status)}>
          {vaultReport.score}/100 {vaultReport.status}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <Metric
            label="Files"
            value={String(vault.manifest.designFileCount)}
            detail={`${vault.manifest.activeDesignFileCount} active`}
          />
          <Metric
            label="Pages"
            value={String(vault.manifest.pageCount)}
            detail={`${vault.manifest.layerCount} layers`}
          />
          <Metric
            label="Support"
            value={`${vault.manifest.supportBundleScore}/100`}
            detail={supportBundle.status}
          />
          <Metric
            label="Backup"
            value={`${vault.manifest.backupReadinessScore}/100`}
            detail={data.selfHostedBackupReadiness.status}
          />
          <Metric
            label="Checksum"
            value={vault.manifest.checksum}
            detail={formatBytes(vault.manifest.estimatedBytes)}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
            <div className="font-medium text-foreground">{packageId}</div>
            <div className="mt-1">
              Generated from the latest admin dashboard data at {generatedAt}.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
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
              <FileArchive className="size-3.5" />
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
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="size-3.5" />
              Import
            </Button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={importJson}
        />

        {importError ? (
          <Alert variant="destructive">
            <AlertDescription>{importError}</AlertDescription>
          </Alert>
        ) : null}

        {importReport ? (
          <Alert>
            <AlertDescription>
              Imported {importReport.packageId ?? "unknown package"}:{" "}
              {importReport.score}/100 {importReport.status},{" "}
              {importReport.designFileCount} files,{" "}
              {formatBytes(importReport.estimatedBytes)}.
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-2 lg:grid-cols-2">
          {visibleRows.map((row) => (
            <div
              key={row.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium">{row.label}</div>
                <Badge variant={getStatusVariant(row.status)}>
                  {row.status}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {row.value}
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {row.detail}
              </p>
              <p className="mt-2 text-xs font-medium">
                {row.recommendation}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 break-all font-mono text-sm text-foreground">
        {value}
      </div>
      <div className="mt-1 text-muted-foreground">{detail}</div>
    </div>
  );
}

function getStatusVariant(status: "ready" | "review" | "blocked") {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "ready" ? "secondary" : "outline";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
