"use client";

import { useState } from "react";
import { Clock3, Download, FileJson2, FileSpreadsheet, Hash, Loader2, Save, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { WorkspaceRiskDigestPacketHistoryReport } from "@/features/projects/workspace-risk-digest-history";
import {
  createWorkspaceRiskDigestExportBody,
  createWorkspaceRiskDigestFileName,
  type WorkspaceRiskDigestFormat,
  type WorkspaceRiskDigestPriority,
  type WorkspaceRiskDigestReport,
} from "@/features/projects/workspace-risk-digest";

function riskVariant(riskLevel: WorkspaceRiskDigestReport["riskLevel"]) {
  if (riskLevel === "critical") {
    return "destructive" as const;
  }

  if (riskLevel === "watch") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function priorityVariant(priority: WorkspaceRiskDigestPriority) {
  if (priority === "high") {
    return "destructive" as const;
  }

  if (priority === "medium") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function downloadTextFile(fileName: string, body: string, mimeType: string) {
  const blob = new Blob([body], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function formatByteSize(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  return `${Math.round(value / 1024)} KB`;
}

function formatDateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";
}

export function WorkspaceRiskDigestPanel({
  history,
  report,
  workspaceId,
}: {
  history?: WorkspaceRiskDigestPacketHistoryReport | null;
  report: WorkspaceRiskDigestReport;
  workspaceId: string;
}) {
  const [packetHistory, setPacketHistory] = useState(history ?? null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const canPersist = report.workspace.role === "owner" || report.workspace.role === "admin";

  function exportDigest(format: WorkspaceRiskDigestFormat) {
    const body = createWorkspaceRiskDigestExportBody(report, format);
    const fileName = createWorkspaceRiskDigestFileName(report, format);
    const mimeType = format === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8";

    downloadTextFile(fileName, body, mimeType);
  }

  async function savePacket() {
    if (!canPersist || isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/risk-digest-packets`, {
        body: JSON.stringify({ report }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Risk digest packet could not be saved.");
      }

      const historyResponse = await fetch(`/api/workspaces/${workspaceId}/risk-digest-packets`, { cache: "no-store" });
      const historyPayload = (await historyResponse.json().catch(() => null)) as { history?: WorkspaceRiskDigestPacketHistoryReport; error?: string } | null;

      if (!historyResponse.ok || !historyPayload?.history) {
        throw new Error(historyPayload?.error ?? "Risk digest packet was saved, but history refresh failed.");
      }

      setPacketHistory(historyPayload.history);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Risk digest packet could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4" />
              Workspace risk digest
            </CardTitle>
            <CardDescription>Reviewer packet combining trust, public health, release runbook, incidents, and audit evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={riskVariant(report.riskLevel)}>
              <ShieldAlert className="size-3.5" />
              {report.score}/100 {report.riskLevel}
            </Badge>
            <Badge className="rounded-md" variant={report.actionItems.length > 0 ? "secondary" : "outline"}>
              {report.actionItems.length} actions
            </Badge>
            <Button className="h-8 gap-2" size="sm" type="button" onClick={() => exportDigest("json")}>
              <FileJson2 className="size-4" />
              JSON
            </Button>
            <Button className="h-8 gap-2" size="sm" type="button" variant="secondary" onClick={() => exportDigest("csv")}>
              <Download className="size-4" />
              CSV
            </Button>
            <Button className="h-8 gap-2" size="sm" type="button" variant="secondary" onClick={() => exportDigest("audit-csv")}>
              <FileSpreadsheet className="size-4" />
              Audit CSV
            </Button>
            {canPersist ? (
              <Button className="h-8 gap-2" disabled={isSaving} size="sm" type="button" variant="outline" onClick={savePacket}>
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save packet
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {saveError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{saveError}</div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Trust score</p>
            <p className="mt-2 text-xl font-semibold">{report.trust.trustScore}/100</p>
            <p className="mt-1 text-xs text-muted-foreground">{report.trust.projectWithBlockerCount} project blockers</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Public health</p>
            <p className="mt-2 text-xl font-semibold">{report.publicHealth.failedCount} failed</p>
            <p className="mt-1 text-xs text-muted-foreground">{report.publicHealth.warningCount} warnings</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Runbook</p>
            <p className="mt-2 text-xl font-semibold">{report.runbook.blockedCount} blocked</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{report.runbook.nextDueAt ?? "No active due date"}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Incidents</p>
            <p className="mt-2 text-xl font-semibold">{report.incidents.criticalCount} critical</p>
            <p className="mt-1 text-xs text-muted-foreground">{report.incidents.warningCount} warnings</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Audit evidence</p>
            <p className="mt-2 text-xl font-semibold">{report.audit.dangerCount} blocked</p>
            <p className="mt-1 text-xs text-muted-foreground">{report.audit.totalCount} rows</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.actionItems.length > 0 ? (
              report.actionItems.slice(0, 8).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-[420px] whitespace-normal">
                    <p className="font-medium">{item.label}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{item.detail}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className="rounded-md" variant="outline">
                      {item.source}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className="rounded-md" variant={priorityVariant(item.priority)}>
                      {item.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.evidenceCount}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={4}>
                  No action items are required for this digest.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {packetHistory ? (
          <div className="grid gap-3 rounded-md border bg-background p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Clock3 className="size-4" />
                  Saved packet history
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {packetHistory.summary.totalPacketCount} saved packets, {packetHistory.summary.auditEventCount} audit events, latest saved{" "}
                  {formatDateTime(packetHistory.summary.latestSavedAt)}.
                </p>
              </div>
              {packetHistory.summary.latestContentHash ? (
                <Badge className="max-w-full gap-1 rounded-md font-mono" variant="outline">
                  <Hash className="size-3.5" />
                  <span className="truncate">{packetHistory.summary.latestContentHash}</span>
                </Badge>
              ) : null}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Saved</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packetHistory.packets.length > 0 ? (
                  packetHistory.packets.slice(0, 5).map((packet) => (
                    <TableRow key={packet.id}>
                      <TableCell className="whitespace-normal">
                        <p className="font-medium">{formatDateTime(packet.createdAt)}</p>
                        <p className="line-clamp-1 font-mono text-xs text-muted-foreground">{packet.contentHash}</p>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <p className="font-medium">{packet.actor.name ?? "Unknown actor"}</p>
                        <p className="text-xs text-muted-foreground">{packet.actor.email ?? "No email snapshot"}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className="rounded-md" variant={riskVariant(packet.riskLevel)}>
                          {packet.score}/100 {packet.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <a className={buttonVariants({ className: "h-8", size: "sm", variant: "outline" })} href={`/api/workspaces/${workspaceId}/risk-digest-packets/${packet.id}?format=json`}>
                            JSON {formatByteSize(packet.jsonByteSize)}
                          </a>
                          <a className={buttonVariants({ className: "h-8", size: "sm", variant: "outline" })} href={`/api/workspaces/${workspaceId}/risk-digest-packets/${packet.id}?format=csv`}>
                            CSV {formatByteSize(packet.csvByteSize)}
                          </a>
                          <a className={buttonVariants({ className: "h-8", size: "sm", variant: "outline" })} href={`/api/workspaces/${workspaceId}/risk-digest-packets/${packet.id}?format=audit-csv`}>
                            Audit {packet.auditEventCount}
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={4}>
                      No saved risk digest packets yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {report.riskLevel !== "healthy" ? (
          <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            Export the packet before handoff so reviewers can inspect the latest blockers and evidence in one file.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
