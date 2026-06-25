"use client";

import {
  ClipboardCopy,
  Download,
  FileCheck2,
  FileJson2,
  KeyRound,
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
  AdminReleaseArtifactKind,
  AdminReleaseArtifactManifestReport,
  AdminReleaseArtifactManifestStatus,
} from "@/features/admin/admin-release-artifact-manifest";
import {
  getAdminReleaseArtifactManifestCsv,
  getAdminReleaseArtifactManifestJson,
  getAdminReleaseArtifactManifestMarkdown,
} from "@/features/admin/admin-release-artifact-manifest-export";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminReleaseArtifactManifestPanelProps = {
  report: AdminReleaseArtifactManifestReport;
};

export function AdminReleaseArtifactManifestPanel({
  report,
}: AdminReleaseArtifactManifestPanelProps) {
  const sortedRows = report.rows
    .filter((row) => row.status !== "ready")
    .concat(report.rows.filter((row) => row.status === "ready"));
  const sortedArtifacts = report.artifacts
    .filter((artifact) => artifact.status !== "ready")
    .concat(report.artifacts.filter((artifact) => artifact.status === "ready"));

  function exportJson() {
    downloadTextFile({
      content: getAdminReleaseArtifactManifestJson(report),
      filename: `${report.manifestId}.json`,
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminReleaseArtifactManifestCsv(report),
      filename: `${report.manifestId}.csv`,
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminReleaseArtifactManifestMarkdown(report),
      filename: `${report.manifestId}.md`,
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminReleaseArtifactManifestMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FileCheck2 className="size-4" />
            Signed artifact manifest
          </CardTitle>
          <CardDescription>
            Web, desktop, self-hosted, offline vault, and support bundle
            artifacts with checksums and release signatures.
          </CardDescription>
        </div>
        <Badge variant={getStatusVariant(report.status)}>
          {report.status} {report.score}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Artifacts" value={report.artifactCount} />
          <Metric label="Signed" value={report.signedArtifactCount} />
          <Metric label="Unsigned" value={report.unsignedArtifactCount} />
          <Metric label="Blocked" value={report.blockedArtifactCount} />
          <Metric label="Bytes" value={formatBytes(report.totalByteSize)} />
          <Metric label="Key" value={report.signing.configured ? "set" : "missing"} />
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={report.signing.configured ? "secondary" : "outline"}>
              <KeyRound className="size-3" />
              {report.signing.keyId}
            </Badge>
            <Badge variant="outline">{report.checksum}</Badge>
            <Badge variant={report.signature ? "secondary" : "outline"}>
              <ShieldCheck className="size-3" />
              {report.signature ?? "checksum-only"}
            </Badge>
          </div>
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          {sortedRows.map((row) => (
            <div
              key={row.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="font-medium">{row.label}</div>
                <Badge variant={getStatusVariant(row.status)}>
                  {row.status}
                </Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {row.value}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{row.detail}</p>
              <p className="mt-2 text-xs">{row.recommendation}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-2 xl:grid-cols-5">
          {sortedArtifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{artifact.label}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">{formatKind(artifact.kind)}</Badge>
                    <Badge variant={getStatusVariant(artifact.status)}>
                      {artifact.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="mt-2 grid gap-1 text-muted-foreground">
                <span className="truncate">{artifact.fileName}</span>
                <span>{formatBytes(artifact.byteSize)}</span>
                <span className="truncate">{artifact.checksum}</span>
                <span>{artifact.signatureStatus}</span>
              </div>
            </div>
          ))}
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
      <div className="mt-1 truncate font-mono text-sm text-foreground">
        {value}
      </div>
    </div>
  );
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatKind(kind: AdminReleaseArtifactKind) {
  return kind.replace("-", " ");
}

function getStatusVariant(status: AdminReleaseArtifactManifestStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
