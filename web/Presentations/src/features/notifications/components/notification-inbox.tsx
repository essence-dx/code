"use client"

import { useCallback, useEffect, useState } from "react"
import { Bell } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type {
  AppNotification,
  NotificationsResponse,
} from "@/features/notifications/types"
import { cn } from "@/lib/utils"

function notificationTime(value: string) {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return ""

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(timestamp))
}

export function NotificationInbox() {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    const response = await fetch("/api/notifications", { cache: "no-store" })
    if (response.ok) {
      const data = (await response.json()) as NotificationsResponse
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
    const interval = window.setInterval(() => void refresh(), 45_000)

    return () => window.clearInterval(interval)
  }, [refresh])

  async function markRead(notification: AppNotification) {
    if (!notification.readAt) {
      const response = await fetch(`/api/notifications/${notification.id}`, {
        method: "PATCH",
      })
      if (response.ok) {
        const data = (await response.json()) as NotificationsResponse
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    }

    if (notification.href) {
      window.open(notification.href, "_blank", "noopener,noreferrer")
    }
  }

  async function markAllRead() {
    const response = await fetch("/api/notifications", { method: "PATCH" })
    if (!response.ok) return

    const data = (await response.json()) as NotificationsResponse
    setNotifications(data.notifications)
    setUnreadCount(data.unreadCount)
  }

  return (
    <DropdownMenu onOpenChange={(open) => (open ? void refresh() : undefined)}>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Notifications"
            title="Notifications"
            type="button"
            variant="ghost"
            size="icon-xs"
            className="relative"
          />
        }
      >
        <Bell className="size-3.5" />
        {unreadCount ? (
          <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]">
            {Math.min(unreadCount, 9)}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <div className="flex items-center justify-between gap-2">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            disabled={!unreadCount}
            onClick={() => void markAllRead()}
          >
            Mark read
          </Button>
        </div>
        <DropdownMenuSeparator />
        {loading && !notifications.length ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">Loading...</div>
        ) : notifications.length ? (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className="items-start py-2"
              onClick={() => void markRead(notification)}
            >
              <span
                className={cn(
                  "mt-1 size-2 shrink-0 rounded-full",
                  notification.readAt ? "bg-transparent" : "bg-primary",
                )}
              />
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">
                  {notification.title}
                </span>
                <span className="line-clamp-2 block text-xs text-muted-foreground">
                  {notification.body}
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  {notificationTime(notification.createdAt)}
                </span>
              </span>
            </DropdownMenuItem>
          ))
        ) : (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            No notifications yet
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
