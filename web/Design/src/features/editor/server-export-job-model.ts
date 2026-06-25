import type { ExportFormat } from "@/features/editor/export-design";
import type { ClientExportArtifact } from "@/features/editor/export-artifacts";

export const serverExportJobStatuses = [
  "queued",
  "running",
  "completed",
  "failed",
] as const;

export type ServerExportJobStatus = (typeof serverExportJobStatuses)[number];

export const maxStoredExportArtifactBytes = 2 * 1024 * 1024;
export const maxStoredExportArtifactDataUrlLength = 2_900_000;

export type StoredExportArtifactPayload = {
  artifactName: string;
  artifactMimeType: string;
  artifactSizeBytes: number;
  artifactDataUrl: string | null;
};

export type ServerExportJobSummary = {
  id: string;
  projectId: string;
  projectName: string;
  format: ExportFormat;
  formatLabel: string;
  fileName: string;
  status: ServerExportJobStatus;
  progress: number;
  artifactName: string | null;
  artifactMimeType: string | null;
  artifactSizeBytes: number | null;
  artifactDataUrl: string | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export function normalizeServerExportProgress(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function isServerExportJobStatus(
  value: unknown,
): value is ServerExportJobStatus {
  return serverExportJobStatuses.includes(value as ServerExportJobStatus);
}

export function canStoreExportArtifact(artifact: ClientExportArtifact) {
  return (
    artifact.sizeBytes <= maxStoredExportArtifactBytes &&
    artifact.dataUrl.length <= maxStoredExportArtifactDataUrlLength
  );
}

export function createStoredExportArtifactPayload(
  artifact: ClientExportArtifact,
): StoredExportArtifactPayload {
  return {
    artifactName: artifact.fileName,
    artifactMimeType: artifact.mimeType,
    artifactSizeBytes: artifact.sizeBytes,
    artifactDataUrl: canStoreExportArtifact(artifact) ? artifact.dataUrl : null,
  };
}
