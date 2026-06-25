import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type { ProjectVersionSummary } from "@/features/editor/types";
import type {
  WorkspaceBackupManifest,
  WorkspaceBackupManifestDownload,
  WorkspaceBackupRestoreStatus,
} from "@/features/operations/workspace-backup-restore-types";

export function createLatestVersionMap(versions: ProjectVersionSummary[]) {
  const latestByProject = new Map<string, ProjectVersionSummary>();

  for (const version of versions) {
    const current = latestByProject.get(version.projectId);
    if (
      !current ||
      timestamp(version.createdAt) > timestamp(current.createdAt)
    ) {
      latestByProject.set(version.projectId, version);
    }
  }

  return latestByProject;
}

export function createLatestCompletedExportMap(jobs: ServerExportJobSummary[]) {
  const latestByProject = new Map<string, ServerExportJobSummary>();

  for (const job of jobs) {
    if (job.status !== "completed") continue;

    const current = latestByProject.get(job.projectId);
    const jobTime = timestamp(job.completedAt ?? job.updatedAt);
    const currentTime = current
      ? timestamp(current.completedAt ?? current.updatedAt)
      : 0;

    if (!current || jobTime > currentTime) {
      latestByProject.set(job.projectId, job);
    }
  }

  return latestByProject;
}

export function groupExportFailures(jobs: ServerExportJobSummary[]) {
  const failedByProject = new Map<string, ServerExportJobSummary[]>();

  for (const job of jobs) {
    if (job.status !== "failed") continue;

    const existing = failedByProject.get(job.projectId) ?? [];
    existing.push(job);
    failedByProject.set(job.projectId, existing);
  }

  return failedByProject;
}

export function statusToScore(status: WorkspaceBackupRestoreStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 70;

  return 20;
}

export function scoreToStatus(
  score: number,
  hasBlocked: boolean,
): WorkspaceBackupRestoreStatus {
  if (hasBlocked || score < 50) return "blocked";
  if (score < 85) return "review";

  return "ready";
}

export function createProjectRestoreStatus(input: {
  latestVersionId: string | null;
  latestCompletedExportId: string | null;
  failedExportCount: number;
}): WorkspaceBackupRestoreStatus {
  if (!input.latestVersionId || !input.latestCompletedExportId) {
    return "blocked";
  }
  if (input.failedExportCount > 0) return "review";

  return "ready";
}

export function createCoverageStatus(
  coveredCount: number,
  totalCount: number,
): WorkspaceBackupRestoreStatus {
  if (totalCount === 0) return "ready";
  if (coveredCount === 0) return "blocked";
  if (coveredCount < totalCount) return "review";

  return "ready";
}

export function worstStatus(
  statuses: WorkspaceBackupRestoreStatus[],
): WorkspaceBackupRestoreStatus {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("review")) return "review";

  return "ready";
}

export function averageScore(values: number[]) {
  if (!values.length) return 100;

  return clampScore(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

export function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function createManifestDownload(
  manifest: WorkspaceBackupManifest,
): WorkspaceBackupManifestDownload {
  const json = JSON.stringify(manifest, null, 2);
  const fileDate = manifest.generatedAt.slice(0, 10) || "workspace";

  return {
    fileName: `workspace-backup-${fileDate}.json`,
    href: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    json,
  };
}

export function createStableFingerprint(parts: string[]) {
  const source = parts.join("|");
  let hash = 5381;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 33) ^ source.charCodeAt(index);
  }

  return `wsb_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function latestTimestamp(values: Array<string | null | undefined>) {
  const validValues = values
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => timestamp(right) - timestamp(left));

  return validValues[0] ?? "1970-01-01T00:00:00.000Z";
}

export function sortByNewest<T>(
  values: T[],
  getDate: (value: T) => string | null | undefined,
) {
  return [...values].sort(
    (left, right) => timestamp(getDate(right)) - timestamp(getDate(left)),
  );
}

export function timestamp(value: string | null | undefined) {
  if (!value) return 0;

  const time = Date.parse(value);

  return Number.isFinite(time) ? time : 0;
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
) {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}
