"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { LocalSong } from "@/features/library/types";
import type { CustomModelCardInput } from "./custom-model-cards";

type ApiError = {
  error?: string;
};

export type ModelTrainingBusyState = "queue" | "refresh" | "save" | undefined;

export type QueueModelTrainingInput = {
  constraints?: string;
  modelIntent: string;
  modelName: string;
  notes?: string;
  rightsConfirmed: boolean;
  sources: LocalSong[];
};

export type GeneratedModelCardView = CustomModelCardInput & {
  available: boolean;
};

export type ModelTrainingJobView = {
  error: string;
  id: string;
  modelCard?: GeneratedModelCardView;
  modelName: string;
  sourceCount: number;
  sourceTitles: string[];
  status: string;
};

type QueueModelTrainingResponse = {
  jobId?: string;
};

type ModelTrainingJobResponse = {
  job: {
    error?: string | null;
    id: string;
    modelName: string;
    sourceCount: number;
    sourceTitles: string[];
    status: string;
  };
  modelCard?: GeneratedModelCardView;
};

export function useModelTrainingJob(
  onGeneratedModelCard: (input: CustomModelCardInput) => Promise<unknown> | unknown,
) {
  const [busy, setBusy] = useState<ModelTrainingBusyState>();
  const [job, setJob] = useState<ModelTrainingJobView | undefined>();

  async function queueModelTraining(input: QueueModelTrainingInput) {
    setBusy("queue");
    try {
      const response = await fetch("/api/ai/model-training-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constraints: input.constraints ?? "",
          modelIntent: input.modelIntent,
          modelName: input.modelName,
          notes: input.notes ?? "",
          rightsConfirmed: input.rightsConfirmed,
          sources: await Promise.all(
            input.sources.map(async (source) => ({
              durationMs: source.durationMs,
              lyrics: source.lyrics,
              sourceAudioDataBase64: await blobToBase64(source.audioBlob),
              sourceMediaType:
                source.audioType || source.audioBlob.type || "audio/mpeg",
              sourceSongId: source.id,
              sourceStyle: source.stylePrompt,
              sourceTitle: source.title,
              tags: source.tags,
            })),
          ),
        }),
      });
      const payload = (await response.json()) as QueueModelTrainingResponse &
        ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Custom model training failed.");
      }

      const queued = {
        error: "",
        id: payload.jobId ?? "",
        modelCard: undefined,
        modelName: input.modelName,
        sourceCount: input.sources.length,
        sourceTitles: input.sources.map((source) => source.title),
        status: payload.jobId ? "running" : "",
      };
      setJob(queued);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      toast.success("Custom model training queued.");
      return queued;
    } finally {
      setBusy(undefined);
    }
  }

  async function refreshModelTrainingJob(jobId = job?.id) {
    if (!jobId) {
      return job;
    }

    setBusy("refresh");
    try {
      const response = await fetch(`/api/ai/model-training-jobs/${jobId}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ModelTrainingJobResponse & ApiError;

      if (!response.ok) {
        throw new Error(payload.error || "Custom model status failed.");
      }

      const nextJob = toModelTrainingJobView(payload);
      setJob(nextJob);
      window.dispatchEvent(new CustomEvent("essence-ai-jobs:changed"));
      return nextJob;
    } finally {
      setBusy(undefined);
    }
  }

  async function saveReadyModelCard() {
    const current = job?.modelCard?.available ? job : await refreshModelTrainingJob();
    const modelCard = current?.modelCard;

    if (!current || !modelCard?.available) {
      toast.error("No completed model card is available yet.");
      return;
    }

    setBusy("save");
    try {
      await onGeneratedModelCard({
        constraints: modelCard.constraints,
        description: modelCard.description,
        modelIntent: modelCard.modelIntent,
        name: modelCard.name,
        providerModelId: modelCard.providerModelId,
        recommendedUse: modelCard.recommendedUse,
        rightsConfirmed: true,
        sourceCount: current.sourceCount,
        sourceTitles: current.sourceTitles,
        styleSummary: modelCard.styleSummary,
      });
      toast.success("Custom model card saved.");
    } finally {
      setBusy(undefined);
    }
  }

  return {
    busy,
    job,
    queueModelTraining,
    refreshModelTrainingJob,
    saveReadyModelCard,
  };
}

function toModelTrainingJobView(
  response: ModelTrainingJobResponse,
): ModelTrainingJobView {
  return {
    error: response.job.error ?? "",
    id: response.job.id,
    modelCard: response.modelCard?.available ? response.modelCard : undefined,
    modelName: response.job.modelName,
    sourceCount: response.job.sourceCount,
    sourceTitles: response.job.sourceTitles,
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
