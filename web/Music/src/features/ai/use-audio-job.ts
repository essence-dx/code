"use client";

import { useState } from "react";
import type { CreativeControls } from "@/lib/ai/schemas";
import type { VoiceProfileAttachment } from "./voice-profiles";

type ApiError = {
  error?: string;
};

type AudioJobResponse = {
  job: {
    error?: string | null;
    id: string;
    status: string;
  };
  audio?: {
    audioUrl: string;
    available: boolean;
    mediaType: string;
    title: string;
  };
  assets: Array<{
    hasStorage?: boolean;
    mediaType: string;
    title: string;
    type: string;
  }>;
  generations: Array<{
    contentType: string;
    hasContent?: boolean;
    isAudio?: boolean;
  }>;
};

export type AudioJobView = {
  audioUrl: string;
  error: string;
  id: string;
  mediaType: string;
  status: string;
  title: string;
};

export type QueueAudioInput = {
  creativeControls?: CreativeControls;
  lyrics: string;
  prompt: string;
  style: string;
  title: string;
  variantCount?: number;
  variantGroupId?: string;
  variantIndex?: number;
  voiceProfile?: VoiceProfileAttachment | null;
};

const emptyAudioJob: AudioJobView = {
  audioUrl: "",
  error: "",
  id: "",
  mediaType: "",
  status: "",
  title: "",
};

export function useAudioJob() {
  const [audioJob, setAudioJob] = useState(emptyAudioJob);

  async function queueAudioJob(input: QueueAudioInput) {
    const response = await fetch("/api/ai/audio-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const payload = (await response.json()) as {
      jobId?: string;
      providerJob?: unknown;
    } & ApiError;

    if (!response.ok) {
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      throw new Error(payload.error || "Audio job failed.");
    }

    const output = parseAudioOutput(payload.providerJob);
    const nextJob = {
      ...emptyAudioJob,
      audioUrl:
        payload.jobId && isPlayableAudioUrl(output.audioUrl)
          ? audioResultUrl(payload.jobId)
          : "",
      id: payload.jobId ?? "",
      mediaType: output.mediaType,
      status: payload.jobId ? "running" : "",
      title: output.title || input.title,
    };
    setAudioJob(nextJob);
    window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
    return nextJob;
  }

  async function refreshAudioJob() {
    if (!audioJob.id) {
      return audioJob;
    }

    const response = await fetch(`/api/ai/audio-jobs/${audioJob.id}`, {
      cache: "no-store",
    });
    const payload = (await response.json()) as AudioJobResponse & ApiError;

    if (!response.ok) {
      throw new Error(payload.error || "Audio status failed.");
    }

    const nextJob = toAudioJobView(payload);
    setAudioJob(nextJob);
    window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
    return nextJob;
  }

  return { audioJob, queueAudioJob, refreshAudioJob };
}

function toAudioJobView(response: AudioJobResponse): AudioJobView {
  const generation = response.generations.find(
    (item) => item.isAudio ?? item.contentType.startsWith("audio/"),
  );
  const asset = response.assets.find((item) => item.type === "audio");
  const audioUrl = response.audio?.audioUrl || "";
  const hasAudioResult = Boolean(response.audio?.available && audioUrl);

  return {
    audioUrl: hasAudioResult ? audioUrl : "",
    error: response.job.error ?? "",
    id: response.job.id,
    mediaType:
      response.audio?.mediaType || generation?.contentType || asset?.mediaType || "",
    status: response.job.status,
    title: response.audio?.title || asset?.title || "Generated audio",
  };
}

function parseAudioOutput(output: unknown) {
  if (!output || typeof output !== "object") {
    return { audioUrl: "", mediaType: "", title: "" };
  }

  const value = output as {
    assetUrl?: unknown;
    audio_url?: unknown;
    audioUrl?: unknown;
    mimeType?: unknown;
    mediaType?: unknown;
    title?: unknown;
    url?: unknown;
  };
  const audioUrl = [value.audioUrl, value.audio_url, value.assetUrl, value.url].find(
    (item) => typeof item === "string",
  );
  const mediaType = [value.mediaType, value.mimeType].find(
    (item) => typeof item === "string",
  );

  return {
    audioUrl: typeof audioUrl === "string" ? audioUrl : "",
    mediaType: typeof mediaType === "string" ? mediaType : "",
    title: typeof value.title === "string" ? value.title : "",
  };
}

function isPlayableAudioUrl(value: string) {
  return (
    value.startsWith("data:audio/") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  );
}

function audioResultUrl(jobId: string) {
  return `/api/ai/audio-jobs/${jobId}/audio`;
}
