export type OfflineWorkbookSnapshotMeta = {
  baseServerUpdatedAt: string;
  documentHash: string;
  encrypted: true;
  localUpdatedAt: string;
  schemaVersion: 1;
  workbookId: string;
  workbookName: string;
};

export type OfflineWorkbookRecoveryKind = "draft" | "checkpoint" | "conflict";

export type OfflineWorkbookRecoveryCheckpointMeta =
  OfflineWorkbookSnapshotMeta & {
    checkpointId: string;
    conflictServerUpdatedAt?: string;
    kind: OfflineWorkbookRecoveryKind;
    label: string;
  };

export type OfflineSyncStatus =
  | "no-cache"
  | "synced"
  | "upload-local"
  | "server-newer"
  | "diverged";

export type OfflineSyncPlan = {
  detail: string;
  label: string;
  status: OfflineSyncStatus;
};

export function createOfflineSyncPlan({
  cacheMeta,
  hasUnsavedClientChanges,
  serverUpdatedAt,
}: {
  cacheMeta: OfflineWorkbookSnapshotMeta | null;
  hasUnsavedClientChanges: boolean;
  serverUpdatedAt: string;
}): OfflineSyncPlan {
  if (!cacheMeta) {
    return {
      detail: "No encrypted local workbook cache has been created on this device.",
      label: "No offline cache",
      status: "no-cache",
    };
  }

  const cacheBaseToken = normalizeSyncToken(cacheMeta.baseServerUpdatedAt);
  const serverToken = normalizeSyncToken(serverUpdatedAt);
  const serverMoved = cacheBaseToken !== serverToken;

  if (serverMoved && hasUnsavedClientChanges) {
    return {
      detail:
        "The server copy changed after this offline snapshot, and this editor also has unsaved changes.",
      label: "Offline conflict",
      status: "diverged",
    };
  }

  if (serverMoved) {
    return {
      detail:
        "The encrypted local snapshot is older than the current server copy.",
      label: "Server newer",
      status: "server-newer",
    };
  }

  if (hasUnsavedClientChanges) {
    return {
      detail:
        "Local edits are encrypted on this device and ready to sync to the server.",
      label: "Local changes cached",
      status: "upload-local",
    };
  }

  return {
    detail:
      "The encrypted local snapshot matches the latest successful server save.",
    label: "Offline cache synced",
    status: "synced",
  };
}

export function normalizeSyncToken(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function createOfflineRecoveryCheckpointMeta({
  baseMeta,
  conflictServerUpdatedAt,
  kind,
  label,
}: {
  baseMeta: OfflineWorkbookSnapshotMeta;
  conflictServerUpdatedAt?: string;
  kind: OfflineWorkbookRecoveryKind;
  label?: string;
}): OfflineWorkbookRecoveryCheckpointMeta {
  return {
    ...baseMeta,
    checkpointId: `${kind}-${baseMeta.localUpdatedAt}-${baseMeta.documentHash}`
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 160),
    conflictServerUpdatedAt,
    kind,
    label: label?.trim() || defaultRecoveryLabel(kind),
  };
}

export function pruneOfflineRecoveryCheckpoints(
  checkpoints: OfflineWorkbookRecoveryCheckpointMeta[],
  limit = 6,
) {
  const unique = new Map<string, OfflineWorkbookRecoveryCheckpointMeta>();

  for (const checkpoint of checkpoints) {
    const key = `${checkpoint.kind}:${checkpoint.documentHash}`;
    const existing = unique.get(key);

    if (
      !existing ||
      normalizeSyncToken(checkpoint.localUpdatedAt) >
        normalizeSyncToken(existing.localUpdatedAt)
    ) {
      unique.set(key, checkpoint);
    }
  }

  return Array.from(unique.values())
    .sort((left, right) =>
      normalizeSyncToken(right.localUpdatedAt).localeCompare(
        normalizeSyncToken(left.localUpdatedAt),
      ),
    )
    .sort((left, right) =>
      Number(right.kind === "conflict") - Number(left.kind === "conflict"),
    )
    .slice(0, limit);
}

export function describeOfflineRecoveryCheckpoint(
  checkpoint: OfflineWorkbookRecoveryCheckpointMeta,
) {
  const savedAt = new Date(checkpoint.localUpdatedAt).toLocaleString();

  if (checkpoint.kind === "conflict" && checkpoint.conflictServerUpdatedAt) {
    return `Saved ${savedAt}; server changed at ${new Date(
      checkpoint.conflictServerUpdatedAt,
    ).toLocaleString()}.`;
  }

  return `Saved ${savedAt}.`;
}

function defaultRecoveryLabel(kind: OfflineWorkbookRecoveryKind) {
  if (kind === "conflict") {
    return "Conflict recovery snapshot";
  }

  if (kind === "checkpoint") {
    return "Saved checkpoint";
  }

  return "Browser draft";
}
