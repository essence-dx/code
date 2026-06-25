import type { DesignDocument } from "@/features/editor/types";

export type OfflineSaveMutationStatus =
  | "queued"
  | "retrying"
  | "failed"
  | "synced";

export type OfflineSaveMutation = {
  id: string;
  fileId: string;
  fileName: string;
  operation: "save-design-file";
  status: OfflineSaveMutationStatus;
  attemptCount: number;
  document: DesignDocument;
  documentHash: string;
  baseUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
  lastAttemptAt?: string;
  lastError?: string;
  lastSyncedAt?: string;
};

export type OfflineSaveMutationReportEntry = OfflineSaveMutation & {
  isCurrentSnapshot: boolean;
};

export type OfflineSaveQueueReport = {
  fileId: string;
  currentDocumentHash: string;
  entries: OfflineSaveMutationReportEntry[];
  totalCount: number;
  retryableCount: number;
  pendingCount: number;
  failedCount: number;
  syncedCount: number;
  staleCount: number;
  latestRetryableEntry: OfflineSaveMutationReportEntry | null;
  latestError: string | null;
};

export type OfflineSaveQueueEvidence = {
  schema: "essence.offline-save-queue.v1";
  exportedAt: string;
  fileId: string;
  fileName: string;
  currentDocumentHash: string;
  currentDocumentUpdatedAt: string;
  queue: OfflineSaveMutationReportEntry[];
  summary: Omit<OfflineSaveQueueReport, "entries" | "latestRetryableEntry"> & {
    latestRetryableEntryId: string | null;
  };
};

const queueLimit = 12;
const storagePrefix = "essence.editor-offline-save-queue";

export function readOfflineSaveMutations(fileId: string) {
  if (!canUseLocalStorage()) {
    return [];
  }

  const raw = localStorage.getItem(getQueueKey(fileId));

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(parseOfflineSaveMutation)
      .filter((entry): entry is OfflineSaveMutation => Boolean(entry))
      .filter((entry) => entry.fileId === fileId)
      .slice(0, queueLimit);
  } catch {
    return [];
  }
}

export function enqueueOfflineSaveMutation(input: {
  fileId: string;
  fileName: string;
  document: DesignDocument;
  error?: string;
}) {
  const now = new Date().toISOString();
  const documentHash = getDesignDocumentSnapshotHash(input.document);
  const existing = readOfflineSaveMutations(input.fileId);
  const duplicate = existing.find(
    (entry) => entry.documentHash === documentHash && entry.status !== "synced",
  );

  if (duplicate) {
    const duplicateStatus: OfflineSaveMutationStatus = input.error
      ? "failed"
      : "queued";
    const next = existing.map((entry) =>
      entry.id === duplicate.id
        ? {
            ...entry,
            fileName: input.fileName,
            status: duplicateStatus,
            lastError: input.error,
            updatedAt: now,
          }
        : entry,
    );

    writeOfflineSaveMutations(input.fileId, next);
    return next;
  }

  const status: OfflineSaveMutationStatus = input.error ? "failed" : "queued";
  const entry: OfflineSaveMutation = {
    id: createOfflineMutationId(),
    fileId: input.fileId,
    fileName: input.fileName,
    operation: "save-design-file",
    status,
    attemptCount: 0,
    document: input.document,
    documentHash,
    baseUpdatedAt: input.document.updatedAt,
    createdAt: now,
    updatedAt: now,
    lastError: input.error,
  };
  const next = [entry, ...existing].slice(0, queueLimit);

  writeOfflineSaveMutations(input.fileId, next);
  return next;
}

export function markOfflineSaveMutationRetrying(fileId: string, entryId: string) {
  const now = new Date().toISOString();
  const next = readOfflineSaveMutations(fileId).map((entry) =>
    entry.id === entryId
      ? {
          ...entry,
          status: "retrying" as const,
          attemptCount: entry.attemptCount + 1,
          lastAttemptAt: now,
          updatedAt: now,
        }
      : entry,
  );

  writeOfflineSaveMutations(fileId, next);
  return next;
}

export function markOfflineSaveMutationFailed(
  fileId: string,
  entryId: string,
  error: string,
) {
  const now = new Date().toISOString();
  const next = readOfflineSaveMutations(fileId).map((entry) =>
    entry.id === entryId
      ? {
          ...entry,
          status: "failed" as const,
          lastError: error,
          updatedAt: now,
        }
      : entry,
  );

  writeOfflineSaveMutations(fileId, next);
  return next;
}

export function markOfflineSaveMutationSynced(fileId: string, entryId: string) {
  const now = new Date().toISOString();
  const next = readOfflineSaveMutations(fileId).map((entry) =>
    entry.id === entryId
      ? {
          ...entry,
          status: "synced" as const,
          lastError: undefined,
          lastSyncedAt: now,
          updatedAt: now,
        }
      : entry,
  );

  writeOfflineSaveMutations(fileId, next);
  return next;
}

export function markAllOfflineSaveMutationsSynced(fileId: string) {
  const now = new Date().toISOString();
  const next = readOfflineSaveMutations(fileId).map((entry) =>
    entry.status === "synced"
      ? entry
      : {
          ...entry,
          status: "synced" as const,
          lastError: undefined,
          lastSyncedAt: now,
          updatedAt: now,
        },
  );

  writeOfflineSaveMutations(fileId, next);
  return next;
}

export function removeOfflineSaveMutation(fileId: string, entryId: string) {
  const next = readOfflineSaveMutations(fileId).filter(
    (entry) => entry.id !== entryId,
  );

  writeOfflineSaveMutations(fileId, next);
  return next;
}

export function clearSyncedOfflineSaveMutations(fileId: string) {
  const next = readOfflineSaveMutations(fileId).filter(
    (entry) => entry.status !== "synced",
  );

  writeOfflineSaveMutations(fileId, next);
  return next;
}

export function getOfflineSaveQueueReport(
  fileId: string,
  currentDocument: DesignDocument,
  entries: OfflineSaveMutation[],
): OfflineSaveQueueReport {
  const currentDocumentHash = getDesignDocumentSnapshotHash(currentDocument);
  const reportEntries = entries.map((entry) => ({
    ...entry,
    isCurrentSnapshot: entry.documentHash === currentDocumentHash,
  }));
  const retryableEntries = reportEntries.filter(isRetryableOfflineMutation);
  const latestRetryableEntry = retryableEntries[0] ?? null;

  return {
    fileId,
    currentDocumentHash,
    entries: reportEntries,
    totalCount: reportEntries.length,
    retryableCount: retryableEntries.length,
    pendingCount: reportEntries.filter((entry) => entry.status === "queued")
      .length,
    failedCount: reportEntries.filter((entry) => entry.status === "failed")
      .length,
    syncedCount: reportEntries.filter((entry) => entry.status === "synced")
      .length,
    staleCount: retryableEntries.filter((entry) => !entry.isCurrentSnapshot)
      .length,
    latestRetryableEntry,
    latestError: retryableEntries.find((entry) => entry.lastError)?.lastError ?? null,
  };
}

export function createOfflineSaveQueueEvidence(input: {
  fileId: string;
  fileName: string;
  currentDocument: DesignDocument;
  entries: OfflineSaveMutation[];
}): OfflineSaveQueueEvidence {
  const report = getOfflineSaveQueueReport(
    input.fileId,
    input.currentDocument,
    input.entries,
  );

  return {
    schema: "essence.offline-save-queue.v1",
    exportedAt: new Date().toISOString(),
    fileId: input.fileId,
    fileName: input.fileName,
    currentDocumentHash: report.currentDocumentHash,
    currentDocumentUpdatedAt: input.currentDocument.updatedAt,
    queue: report.entries,
    summary: {
      fileId: report.fileId,
      currentDocumentHash: report.currentDocumentHash,
      totalCount: report.totalCount,
      retryableCount: report.retryableCount,
      pendingCount: report.pendingCount,
      failedCount: report.failedCount,
      syncedCount: report.syncedCount,
      staleCount: report.staleCount,
      latestError: report.latestError,
      latestRetryableEntryId: report.latestRetryableEntry?.id ?? null,
    },
  };
}

export function getDesignDocumentSnapshotHash(document: DesignDocument) {
  return hashString(JSON.stringify(document));
}

function writeOfflineSaveMutations(
  fileId: string,
  entries: OfflineSaveMutation[],
) {
  if (!canUseLocalStorage()) {
    return;
  }

  localStorage.setItem(
    getQueueKey(fileId),
    JSON.stringify(entries.slice(0, queueLimit)),
  );
}

function parseOfflineSaveMutation(value: unknown): OfflineSaveMutation | null {
  if (!isRecord(value) || !isRecord(value.document)) {
    return null;
  }

  if (
    typeof value.id !== "string" ||
    typeof value.fileId !== "string" ||
    typeof value.fileName !== "string" ||
    value.operation !== "save-design-file" ||
    !isOfflineSaveMutationStatus(value.status) ||
    typeof value.documentHash !== "string" ||
    typeof value.baseUpdatedAt !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  const entry: OfflineSaveMutation = {
    id: value.id,
    fileId: value.fileId,
    fileName: value.fileName,
    operation: "save-design-file" as const,
    status: value.status,
    attemptCount:
      typeof value.attemptCount === "number" && Number.isFinite(value.attemptCount)
        ? value.attemptCount
        : 0,
    document: value.document as DesignDocument,
    documentHash: value.documentHash,
    baseUpdatedAt: value.baseUpdatedAt,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    lastAttemptAt:
      typeof value.lastAttemptAt === "string" ? value.lastAttemptAt : undefined,
    lastError: typeof value.lastError === "string" ? value.lastError : undefined,
    lastSyncedAt:
      typeof value.lastSyncedAt === "string" ? value.lastSyncedAt : undefined,
  };

  return entry;
}

function isRetryableOfflineMutation(entry: OfflineSaveMutation) {
  return entry.status === "queued" || entry.status === "failed";
}

function isOfflineSaveMutationStatus(
  value: unknown,
): value is OfflineSaveMutationStatus {
  return (
    value === "queued" ||
    value === "retrying" ||
    value === "failed" ||
    value === "synced"
  );
}

function createOfflineMutationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getQueueKey(fileId: string) {
  return `${storagePrefix}.${fileId}`;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hashString(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
