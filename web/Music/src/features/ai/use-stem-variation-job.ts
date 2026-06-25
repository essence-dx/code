"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getAudioDurationMs } from "@/features/audio/audio-processing";
import type { GeneratedSongInput } from "@/features/library/types";

type ApiError = {
  error?: string;
};

export type StemVariationBusyState = "queue" | "refresh" | "save" | undefined;

export type QueueStemVariationInput = {
  audioBlob: Blob;
  directionPrompt: string;
  durationMs: number;
  mediaType: string;
  notes?: string;
  sourceJobId?: string;
  sourceSongTitle?: string;
  sourceStemId: string;
  sourceStemTitle: string;
  sourceStyle?: string;
  stemType: string;
  title?: string;
};

export type StemVariationJobView = {
  audio?: {
    audioUrl: string;
    available: boolean;
    mediaType: string;
    title: string;
  };
  error: string;
  id: string;
  sourceSongTitle: string;
  sourceStemTitle: string;
  status: string;
  stemType: string;
};

type QueueStemVariationResponse = {
  jobId?: string;
};

type StemVariationJobResponse = {
  audio?: StemVariationJobView["audio"];
  job: {
    error?: string | null;
    id: string;
    sourceSongTitle: string;
    sourceStemTitle: string;
    status: string;
    stemType: string;
  };
};

export function useStemVariationJob(
  onGeneratedVariation: (input: GeneratedSongInput) => Promise<unknown>,
) {
  const [busy, setBusy] = useState<StemVariationBusyState>();
  const [job, setJob] = useState<StemVariationJobView | undefined>();

  async function queueStemVariation(input: QueueStemVariationInput) {
    setBusy("queue");
    try {
      const response = await fetch("/api/ai/stem-variation-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directionPrompt: input.directionPrompt,
          durationMs: input.durationMs,
          notes: input.notes ?? "",
          sourceAudioDataBase64: await blobToBase64(input.audioBlob),
          sourceJobId: input.sourceJobId ?? "",
          sourceMediaType: input.mediaType || input.audioBlob.type || "audio/mpeg",
          sourceSongTitle: input.sourceSongTitle ?? "",
          sourceStemId: input.sourceStemId,
          sourceStemTitle: input.sourceStemTitle,
          sourceStyle: input.sourceStyle ?? "",
          stemType: input.stemType,
        }),
      });
      const payload = (await response.json()) as QueueStemVariationResponse &
        ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Stem variation failed.");
      }

      const queued = {
        audio: undefined,
        error: "",
        id: payload.jobId ?? "",
        sourceSongTitle: input.sourceSongTitle ?? "",
        sourceStemTitle: input.sourceStemTitle,
        status: payload.jobId ? "running" : "",
        stemType: input.stemType,
      };
      setJob(queued);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      toast.success("Stem variation queued.");
      return queued;
    } finally {
      setBusy(undefined);
    }
  }

  async function refreshStemVariationJob(jobId = job?.id) {
    if (!jobId) {
      return job;
    }

    setBusy("refresh");
    try {
      const response = await fetch(`/api/ai/stem-variation-jobs/${jobId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as StemVariationJobResponse &
        ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Stem variation status failed.");
      }

      const nextJob = toStemVariationJobView(payload);
      setJob(nextJob);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      return nextJob;
    } finally {
      setBusy(undefined);
    }
  }

  async function saveReadyStemVariation() {
    const current = job?.audio?.available ? job : await refreshStemVariationJob();
    const audioUrl = current?.audio?.audioUrl;

    if (!current?.audio?.available || !audioUrl) {
      toast.error("No completed stem variation is available yet.");
      return;
    }

    setBusy("save");
    try {
      const response = await fetch(audioUrl);

      if (!response.ok) {
        throw new Error("Could not fetch stem variation.");
      }

      const audioBlob = await response.blob();
      let durationMs = 0;

      try {
        durationMs = await getAudioDurationMs(audioBlob);
      } catch {
        durationMs = 0;
      }

      await onGeneratedVariation({
        audioBlob,
        durationMs,
        lyrics: "",
        mediaType: current.audio.mediaType || audioBlob.type,
        stylePrompt: `Stem variation from ${current.sourceStemTitle}.`,
        tags: ["stem-variation", current.stemType],
        title: current.audio.title || `${current.sourceStemTitle} variation`,
      });
      toast.success("Stem variation saved to the library.");
    } finally {
      setBusy(undefined);
    }
  }

  return {
    busy,
    job,
    queueStemVariation,
    refreshStemVariationJob,
    saveReadyStemVariation,
  };
}

function toStemVariationJobView(
  response: StemVariationJobResponse,
): StemVariationJobView {
  return {
    audio: response.audio,
    error: response.job.error ?? "",
    id: response.job.id,
    sourceSongTitle: response.job.sourceSongTitle,
    sourceStemTitle: response.job.sourceStemTitle,
    status: response.job.status,
    stemType: response.job.stemType,
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
