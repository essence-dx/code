"use client";

import type { ExportJobSummary } from "@/features/editor/export-job-history";
import type { ClientExportArtifact } from "@/features/editor/export-artifacts";
import { createStoredExportArtifactPayload } from "@/features/editor/server-export-job-model";

export async function createServerExportJob(input: {
  projectId: string;
  projectName: string;
  job: ExportJobSummary;
}) {
  await sendExportJobRequest("/api/export-jobs", {
    method: "POST",
    body: {
      jobId: input.job.id,
      projectId: input.projectId,
      projectName: input.projectName,
      format: input.job.format,
      formatLabel: input.job.formatLabel,
      fileName: input.job.fileName,
      status: input.job.status,
      progress: input.job.progress,
    },
  });
}

export async function updateServerExportJob(input: {
  jobId: string;
  status?: ExportJobSummary["status"];
  progress?: number;
  failureMessage?: string | null;
  artifact?: ClientExportArtifact | null;
}) {
  await sendExportJobRequest(`/api/export-jobs/${encodeURIComponent(input.jobId)}`, {
    method: "PATCH",
    body: {
      status: input.status,
      progress: input.progress,
      failureMessage: input.failureMessage,
      artifact: input.artifact
        ? createStoredExportArtifactPayload(input.artifact)
        : undefined,
    },
  });
}

async function sendExportJobRequest(
  url: string,
  input: {
    body: Record<string, unknown>;
    method: "POST" | "PATCH";
  },
) {
  try {
    await fetch(url, {
      method: input.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input.body),
    });
  } catch {
    // Browser exports must keep working even when server history sync is offline.
  }
}
