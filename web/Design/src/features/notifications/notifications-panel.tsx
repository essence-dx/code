"use client";

import Link from "next/link";
import { Bell, Check, CheckCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UserNotificationSummary } from "@/db/notifications";
import type { EditorLocale } from "@/features/editor/editor-localization";
import { getNotificationsCopy } from "@/features/notifications/notifications-localization";

type ServerAction = (formData: FormData) => Promise<void> | void;

type NotificationsPanelProps = {
  locale: EditorLocale;
  notifications: UserNotificationSummary[];
  markReadAction: ServerAction;
  markAllReadAction: ServerAction;
};

export function NotificationsPanel({
  locale,
  notifications,
  markReadAction,
  markAllReadAction,
}: NotificationsPanelProps) {
  const copy = getNotificationsCopy(locale);
  const unreadCount = notifications.filter(
    (notification) => !notification.readAt,
  ).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {copy.title}
          </CardTitle>
          {unreadCount ? (
            <Badge variant="secondary">{unreadCount}</Badge>
          ) : null}
        </div>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {unreadCount ? (
          <form action={markAllReadAction}>
            <Button type="submit" variant="outline" size="sm">
              <CheckCheck className="h-4 w-4" />
              {copy.markAllRead}
            </Button>
          </form>
        ) : null}

        {notifications.length ? (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-md border border-border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      {!notification.readAt ? (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      ) : null}
                      <p className="truncate text-sm font-medium">
                        {notification.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {notification.body}
                    </p>
                    {notification.targetHref ? (
                      <Button asChild variant="link" size="sm" className="px-0">
                        <Link href={notification.targetHref}>{copy.open}</Link>
                      </Button>
                    ) : null}
                  </div>
                  {!notification.readAt ? (
                    <form action={markReadAction}>
                      <input
                        type="hidden"
                        name="notificationId"
                        value={notification.id}
                      />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={copy.markAsRead(notification.title)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            {copy.empty}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
