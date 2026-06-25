"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { LocalSong } from "@/features/library/types";
import type { WarpMarkerJobMarker } from "@/lib/ai/schemas";

type ApiError = {
  error?: string;
};

export type WarpMarkerBusyState = "queue" | "refresh" | "apply" | undefined;

export type QueueWarpMarkerInput = {
  analysisMode?: "transients" | "beats" | "sections" | "mixed";
  audioBlob: Blob;
  durationMs: number;
  mediaType: string;
  notes?: string;
  region?: {
    endMs: number;
    startMs: number;
  };
  source: LocalSong;
  sourceKind?: "track" | "region";
  targetGrid?: "auto" | "1/4" | "1/8" | "1/16";
  title?: string;
};

export type WarpMarkerJobView = {
  analysisMode: string;
  error: string;
  id: string;
  markers: WarpMarkerJobMarker[];
  region?: {
    endMs: number;
    startMs: number;
  };
  sourceKind: string;
  sourceTitle: string;
  status: string;
  targetGrid: string;
};

type QueueWarpMarkerResponse = {
  jobId?: string;
};

type WarpMarkerJobResponse = {
  job: {
    analysisMode: string;
    error?: string | null;
    id: string;
    region?: WarpMarkerJobView["region"];
    sourceKind: string;
    sourceTitle: string;
    status: string;
    targetGrid: string;
  };
  result?: {
    markers?: WarpMarkerJobMarker[];
  };
};

export function useWarpMarkerJob() {
  const [busy, setBusy] = useState<WarpMarkerBusyState>();
  const [job, setJob] = useState<WarpMarkerJobView | undefined>();

  async function queueWarpMarkers(input: QueueWarpMarkerInput) {
    setBusy("queue");
    try {
      const analysisMode = input.analysisMode ?? "mixed";
      const sourceKind = input.sourceKind ?? "track";
      const targetGrid = input.targetGrid ?? "auto";
      const response = await fetch("/api/ai/warp-marker-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisMode,
          durationMs: input.durationMs,
          notes:
            input.notes ||
            [input.source.stylePrompt, input.source.tags.join(", ")]
              .filter(Boolean)
              .join("\n"),
          region: input.region,
          sourceAudioDataBase64: await blobToBase64(input.audioBlob),
          sourceKind,
          sourceMediaType:
            input.mediaType || input.audioBlob.type || input.source.audioType,
          sourceSongId: input.source.id,
          sourceTitle: input.title || input.source.title,
          targetGrid,
        }),
      });
      const payload = (await response.json()) as QueueWarpMarkerResponse & ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Warp marker analysis failed.");
      }

      const queued = {
        analysisMode,
        error: "",
        id: payload.jobId ?? "",
        markers: [],
        region: input.region,
        sourceKind,
        sourceTitle: input.source.title,
        status: payload.jobId ? "running" : "",
        targetGrid,
      };
      setJob(queued);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      toast.success("Warp marker analysis queued.");
      return queued;
    } finally {
      setBusy(undefined);
    }
  }

  async function refreshWarpMarkerJob(jobId = job?.id) {
    if (!jobId) {
      return job;
    }

    setBusy("refresh");
    try {
      const response = await fetch(`/api/ai/warp-marker-jobs/${jobId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as WarpMarkerJobResponse & ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Warp marker status failed.");
      }

      const nextJob = toWarpMarkerJobView(payload);
      setJob(nextJob);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      return nextJob;
    } finally {
      setBusy(undefined);
    }
  }

  async function applyReadyMarkers(
    onApply: (markers: WarpMarkerJobMarker[]) => Promise<unknown>,
  ) {
    const current = job?.markers.length ? job : await refreshWarpMarkerJob();

    if (!current?.markers.length) {
      toast.error("No completed warp markers are available yet.");
      return;
    }

    setBusy("apply");
    try {
      await onApply(current.markers);
      toast.success("Warp markers applied to the Studio session.");
    } finally {
      setBusy(undefined);
    }
  }

  return {
    applyReadyMarkers,
    busy,
    job,
    queueWarpMarkers,
    refreshWarpMarkerJob,
  };
}

function toWarpMarkerJobView(response: WarpMarkerJobResponse): WarpMarkerJobView {
  return {
    analysisMode: response.job.analysisMode,
    error: response.job.error ?? "",
    id: response.job.id,
    markers: response.result?.markers ?? [],
    region: response.job.region,
    sourceKind: response.job.sourceKind,
    sourceTitle: response.job.sourceTitle,
    status: response.job.status,
    targetGrid: response.job.targetGrid,
  };
}

async function blobToBase64(blob: Blob) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read audio blob."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });

  return dataUrl.split(",")[1] ?? "";
}
