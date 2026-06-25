"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getAudioDurationMs } from "@/features/audio/audio-processing";
import type {
  GeneratedSongInput,
  LocalSong,
} from "@/features/library/types";
import type { CreativeControls, ReplaceSectionMode } from "@/lib/ai/schemas";

type ApiError = {
  error?: string;
};

export type ReplaceSectionBusyState = "queue" | "refresh" | "save" | undefined;

export type QueueReplaceSectionInput = {
  audioBlob: Blob;
  creativeControls?: CreativeControls;
  directionPrompt: string;
  durationMs: number;
  lyrics?: string;
  mediaType: string;
  mode?: ReplaceSectionMode;
  notes?: string;
  region: {
    endMs: number;
    startMs: number;
  };
  source: LocalSong;
  sourceStyle?: string;
  title?: string;
};

export type ReplaceSectionJobView = {
  audio?: {
    audioUrl: string;
    available: boolean;
    mediaType: string;
    title: string;
  };
  directionPrompt: string;
  error: string;
  id: string;
  mode: string;
  region: {
    endMs: number;
    startMs: number;
  };
  sourceTitle: string;
  status: string;
};

type QueueReplaceSectionResponse = {
  jobId?: string;
};

type ReplaceSectionJobResponse = {
  audio?: ReplaceSectionJobView["audio"];
  job: {
    directionPrompt: string;
    error?: string | null;
    id: string;
    mode: string;
    region: ReplaceSectionJobView["region"];
    sourceTitle: string;
    status: string;
  };
};

export function useReplaceSectionJob(
  onGeneratedReplacement: (input: GeneratedSongInput) => Promise<unknown>,
) {
  const [busy, setBusy] = useState<ReplaceSectionBusyState>();
  const [job, setJob] = useState<ReplaceSectionJobView | undefined>();

  async function queueReplaceSection(input: QueueReplaceSectionInput) {
    setBusy("queue");
    try {
      const mode = input.mode ?? "replace";
      const response = await fetch("/api/ai/replace-section-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creativeControls: input.creativeControls,
          directionPrompt: input.directionPrompt,
          durationMs: input.durationMs,
          lyrics: input.lyrics ?? input.source.lyrics,
          mode,
          notes: input.notes ?? "",
          region: input.region,
          sourceAudioDataBase64: await blobToBase64(input.audioBlob),
          sourceMediaType:
            input.mediaType || input.audioBlob.type || input.source.audioType,
          sourceSongId: input.source.id,
          sourceStyle: input.sourceStyle ?? input.source.stylePrompt,
          sourceTitle: input.title || input.source.title,
        }),
      });
      const payload = (await response.json()) as QueueReplaceSectionResponse &
        ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Section replacement failed.");
      }

      const queued = {
        audio: undefined,
        directionPrompt: input.directionPrompt,
        error: "",
        id: payload.jobId ?? "",
        mode,
        region: input.region,
        sourceTitle: input.source.title,
        status: payload.jobId ? "running" : "",
      };
      setJob(queued);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      toast.success(
        `${mode === "add" ? "Section addition" : "Section replacement"} queued.`,
      );
      return queued;
    } finally {
      setBusy(undefined);
    }
  }

  async function refreshReplaceSectionJob(jobId = job?.id) {
    if (!jobId) {
      return job;
    }

    setBusy("refresh");
    try {
      const response = await fetch(`/api/ai/replace-section-jobs/${jobId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ReplaceSectionJobResponse &
        ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Section replacement status failed.");
      }

      const nextJob = toReplaceSectionJobView(payload);
      setJob(nextJob);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      return nextJob;
    } finally {
      setBusy(undefined);
    }
  }

  async function saveReadyReplacement() {
    const current = job?.audio?.available ? job : await refreshReplaceSectionJob();
    const audioUrl = current?.audio?.audioUrl;

    if (!current?.audio?.available || !audioUrl) {
      toast.error("No completed section edit is available yet.");
      return;
    }

    setBusy("save");
    try {
      const response = await fetch(audioUrl);

      if (!response.ok) {
        throw new Error("Could not fetch section edit audio.");
      }

      const audioBlob = await response.blob();
      let durationMs = 0;

      try {
        durationMs = await getAudioDurationMs(audioBlob);
      } catch {
        durationMs = 0;
      }

      await onGeneratedReplacement({
        audioBlob,
        durationMs,
        lyrics: "",
        mediaType: current.audio.mediaType || audioBlob.type,
        stylePrompt: `Section ${current.mode} from ${current.sourceTitle}: ${current.directionPrompt}`,
        tags: ["section-edit", current.mode],
        title: current.audio.title || `${current.sourceTitle} section edit`,
      });
      toast.success("Section edit saved to the library.");
    } finally {
      setBusy(undefined);
    }
  }

  return {
    busy,
    job,
    queueReplaceSection,
    refreshReplaceSectionJob,
    saveReadyReplacement,
  };
}

function toReplaceSectionJobView(
  response: ReplaceSectionJobResponse,
): ReplaceSectionJobView {
  return {
    audio: response.audio,
    directionPrompt: response.job.directionPrompt,
    error: response.job.error ?? "",
    id: response.job.id,
    mode: response.job.mode,
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
