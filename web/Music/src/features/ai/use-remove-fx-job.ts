"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getAudioDurationMs } from "@/features/audio/audio-processing";
import type {
  GeneratedSongInput,
  LocalSong,
} from "@/features/library/types";
import type { RemoveFxTarget } from "@/lib/ai/schemas";

type ApiError = {
  error?: string;
};

export type RemoveFxBusyState = "queue" | "refresh" | "save" | undefined;

export type QueueRemoveFxInput = {
  audioBlob: Blob;
  cleanupTargets?: RemoveFxTarget[];
  durationMs: number;
  intensity?: "light" | "balanced" | "strong";
  mediaType: string;
  notes?: string;
  region?: {
    endMs: number;
    startMs: number;
  };
  source: LocalSong;
  title?: string;
};

export type RemoveFxJobView = {
  audio?: {
    audioUrl: string;
    available: boolean;
    mediaType: string;
    title: string;
  };
  cleanupTargets: string[];
  error: string;
  id: string;
  intensity: string;
  region?: {
    endMs: number;
    startMs: number;
  };
  sourceTitle: string;
  status: string;
};

type QueueRemoveFxResponse = {
  jobId?: string;
};

type RemoveFxJobResponse = {
  audio?: RemoveFxJobView["audio"];
  job: {
    cleanupTargets: string[];
    error?: string | null;
    id: string;
    intensity: string;
    region?: RemoveFxJobView["region"];
    sourceTitle: string;
    status: string;
  };
};

export function useRemoveFxJob(
  onGeneratedCleanup: (input: GeneratedSongInput) => Promise<unknown>,
) {
  const [busy, setBusy] = useState<RemoveFxBusyState>();
  const [job, setJob] = useState<RemoveFxJobView | undefined>();

  async function queueRemoveFx(input: QueueRemoveFxInput) {
    setBusy("queue");
    try {
      const cleanupTargets = input.cleanupTargets ?? ["mixed-fx"];
      const intensity = input.intensity ?? "balanced";
      const response = await fetch("/api/ai/remove-fx-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleanupTargets,
          durationMs: input.durationMs,
          intensity,
          notes:
            input.notes ||
            [input.source.stylePrompt, input.source.tags.join(", ")]
              .filter(Boolean)
              .join("\n"),
          region: input.region,
          sourceAudioDataBase64: await blobToBase64(input.audioBlob),
          sourceMediaType:
            input.mediaType || input.audioBlob.type || input.source.audioType,
          sourceSongId: input.source.id,
          sourceTitle: input.title || input.source.title,
        }),
      });
      const payload = (await response.json()) as QueueRemoveFxResponse & ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Remove FX failed.");
      }

      const queued = {
        audio: undefined,
        cleanupTargets,
        error: "",
        id: payload.jobId ?? "",
        intensity,
        region: input.region,
        sourceTitle: input.source.title,
        status: payload.jobId ? "running" : "",
      };
      setJob(queued);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      toast.success("Remove FX cleanup queued.");
      return queued;
    } finally {
      setBusy(undefined);
    }
  }

  async function refreshRemoveFxJob(jobId = job?.id) {
    if (!jobId) {
      return job;
    }

    setBusy("refresh");
    try {
      const response = await fetch(`/api/ai/remove-fx-jobs/${jobId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as RemoveFxJobResponse & ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Remove FX status failed.");
      }

      const nextJob = toRemoveFxJobView(payload);
      setJob(nextJob);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      return nextJob;
    } finally {
      setBusy(undefined);
    }
  }

  async function saveReadyCleanup() {
    const current = job?.audio?.available ? job : await refreshRemoveFxJob();
    const audioUrl = current?.audio?.audioUrl;

    if (!current?.audio?.available || !audioUrl) {
      toast.error("No completed cleanup is available yet.");
      return;
    }

    setBusy("save");
    try {
      const response = await fetch(audioUrl);

      if (!response.ok) {
        throw new Error("Could not fetch cleaned audio.");
      }

      const audioBlob = await response.blob();
      let durationMs = 0;

      try {
        durationMs = await getAudioDurationMs(audioBlob);
      } catch {
        durationMs = 0;
      }

      await onGeneratedCleanup({
        audioBlob,
        durationMs,
        lyrics: "",
        mediaType: current.audio.mediaType || audioBlob.type,
        stylePrompt: `FX cleanup from ${current.sourceTitle}.`,
        tags: ["remove-fx", ...current.cleanupTargets],
        title: current.audio.title || `${current.sourceTitle} cleaned`,
      });
      toast.success("Cleaned audio saved to the library.");
    } finally {
      setBusy(undefined);
    }
  }

  return {
    busy,
    job,
    queueRemoveFx,
    refreshRemoveFxJob,
    saveReadyCleanup,
  };
}

function toRemoveFxJobView(response: RemoveFxJobResponse): RemoveFxJobView {
  return {
    audio: response.audio,
    cleanupTargets: response.job.cleanupTargets,
    error: response.job.error ?? "",
    id: response.job.id,
    intensity: response.job.intensity,
    region: response.job.region,
    sourceTitle: response.job.sourceTitle,
    status: response.job.status,
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
