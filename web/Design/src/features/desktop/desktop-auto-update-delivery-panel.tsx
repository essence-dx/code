"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Download,
  RefreshCcw,
  Rocket,
  RotateCcw,
  ShieldAlert,
  UploadCloud,
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
  DesktopAutoUpdateDeliveryCenter,
  DesktopAutoUpdateFeed,
  DesktopAutoUpdatePromotion,
  DesktopAutoUpdateRollbackWindow,
  DesktopAutoUpdateStatus,
} from "@/features/desktop/desktop-auto-update-delivery";
import { cn } from "@/lib/utils";

type DesktopAutoUpdateDeliveryPanelProps = {
  center: DesktopAutoUpdateDeliveryCenter;
};

const statusLabels: Record<DesktopAutoUpdateStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  DesktopAutoUpdateStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function DesktopAutoUpdateDeliveryPanel({
  center,
}: DesktopAutoUpdateDeliveryPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCcw className="h-5 w-5" />
              Desktop auto-update delivery
            </CardTitle>
            <CardDescription>
              Signed artifact feeds, channel promotion controls, rollback
              windows, and release audit packets.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Button asChild size="sm" variant="outline">
              <a
                download={center.auditPacket.download.fileName}
                href={center.auditPacket.download.href}
              >
                <Download className="h-4 w-4" />
                Audit packet
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
          <Metric label="Feeds" value={center.totals.feeds} />
          <Metric label="Ready feeds" value={center.totals.readyFeeds} />
          <Metric label="Blocked feeds" value={center.totals.blockedFeeds} />
          <Metric label="Promotions" value={center.totals.readyPromotions} />
          <Metric label="Rollback" value={center.totals.rollbackWindows} />
          <Metric
            label="Active windows"
            value={center.totals.activeRollbackWindows}
          />
          <Metric label="Artifacts" value={center.totals.artifacts} />
          <Metric label="Signed" value={center.totals.signedArtifacts} />
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <SectionHeader
              icon={UploadCloud}
              title="Artifact feeds"
              badge={`${center.totals.readyFeeds}/${center.totals.feeds}`}
            />
            <div className="mt-3 grid gap-2">
              {center.feeds.map((feed) => (
                <FeedCard key={feed.id} feed={feed} />
              ))}
            </div>
          </section>

          <section className="rounded-md border border-border bg-muted/20 p-3">
            <SectionHeader
              icon={Rocket}
              title="Channel promotions"
              badge={`${center.totals.readyPromotions}/${center.promotions.length}`}
            />
            <div className="mt-3 grid gap-2">
              {center.promotions.map((promotion) => (
                <PromotionCard key={promotion.id} promotion={promotion} />
              ))}
            </div>
          </section>

          <section className="rounded-md border border-border bg-muted/20 p-3">
            <SectionHeader
              icon={RotateCcw}
              title="Rollback windows"
              badge={`${center.totals.activeRollbackWindows}/${center.totals.rollbackWindows}`}
            />
            <div className="mt-3 grid gap-2">
              {center.rollbackWindows.map((window) => (
                <RollbackCard key={window.id} window={window} />
              ))}
            </div>
          </section>
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Auto-update delivery actions
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
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FeedCard({ feed }: { feed: DesktopAutoUpdateFeed }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <StatusIcon status={feed.status} />
            <span className="truncate">{feed.channelLabel}</span>
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {feed.endpoint ?? "Update endpoint missing"}
          </p>
        </div>
        <Badge variant={statusVariants[feed.status]}>{feed.version}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline">{feed.artifacts.length} artifacts</Badge>
        <Badge variant="outline">
          {feed.missingPlatforms.length} missing platforms
        </Badge>
        <Badge variant="outline">
          {feed.unsignedArtifactIds.length} unsigned
        </Badge>
      </div>
      <Button asChild className="mt-3 w-full" size="sm" variant="outline">
        <a download={feed.download.fileName} href={feed.download.href}>
          <Download className="h-4 w-4" />
          Feed
        </a>
      </Button>
    </div>
  );
}

function PromotionCard({
  promotion,
}: {
  promotion: DesktopAutoUpdatePromotion;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <StatusIcon status={promotion.status} />
            <span className="truncate">{promotion.channelLabel}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {promotion.promotedAt
              ? `Promoted ${promotion.promotedAt}`
              : "Awaiting promotion evidence"}
          </p>
        </div>
        <Badge variant={statusVariants[promotion.status]}>
          {promotion.version}
        </Badge>
      </div>
      {promotion.blockedReasons.length ? (
        <div className="mt-2 grid gap-1">
          {promotion.blockedReasons.slice(0, 2).map((reason) => (
            <p key={reason} className="text-xs text-muted-foreground">
              {reason}
            </p>
          ))}
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline">
          {promotion.auditEvidenceIds.length} audit logs
        </Badge>
      </div>
    </div>
  );
}

function RollbackCard({ window }: { window: DesktopAutoUpdateRollbackWindow }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <StatusIcon status={window.status} />
            <span className="truncate">{window.channelLabel}</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {window.rollbackVersion
              ? `${window.currentVersion} -> ${window.rollbackVersion}`
              : "Rollback artifact missing"}
          </p>
        </div>
        <Badge variant={statusVariants[window.status]}>
          {statusLabels[window.status]}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="outline">{window.artifactIds.length} artifacts</Badge>
        <Badge variant="outline">until {window.expiresAt}</Badge>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  badge,
}: {
  icon: typeof UploadCloud;
  title: string;
  badge: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {title}
      </h3>
      <Badge variant="outline">{badge}</Badge>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function StatusIcon({ status }: { status: DesktopAutoUpdateStatus }) {
  const className = cn("h-4 w-4 shrink-0", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "review",
    "text-destructive": status === "blocked",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "review") return <CircleAlert className={className} />;

  return <ShieldAlert className={className} />;
}
