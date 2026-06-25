"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getAudioDurationMs } from "@/features/audio/audio-processing";
import type {
  GeneratedSongInput,
  LocalSong,
} from "@/features/library/types";

type ApiError = {
  error?: string;
};

export type GeneratedInstrumentalBusyState =
  | "queue"
  | "refresh"
  | "save"
  | undefined;

export type QueueGeneratedInstrumentalInput = {
  audioBlob: Blob;
  directionPrompt: string;
  durationMs: number;
  lyrics?: string;
  mediaType: string;
  notes?: string;
  region?: {
    endMs: number;
    startMs: number;
  };
  source: LocalSong;
  sourceKind?: "track" | "region" | "vocal";
  sourceStyle?: string;
  title?: string;
};

export type GeneratedInstrumentalJobView = {
  audio?: {
    audioUrl: string;
    available: boolean;
    mediaType: string;
    title: string;
  };
  error: string;
  id: string;
  region?: {
    endMs: number;
    startMs: number;
  };
  sourceKind: string;
  sourceTitle: string;
  status: string;
};

type QueueGeneratedInstrumentalResponse = {
  jobId?: string;
};

type GeneratedInstrumentalJobResponse = {
  audio?: GeneratedInstrumentalJobView["audio"];
  job: {
    error?: string | null;
    id: string;
    region?: GeneratedInstrumentalJobView["region"];
    sourceKind: string;
    sourceTitle: string;
    status: string;
  };
};

export function useGeneratedInstrumentalJob(
  onGeneratedInstrumental: (input: GeneratedSongInput) => Promise<unknown>,
) {
  const [busy, setBusy] = useState<GeneratedInstrumentalBusyState>();
  const [job, setJob] = useState<GeneratedInstrumentalJobView | undefined>();

  async function queueGeneratedInstrumental(
    input: QueueGeneratedInstrumentalInput,
  ) {
    setBusy("queue");
    try {
      const sourceKind = input.sourceKind ?? "track";
      const response = await fetch("/api/ai/instrumental-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directionPrompt: input.directionPrompt,
          durationMs: input.durationMs,
          lyrics: input.lyrics ?? input.source.lyrics,
          notes: input.notes ?? "",
          region: input.region,
          sourceAudioDataBase64: await blobToBase64(input.audioBlob),
          sourceKind,
          sourceMediaType:
            input.mediaType || input.audioBlob.type || input.source.audioType,
          sourceSongId: input.source.id,
          sourceStyle: input.sourceStyle ?? input.source.stylePrompt,
          sourceTitle: input.title || input.source.title,
        }),
      });
      const payload = (await response.json()) as QueueGeneratedInstrumentalResponse &
        ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Generated instrumental failed.");
      }

      const queued = {
        audio: undefined,
        error: "",
        id: payload.jobId ?? "",
        region: input.region,
        sourceKind,
        sourceTitle: input.source.title,
        status: payload.jobId ? "running" : "",
      };
      setJob(queued);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      toast.success("Instrumental backing queued.");
      return queued;
    } finally {
      setBusy(undefined);
    }
  }

  async function refreshGeneratedInstrumentalJob(jobId = job?.id) {
    if (!jobId) {
      return job;
    }

    setBusy("refresh");
    try {
      const response = await fetch(`/api/ai/instrumental-jobs/${jobId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as GeneratedInstrumentalJobResponse &
        ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Instrumental status failed.");
      }

      const nextJob = toGeneratedInstrumentalJobView(payload);
      setJob(nextJob);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      return nextJob;
    } finally {
      setBusy(undefined);
    }
  }

  async function saveReadyInstrumental() {
    const current = job?.audio?.available
      ? job
      : await refreshGeneratedInstrumentalJob();
    const audioUrl = current?.audio?.audioUrl;

    if (!current?.audio?.available || !audioUrl) {
      toast.error("No completed instrumental is available yet.");
      return;
    }

    setBusy("save");
    try {
      const response = await fetch(audioUrl);

      if (!response.ok) {
        throw new Error("Could not fetch generated instrumental.");
      }

      const audioBlob = await response.blob();
      let durationMs = 0;

      try {
        durationMs = await getAudioDurationMs(audioBlob);
      } catch {
        durationMs = 0;
      }

      await onGeneratedInstrumental({
        audioBlob,
        durationMs,
        lyrics: "",
        mediaType: current.audio.mediaType || audioBlob.type,
        stylePrompt: `Generated instrumental backing for ${current.sourceTitle}.`,
        tags: ["generated-instrumental", current.sourceKind],
        title: current.audio.title || `${current.sourceTitle} instrumental`,
      });
      toast.success("Instrumental saved to the library.");
    } finally {
      setBusy(undefined);
    }
  }

  return {
    busy,
    job,
    queueGeneratedInstrumental,
    refreshGeneratedInstrumentalJob,
    saveReadyInstrumental,
  };
}

function toGeneratedInstrumentalJobView(
  response: GeneratedInstrumentalJobResponse,
): GeneratedInstrumentalJobView {
  return {
    audio: response.audio,
    error: response.job.error ?? "",
    id: response.job.id,
    region: response.job.region,
    sourceKind: response.job.sourceKind,
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
