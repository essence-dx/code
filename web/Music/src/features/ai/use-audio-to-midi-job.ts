"use client";

import { useState } from "react";
import { toast } from "sonner";

type ApiError = {
  error?: string;
};

export type AudioToMidiBusyState = "queue" | "refresh" | "download" | undefined;

export type QueueAudioToMidiInput = {
  audioBlob: Blob;
  durationMs: number;
  mediaType: string;
  notes?: string;
  region?: {
    endMs: number;
    startMs: number;
  };
  sourceId: string;
  sourceKind?: "track" | "region" | "stem";
  sourceTitle: string;
  title?: string;
};

export type AudioToMidiJobView = {
  error: string;
  id: string;
  midi?: {
    available: boolean;
    downloadUrl: string;
    mediaType: string;
    title: string;
  };
  region?: {
    endMs: number;
    startMs: number;
  };
  sourceKind: string;
  sourceTitle: string;
  status: string;
};

type QueueAudioToMidiResponse = {
  jobId?: string;
};

type AudioToMidiJobResponse = {
  job: {
    error?: string | null;
    id: string;
    region?: AudioToMidiJobView["region"];
    sourceKind: string;
    sourceTitle: string;
    status: string;
  };
  midi?: AudioToMidiJobView["midi"];
};

export function useAudioToMidiJob() {
  const [busy, setBusy] = useState<AudioToMidiBusyState>();
  const [job, setJob] = useState<AudioToMidiJobView | undefined>();

  async function queueAudioToMidi(input: QueueAudioToMidiInput) {
    setBusy("queue");
    try {
      const sourceKind = input.sourceKind ?? "track";
      const response = await fetch("/api/ai/midi-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMs: input.durationMs,
          notes: input.notes ?? "",
          region: input.region,
          sourceAudioDataBase64: await blobToBase64(input.audioBlob),
          sourceKind,
          sourceMediaType: input.mediaType || input.audioBlob.type || "audio/mpeg",
          sourceSongId: input.sourceId,
          sourceTitle: input.title || input.sourceTitle,
        }),
      });
      const payload = (await response.json()) as QueueAudioToMidiResponse &
        ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Audio-to-MIDI extraction failed.");
      }

      const queued = {
        error: "",
        id: payload.jobId ?? "",
        midi: undefined,
        region: input.region,
        sourceKind,
        sourceTitle: input.sourceTitle,
        status: payload.jobId ? "running" : "",
      };
      setJob(queued);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      toast.success("Audio-to-MIDI extraction queued.");
      return queued;
    } finally {
      setBusy(undefined);
    }
  }

  async function refreshAudioToMidiJob(jobId = job?.id) {
    if (!jobId) {
      return job;
    }

    setBusy("refresh");
    try {
      const response = await fetch(`/api/ai/midi-jobs/${jobId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as AudioToMidiJobResponse & ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Audio-to-MIDI status failed.");
      }

      const nextJob = toAudioToMidiJobView(payload);
      setJob(nextJob);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      return nextJob;
    } finally {
      setBusy(undefined);
    }
  }

  async function downloadReadyMidi() {
    const current = job?.midi?.available ? job : await refreshAudioToMidiJob();
    const downloadUrl = current?.midi?.downloadUrl;

    if (!current?.midi?.available || !downloadUrl) {
      toast.error("No completed MIDI file is available yet.");
      return;
    }

    setBusy("download");
    try {
      const response = await fetch(downloadUrl);

      if (!response.ok) {
        throw new Error("Could not fetch extracted MIDI.");
      }

      downloadBlob(await response.blob(), `${safeFileName(current.midi.title)}.mid`);
      toast.success("MIDI downloaded.");
    } finally {
      setBusy(undefined);
    }
  }

  return {
    busy,
    downloadReadyMidi,
    job,
    queueAudioToMidi,
    refreshAudioToMidiJob,
  };
}

function toAudioToMidiJobView(
  response: AudioToMidiJobResponse,
): AudioToMidiJobView {
  return {
    error: response.job.error ?? "",
    id: response.job.id,
    midi: response.midi,
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "extracted-midi";
}
