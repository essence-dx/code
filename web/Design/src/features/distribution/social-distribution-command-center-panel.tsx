"use client";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Crop,
  Download,
  History,
  Megaphone,
  RefreshCcw,
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
  ScheduledPostRecoveryPacket,
  SocialApprovalQueueItem,
  SocialCaptionVersionHistory,
  SocialDistributionCommandCenter,
  SocialDistributionStatus,
  SocialPlatformCropPreview,
} from "@/features/distribution/social-distribution-command-center";
import { cn } from "@/lib/utils";

type SocialDistributionCommandCenterPanelProps = {
  center: SocialDistributionCommandCenter;
};

const statusLabels: Record<SocialDistributionStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  SocialDistributionStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function SocialDistributionCommandCenterPanel({
  center,
}: SocialDistributionCommandCenterPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Social distribution command center
            </CardTitle>
            <CardDescription>
              Platform crop previews, approval queues, caption/version history,
              and recovery packets for scheduled social posts.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Platforms" value={center.totals.platforms} />
          <Metric label="Crop previews" value={center.totals.cropPreviews} />
          <Metric label="Approvals" value={center.totals.approvalQueue} />
          <Metric label="Caption sets" value={center.totals.captionHistories} />
          <Metric label="Versions" value={center.totals.captionVersions} />
          <Metric label="Recovery" value={center.totals.recoveryPackets} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_410px]">
          <section className="space-y-4">
            <CropPreviewPanel previews={center.platformCropPreviews} />
            <ApprovalQueuePanel queue={center.approvalQueue} />
          </section>

          <div className="space-y-4">
            <CaptionHistoryPanel histories={center.captionHistories} />
            <RecoveryPacketPanel packets={center.recoveryPackets} />
          </div>
        </div>

        {center.nextActions.length ? (
          <div className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Next social actions
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
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

function CropPreviewPanel({
  previews,
}: {
  previews: SocialPlatformCropPreview[];
}) {
  return (
    <PanelBlock
      title="Platform crop previews"
      badge={`${previews.length} previews`}
      icon={<Crop className="h-4 w-4 text-muted-foreground" />}
    >
      {previews.length ? (
        <div className="grid gap-3">
          {previews.map((preview) => (
            <div
              key={preview.id}
              className="rounded-md border border-border bg-background p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusIcon status={preview.status} />
                    <h3 className="truncate text-sm font-semibold">
                      {preview.projectName}
                    </h3>
                    <Badge variant="outline">{preview.platformLabel}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {preview.detail}
                  </p>
                </div>
                <Badge variant={statusVariants[preview.status]}>
                  {preview.cropMode}
                </Badge>
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                <MiniStat
                  label="Source"
                  value={`${preview.sourceWidth} x ${preview.sourceHeight}`}
                />
                <MiniStat label="Target" value={preview.targetLabel} />
                <MiniStat label="Scale" value={`${preview.scalePercent}%`} />
              </div>
              {preview.safeAreaWarning ? (
                <p className="mt-3 flex gap-2 text-xs text-amber-600">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{preview.safeAreaWarning}</span>
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyLine>
          No social schedule items are ready for crop preview.
        </EmptyLine>
      )}
    </PanelBlock>
  );
}

function ApprovalQueuePanel({ queue }: { queue: SocialApprovalQueueItem[] }) {
  return (
    <PanelBlock
      title="Approval queue"
      badge={`${queue.length} items`}
      icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />}
    >
      {queue.length ? (
        <div className="grid gap-2">
          {queue.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-md border border-border p-3",
                item.status === "ready" ? "bg-background" : "bg-muted/20",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusIcon status={item.status} />
                    <p className="truncate text-sm font-semibold">
                      {item.projectName}
                    </p>
                    <Badge variant="outline">{item.platformLabel}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.nextAction}
                  </p>
                </div>
                <Badge variant={statusVariants[item.status]}>
                  {statusLabels[item.status]}
                </Badge>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <MiniStat
                  label="Approval"
                  value={item.approvalStatus.replace("-", " ")}
                />
                <MiniStat
                  label="Caption"
                  value={item.captionReady ? "Ready" : "Missing"}
                />
                <MiniStat label="Schedule" value={item.scheduleStatus} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyLine>No social approvals are queued yet.</EmptyLine>
      )}
    </PanelBlock>
  );
}

function CaptionHistoryPanel({
  histories,
}: {
  histories: SocialCaptionVersionHistory[];
}) {
  return (
    <PanelBlock
      title="Caption history"
      badge={`${histories.length} schedules`}
      icon={<History className="h-4 w-4 text-muted-foreground" />}
    >
      {histories.length ? (
        <ScrollArea className="h-[360px]">
          <div className="space-y-2 pr-3">
            {histories.map((history) => (
              <div
                key={history.id}
                className="rounded-md border border-border bg-background p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {history.projectName ?? "Untitled social post"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {history.platformLabel} / {history.versions.length}{" "}
                      versions
                    </p>
                  </div>
                  <Badge
                    variant={history.currentCaption ? "secondary" : "outline"}
                  >
                    {history.currentCaption ? "Captioned" : "Needs caption"}
                  </Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {history.versions.slice(-3).map((version) => (
                    <div
                      key={version.id}
                      className="rounded-md border border-border bg-muted/20 p-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium">{version.label}</p>
                        <Badge variant="outline">{version.source}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {version.caption || "No caption text captured."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <EmptyLine>No caption history exists for social posts yet.</EmptyLine>
      )}
    </PanelBlock>
  );
}

function RecoveryPacketPanel({
  packets,
}: {
  packets: ScheduledPostRecoveryPacket[];
}) {
  return (
    <PanelBlock
      title="Recovery packets"
      badge={`${packets.length} packets`}
      icon={<RefreshCcw className="h-4 w-4 text-muted-foreground" />}
    >
      {packets.length ? (
        <div className="grid gap-2">
          {packets.map((packet) => (
            <div
              key={packet.id}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={packet.status} />
                    <p className="truncate text-sm font-medium">
                      {packet.projectName}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {packet.platformLabel} / {packet.steps.length} steps
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a href={packet.dataUrl} download={packet.fileName}>
                    <Download className="h-4 w-4" />
                    Packet
                  </a>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyLine>
          All scheduled social posts are recoverable in place.
        </EmptyLine>
      )}
    </PanelBlock>
  );
}

function PanelBlock({
  title,
  badge,
  icon,
  children,
}: {
  title: string;
  badge: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
        </h3>
        <Badge variant="outline">{badge}</Badge>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p className="text-[11px] uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function StatusIcon({ status }: { status: SocialDistributionStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }

  if (status === "blocked") {
    return <XCircle className="h-4 w-4 text-destructive" />;
  }

  return <AlertTriangle className="h-4 w-4 text-amber-500" />;
}
