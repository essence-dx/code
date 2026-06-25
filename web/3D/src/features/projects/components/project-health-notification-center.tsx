"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCircle2, Clock3, FileWarning, MailOpen, MessageCircleWarning, PackageCheck, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProjectHealthNotificationState } from "@/features/projects/project-api";
import { summarizeProjectHealthNotifications, type ProjectHealthNotification, type ProjectHealthNotificationCenter as ProjectHealthNotificationCenterData } from "@/features/projects/project-health-notifications";

function iconForKind(kind: ProjectHealthNotification["kind"]) {
  switch (kind) {
    case "blocked-review":
      return <ShieldAlert className="size-4" />;
    case "failed-export":
      return <FileWarning className="size-4" />;
    case "missing-assets":
      return <AlertTriangle className="size-4" />;
    case "release-readiness":
      return <PackageCheck className="size-4" />;
    case "stale-comments":
      return <MessageCircleWarning className="size-4" />;
  }
}

function severityVariant(severity: ProjectHealthNotification["severity"]) {
  return severity === "critical" ? "destructive" : severity === "warning" ? "secondary" : "outline";
}

function formatDate(value: string | null) {
  if (!value) {
    return "No recent save";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function NotificationRow({
  notification,
  onAction,
  pendingAction,
}: {
  notification: ProjectHealthNotification;
  onAction: (notification: ProjectHealthNotification, action: "dismiss" | "read" | "snooze") => void;
  pendingAction: string | null;
}) {
  const isPending = pendingAction?.startsWith(`${notification.id}:`);

  return (
    <div className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground">{iconForKind(notification.kind)}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{notification.title}</p>
            <p className="truncate text-xs text-muted-foreground">{notification.projectName}</p>
          </div>
          <Badge className="rounded-md text-[10px]" variant={severityVariant(notification.severity)}>
            {notification.severity}
          </Badge>
          <Badge className="rounded-md text-[10px]" variant={notification.readAt ? "outline" : "default"}>
            {notification.readAt ? "read" : "unread"}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{notification.message}</p>
      </div>
      <div className="flex flex-col gap-3 md:items-end">
        <Badge className="rounded-md" variant="outline">
          {notification.count}
        </Badge>
        <div className="text-right text-xs text-muted-foreground">
          <p>{notification.actionLabel}</p>
          <p>{formatDate(notification.updatedAt)}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {notification.readAt ? null : (
            <Button disabled={isPending} onClick={() => onAction(notification, "read")} size="sm" type="button" variant="outline">
              <MailOpen className="size-3.5" />
              Read
            </Button>
          )}
          <Button disabled={isPending} onClick={() => onAction(notification, "snooze")} size="sm" type="button" variant="outline">
            <Clock3 className="size-3.5" />
            24h
          </Button>
          <Button disabled={isPending} onClick={() => onAction(notification, "dismiss")} size="icon" type="button" variant="ghost">
            <X className="size-3.5" />
            <span className="sr-only">Dismiss notification</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ProjectHealthNotificationCenter({ center }: { center: ProjectHealthNotificationCenterData }) {
  const [notifications, setNotifications] = useState(center.notifications);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const summary = useMemo(() => summarizeProjectHealthNotifications(notifications), [notifications]);
  const topNotifications = notifications.slice(0, 6);

  async function handleAction(notification: ProjectHealthNotification, action: "dismiss" | "read" | "snooze") {
    const snoozedUntil = action === "snooze" ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined;

    setPendingAction(`${notification.id}:${action}`);

    try {
      const response = await updateProjectHealthNotificationState({
        action,
        notificationId: notification.id,
        projectId: notification.projectId,
        snoozedUntil,
      });

      setNotifications((current) =>
        action === "dismiss" || action === "snooze"
          ? current.filter((entry) => entry.id !== notification.id)
          : current.map((entry) => (entry.id === notification.id ? { ...entry, ...response.state } : entry)),
      );
      toast.success(action === "snooze" ? "Notification snoozed" : action === "dismiss" ? "Notification dismissed" : "Notification marked read");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Notification update failed");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-4" />
              Health notifications
            </CardTitle>
            <CardDescription>Export, review, release, asset, and comment alerts from active projects.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={summary.criticalCount > 0 ? "destructive" : "outline"}>
              {summary.criticalCount} critical
            </Badge>
            <Badge className="rounded-md" variant="secondary">
              {summary.warningCount} warnings
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {summary.totalCount} total
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {topNotifications.length > 0 ? (
          topNotifications.map((notification) => <NotificationRow key={notification.id} notification={notification} onAction={handleAction} pendingAction={pendingAction} />)
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-emerald-500" />
            No active project health notifications.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
