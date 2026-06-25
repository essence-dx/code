"use client";

import { useCallback, useState } from "react";
import { useOnlineActionGuard } from "./online-action-guard";

type ProviderHealthState = "idle" | "checking" | "ready" | "warning" | "blocked";

export type AudioProviderHealth = {
  detail: string;
  state: ProviderHealthState;
  status?: number;
};

export function useAudioProviderHealth() {
  const onlineGuard = useOnlineActionGuard();
  const [health, setHealth] = useState<AudioProviderHealth>({
    detail: "Music generation health has not been checked.",
    state: "idle",
  });

  const checkHealth = useCallback(async () => {
    if (!onlineGuard.canUseConnectionActions) {
      setHealth({
        detail: onlineGuard.refreshDisabledReason,
        state: "idle",
      });
      return;
    }

    setHealth({
      detail: "Checking music generation health...",
      state: "checking",
    });

    try {
      const response = await fetch("/api/ai/audio-provider-health", {
        cache: "no-store",
      });
      const data = (await response.json()) as {
        error?: string;
        ok?: boolean;
        status?: number;
        statusText?: string;
      };

      if (!response.ok) {
        setHealth({
          detail: data.error || "Music generation health check failed.",
          state: response.status === 503 ? "warning" : "blocked",
          status: response.status,
        });
        return;
      }

      setHealth({
        detail: data.ok
          ? "Music generation service responded successfully."
          : data.statusText || "Music generation responded with an unhealthy status.",
        state: data.ok ? "ready" : "blocked",
        status: data.status,
      });
    } catch (error) {
      setHealth({
        detail: error instanceof Error ? error.message : "Music generation health check failed.",
        state: "blocked",
      });
    }
  }, [onlineGuard.canUseConnectionActions, onlineGuard.refreshDisabledReason]);

  return {
    canCheck: onlineGuard.canUseConnectionActions,
    checkDisabledReason: onlineGuard.refreshDisabledReason,
    checkHealth,
    health,
  };
}
