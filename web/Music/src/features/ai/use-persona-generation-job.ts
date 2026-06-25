"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { LocalSong } from "@/features/library/types";
import type { PersonaInput } from "./persona-library";

type ApiError = {
  error?: string;
};

export type PersonaGenerationBusyState = "queue" | "refresh" | "save" | undefined;

export type QueuePersonaGenerationInput = {
  analysisPrompt: string;
  audioBlob: Blob;
  durationMs: number;
  lyrics?: string;
  mediaType: string;
  notes?: string;
  rightsConfirmed: boolean;
  source: LocalSong;
  sourceStyle?: string;
  title?: string;
};

export type GeneratedPersonaView = PersonaInput & {
  available: boolean;
};

export type PersonaGenerationJobView = {
  error: string;
  id: string;
  persona?: GeneratedPersonaView;
  sourceSongId: string;
  sourceTitle: string;
  status: string;
};

type QueuePersonaGenerationResponse = {
  jobId?: string;
};

type PersonaGenerationJobResponse = {
  job: {
    error?: string | null;
    id: string;
    sourceSongId: string;
    sourceTitle: string;
    status: string;
  };
  persona?: GeneratedPersonaView;
};

export function usePersonaGenerationJob(
  onGeneratedPersona: (input: PersonaInput) => Promise<unknown> | unknown,
) {
  const [busy, setBusy] = useState<PersonaGenerationBusyState>();
  const [job, setJob] = useState<PersonaGenerationJobView | undefined>();

  async function queuePersonaGeneration(input: QueuePersonaGenerationInput) {
    setBusy("queue");
    try {
      const response = await fetch("/api/ai/persona-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisPrompt: input.analysisPrompt,
          durationMs: input.durationMs,
          lyrics: input.lyrics ?? input.source.lyrics,
          notes: input.notes ?? "",
          rightsConfirmed: input.rightsConfirmed,
          sourceAudioDataBase64: await blobToBase64(input.audioBlob),
          sourceMediaType:
            input.mediaType || input.audioBlob.type || input.source.audioType,
          sourceSongId: input.source.id,
          sourceStyle: input.sourceStyle ?? input.source.stylePrompt,
          sourceTitle: input.title || input.source.title,
        }),
      });
      const payload = (await response.json()) as QueuePersonaGenerationResponse &
        ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Persona generation failed.");
      }

      const queued = {
        error: "",
        id: payload.jobId ?? "",
        persona: undefined,
        sourceSongId: input.source.id,
        sourceTitle: input.source.title,
        status: payload.jobId ? "running" : "",
      };
      setJob(queued);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      toast.success("Persona generation queued.");
      return queued;
    } finally {
      setBusy(undefined);
    }
  }

  async function refreshPersonaGenerationJob(jobId = job?.id) {
    if (!jobId) {
      return job;
    }

    setBusy("refresh");
    try {
      const response = await fetch(`/api/ai/persona-jobs/${jobId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as PersonaGenerationJobResponse &
        ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Persona status failed.");
      }

      const nextJob = toPersonaGenerationJobView(payload);
      setJob(nextJob);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      return nextJob;
    } finally {
      setBusy(undefined);
    }
  }

  async function saveReadyPersona() {
    const current = job?.persona?.available ? job : await refreshPersonaGenerationJob();
    const persona = current?.persona;

    if (!current || !persona?.available) {
      toast.error("No completed persona is available yet.");
      return;
    }

    setBusy("save");
    try {
      await onGeneratedPersona({
        energy: persona.energy,
        name: persona.name,
        rightsConfirmed: true,
        sourceSongId: current.sourceSongId,
        sourceTitle: current.sourceTitle,
        stylePrompt: persona.stylePrompt,
        vibe: persona.vibe,
        vocalCharacter: persona.vocalCharacter,
      });
      toast.success("Persona saved to the library.");
    } finally {
      setBusy(undefined);
    }
  }

  return {
    busy,
    job,
    queuePersonaGeneration,
    refreshPersonaGenerationJob,
    saveReadyPersona,
  };
}

function toPersonaGenerationJobView(
  response: PersonaGenerationJobResponse,
): PersonaGenerationJobView {
  return {
    error: response.job.error ?? "",
    id: response.job.id,
    persona: response.persona?.available ? response.persona : undefined,
    sourceSongId: response.job.sourceSongId,
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
