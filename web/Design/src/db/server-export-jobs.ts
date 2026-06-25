import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { serverExportJob, type ServerExportJobRow } from "@/db/schema";
import {
  isServerExportJobStatus,
  normalizeServerExportProgress,
  type ServerExportJobSummary,
  type ServerExportJobStatus,
} from "@/features/editor/server-export-job-model";
import type { ExportFormat } from "@/features/editor/export-design";

function toSummary(row: ServerExportJobRow): ServerExportJobSummary {
  return {
    id: row.id,
    projectId: row.projectId,
    projectName: row.projectName,
    format: row.format as ExportFormat,
    formatLabel: row.formatLabel,
    fileName: row.fileName,
    status: isServerExportJobStatus(row.status) ? row.status : "failed",
    progress: normalizeServerExportProgress(row.progress),
    artifactName: row.artifactName,
    artifactMimeType: row.artifactMimeType,
    artifactSizeBytes: row.artifactSizeBytes,
    artifactDataUrl: row.artifactDataUrl,
    failureMessage: row.failureMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export async function listServerExportJobs(userId: string) {
  const rows = await getDb()
    .select()
    .from(serverExportJob)
    .where(eq(serverExportJob.userId, userId))
    .orderBy(desc(serverExportJob.updatedAt))
    .limit(24);

  return rows.map(toSummary);
}

export async function getServerExportJob(input: {
  userId: string;
  jobId: string;
}) {
  const [row] = await getDb()
    .select()
    .from(serverExportJob)
    .where(
      and(
        eq(serverExportJob.id, input.jobId),
        eq(serverExportJob.userId, input.userId),
      ),
    )
    .limit(1);

  return row ? toSummary(row) : null;
}

export async function createServerExportJob(input: {
  id: string;
  userId: string;
  projectId: string;
  projectName: string;
  format: ExportFormat;
  formatLabel: string;
  fileName: string;
  status?: ServerExportJobStatus;
  progress?: number;
}) {
  const now = new Date();
  const [row] = await getDb()
    .insert(serverExportJob)
    .values({
      id: input.id,
      userId: input.userId,
      projectId: input.projectId,
      projectName: input.projectName,
      format: input.format,
      formatLabel: input.formatLabel,
      fileName: input.fileName,
      status: input.status ?? "queued",
      progress: normalizeServerExportProgress(input.progress ?? 0),
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return toSummary(row);
}

export async function updateServerExportJob(input: {
  userId: string;
  jobId: string;
  status?: ServerExportJobStatus;
  progress?: number;
  artifactName?: string | null;
  artifactMimeType?: string | null;
  artifactSizeBytes?: number | null;
  artifactDataUrl?: string | null;
  failureMessage?: string | null;
}) {
  const status = input.status;
  const isCompleted = status === "completed";
  const [row] = await getDb()
    .update(serverExportJob)
    .set({
      ...(status ? { status } : {}),
      ...(input.progress !== undefined
        ? { progress: normalizeServerExportProgress(input.progress) }
        : {}),
      ...(input.artifactName !== undefined
        ? { artifactName: input.artifactName }
        : {}),
      ...(input.artifactMimeType !== undefined
        ? { artifactMimeType: input.artifactMimeType }
        : {}),
      ...(input.artifactSizeBytes !== undefined
        ? { artifactSizeBytes: input.artifactSizeBytes }
        : {}),
      ...(input.artifactDataUrl !== undefined
        ? { artifactDataUrl: input.artifactDataUrl }
        : {}),
      ...(input.failureMessage !== undefined
        ? { failureMessage: input.failureMessage }
        : {}),
      ...(isCompleted ? { completedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(serverExportJob.id, input.jobId),
        eq(serverExportJob.userId, input.userId),
      ),
    )
    .returning();

  return row ? toSummary(row) : null;
}
