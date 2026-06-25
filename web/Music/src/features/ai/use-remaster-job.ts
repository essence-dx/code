"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getAudioDurationMs } from "@/features/audio/audio-processing";
import type {
  GeneratedSongInput,
  LocalSong,
} from "@/features/library/types";
import type { RemasterTarget } from "@/lib/ai/schemas";

type ApiError = {
  error?: string;
};

export type RemasterBusyState = "queue" | "refresh" | "save" | undefined;

export type QueueRemasterInput = {
  audioBlob: Blob;
  durationMs: number;
  mediaType: string;
  notes?: string;
  region?: {
    endMs: number;
    startMs: number;
  };
  source: LocalSong;
  target?: RemasterTarget;
  title?: string;
};

export type RemasterJobView = {
  audio?: {
    audioUrl: string;
    available: boolean;
    mediaType: string;
    title: string;
  };
  error: string;
  id: string;
  sourceTitle: string;
  status: string;
  target: string;
};

type QueueRemasterResponse = {
  jobId?: string;
};

type RemasterJobResponse = {
  audio?: RemasterJobView["audio"];
  job: {
    error?: string | null;
    id: string;
    sourceTitle: string;
    status: string;
    target: string;
  };
};

export function useRemasterJob(
  onGeneratedRemaster: (input: GeneratedSongInput) => Promise<unknown>,
) {
  const [busy, setBusy] = useState<RemasterBusyState>();
  const [job, setJob] = useState<RemasterJobView | undefined>();

  async function queueRemaster(input: QueueRemasterInput) {
    setBusy("queue");
    try {
      const response = await fetch("/api/ai/remaster-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceSongId: input.source.id,
          sourceTitle: input.title || input.source.title,
          sourceMediaType:
            input.mediaType || input.audioBlob.type || input.source.audioType,
          sourceAudioDataBase64: await blobToBase64(input.audioBlob),
          durationMs: input.durationMs,
          target: input.target ?? "balanced-master",
          notes:
            input.notes ||
            [input.source.stylePrompt, input.source.tags.join(", ")]
              .filter(Boolean)
              .join("\n"),
          region: input.region,
        }),
      });
      const payload = (await response.json()) as QueueRemasterResponse & ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Remastering failed.");
      }

      const queued = {
        audio: undefined,
        error: "",
        id: payload.jobId ?? "",
        sourceTitle: input.source.title,
        status: payload.jobId ? "running" : "",
        target: input.target ?? "balanced-master",
      };
      setJob(queued);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      toast.success("Remaster queued.");
      return queued;
    } finally {
      setBusy(undefined);
    }
  }

  async function refreshRemasterJob(jobId = job?.id) {
    if (!jobId) {
      return job;
    }

    setBusy("refresh");
    try {
      const response = await fetch(`/api/ai/remaster-jobs/${jobId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as RemasterJobResponse & ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Remaster status failed.");
      }

      const nextJob = toRemasterJobView(payload);
      setJob(nextJob);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      return nextJob;
    } finally {
      setBusy(undefined);
    }
  }

  async function saveReadyRemaster() {
    const current = job?.audio?.available ? job : await refreshRemasterJob();
    const audioUrl = current?.audio?.audioUrl;

    if (!current?.audio?.available || !audioUrl) {
      toast.error("No completed remaster is available yet.");
      return;
    }

    setBusy("save");
    try {
      const response = await fetch(audioUrl);

      if (!response.ok) {
        throw new Error("Could not fetch remastered audio.");
      }

      const audioBlob = await response.blob();
      let durationMs = 0;

      try {
        durationMs = await getAudioDurationMs(audioBlob);
      } catch {
        durationMs = 0;
      }

      await onGeneratedRemaster({
        audioBlob,
        durationMs,
        lyrics: "",
        mediaType: current.audio.mediaType || audioBlob.type,
        stylePrompt: `Remastered from ${current.sourceTitle}.`,
        tags: ["remaster", current.target],
        title: current.audio.title || `${current.sourceTitle} remaster`,
      });
      toast.success("Remaster saved to the library.");
    } finally {
      setBusy(undefined);
    }
  }

  return {
    busy,
    job,
    queueRemaster,
    refreshRemasterJob,
    saveReadyRemaster,
  };
}

function toRemasterJobView(response: RemasterJobResponse): RemasterJobView {
  return {
    audio: response.audio,
    error: response.job.error ?? "",
    id: response.job.id,
    sourceTitle: response.job.sourceTitle,
    status: response.job.status,
    target: response.job.target,
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
