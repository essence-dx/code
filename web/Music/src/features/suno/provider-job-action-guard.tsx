"use client";

import { Badge } from "@/components/ui/badge";
import {
  getOnlineActionTitle,
  useOnlineActionGuard,
} from "@/features/system/online-action-guard";

export type ProviderJobActionGuardSnapshot = Readonly<{
  connectionDisabled: boolean;
  disabledReason: string;
  title: (onlineTitle: string) => string | undefined;
}>;

export function useProviderJobActionGuard(): ProviderJobActionGuardSnapshot {
  const guard = useOnlineActionGuard();

  return {
    connectionDisabled: !guard.canUseConnectionActions,
    disabledReason: guard.generationDisabledReason,
    title: (onlineTitle) => getOnlineActionTitle(guard, "generation", onlineTitle),
  };
}

export function ProviderJobOfflineBadge({
  guard,
}: {
  guard: ProviderJobActionGuardSnapshot;
}) {
  if (!guard.connectionDisabled) {
    return null;
  }

  return <Badge variant="outline">{guard.disabledReason}</Badge>;
}
