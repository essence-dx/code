"use client";

import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  MailCheck,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  NotificationFailureRecovery,
  NotificationPreferenceRoutingCenter,
  NotificationRouteChannel,
  NotificationRoutePlan,
  NotificationRouteStatus,
  NotificationRoutingStatus,
} from "@/features/notifications/notification-preference-routing";
import { cn } from "@/lib/utils";

type NotificationPreferenceRoutingPanelProps = {
  center: NotificationPreferenceRoutingCenter;
};

const statusVariants: Record<
  NotificationRoutingStatus | NotificationRouteStatus,
  "secondary" | "outline" | "destructive"
> = {
  ready: "secondary",
  review: "outline",
  blocked: "destructive",
  quiet: "outline",
  recovery: "destructive",
  muted: "outline",
};

const statusLabels: Record<
  NotificationRoutingStatus | NotificationRouteStatus,
  string
> = {
  ready: "Ready",
  review: "Review",
  blocked: "Blocked",
  quiet: "Quiet hours",
  recovery: "Recovery",
  muted: "Muted",
};

const channelLabels: Record<NotificationRouteChannel, string> = {
  in_app: "In-app",
  slack: "Slack",
  teams: "Teams",
  email_digest: "Digest",
};

export function NotificationPreferenceRoutingPanel({
  center,
}: NotificationPreferenceRoutingPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5" />
              Notification routing
            </CardTitle>
            <CardDescription>
              Quiet hours, channel subscriptions, digest previews, and failed
              delivery recovery for workspace alerts.
            </CardDescription>
          </div>
          <Badge variant={statusVariants[center.status]}>
            {center.score}/100 {statusLabels[center.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
          <Metric label="Unread" value={center.totals.unread} />
          <Metric label="Topics" value={center.totals.subscribedTopics} />
          <Metric
            label="Immediate"
            value={center.totals.activeImmediateRoutes}
          />
          <Metric label="Deferred" value={center.totals.deferredRoutes} />
          <Metric label="Failures" value={center.totals.failedChannels} />
          <Metric label="Digest" value={center.digestPreview.totalUnread} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Quiet hours</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {center.quietHours.startHour}:00 to{" "}
                  {center.quietHours.endHour}:00{" "}
                  {center.quietHours.timezoneLabel}
                </p>
              </div>
              <Badge
                variant={center.quietHours.active ? "outline" : "secondary"}
              >
                {center.quietHours.active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="mt-3 rounded-md border border-border bg-background p-3 text-xs text-muted-foreground">
              {center.quietHours.active && center.quietHours.resumesAt
                ? `External delivery resumes ${formatDateTime(center.quietHours.resumesAt)}.`
                : "External delivery can run immediately for subscribed topics."}
            </div>
          </section>

          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Digest preview</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {center.digestPreview.cadence} digest at{" "}
                  {formatDateTime(center.digestPreview.scheduledFor)}
                </p>
              </div>
              <MailCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-3 grid gap-2">
              {center.digestPreview.items.length ? (
                center.digestPreview.items.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border border-border bg-background p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-sm font-medium">
                        {item.title}
                      </p>
                      <Badge variant="outline">{item.topic}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-border bg-background p-3 text-xs text-muted-foreground">
                  No unread digest items match the active routing preferences.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-3 xl:grid-cols-2">
          {center.routePlans.map((route) => (
            <RoutePlanCard key={route.topic} route={route} />
          ))}
        </div>

        {center.failureRecovery.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              Failed-delivery recovery
            </div>
            <div className="mt-3 grid gap-2 xl:grid-cols-2">
              {center.failureRecovery.map((item) => (
                <RecoveryCard key={item.channel} item={item} />
              ))}
            </div>
          </section>
        ) : null}

        {center.nextActions.length ? (
          <section className="rounded-md border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              Routing next actions
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

function RoutePlanCard({ route }: { route: NotificationRoutePlan }) {
  return (
    <section className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{route.label}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {route.reason}
          </p>
        </div>
        <ReadinessIcon status={route.status} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge variant={statusVariants[route.status]}>
          {statusLabels[route.status]}
        </Badge>
        <Badge variant="outline">{route.unreadCount} unread</Badge>
      </div>
      <ChannelRow label="Now" channels={route.immediateChannels} />
      <ChannelRow label="Later" channels={route.deferredChannels} />
      {route.unavailableChannels.length ? (
        <ChannelRow label="Setup" channels={route.unavailableChannels} />
      ) : null}
    </section>
  );
}

function ChannelRow({
  label,
  channels,
}: {
  label: string;
  channels: NotificationRouteChannel[];
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      {channels.length ? (
        channels.map((channel) => (
          <Badge key={`${label}-${channel}`} variant="outline">
            {channelLabels[channel]}
          </Badge>
        ))
      ) : (
        <Badge variant="outline">None</Badge>
      )}
    </div>
  );
}

function RecoveryCard({ item }: { item: NotificationFailureRecovery }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.label}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {item.reason}
          </p>
        </div>
        <Badge variant="destructive">{item.affectedTopics.length}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.fallbackChannels.map((channel) => (
          <Badge key={channel} variant="outline">
            {channelLabels[channel]}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock3 className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function ReadinessIcon({ status }: { status: NotificationRouteStatus }) {
  const className = cn("h-4 w-4", {
    "text-emerald-600": status === "ready",
    "text-amber-600": status === "quiet" || status === "review",
    "text-destructive": status === "recovery",
    "text-muted-foreground": status === "muted",
  });

  if (status === "ready") return <CheckCircle2 className={className} />;
  if (status === "recovery") return <ShieldAlert className={className} />;

  return <Clock3 className={className} />;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
