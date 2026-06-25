"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReadinessCheck } from "@/lib/readiness";
import { useOnlineActionGuard } from "./online-action-guard";

export type ReadinessSummary = {
  blocked: number;
  coreBlocked: number;
  coreReady: number;
  coreScore: number;
  coreTotal: number;
  enhancementReady: number;
  enhancementTotal: number;
  fullScore: number;
  ready: number;
  score: number;
  total: number;
  warning: number;
};

export function useReadiness() {
  const onlineGuard = useOnlineActionGuard();
  const [checks, setChecks] = useState<ReadinessCheck[]>([]);
  const [summary, setSummary] = useState<ReadinessSummary>({
    blocked: 0,
    coreBlocked: 0,
    coreReady: 0,
    coreScore: 0,
    coreTotal: 0,
    enhancementReady: 0,
    enhancementTotal: 0,
    fullScore: 0,
    ready: 0,
    score: 0,
    total: 0,
    warning: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!onlineGuard.canUseConnectionActions) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/readiness");

      if (!response.ok) {
        throw new Error("Readiness request failed.");
      }

      const data = (await response.json()) as {
        checks: ReadinessCheck[];
        summary: ReadinessSummary;
      };
      setChecks(data.checks);
      setSummary(data.summary);
    } finally {
      setLoading(false);
    }
  }, [onlineGuard.canUseConnectionActions]);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  return {
    canRefresh: onlineGuard.canUseConnectionActions,
    checks,
    loading,
    refresh,
    refreshDisabledReason: onlineGuard.refreshDisabledReason,
    summary,
  };
}
