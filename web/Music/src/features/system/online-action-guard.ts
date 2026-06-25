"use client";

import { useMemo } from "react";
import { useNetworkStatus } from "./use-network-status";

export type OnlineActionGuardSnapshot = Readonly<{
  accountDisabledReason: string;
  canUseConnectionActions: boolean;
  cloudSyncDisabledReason: string;
  connectionRequiredActions: readonly string[];
  generationDisabledReason: string;
  localSafeActions: readonly string[];
  online: boolean;
  publicInteractionDisabledReason: string;
  refreshDisabledReason: string;
  sharingDisabledReason: string;
}>;

export type OnlineConnectionAction =
  | "account"
  | "cloud-sync"
  | "generation"
  | "public-interaction"
  | "refresh"
  | "sharing";

const localSafeActions = [
  "write lyrics",
  "edit local metadata",
  "review open projects",
  "export local files",
] as const;

const connectionRequiredActions = [
  "account updates",
  "cloud sync",
  "live status refresh",
  "public interactions",
  "sharing",
  "AI generation",
  "provider jobs",
] as const;

export function useOnlineActionGuard() {
  const { online } = useNetworkStatus();

  return useMemo(() => createOnlineActionGuardSnapshot(online), [online]);
}

export function createOnlineActionGuardSnapshot(
  online: boolean,
): OnlineActionGuardSnapshot {
  return {
    accountDisabledReason: online
      ? ""
      : "Reconnect before updating account or profile settings.",
    canUseConnectionActions: online,
    cloudSyncDisabledReason: online
      ? ""
      : "Reconnect before syncing library or playlist changes.",
    connectionRequiredActions,
    generationDisabledReason: online
      ? ""
      : "Reconnect before requesting AI generation or provider jobs.",
    localSafeActions,
    online,
    publicInteractionDisabledReason: online
      ? ""
      : "Reconnect before posting comments, reactions, reports, or blocks.",
    refreshDisabledReason: online
      ? ""
      : "Reconnect before refreshing live status or provider queues.",
    sharingDisabledReason: online
      ? ""
      : "Reconnect before updating or opening share pages.",
  };
}

export function assertOnlineAction(
  guard: OnlineActionGuardSnapshot,
  actionLabel: string,
) {
  if (!guard.canUseConnectionActions) {
    throw new Error(`${actionLabel} needs a connection.`);
  }
}

export function getOnlineActionTitle(
  guard: OnlineActionGuardSnapshot,
  action: OnlineConnectionAction,
  onlineTitle?: string,
) {
  if (guard.canUseConnectionActions) {
    return onlineTitle;
  }

  return getOnlineActionDisabledReason(guard, action);
}

export function getOnlineActionDisabledReason(
  guard: OnlineActionGuardSnapshot,
  action: OnlineConnectionAction,
) {
  switch (action) {
    case "account":
      return guard.accountDisabledReason;
    case "cloud-sync":
      return guard.cloudSyncDisabledReason;
    case "generation":
      return guard.generationDisabledReason;
    case "public-interaction":
      return guard.publicInteractionDisabledReason;
    case "refresh":
      return guard.refreshDisabledReason;
    case "sharing":
      return guard.sharingDisabledReason;
  }
}
