"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CloudOff, RefreshCcw, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNetworkStatus } from "@/features/system/use-network-status";

const restoredNoticeMs = 5000;

type OfflineRecoveryCopy = Readonly<{
  connectionRequiredMessage: string;
  localSafeItems: readonly string[];
  retryLabel: string;
  retryStillOfflineMessage: string;
  restoredDismissLabel: string;
  restoredMessage: string;
}>;

const offlineRecoveryCopy: OfflineRecoveryCopy = {
  connectionRequiredMessage:
    "Cloud sync, sharing, and generation are paused until the connection returns.",
  localSafeItems: [
    "Draft lyrics and style ideas already open",
    "Review local library metadata and saved project notes",
    "Prepare edits that do not need cloud sync",
  ],
  retryLabel: "Retry connection",
  retryStillOfflineMessage:
    "Still offline. Keep local work open and retry before syncing, sharing, or requesting generation.",
  restoredDismissLabel: "Dismiss",
  restoredMessage:
    "Connection restored. Refresh cloud panels when you want the latest sync state.",
} as const;

export function OfflineStatusBanner() {
  const { online, restoredAt } = useNetworkStatus();
  const recoveryCopy = getOfflineRecoveryCopy();
  const [dismissedRestoredAt, setDismissedRestoredAt] = useState<number | null>(
    null,
  );
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState("");
  const showRestored =
    online && restoredAt !== null && dismissedRestoredAt !== restoredAt;
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!showRestored) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [showRestored]);

  if (showRestored && now - restoredAt > restoredNoticeMs) {
    return null;
  }

  if (!online) {
    return (
      <StatusBanner
        action={
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-2"
            disabled={retrying}
            onClick={() => {
              void retryConnection(
                recoveryCopy.retryStillOfflineMessage,
                setRetrying,
                setRetryMessage,
              );
            }}
          >
            <RefreshCcw
              className={retrying ? "size-4 animate-spin" : "size-4"}
            />
            {recoveryCopy.retryLabel}
          </Button>
        }
        badge="offline"
        icon={<CloudOff className="size-4" />}
        message={recoveryCopy.connectionRequiredMessage}
        retryMessage={retryMessage}
        safeItems={recoveryCopy.localSafeItems}
        tone="offline"
      />
    );
  }

  if (showRestored) {
    return (
      <StatusBanner
        action={
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setDismissedRestoredAt(restoredAt)}
          >
            {recoveryCopy.restoredDismissLabel}
          </Button>
        }
        badge="online"
        icon={<Wifi className="size-4" />}
        message={recoveryCopy.restoredMessage}
        tone="online"
      />
    );
  }

  return null;
}

function StatusBanner({
  action,
  badge,
  icon,
  message,
  retryMessage,
  safeItems = [],
  tone,
}: {
  action?: React.ReactNode;
  badge: string;
  icon: React.ReactNode;
  message: string;
  retryMessage?: string;
  safeItems?: readonly string[];
  tone: "offline" | "online";
}) {
  return (
    <div
      className={
        tone === "offline"
          ? "border-b border-amber-300/20 bg-amber-300/10 text-amber-50"
          : "border-b border-emerald-300/20 bg-emerald-300/10 text-emerald-50"
      }
      role="status"
      aria-live="polite"
    >
      <div className="essence-banner-safe mx-auto flex max-w-7xl flex-col gap-3 text-sm lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex min-w-0 items-center gap-2">
            {icon}
            <Badge
              variant="secondary"
              className={
                tone === "offline"
                  ? "bg-amber-300/20 text-amber-50"
                  : "bg-emerald-300/20 text-emerald-50"
              }
            >
              {badge}
            </Badge>
            <span>{message}</span>
          </div>
          {safeItems.length ? (
            <div className="grid gap-1 text-xs text-current/80 sm:grid-cols-3">
              {safeItems.map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 shrink-0" />
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          {retryMessage ? (
            <p className="text-xs text-current/80">{retryMessage}</p>
          ) : null}
        </div>
        {action ? (
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        ) : null}
      </div>
    </div>
  );
}

function getOfflineRecoveryCopy(): OfflineRecoveryCopy {
  return offlineRecoveryCopy;
}

async function retryConnection(
  stillOfflineMessage: string,
  setRetrying: (value: boolean) => void,
  setRetryMessage: (value: string) => void,
) {
  setRetrying(true);
  setRetryMessage("");

  try {
    if (navigator.onLine) {
      window.location.reload();
      return;
    }

    setRetryMessage(stillOfflineMessage);
  } finally {
    setRetrying(false);
  }
}
