export type ProjectSyncConflictMode = "reject-stale" | "force";

export interface ProjectSyncConflictPolicy {
  baseUpdatedAt?: string;
  mode?: ProjectSyncConflictMode;
}

export interface ProjectSyncConflictDetails {
  code: "project_conflict";
  baseUpdatedAt?: string;
  remoteUpdatedAt: string;
  localUpdatedAt: string;
}

export function detectProjectSyncConflict(input: {
  baseUpdatedAt?: string;
  remoteUpdatedAt: Date | string;
  localUpdatedAt: string;
  mode?: ProjectSyncConflictMode;
}): ProjectSyncConflictDetails | null {
  if (input.mode === "force") return null;
  const baseUpdatedAt = normalizeRevisionTime(input.baseUpdatedAt);
  if (!baseUpdatedAt) return null;

  const remoteUpdatedAt = normalizeRevisionTime(input.remoteUpdatedAt);
  if (!remoteUpdatedAt || baseUpdatedAt === remoteUpdatedAt) return null;

  return {
    code: "project_conflict",
    baseUpdatedAt,
    remoteUpdatedAt,
    localUpdatedAt: normalizeRevisionTime(input.localUpdatedAt) ?? input.localUpdatedAt,
  };
}

export function normalizeRevisionTime(value: Date | string | undefined) {
  if (value instanceof Date) return value.toISOString();
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return new Date(timestamp).toISOString();
}

export class ProjectSyncConflictError extends Error {
  constructor(public readonly conflict: ProjectSyncConflictDetails) {
    super("Project changed in the signed-in library.");
    this.name = "ProjectSyncConflictError";
  }
}
