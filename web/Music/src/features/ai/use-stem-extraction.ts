"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getAudioDurationMs } from "@/features/audio/audio-processing";
import type {
  GeneratedSongInput,
  LocalSong,
} from "@/features/library/types";
import type { StemType } from "@/lib/ai/schemas";

type ApiError = {
  error?: string;
};

export type StemJobView = {
  error: string;
  id: string;
  sourceTitle: string;
  status: string;
  stems: StemAssetView[];
};

export type StemAssetView = {
  audioUrl: string;
  id: string;
  mediaType: string;
  sourceTitle: string;
  stemType: string;
  title: string;
};

type StemJobResponse = {
  job: {
    error?: string | null;
    id: string;
    sourceTitle: string;
    status: string;
  };
  stems: StemAssetView[];
};

type QueueStemResponse = {
  jobId?: string;
};

export type StemBusyState = "queue" | "refresh" | "save" | undefined;

const defaultRequestedStems: StemType[] = ["vocals", "instrumental"];

export function useStemExtraction(
  onGeneratedStem: (input: GeneratedSongInput) => Promise<unknown>,
) {
  const [busy, setBusy] = useState<StemBusyState>();
  const [job, setJob] = useState<StemJobView | undefined>();

  async function queueStemExtraction(song: LocalSong) {
    setBusy("queue");
    try {
      const response = await fetch("/api/ai/stem-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceSongId: song.id,
          sourceTitle: song.title,
          sourceMediaType: song.audioType || song.audioBlob.type || "audio/mpeg",
          sourceAudioDataBase64: await blobToBase64(song.audioBlob),
          requestedStems: defaultRequestedStems,
          notes: [song.stylePrompt, song.tags.join(", ")].filter(Boolean).join("\n"),
        }),
      });
      const payload = (await response.json()) as QueueStemResponse & ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Stem extraction failed.");
      }

      const queued = {
        error: "",
        id: payload.jobId ?? "",
        sourceTitle: song.title,
        status: payload.jobId ? "running" : "",
        stems: [],
      };
      setJob(queued);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      toast.success("Stem extraction queued.");
      return queued;
    } finally {
      setBusy(undefined);
    }
  }

  async function refreshStemJob(jobId = job?.id) {
    if (!jobId) {
      return job;
    }

    setBusy("refresh");
    try {
      const response = await fetch(`/api/ai/stem-jobs/${jobId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as StemJobResponse & ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Stem extraction status failed.");
      }

      const nextJob = toStemJobView(payload);
      setJob(nextJob);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      return nextJob;
    } finally {
      setBusy(undefined);
    }
  }

  async function saveReadyStems() {
    const current = job?.stems.length ? job : await refreshStemJob();

    if (!current?.stems.length) {
      toast.error("No completed stems are available yet.");
      return;
    }

    setBusy("save");
    try {
      for (const stem of current.stems) {
        const response = await fetch(stem.audioUrl);

        if (!response.ok) {
          throw new Error(`Could not fetch ${stem.title}.`);
        }

        const audioBlob = await response.blob();
        let durationMs = 0;

        try {
          durationMs = await getAudioDurationMs(audioBlob);
        } catch {
          durationMs = 0;
        }

        await onGeneratedStem({
          audioBlob,
          durationMs,
          lyrics: "",
          mediaType: stem.mediaType || audioBlob.type,
          stylePrompt: `Stem extracted from ${current.sourceTitle}.`,
          tags: ["stem", stem.stemType],
          title: stem.title,
        });
      }

      toast.success(`${current.stems.length} stem${current.stems.length === 1 ? "" : "s"} saved to the library.`);
    } finally {
      setBusy(undefined);
    }
  }

  return {
    busy,
    job,
    queueStemExtraction,
    refreshStemJob,
    saveReadyStems,
  };
}

function toStemJobView(response: StemJobResponse): StemJobView {
  return {
    error: response.job.error ?? "",
    id: response.job.id,
    sourceTitle: response.job.sourceTitle,
    status: response.job.status,
    stems: response.stems,
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
