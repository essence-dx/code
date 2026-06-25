"use client";

import { useCallback, useEffect, useState } from "react";
import { useOnlineActionGuard } from "@/features/system/online-action-guard";
import type { JobProvenance } from "@/lib/ai/job-provenance";
import type { JobReplayDraft } from "@/lib/ai/job-replay-drafts";

export type AiJobListItem = {
  id: string;
  kind: string;
  status: string;
  provider: string;
  model: string;
  error: string | null;
  queue: {
    audioAvailable: boolean;
    audioTitle: string;
    audioUrl: string;
    mediaType: string;
    prompt: string;
    lyrics: string;
    style: string;
    title: string;
    variantCount: number;
    variantGroupId: string;
    variantIndex: number;
    voiceProfile: {
      id: string;
      name: string;
      rightsConfirmed: boolean;
      sampleSummary: string;
      summary: string;
    } | null;
  } | null;
  provenance: JobProvenance | null;
  replayDraft: JobReplayDraft | null;
  createdAt: string | number;
  updatedAt: string | number;
};

export function useAiJobs() {
  const onlineGuard = useOnlineActionGuard();
  const [jobs, setJobs] = useState<AiJobListItem[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!onlineGuard.canUseConnectionActions) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/jobs");

      if (!response.ok) {
        throw new Error("AI jobs request failed.");
      }

      const data = (await response.json()) as {
        jobs: AiJobListItem[];
        summary: Record<string, number>;
      };
      setJobs(data.jobs);
      setSummary(data.summary);
    } finally {
      setLoading(false);
    }
  }, [onlineGuard.canUseConnectionActions]);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    function handleJobsChanged() {
      refresh().catch(() => setLoading(false));
    }

    window.addEventListener("essence-ai-jobs:changed", handleJobsChanged);
    return () =>
      window.removeEventListener("essence-ai-jobs:changed", handleJobsChanged);
  }, [refresh]);

  return {
    canRefresh: onlineGuard.canUseConnectionActions,
    jobs,
    loading,
    refresh,
    refreshDisabledReason: onlineGuard.refreshDisabledReason,
    summary,
  };
}
