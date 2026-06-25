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

export type SampleBusyState = "queue" | "refresh" | "save" | undefined;

export type QueueSampleInput = {
  creativeControls?: CreativeControls;
  durationMs: number;
  prompt: string;
  source?: LocalSong;
  sourceContext?: string;
  style: string;
  title: string;
};

export type SampleJobView = {
  audio?: {
    audioUrl: string;
    available: boolean;
    mediaType: string;
    title: string;
  };
  durationMs: number;
  error: string;
  id: string;
  prompt: string;
  sourceTitle: string;
  status: string;
  style: string;
  title: string;
};

type QueueSampleResponse = {
  jobId?: string;
};

type SampleJobResponse = {
  audio?: SampleJobView["audio"];
  job: {
    durationMs: number;
    error?: string | null;
    id: string;
    prompt: string;
    sourceContext?: {
      sourceTitle?: string;
    };
    status: string;
    style: string;
    title: string;
  };
};

export function useSampleJob(
  onGeneratedSample: (input: GeneratedSongInput) => Promise<unknown>,
) {
  const [busy, setBusy] = useState<SampleBusyState>();
  const [job, setJob] = useState<SampleJobView | undefined>();

  async function queueSample(input: QueueSampleInput) {
    setBusy("queue");
    try {
      const response = await fetch("/api/ai/sample-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMs: input.durationMs,
          prompt: input.prompt,
          creativeControls: input.creativeControls,
          sourceContext: input.source
            ? {
                originalWork: input.source.rightsMetadata.originalWork,
                rightsConfirmed: input.source.rightsMetadata.rightsConfirmed,
                sourceSongId: input.source.id,
                sourceTitle: input.source.title,
                summary:
                  input.sourceContext ||
                  [input.source.stylePrompt, input.source.tags.join(", ")]
                    .filter(Boolean)
                    .join("\n"),
                tags: input.source.tags,
              }
            : undefined,
          style: input.style,
          title: input.title,
        }),
      });
      const payload = (await response.json()) as QueueSampleResponse & ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Sample generation failed.");
      }

      const queued = {
        audio: undefined,
        durationMs: input.durationMs,
        error: "",
        id: payload.jobId ?? "",
        prompt: input.prompt,
        sourceTitle: input.source?.title ?? "",
        status: payload.jobId ? "running" : "",
        style: input.style,
        title: input.title,
      };
      setJob(queued);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      toast.success("Sample generation queued.");
      return queued;
    } finally {
      setBusy(undefined);
    }
  }

  async function refreshSampleJob(jobId = job?.id) {
    if (!jobId) {
      return job;
    }

    setBusy("refresh");
    try {
      const response = await fetch(`/api/ai/sample-jobs/${jobId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as SampleJobResponse & ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Sample status failed.");
      }

      const nextJob = toSampleJobView(payload);
      setJob(nextJob);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      return nextJob;
    } finally {
      setBusy(undefined);
    }
  }

  async function saveReadySample() {
    const current = job?.audio?.available ? job : await refreshSampleJob();
    const audioUrl = current?.audio?.audioUrl;

    if (!current?.audio?.available || !audioUrl) {
      toast.error("No completed sample is available yet.");
      return;
    }

    setBusy("save");
    try {
      const response = await fetch(audioUrl);

      if (!response.ok) {
        throw new Error("Could not fetch generated sample.");
      }

      const audioBlob = await response.blob();
      let durationMs = 0;

      try {
        durationMs = await getAudioDurationMs(audioBlob);
      } catch {
        durationMs = current.durationMs;
      }

      await onGeneratedSample({
        audioBlob,
        durationMs,
        lyrics: "",
        mediaType: current.audio.mediaType || audioBlob.type,
        stylePrompt: current.style,
        tags: ["sample"],
        title: current.audio.title || current.title,
      });
      toast.success("Sample saved to the library.");
    } finally {
      setBusy(undefined);
    }
  }

  return {
    busy,
    job,
    queueSample,
    refreshSampleJob,
    saveReadySample,
  };
}

function toSampleJobView(response: SampleJobResponse): SampleJobView {
  return {
    audio: response.audio,
    durationMs: response.job.durationMs,
    error: response.job.error ?? "",
    id: response.job.id,
    prompt: response.job.prompt,
    sourceTitle: response.job.sourceContext?.sourceTitle ?? "",
    status: response.job.status,
    style: response.job.style,
    title: response.job.title,
  };
}
