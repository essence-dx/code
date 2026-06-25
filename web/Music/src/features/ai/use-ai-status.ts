"use client";

import { useCallback, useEffect, useState } from "react";
import { useOnlineActionGuard } from "@/features/system/online-action-guard";
import type { AiProviderStatus } from "@/lib/ai/schemas";

const fallbackStatus: AiProviderStatus = {
  backend: "free-first",
  text: false,
  image: false,
  transcription: false,
  audio: false,
  textModel: "",
  structuredTextModel: "",
  imageModel: "",
  capabilities: [],
  capabilitySummary: {
    disabled: 0,
    ready: 0,
    score: 0,
    total: 0,
  },
};

export function useAiStatus() {
  const onlineGuard = useOnlineActionGuard();
  const [status, setStatus] = useState<AiProviderStatus>(fallbackStatus);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!onlineGuard.canUseConnectionActions) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/status");
      if (!response.ok) {
        throw new Error("Status request failed.");
      }
      setStatus((await response.json()) as AiProviderStatus);
    } finally {
      setLoading(false);
    }
  }, [onlineGuard.canUseConnectionActions]);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  return {
    canRefresh: onlineGuard.canUseConnectionActions,
    loading,
    refresh,
    refreshDisabledReason: onlineGuard.refreshDisabledReason,
    status,
  };
}
