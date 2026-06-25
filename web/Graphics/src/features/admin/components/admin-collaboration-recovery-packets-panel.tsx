"use client";

import type { ReactNode } from "react";
import {
  Activity,
  ClipboardCopy,
  Download,
  FileJson2,
  PackageCheck,
  RefreshCcw,
  ShieldAlert,
  Users,
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
  AdminCollaborationRecoveryPacketsReport,
  AdminCollaborationRecoveryPacketStatus,
} from "@/features/admin/admin-collaboration-recovery-packets";
import {
  getAdminCollaborationRecoveryPacketsCsv,
  getAdminCollaborationRecoveryPacketsJson,
  getAdminCollaborationRecoveryPacketsMarkdown,
} from "@/features/admin/admin-collaboration-recovery-packets";
import { downloadTextFile } from "@/features/editor/components/library-release-panel-shared";

type AdminCollaborationRecoveryPacketsPanelProps = {
  report: AdminCollaborationRecoveryPacketsReport;
};

export function AdminCollaborationRecoveryPacketsPanel({
  report,
}: AdminCollaborationRecoveryPacketsPanelProps) {
  function exportJson() {
    downloadTextFile({
      content: getAdminCollaborationRecoveryPacketsJson(report),
      filename: "admin-collaboration-recovery-packets.json",
      type: "application/json;charset=utf-8",
    });
  }

  function exportCsv() {
    downloadTextFile({
      content: getAdminCollaborationRecoveryPacketsCsv(report),
      filename: "admin-collaboration-recovery-packets.csv",
      type: "text/csv;charset=utf-8",
    });
  }

  function exportMarkdown() {
    downloadTextFile({
      content: getAdminCollaborationRecoveryPacketsMarkdown(report),
      filename: "admin-collaboration-recovery-packets.md",
      type: "text/markdown;charset=utf-8",
    });
  }

  function copyMarkdown() {
    void navigator.clipboard.writeText(
      getAdminCollaborationRecoveryPacketsMarkdown(report),
    );
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <PackageCheck className="size-4" />
            Collaboration recovery packets
          </CardTitle>
          <CardDescription>
            Activity replay evidence, ownership handoff, conflict summaries,
            and export readiness for collaboration incident recovery.
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
          <Metric label="Packets" value={report.packetCount} />
          <Metric label="Export ready" value={report.exportReadyPacketCount} />
          <Metric label="Replay evidence" value={report.replayEvidenceCount} />
          <Metric label="Ownership" value={report.ownershipHandoffCount} />
          <Metric label="Conflicts" value={report.conflictSummaryCount} />
          <Metric label="Save conflicts" value={report.saveConflictCount} />
        </div>

        <div className="grid gap-2 lg:grid-cols-2">
          {report.rows.map((row) => (
            <div
              key={row.id}
              className="rounded-md border border-border bg-muted/20 p-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{row.label}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.detail}
                  </p>
                </div>
                <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge variant="outline">{row.value}</Badge>
                {row.target ? <Badge variant="outline">{row.target}</Badge> : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {row.recommendation}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {report.packets.slice(0, 8).map((packet) => (
            <div
              key={packet.id}
              className="rounded-md border border-border bg-background p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium">{packet.fileName}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {packet.recommendation}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant={getStatusVariant(packet.status)}>
                    {packet.status}
                  </Badge>
                  {packet.exportReady ? (
                    <Badge variant="outline">export ready</Badge>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                <Info
                  icon={<Activity className="size-3.5" />}
                  label="Replay"
                  value={`${packet.activityReplayEvidenceCount}`}
                />
                <Info
                  icon={<Users className="size-3.5" />}
                  label="Owner"
                  value={packet.ownerHandoffStatus}
                />
                <Info
                  icon={<ShieldAlert className="size-3.5" />}
                  label="Conflicts"
                  value={`${packet.conflictSummaryCount}`}
                />
                <Info
                  icon={<RefreshCcw className="size-3.5" />}
                  label="Replay state"
                  value={packet.replayWindowStatus}
                />
              </div>
              {packet.recoverySteps.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1">
                  {packet.recoverySteps.slice(0, 4).map((step) => (
                    <Badge key={step} variant="outline">
                      {step}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
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

function Info({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 font-mono text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: AdminCollaborationRecoveryPacketStatus) {
  if (status === "blocked") {
    return "destructive";
  }

  return status === "review" ? "secondary" : "outline";
}
