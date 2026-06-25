"use client";

import { ClipboardCopy, Download, FileJson2, ShieldAlert } from "lucide-react";
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
  AdminOrganizationAuditIntelligenceReport,
  AdminOrganizationAuditSeverity,
  AdminOrganizationAuditStatus,
} from "@/features/admin/admin-organization-audit-intelligence";
import {
  getAdminOrganizationAuditIntelligenceCsv,
  getAdminOrganizationAuditIntelligenceJson,
  getAdminOrganizationAuditIntelligenceMarkdown,
} from "@/features/admin/admin-organization-audit-intelligence";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminOrganizationAuditIntelligencePanelProps = {
  report: AdminOrganizationAuditIntelligenceReport;
};

export function AdminOrganizationAuditIntelligencePanel({
  report,
}: AdminOrganizationAuditIntelligencePanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getAdminOrganizationAuditIntelligenceJson(report),
      filename: "admin-organization-audit-intelligence.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminOrganizationAuditIntelligenceCsv(report),
      filename: "admin-organization-audit-intelligence.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminOrganizationAuditIntelligenceMarkdown(report),
      filename: "admin-organization-audit-intelligence.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminOrganizationAuditIntelligenceMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-4" />
            Organization audit intelligence
          </CardTitle>
          <CardDescription>
            Anomaly clusters, reviewer ownership, and redacted investigation
            packets for organization-level admin review.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={getStatusVariant(report.status)}>
            {report.status} {report.score}
          </Badge>
          <Badge variant="outline">{report.clusterCount} clusters</Badge>
          <Badge variant="outline">{report.packetCount} packets</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 text-xs md:grid-cols-4">
          <Metric label="Blocked" value={report.blockedCount} />
          <Metric label="Review" value={report.reviewCount} />
          <Metric label="High severity" value={report.highSeverityCount} />
          <Metric label="Reviewers" value={report.reviewerQueueCount} />
        </div>

        <div className="grid gap-2 lg:grid-cols-3">
          {report.reviewerQueues.map((queue) => (
            <div
              key={queue.reviewer}
              className="rounded-md border border-border bg-muted/20 p-3 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{queue.reviewer}</div>
                <Badge variant={getStatusVariant(queue.status)}>
                  {queue.status}
                </Badge>
              </div>
              <div className="mt-2 text-muted-foreground">
                {queue.openClusterCount} clusters / {queue.blockedClusterCount} blocked
              </div>
              <div className="mt-2 break-words font-mono text-[11px]">
                {queue.packetIds.join(", ")}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-2 xl:grid-cols-2">
          {report.clusters.map((cluster) => (
            <div
              key={cluster.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{cluster.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="outline">{cluster.category}</Badge>
                    <Badge variant={getStatusVariant(cluster.status)}>
                      {cluster.status}
                    </Badge>
                    <Badge variant={getSeverityVariant(cluster.severity)}>
                      {cluster.severity}
                    </Badge>
                    <Badge variant="outline">{cluster.reviewer}</Badge>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {cluster.detail}
              </p>
              <p className="mt-2 text-xs">{cluster.evidence}</p>
              <div className="mt-2 rounded-md border border-border bg-background p-2 text-xs">
                {cluster.recommendation}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium">Redacted investigation packets</div>
            <Badge variant="outline">{report.investigationPackets.length} packets</Badge>
          </div>
          <div className="grid gap-2 xl:grid-cols-2">
            {report.investigationPackets.slice(0, 8).map((packet) => (
              <div
                key={packet.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{packet.title}</div>
                  <Badge variant={getSeverityVariant(packet.severity)}>
                    {packet.severity}
                  </Badge>
                </div>
                <p className="mt-2 text-muted-foreground">{packet.summary}</p>
                <p className="mt-2">{packet.redactedEvidence}</p>
              </div>
            ))}
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

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: AdminOrganizationAuditStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}

function getSeverityVariant(severity: AdminOrganizationAuditSeverity) {
  return severity === "high"
    ? "destructive"
    : severity === "medium"
      ? "secondary"
      : "outline";
}
