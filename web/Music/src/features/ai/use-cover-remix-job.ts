"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getAudioDurationMs } from "@/features/audio/audio-processing";
import type {
  GeneratedSongInput,
  LocalSong,
} from "@/features/library/types";
import type { CoverRemixMode, CreativeControls } from "@/lib/ai/schemas";

type ApiError = {
  error?: string;
};

export type CoverRemixBusyState = "queue" | "refresh" | "save" | undefined;

export type QueueCoverRemixInput = {
  audioBlob: Blob;
  creativeControls?: CreativeControls;
  durationMs: number;
  lyrics?: string;
  mediaType: string;
  mode?: CoverRemixMode;
  notes?: string;
  source: LocalSong;
  sourceStyle?: string;
  targetStyle: string;
  title?: string;
};

export type CoverRemixJobView = {
  audio?: {
    audioUrl: string;
    available: boolean;
    mediaType: string;
    title: string;
  };
  error: string;
  id: string;
  mode: string;
  sourceTitle: string;
  status: string;
  targetStyle: string;
};

type QueueCoverRemixResponse = {
  jobId?: string;
};

type CoverRemixJobResponse = {
  audio?: CoverRemixJobView["audio"];
  job: {
    error?: string | null;
    id: string;
    mode: string;
    sourceTitle: string;
    status: string;
    targetStyle: string;
  };
};

export function useCoverRemixJob(
  onGeneratedCoverRemix: (input: GeneratedSongInput) => Promise<unknown>,
) {
  const [busy, setBusy] = useState<CoverRemixBusyState>();
  const [job, setJob] = useState<CoverRemixJobView | undefined>();

  async function queueCoverRemix(input: QueueCoverRemixInput) {
    setBusy("queue");
    try {
      const mode = input.mode ?? "remix";
      const response = await fetch("/api/ai/cover-remix-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceSongId: input.source.id,
          sourceTitle: input.title || input.source.title,
          sourceMediaType:
            input.mediaType || input.audioBlob.type || input.source.audioType,
          sourceAudioDataBase64: await blobToBase64(input.audioBlob),
          creativeControls: input.creativeControls,
          durationMs: input.durationMs,
          lyrics: input.lyrics ?? input.source.lyrics,
          mode,
          notes: input.notes ?? "",
          sourceStyle: input.sourceStyle ?? input.source.stylePrompt,
          targetStyle: input.targetStyle,
        }),
      });
      const payload = (await response.json()) as QueueCoverRemixResponse & ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Cover/remix generation failed.");
      }

      const queued = {
        audio: undefined,
        error: "",
        id: payload.jobId ?? "",
        mode,
        sourceTitle: input.source.title,
        status: payload.jobId ? "running" : "",
        targetStyle: input.targetStyle,
      };
      setJob(queued);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      toast.success(`${mode === "cover" ? "Cover" : "Remix"} queued.`);
      return queued;
    } finally {
      setBusy(undefined);
    }
  }

  async function refreshCoverRemixJob(jobId = job?.id) {
    if (!jobId) {
      return job;
    }

    setBusy("refresh");
    try {
      const response = await fetch(`/api/ai/cover-remix-jobs/${jobId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as CoverRemixJobResponse & ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Cover/remix status failed.");
      }

      const nextJob = toCoverRemixJobView(payload);
      setJob(nextJob);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      return nextJob;
    } finally {
      setBusy(undefined);
    }
  }

  async function saveReadyCoverRemix() {
    const current = job?.audio?.available ? job : await refreshCoverRemixJob();
    const audioUrl = current?.audio?.audioUrl;

    if (!current?.audio?.available || !audioUrl) {
      toast.error("No completed cover/remix is available yet.");
      return;
    }

    setBusy("save");
    try {
      const response = await fetch(audioUrl);

      if (!response.ok) {
        throw new Error("Could not fetch cover/remix audio.");
      }

      const audioBlob = await response.blob();
      let durationMs = 0;

      try {
        durationMs = await getAudioDurationMs(audioBlob);
      } catch {
        durationMs = 0;
      }

      await onGeneratedCoverRemix({
        audioBlob,
        durationMs,
        lyrics: "",
        mediaType: current.audio.mediaType || audioBlob.type,
        stylePrompt: current.targetStyle,
        tags: ["cover-remix", current.mode],
        title: current.audio.title || `${current.sourceTitle} ${current.mode}`,
      });
      toast.success("Cover/remix result saved to the library.");
    } finally {
      setBusy(undefined);
    }
  }

  return {
    busy,
    job,
    queueCoverRemix,
    refreshCoverRemixJob,
    saveReadyCoverRemix,
  };
}

function toCoverRemixJobView(response: CoverRemixJobResponse): CoverRemixJobView {
  return {
    audio: response.audio,
    error: response.job.error ?? "",
    id: response.job.id,
    mode: response.job.mode,
    sourceTitle: response.job.sourceTitle,
    status: response.job.status,
    targetStyle: response.job.targetStyle,
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
