"use client";

import {
  Download,
  ExternalLink,
  FileCheck2,
  History,
  MessageSquareText,
  PackageCheck,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatAssetBytes } from "@/features/assets/asset-library-audit";
import type {
  ProjectHandoffExportStatus,
  ProjectHandoffPacket,
  ProjectHandoffStatus,
} from "@/features/projects/project-handoff-packet";
import { approvalStatusLabels } from "@/features/review/approval-status";

type ProjectHandoffPacketPanelProps = {
  packets: ProjectHandoffPacket[];
};

const handoffStatusLabels: Record<ProjectHandoffStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const exportStatusLabels: Record<ProjectHandoffExportStatus, string> = {
  ready: "Ready",
  running: "Running",
  failed: "Failed",
  missing: "Missing",
};

const statusVariants: Record<
  ProjectHandoffStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

const exportStatusVariants: Record<
  ProjectHandoffExportStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ready: "secondary",
  running: "outline",
  failed: "destructive",
  missing: "outline",
};

export function ProjectHandoffPacketPanel({
  packets,
}: ProjectHandoffPacketPanelProps) {
  const readyCount = packets.filter((packet) => packet.status === "ready").length;
  const blockedCount = packets.filter(
    (packet) => packet.status === "blocked",
  ).length;
  const averageScore = packets.length
    ? Math.round(
        packets.reduce((total, packet) => total + packet.packetScore, 0) /
          packets.length,
      )
    : 0;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5" />
              Project handoff packets
            </CardTitle>
            <CardDescription>
              Export bundles, readiness reports, notes, and approvals for final delivery.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{readyCount} ready</Badge>
            <Badge variant={blockedCount ? "destructive" : "outline"}>
              {blockedCount} blocked
            </Badge>
            <Badge variant="outline">{averageScore}/100 average</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {packets.length ? (
          <ScrollArea className="h-[440px] rounded-md border border-border">
            <div className="divide-y divide-border">
              {packets.map((packet) => (
                <ProjectHandoffPacketRow
                  key={packet.projectId}
                  packet={packet}
                />
              ))}
            </div>
          </ScrollArea>
        ) : (
          <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            Create and export a design to prepare the first handoff packet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectHandoffPacketRow({
  packet,
}: {
  packet: ProjectHandoffPacket;
}) {
  return (
    <article className="space-y-4 p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold">
              {packet.projectName}
            </h3>
            <Badge variant={statusVariants[packet.status]}>
              {handoffStatusLabels[packet.status]}
            </Badge>
            <Badge variant="outline">{packet.packetScore}/100</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {packet.nextAction}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => downloadHandoffPacket(packet)}
          >
            <Download className="h-4 w-4" />
            Packet
          </Button>
          <Button asChild size="icon" variant="ghost" aria-label="Open project">
            <a href={`/editor/${packet.projectId}`}>
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <HandoffSignal
          icon={FileCheck2}
          label="Readiness"
          value={
            packet.readinessReport
              ? `${packet.readinessReport.score}/100`
              : "No report"
          }
          detail={`${packet.checklist.filter((item) => item.complete).length}/${packet.checklist.length} checklist items`}
        />
        <HandoffSignal
          icon={PackageCheck}
          label="Exports"
          value={exportStatusLabels[packet.exportBundle.status]}
          detail={formatExportDetail(packet)}
          variant={exportStatusVariants[packet.exportBundle.status]}
        />
        <HandoffSignal
          icon={MessageSquareText}
          label="Notes"
          value={`${packet.stakeholderNotes.totalCount} total`}
          detail={`${packet.stakeholderNotes.openTaskCount} open tasks, ${packet.stakeholderNotes.overdueTaskCount} overdue`}
        />
        <HandoffSignal
          icon={History}
          label="Approval"
          value={approvalStatusLabels[packet.approvalStatus]}
          detail={`${packet.approvalHistory.length} history event${packet.approvalHistory.length === 1 ? "" : "s"}`}
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {packet.checklist.map((item) => (
          <div
            key={item.id}
            className="rounded-md border border-border bg-muted/20 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{item.label}</p>
              <Badge variant={item.complete ? "secondary" : "outline"}>
                {item.complete ? "Included" : "Open"}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

function HandoffSignal({
  icon: Icon,
  label,
  value,
  detail,
  variant = "outline",
}: {
  icon: typeof FileCheck2;
  label: string;
  value: string;
  detail: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </p>
        <Badge variant={variant}>{value}</Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function formatExportDetail(packet: ProjectHandoffPacket) {
  const bundle = packet.exportBundle;

  if (bundle.status === "ready") {
    return [
      `${bundle.completedCount} completed`,
      bundle.totalStoredBytes ? formatAssetBytes(bundle.totalStoredBytes) : null,
      bundle.latestFormatLabel,
    ]
      .filter(Boolean)
      .join(" - ");
  }

  if (bundle.status === "failed") return `${bundle.failedCount} failed`;
  if (bundle.status === "running") return "Export is still processing";

  return "No completed export";
}

function downloadHandoffPacket(packet: ProjectHandoffPacket) {
  const blob = new Blob([JSON.stringify(packet, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${slugify(packet.projectName)}-handoff-packet.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project"
  );
}
