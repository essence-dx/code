import type { ExportFormat } from "@/features/editor/export-design";

export type ExportJobStatus = "queued" | "running" | "completed" | "failed";

export type ExportJobSummary = {
  id: string;
  format: ExportFormat;
  formatLabel: string;
  fileName: string;
  status: ExportJobStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  artifactName?: string;
  failureMessage?: string;
};

const maxExportJobs = 20;

export function createExportJob(input: {
  format: ExportFormat;
  projectName: string;
  now?: string;
}): ExportJobSummary {
  const now = input.now ?? new Date().toISOString();

  return {
    id: `export-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    format: input.format,
    formatLabel: getExportFormatLabel(input.format),
    fileName: createExportArtifactName(input.projectName, input.format),
    status: "queued",
    progress: 4,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateExportJob(
  jobs: ExportJobSummary[],
  jobId: string,
  patch: Partial<Omit<ExportJobSummary, "id" | "createdAt">>,
) {
  return jobs.map((job) =>
    job.id === jobId
      ? {
          ...job,
          ...patch,
          updatedAt: patch.updatedAt ?? new Date().toISOString(),
        }
      : job,
  );
}

export function prependExportJob(
  jobs: ExportJobSummary[],
  job: ExportJobSummary,
) {
  return [job, ...jobs.filter((item) => item.id !== job.id)].slice(
    0,
    maxExportJobs,
  );
}

export function normalizeExportJobs(value: unknown): ExportJobSummary[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isExportJobSummary)
    .slice(0, maxExportJobs)
    .map((job) => ({
      ...job,
      formatLabel: getExportFormatLabel(job.format),
      fileName: job.fileName || createExportArtifactName("design", job.format),
      progress: clampProgress(job.progress),
    }));
}

export function loadExportJobs(projectId: string) {
  if (typeof window === "undefined") return [];

  try {
    return normalizeExportJobs(
      JSON.parse(window.localStorage.getItem(getExportJobsKey(projectId)) ?? "[]"),
    );
  } catch {
    return [];
  }
}

export function saveExportJobs(projectId: string, jobs: ExportJobSummary[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      getExportJobsKey(projectId),
      JSON.stringify(normalizeExportJobs(jobs)),
    );
  } catch {
    // Export history is a convenience layer; failed persistence must not block exports.
  }
}

export function getExportFailureMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return String(error || "Export failed");
}

export function getExportFormatLabel(format: ExportFormat) {
  switch (format) {
    case "transparent-png":
      return "Transparent PNG";
    case "multipage-pdf":
      return "Multi-page PDF";
    case "print-pdf":
      return "Print-ready PDF";
    case "media-sequence":
      return "Media sequence JSON";
    case "docx":
      return "DOCX";
    case "xlsx":
      return "XLSX";
    case "gif":
      return "GIF";
    case "jpg":
      return "JPG";
    case "mp4":
      return "MP4";
    case "pdf":
      return "PDF";
    case "png":
      return "PNG";
    case "svg":
      return "SVG";
    case "webp":
      return "WebP";
    case "html":
      return "Website HTML";
  }
}

function createExportArtifactName(projectName: string, format: ExportFormat) {
  const baseName = slugifyExportName(projectName);

  switch (format) {
    case "transparent-png":
      return `${baseName}-transparent.png`;
    case "multipage-pdf":
      return `${baseName}.pdf`;
    case "print-pdf":
      return `${baseName}-print-ready.pdf`;
    case "media-sequence":
      return `${baseName}-media-sequence.json`;
    case "html":
      return `${baseName}-website.html`;
    case "jpg":
      return `${baseName}.jpg`;
    default:
      return `${baseName}.${format}`;
  }
}

function getExportJobsKey(projectId: string) {
  return `essence-export-jobs:${projectId}`;
}

function isExportJobSummary(value: unknown): value is ExportJobSummary {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ExportJobSummary>;

  return (
    typeof candidate.id === "string" &&
    isExportFormat(candidate.format) &&
    isExportJobStatus(candidate.status) &&
    typeof candidate.createdAt === "string" &&
    typeof candidate.updatedAt === "string"
  );
}

function isExportFormat(value: unknown): value is ExportFormat {
  return (
    value === "png" ||
    value === "transparent-png" ||
    value === "jpg" ||
    value === "webp" ||
    value === "svg" ||
    value === "pdf" ||
    value === "multipage-pdf" ||
    value === "print-pdf" ||
    value === "docx" ||
    value === "xlsx" ||
    value === "gif" ||
    value === "mp4" ||
    value === "media-sequence" ||
    value === "html"
  );
}

function isExportJobStatus(value: unknown): value is ExportJobStatus {
  return (
    value === "queued" ||
    value === "running" ||
    value === "completed" ||
    value === "failed"
  );
}

function clampProgress(value: unknown) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;

  return Math.max(0, Math.min(100, Math.round(value)));
}

function slugifyExportName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "essence-design"
  );
}
