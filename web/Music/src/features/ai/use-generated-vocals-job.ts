"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getAudioDurationMs } from "@/features/audio/audio-processing";
import type {
  GeneratedSongInput,
  LocalSong,
} from "@/features/library/types";
import type { VoiceProfileAttachment } from "./voice-profiles";

type ApiError = {
  error?: string;
};

export type GeneratedVocalsBusyState = "queue" | "refresh" | "save" | undefined;

export type QueueGeneratedVocalsInput = {
  audioBlob: Blob;
  directionPrompt?: string;
  durationMs: number;
  lyrics: string;
  mediaType: string;
  notes?: string;
  region?: {
    endMs: number;
    startMs: number;
  };
  source: LocalSong;
  sourceStyle?: string;
  title?: string;
  voiceProfile: VoiceProfileAttachment;
};

export type GeneratedVocalsJobView = {
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
  sourceTitle: string;
  status: string;
  voiceProfile: {
    name: string;
  };
};

type QueueGeneratedVocalsResponse = {
  jobId?: string;
};

type GeneratedVocalsJobResponse = {
  audio?: GeneratedVocalsJobView["audio"];
  job: {
    error?: string | null;
    id: string;
    region?: GeneratedVocalsJobView["region"];
    sourceTitle: string;
    status: string;
    voiceProfile: GeneratedVocalsJobView["voiceProfile"];
  };
};

export function useGeneratedVocalsJob(
  onGeneratedVocals: (input: GeneratedSongInput) => Promise<unknown>,
) {
  const [busy, setBusy] = useState<GeneratedVocalsBusyState>();
  const [job, setJob] = useState<GeneratedVocalsJobView | undefined>();

  async function queueGeneratedVocals(input: QueueGeneratedVocalsInput) {
    setBusy("queue");
    try {
      if (!input.voiceProfile.rightsConfirmed) {
        throw new Error("Confirm voice rights before generating vocals.");
      }

      const response = await fetch("/api/ai/vocal-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          directionPrompt: input.directionPrompt ?? "",
          durationMs: input.durationMs,
          lyrics: input.lyrics,
          notes: input.notes ?? "",
          region: input.region,
          sourceAudioDataBase64: await blobToBase64(input.audioBlob),
          sourceMediaType:
            input.mediaType || input.audioBlob.type || input.source.audioType,
          sourceSongId: input.source.id,
          sourceStyle: input.sourceStyle ?? input.source.stylePrompt,
          sourceTitle: input.title || input.source.title,
          voiceProfile: input.voiceProfile,
        }),
      });
      const payload = (await response.json()) as QueueGeneratedVocalsResponse &
        ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Generated vocals failed.");
      }

      const queued = {
        audio: undefined,
        error: "",
        id: payload.jobId ?? "",
        region: input.region,
        sourceTitle: input.source.title,
        status: payload.jobId ? "running" : "",
        voiceProfile: {
          name: input.voiceProfile.name,
        },
      };
      setJob(queued);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      toast.success("Generated vocals queued.");
      return queued;
    } finally {
      setBusy(undefined);
    }
  }

  async function refreshGeneratedVocalsJob(jobId = job?.id) {
    if (!jobId) {
      return job;
    }

    setBusy("refresh");
    try {
      const response = await fetch(`/api/ai/vocal-jobs/${jobId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as GeneratedVocalsJobResponse &
        ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Generated-vocals status failed.");
      }

      const nextJob = toGeneratedVocalsJobView(payload);
      setJob(nextJob);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      return nextJob;
    } finally {
      setBusy(undefined);
    }
  }

  async function saveReadyVocals() {
    const current = job?.audio?.available ? job : await refreshGeneratedVocalsJob();
    const audioUrl = current?.audio?.audioUrl;

    if (!current?.audio?.available || !audioUrl) {
      toast.error("No completed generated vocals are available yet.");
      return;
    }

    setBusy("save");
    try {
      const response = await fetch(audioUrl);

      if (!response.ok) {
        throw new Error("Could not fetch generated vocals.");
      }

      const audioBlob = await response.blob();
      let durationMs = 0;

      try {
        durationMs = await getAudioDurationMs(audioBlob);
      } catch {
        durationMs = 0;
      }

      await onGeneratedVocals({
        audioBlob,
        durationMs,
        lyrics: "",
        mediaType: current.audio.mediaType || audioBlob.type,
        stylePrompt: `Generated vocals for ${current.sourceTitle} using ${current.voiceProfile.name}.`,
        tags: ["generated-vocals", "voice"],
        title: current.audio.title || `${current.sourceTitle} vocals`,
      });
      toast.success("Generated vocals saved to the library.");
    } finally {
      setBusy(undefined);
    }
  }

  return {
    busy,
    job,
    queueGeneratedVocals,
    refreshGeneratedVocalsJob,
    saveReadyVocals,
  };
}

function toGeneratedVocalsJobView(
  response: GeneratedVocalsJobResponse,
): GeneratedVocalsJobView {
  return {
    audio: response.audio,
    error: response.job.error ?? "",
    id: response.job.id,
    region: response.job.region,
    sourceTitle: response.job.sourceTitle,
    status: response.job.status,
    voiceProfile: response.job.voiceProfile,
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
