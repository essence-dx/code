"use client";

import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Download,
  History,
  MailCheck,
  ShieldCheck,
  UsersRound,
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
  StakeholderDigestFailureRecovery,
  StakeholderReportingDeliveryHistoryItem,
  StakeholderReportingSignedPacket,
  StakeholderReportingStatus,
  StakeholderReportingSubscription,
  StakeholderReportingSubscriptionCenter,
  StakeholderRoleSafeDashboard,
} from "@/features/reports/stakeholder-reporting-subscriptions";
import { cn } from "@/lib/utils";

type StakeholderReportingSubscriptionsPanelProps = {
  center: StakeholderReportingSubscriptionCenter;
};

const statusLabels: Record<StakeholderReportingStatus, string> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
};

const statusVariants: Record<
  StakeholderReportingStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
};

export function StakeholderReportingSubscriptionsPanel({
  center,
}: StakeholderReportingSubscriptionsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MailCheck className="h-5 w-5" />
              Stakeholder reporting subscriptions
            </CardTitle>
            <CardDescription>
              Role-safe dashboards, recurring signed packets, delivery history,
              and digest failure recovery for stakeholder reporting.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[center.status]}>
              {center.score}/100 {statusLabels[center.status]}
            </Badge>
            <Badge variant="outline">
              {center.totals.subscriptions.toLocaleString()} subscriptions
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-7">
          <Metric label="Safe views" value={center.totals.roleSafeDashboards} />
          <Metric label="Subscriptions" value={center.totals.subscriptions} />
          <Metric label="Packets" value={center.totals.signedPackets} />
          <Metric label="History" value={center.totals.deliveryHistory} />
          <Metric
            label="Recoveries"
            value={center.totals.digestFailureRecoveries}
          />
          <Metric label="Blocked" value={center.totals.blockedSubscriptions} />
          <Metric label="Failures" value={center.totals.failedDeliveries} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <PanelBlock
            title="Recurring subscriptions"
            badge={`${center.subscriptions.length} active`}
            icon={<BellRing className="h-4 w-4 text-muted-foreground" />}
          >
            <ScrollArea className="h-[410px]">
              <div className="grid gap-2 pr-3">
                {center.subscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                  />
                ))}
              </div>
            </ScrollArea>
          </PanelBlock>

          <div className="space-y-4">
            <PanelBlock
              title="Role-safe dashboards"
              badge={`${center.roleSafeDashboards.length} views`}
              icon={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
            >
              <div className="grid gap-2">
                {center.roleSafeDashboards.slice(0, 5).map((dashboard) => (
                  <RoleSafeDashboardRow
                    key={`${dashboard.source}-${dashboard.id}`}
                    dashboard={dashboard}
                  />
                ))}
              </div>
            </PanelBlock>

            <PanelBlock
              title="Digest recovery"
              badge={`${center.digestFailureRecoveries.length} plans`}
              icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
            >
              {center.digestFailureRecoveries.length ? (
                <div className="grid gap-2">
                  {center.digestFailureRecoveries.map((recovery) => (
                    <RecoveryCard key={recovery.id} recovery={recovery} />
                  ))}
                </div>
              ) : (
                <EmptyLine>No digest recovery plan is active.</EmptyLine>
              )}
            </PanelBlock>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <PanelBlock
            title="Signed packets"
            badge={`${center.signedPackets.length} packets`}
            icon={<Download className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-2 md:grid-cols-2">
              {center.signedPackets.map((packet) => (
                <SignedPacketCard key={packet.id} packet={packet} />
              ))}
            </div>
          </PanelBlock>

          <PanelBlock
            title="Delivery history"
            badge={`${center.deliveryHistory.length} events`}
            icon={<History className="h-4 w-4 text-muted-foreground" />}
          >
            {center.deliveryHistory.length ? (
              <div className="grid gap-2">
                {center.deliveryHistory.slice(0, 6).map((delivery) => (
                  <DeliveryHistoryRow key={delivery.id} delivery={delivery} />
                ))}
              </div>
            ) : (
              <EmptyLine>
                No stakeholder report deliveries recorded yet.
              </EmptyLine>
            )}
          </PanelBlock>
        </div>

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              Reporting next actions
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

function SubscriptionCard({
  subscription,
}: {
  subscription: StakeholderReportingSubscription;
}) {
  return (
    <article className="rounded-md border border-border bg-muted/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusIcon status={subscription.status} />
            <h3 className="truncate text-sm font-semibold">
              {subscription.title}
            </h3>
            <Badge variant={statusVariants[subscription.status]}>
              {subscription.score}/100
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {subscription.summary}
          </p>
        </div>
        <Badge variant="outline">{subscription.cadence}</Badge>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-5">
        <MiniStat label="Recipients" value={subscription.recipientCount} />
        <MiniStat label="Dashboards" value={subscription.dashboardIds.length} />
        <MiniStat label="Rooms" value={subscription.roomIds.length} />
        <MiniStat label="Digests" value={subscription.digestPacketIds.length} />
        <MiniStat label="Role" value={subscription.recipientRole} />
      </div>
      <div className="mt-3 rounded-md border border-border bg-background/60 p-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant={statusVariants[subscription.roleSafety.status]}>
            {statusLabels[subscription.roleSafety.status]} role safety
          </Badge>
          <span className="text-muted-foreground">
            {subscription.roleSafety.allowedRoles.join(", ") || "No roles"}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Redacts {subscription.roleSafety.redactedFields.join(", ")}.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Next run {formatDateTime(subscription.nextRunAt)}
        </p>
      </div>
    </article>
  );
}

function RoleSafeDashboardRow({
  dashboard,
}: {
  dashboard: StakeholderRoleSafeDashboard;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{dashboard.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {dashboard.audience} / {dashboard.allowedRoles.join(", ")}
          </p>
        </div>
        <Badge variant={statusVariants[dashboard.status]}>
          {dashboard.score}/100
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{dashboard.summary}</p>
    </div>
  );
}

function RecoveryCard({
  recovery,
}: {
  recovery: StakeholderDigestFailureRecovery;
}) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{recovery.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {recovery.reason}
          </p>
        </div>
        <Badge variant="destructive">
          {recovery.failedDeliveryIds.length} failed
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Fallback: {recovery.fallbackChannels.join(", ")}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {recovery.nextAction}
      </p>
    </div>
  );
}

function SignedPacketCard({
  packet,
}: {
  packet: StakeholderReportingSignedPacket;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{packet.id}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {packet.signature}
          </p>
        </div>
        <Badge variant={statusVariants[packet.status]}>
          {statusLabels[packet.status]}
        </Badge>
      </div>
      <Button asChild size="sm" variant="outline" className="mt-3 w-full">
        <a href={packet.dataUrl} download={packet.fileName}>
          <Download className="h-4 w-4" />
          Packet
        </a>
      </Button>
    </div>
  );
}

function DeliveryHistoryRow({
  delivery,
}: {
  delivery: StakeholderReportingDeliveryHistoryItem;
}) {
  const failed = delivery.status === "failed";

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-muted/20 p-3",
        failed && "border-destructive/30 bg-destructive/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{delivery.subscriptionId}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {delivery.recipientEmail ?? "Unknown recipient"} /{" "}
            {delivery.channel}
          </p>
        </div>
        <Badge variant={failed ? "destructive" : "secondary"}>
          {delivery.status}
        </Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {formatDateTime(delivery.deliveredAt)}
      </p>
      {delivery.failureReason ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {delivery.failureReason}
        </p>
      ) : null}
    </div>
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
    <section className="rounded-md border border-border bg-background/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <Badge variant="outline">{badge}</Badge>
      </div>
      {children}
    </section>
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
    <div className="rounded-md border border-border bg-background/70 px-2 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate text-xs font-medium">{value}</p>
    </div>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function StatusIcon({ status }: { status: StakeholderReportingStatus }) {
  if (status === "blocked") {
    return <AlertTriangle className="h-4 w-4 text-destructive" />;
  }

  if (status === "review") {
    return <UsersRound className="h-4 w-4 text-muted-foreground" />;
  }

  return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
