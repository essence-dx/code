"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  GitCompareArrows,
  RotateCcw,
  Split,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

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
import type {
  TemplateInstanceBreakingChange,
  TemplateInstanceGroup,
  TemplateInstancePropagationCenter,
  TemplateInstancePropagationDecision,
  TemplateInstancePropagationStatus,
  TemplateInstanceRollbackPacket,
  TemplateInstanceUpdatePreview,
} from "@/features/templates/template-instance-propagation";
import { cn } from "@/lib/utils";

type TemplateInstancePropagationPanelProps = {
  center: TemplateInstancePropagationCenter;
};

const statusLabels: Record<TemplateInstancePropagationStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  TemplateInstancePropagationStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

const decisionLabels: Record<TemplateInstancePropagationDecision, string> = {
  accept: "Accept",
  hold: "Hold",
  reject: "Reject",
};

const decisionVariants: Record<
  TemplateInstancePropagationDecision,
  "secondary" | "outline" | "destructive"
> = {
  accept: "secondary",
  hold: "outline",
  reject: "destructive",
};

export function TemplateInstancePropagationPanel({
  center,
}: TemplateInstancePropagationPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Split className="h-5 w-5" />
              Template instance propagation
            </CardTitle>
            <CardDescription>
              Update previews, breaking-change detection, selective
              accept/reject decisions, and rollback packets across projects and
              campaigns.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Templates" value={center.totals.templates} />
          <Metric label="Instances" value={center.totals.instances} />
          <Metric label="Campaigns" value={center.totals.campaigns} />
          <Metric label="Accepted" value={center.totals.acceptableUpdates} />
          <Metric label="Rejected" value={center.totals.rejectedUpdates} />
          <Metric label="Rollback" value={center.totals.rollbackPackets} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="space-y-3">
            {center.templateGroups.length ? (
              center.templateGroups
                .slice(0, 8)
                .map((group) => (
                  <TemplateInstanceGroupCard key={group.id} group={group} />
                ))
            ) : (
              <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                Template-based project instances will appear here after teams
                create designs from templates.
              </p>
            )}
          </section>

          <div className="space-y-4">
            <BreakingChangesPanel changes={center.breakingChanges} />
            <RollbackPacketsPanel packets={center.rollbackPackets} />
          </div>
        </div>

        {center.nextActions.length ? (
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Next propagation actions
            </div>
            <div className="mt-2 grid gap-2">
              {center.nextActions.map((action) => (
                <p
                  key={action}
                  className="flex gap-2 text-xs text-muted-foreground"
                >
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{action}</span>
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TemplateInstanceGroupCard({
  group,
}: {
  group: TemplateInstanceGroup;
}) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIcon status={group.status} />
            <h3 className="truncate text-sm font-semibold">
              {group.templateName}
            </h3>
            <Badge variant={statusVariants[group.status]}>
              {statusLabels[group.status]}
            </Badge>
            <Badge variant="outline">{group.dimensions}</Badge>
            <Badge variant="outline">{group.score}/100</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {group.nextAction}
          </p>
        </div>
        <Button asChild size="icon" variant="ghost" aria-label="Open template">
          <a href={group.href}>
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-5">
        <MiniStat label="Instances" value={group.instanceCount} />
        <MiniStat label="Campaigns" value={group.campaignCount} />
        <MiniStat label="Accept" value={group.acceptableCount} />
        <MiniStat label="Hold" value={group.heldCount} />
        <MiniStat label="Reject" value={group.rejectedCount} />
      </div>

      <div className="mt-4 grid gap-2">
        {group.updatePreviews.slice(0, 4).map((preview) => (
          <UpdatePreviewLine key={preview.id} preview={preview} />
        ))}
      </div>
    </article>
  );
}

function UpdatePreviewLine({
  preview,
}: {
  preview: TemplateInstanceUpdatePreview;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIcon status={preview.status} />
            <p className="truncate text-sm font-medium">
              {preview.projectName}
            </p>
            <Badge variant={decisionVariants[preview.decision]}>
              {decisionLabels[preview.decision]}
            </Badge>
            <Badge variant="outline">{preview.score}/100</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {preview.nextAction}
          </p>
        </div>
        <Button asChild size="icon" variant="ghost" aria-label="Open design">
          <a href={preview.projectHref}>
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <PreviewSignal
          icon={<GitCompareArrows className="h-4 w-4 text-muted-foreground" />}
          label="Changes"
          value={`${preview.changes.length} previewed`}
          status={preview.status}
        />
        <PreviewSignal
          icon={<RotateCcw className="h-4 w-4 text-muted-foreground" />}
          label="Rollback"
          value={preview.rollbackPacketId ? "Packet ready" : "Needs snapshot"}
          status={preview.rollbackPacketId ? "ready" : preview.status}
        />
      </div>
      {preview.breakingChanges.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {preview.breakingChanges.slice(0, 3).map((change) => (
            <Badge key={change.id} variant={statusVariants[change.severity]}>
              {change.kind.replaceAll("-", " ")}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BreakingChangesPanel({
  changes,
}: {
  changes: TemplateInstanceBreakingChange[];
}) {
  return (
    <section className="rounded-md border border-border">
      <div className="border-b border-border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          Breaking changes
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {changes.length} propagation blocker{changes.length === 1 ? "" : "s"}
        </p>
      </div>
      {changes.length ? (
        <ScrollArea className="h-72">
          <div className="space-y-2 p-3">
            {changes.slice(0, 8).map((change) => (
              <div
                key={change.id}
                className="rounded-md border border-border bg-muted/20 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariants[change.severity]}>
                    {statusLabels[change.severity]}
                  </Badge>
                  <p className="min-w-0 text-sm font-medium">
                    {change.projectName}
                  </p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {change.detail}
                </p>
                <p className="mt-2 text-xs font-medium">{change.remediation}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">
          No breaking propagation changes detected.
        </p>
      )}
    </section>
  );
}

function RollbackPacketsPanel({
  packets,
}: {
  packets: TemplateInstanceRollbackPacket[];
}) {
  return (
    <section className="rounded-md border border-border">
      <div className="border-b border-border p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <RotateCcw className="h-4 w-4 text-muted-foreground" />
          Rollback packets
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {packets.length} downloadable packet{packets.length === 1 ? "" : "s"}
        </p>
      </div>
      {packets.length ? (
        <div className="space-y-2 p-3">
          {packets.slice(0, 6).map((packet) => (
            <div
              key={packet.id}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {packet.templateName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {packet.projectIds.length} project
                    {packet.projectIds.length === 1 ? "" : "s"} and{" "}
                    {packet.campaignIds.length} campaign
                    {packet.campaignIds.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  aria-label="Download packet"
                >
                  <a download={packet.fileName} href={packet.dataUrl}>
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="p-4 text-sm text-muted-foreground">
          Create project snapshots to unlock rollback packets.
        </p>
      )}
    </section>
  );
}

function PreviewSignal({
  icon,
  label,
  value,
  status,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  status: TemplateInstancePropagationStatus;
}) {
  return (
    <div
      className={cn(
        "rounded-md border border-border p-3",
        status === "blocked" ? "bg-destructive/10" : "bg-muted/20",
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: TemplateInstancePropagationStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }

  if (status === "blocked") {
    return <XCircle className="h-4 w-4 text-destructive" />;
  }

  return <AlertTriangle className="h-4 w-4 text-amber-500" />;
}
