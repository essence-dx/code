export function createProjectSyncUrl(input: {
  projectId: string;
  editShareId?: string | null;
}) {
  const params = new URLSearchParams();

  if (input.editShareId) {
    params.set("editShareId", input.editShareId);
  }

  const query = params.toString();
  return `/api/projects/${input.projectId}${query ? `?${query}` : ""}`;
}

export function isRemoteProjectNewer(input: {
  remoteUpdatedAt: string;
  lastSyncedAt: string | null;
}) {
  if (!input.lastSyncedAt) {
    return true;
  }

  const remoteTime = Date.parse(input.remoteUpdatedAt);
  const localTime = Date.parse(input.lastSyncedAt);

  if (!Number.isFinite(remoteTime) || !Number.isFinite(localTime)) {
    return input.remoteUpdatedAt !== input.lastSyncedAt;
  }

  return remoteTime > localTime;
}

export type ProjectCollaborationOperationKind = "autosave-sync" | "manual-save";

export function createProjectCollaborationOperationId(input: {
  projectId: string;
  revision: number;
  kind: ProjectCollaborationOperationKind;
}) {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;

  return `${input.kind}-${input.projectId}-${input.revision}-${randomPart}`;
}
