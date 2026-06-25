"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getAudioDurationMs } from "@/features/audio/audio-processing";
import type {
  GeneratedSongInput,
  LocalSong,
} from "@/features/library/types";
import type { CreativeControls } from "@/lib/ai/schemas";

type ApiError = {
  error?: string;
};

export type ExtendSongBusyState = "queue" | "refresh" | "save" | undefined;

export type QueueExtendSongInput = {
  audioBlob: Blob;
  continuationPrompt: string;
  creativeControls?: CreativeControls;
  durationMs: number;
  extendFromMs: number;
  lyrics?: string;
  maxExtensionMs?: number;
  mediaType: string;
  notes?: string;
  source: LocalSong;
  sourceStyle?: string;
  title?: string;
};

export type ExtendSongJobView = {
  audio?: {
    audioUrl: string;
    available: boolean;
    mediaType: string;
    title: string;
  };
  error: string;
  extendFromMs: number;
  id: string;
  sourceTitle: string;
  status: string;
};

type QueueExtendSongResponse = {
  jobId?: string;
};

type ExtendSongJobResponse = {
  audio?: ExtendSongJobView["audio"];
  job: {
    error?: string | null;
    extendFromMs: number;
    id: string;
    sourceTitle: string;
    status: string;
  };
};

export function useExtendSongJob(
  onGeneratedExtension: (input: GeneratedSongInput) => Promise<unknown>,
) {
  const [busy, setBusy] = useState<ExtendSongBusyState>();
  const [job, setJob] = useState<ExtendSongJobView | undefined>();

  async function queueExtendSong(input: QueueExtendSongInput) {
    setBusy("queue");
    try {
      const response = await fetch("/api/ai/extend-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceSongId: input.source.id,
          sourceTitle: input.title || input.source.title,
          sourceMediaType:
            input.mediaType || input.audioBlob.type || input.source.audioType,
          sourceAudioDataBase64: await blobToBase64(input.audioBlob),
          continuationPrompt: input.continuationPrompt,
          creativeControls: input.creativeControls,
          durationMs: input.durationMs,
          extendFromMs: input.extendFromMs,
          lyrics: input.lyrics ?? input.source.lyrics,
          maxExtensionMs: input.maxExtensionMs ?? 60000,
          notes: input.notes ?? "",
          sourceStyle: input.sourceStyle ?? input.source.stylePrompt,
        }),
      });
      const payload = (await response.json()) as QueueExtendSongResponse & ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Song extension failed.");
      }

      const queued = {
        audio: undefined,
        error: "",
        extendFromMs: input.extendFromMs,
        id: payload.jobId ?? "",
        sourceTitle: input.source.title,
        status: payload.jobId ? "running" : "",
      };
      setJob(queued);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      toast.success("Song extension queued.");
      return queued;
    } finally {
      setBusy(undefined);
    }
  }

  async function refreshExtendSongJob(jobId = job?.id) {
    if (!jobId) {
      return job;
    }

    setBusy("refresh");
    try {
      const response = await fetch(`/api/ai/extend-jobs/${jobId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ExtendSongJobResponse & ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Song extension status failed.");
      }

      const nextJob = toExtendSongJobView(payload);
      setJob(nextJob);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      return nextJob;
    } finally {
      setBusy(undefined);
    }
  }

  async function saveReadyExtension() {
    const current = job?.audio?.available ? job : await refreshExtendSongJob();
    const audioUrl = current?.audio?.audioUrl;

    if (!current?.audio?.available || !audioUrl) {
      toast.error("No completed extension is available yet.");
      return;
    }

    setBusy("save");
    try {
      const response = await fetch(audioUrl);

      if (!response.ok) {
        throw new Error("Could not fetch extended audio.");
      }

      const audioBlob = await response.blob();
      let durationMs = 0;

      try {
        durationMs = await getAudioDurationMs(audioBlob);
      } catch {
        durationMs = 0;
      }

      await onGeneratedExtension({
        audioBlob,
        durationMs,
        lyrics: "",
        mediaType: current.audio.mediaType || audioBlob.type,
        stylePrompt: `Extended from ${current.sourceTitle}.`,
        tags: ["extension"],
        title: current.audio.title || `${current.sourceTitle} extension`,
      });
      toast.success("Extension saved to the library.");
    } finally {
      setBusy(undefined);
    }
  }

  return {
    busy,
    job,
    queueExtendSong,
    refreshExtendSongJob,
    saveReadyExtension,
  };
}

function toExtendSongJobView(response: ExtendSongJobResponse): ExtendSongJobView {
  return {
    audio: response.audio,
    error: response.job.error ?? "",
    extendFromMs: response.job.extendFromMs,
    id: response.job.id,
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
