import {
  collectOfflineAssetCacheRequests,
  estimateDataUrlSizeBytes,
} from "@/features/desktop/desktop-asset-cache";
import { createDesktopProjectConflictReplayPlan } from "@/features/desktop/desktop-project-storage-replay";
import {
  desktopProjectStorageKey,
  desktopProjectStorageVersion,
  type DesktopProjectAssetReference,
  type DesktopProjectAssetResumeStatus,
  type DesktopProjectConflictReplayStep,
  type DesktopProjectDatabaseRecord,
  type DesktopProjectMutationKind,
  type DesktopProjectMutationRecord,
  type DesktopProjectMutationStatus,
  type DesktopProjectStorageLike,
  type DesktopProjectStorageState,
} from "@/features/desktop/desktop-project-storage-types";
import type { DesignDocument } from "@/features/editor/types";

export {
  desktopProjectStorageKey,
  desktopProjectStorageVersion,
} from "@/features/desktop/desktop-project-storage-types";
export type {
  DesktopProjectAssetReference,
  DesktopProjectAssetResumeStatus,
  DesktopProjectConflictReplayAction,
  DesktopProjectConflictReplayStep,
  DesktopProjectDatabaseRecord,
  DesktopProjectMutationKind,
  DesktopProjectMutationRecord,
  DesktopProjectMutationStatus,
  DesktopProjectStorageLike,
  DesktopProjectStorageState,
} from "@/features/desktop/desktop-project-storage-types";

type CreateDesktopProjectDatabaseSnapshotInput = {
  projectId: string;
  projectName: string;
  baseUpdatedAt: string;
  localRevision: number;
  document: DesignDocument;
  savedAt?: string;
};

type QueueDesktopProjectMutationInput = {
  projectId: string;
  projectName: string;
  kind: DesktopProjectMutationKind;
  baseUpdatedAt: string;
  localRevision: number;
  document?: DesignDocument | null;
  createdAt?: string;
};

const resumableAssetBytes = 8 * 1024 * 1024;
const blockedAssetBytes = 25 * 1024 * 1024;

export function createDesktopProjectDatabaseSnapshot(
  input: CreateDesktopProjectDatabaseSnapshotInput,
): DesktopProjectDatabaseRecord {
  return {
    version: desktopProjectStorageVersion,
    projectId: input.projectId,
    projectName: input.projectName,
    baseUpdatedAt: input.baseUpdatedAt,
    localUpdatedAt: input.savedAt ?? new Date().toISOString(),
    localRevision: input.localRevision,
    document: input.document,
    assetReferences: createAssetReferences(input.document),
    pendingMutationIds: [],
    conflictMutationIds: [],
  };
}

export function writeDesktopProjectDatabaseSnapshot(
  snapshot: DesktopProjectDatabaseRecord,
  storage: DesktopProjectStorageLike,
) {
  const state = readDesktopProjectStorageState(storage);
  const existing = state.databases.find(
    (database) => database.projectId === snapshot.projectId,
  );
  const databases = [
    ...state.databases.filter(
      (database) => database.projectId !== snapshot.projectId,
    ),
    {
      ...snapshot,
      pendingMutationIds: existing?.pendingMutationIds ?? [],
      conflictMutationIds: existing?.conflictMutationIds ?? [],
    },
  ];

  writeDesktopProjectStorageState(
    {
      databases,
      mutationQueue: state.mutationQueue,
    },
    storage,
  );
}

export function queueDesktopProjectMutation(
  input: QueueDesktopProjectMutationInput,
  storage: DesktopProjectStorageLike,
): DesktopProjectMutationRecord {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const state = readDesktopProjectStorageState(storage);
  const existingDatabase = state.databases.find(
    (database) => database.projectId === input.projectId,
  );
  const document = input.document ?? existingDatabase?.document ?? null;
  const mutation: DesktopProjectMutationRecord = {
    id: createMutationId({
      projectId: input.projectId,
      kind: input.kind,
      localRevision: input.localRevision,
      createdAt,
    }),
    projectId: input.projectId,
    projectName: input.projectName,
    kind: input.kind,
    status: "queued",
    baseUpdatedAt: input.baseUpdatedAt,
    localRevision: input.localRevision,
    createdAt,
    updatedAt: createdAt,
    document,
    assetReferences: document ? createAssetReferences(document) : [],
    attempts: 0,
    remoteUpdatedAt: null,
    failureReason: null,
  };
  const mutationQueue = [
    ...state.mutationQueue.filter((item) => item.id !== mutation.id),
    mutation,
  ];
  const databases = upsertDatabaseForMutation({
    databases: state.databases,
    mutation,
    mutationQueue,
  });

  writeDesktopProjectStorageState(
    {
      databases,
      mutationQueue,
    },
    storage,
  );

  return mutation;
}

export function markDesktopProjectMutationSyncing(
  input: { mutationId: string; checkedAt?: string },
  storage: DesktopProjectStorageLike,
) {
  updateDesktopProjectMutation(
    {
      mutationId: input.mutationId,
      updatedAt: input.checkedAt,
      update: (mutation) => ({
        ...mutation,
        status: "syncing",
        attempts: mutation.attempts + 1,
      }),
    },
    storage,
  );
}

export function markDesktopProjectMutationSynced(
  input: { mutationId: string; syncedAt: string },
  storage: DesktopProjectStorageLike,
) {
  updateDesktopProjectMutation(
    {
      mutationId: input.mutationId,
      updatedAt: input.syncedAt,
      update: (mutation) => ({
        ...mutation,
        status: "synced",
        remoteUpdatedAt: input.syncedAt,
        failureReason: null,
      }),
    },
    storage,
  );
}

export function markDesktopProjectMutationConflict(
  input: {
    mutationId: string;
    remoteUpdatedAt: string;
    reason: string;
    checkedAt?: string;
  },
  storage: DesktopProjectStorageLike,
) {
  updateDesktopProjectMutation(
    {
      mutationId: input.mutationId,
      updatedAt: input.checkedAt,
      update: (mutation) => ({
        ...mutation,
        status: "conflict",
        remoteUpdatedAt: input.remoteUpdatedAt,
        failureReason: input.reason,
      }),
    },
    storage,
  );
}

export function markDesktopProjectMutationFailed(
  input: { mutationId: string; reason: string; checkedAt?: string },
  storage: DesktopProjectStorageLike,
) {
  updateDesktopProjectMutation(
    {
      mutationId: input.mutationId,
      updatedAt: input.checkedAt,
      update: (mutation) => ({
        ...mutation,
        status: "failed",
        failureReason: input.reason,
      }),
    },
    storage,
  );
}

export function readDesktopProjectStorageState(
  storage: DesktopProjectStorageLike,
): DesktopProjectStorageState {
  const parsed = readRawStorageState(storage);
  const databases = parsed.databases
    .filter(isDesktopProjectDatabaseRecord)
    .sort(compareDatabases);
  const mutationQueue = parsed.mutationQueue
    .filter(isDesktopProjectMutationRecord)
    .sort(compareMutations);
  const replayPlan = createDesktopProjectConflictReplayPlan(mutationQueue);
  const totals = createTotals({ databases, mutationQueue, replayPlan });

  return {
    version: desktopProjectStorageVersion,
    databases,
    mutationQueue,
    replayPlan,
    totals,
    fingerprint: createFingerprint({
      databases,
      mutationQueue,
      replayPlan,
    }),
  };
}

export function clearDesktopProjectStorage(storage: DesktopProjectStorageLike) {
  storage.removeItem(desktopProjectStorageKey);
}

function writeDesktopProjectStorageState(
  input: {
    databases: DesktopProjectDatabaseRecord[];
    mutationQueue: DesktopProjectMutationRecord[];
  },
  storage: DesktopProjectStorageLike,
) {
  const normalized = {
    version: desktopProjectStorageVersion,
    databases: input.databases.sort(compareDatabases),
    mutationQueue: input.mutationQueue.sort(compareMutations),
  };

  storage.setItem(desktopProjectStorageKey, JSON.stringify(normalized));
}

function updateDesktopProjectMutation(
  input: {
    mutationId: string;
    updatedAt?: string;
    update: (
      mutation: DesktopProjectMutationRecord,
    ) => DesktopProjectMutationRecord;
  },
  storage: DesktopProjectStorageLike,
) {
  const state = readDesktopProjectStorageState(storage);
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  const mutationQueue = state.mutationQueue.map((mutation) => {
    if (mutation.id !== input.mutationId) return mutation;

    return {
      ...input.update(mutation),
      updatedAt,
    };
  });
  const databases = state.databases.map((database) =>
    reconcileDatabaseMutationIds(database, mutationQueue),
  );

  writeDesktopProjectStorageState({ databases, mutationQueue }, storage);
}

function createAssetReferences(
  document: DesignDocument,
): DesktopProjectAssetReference[] {
  return collectOfflineAssetCacheRequests(document)
    .map((asset): DesktopProjectAssetReference => {
      const sizeBytes = estimateDataUrlSizeBytes(asset.dataUrl);

      return {
        cacheKey: asset.cacheKey,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        sizeBytes,
        sourcePageId: asset.sourcePageId,
        sourceElementId: asset.sourceElementId,
        resumeStatus: createAssetResumeStatus(sizeBytes),
      };
    })
    .sort((left, right) => left.cacheKey.localeCompare(right.cacheKey));
}

function createAssetResumeStatus(
  sizeBytes: number,
): DesktopProjectAssetResumeStatus {
  if (sizeBytes >= blockedAssetBytes) return "blocked";
  if (sizeBytes >= resumableAssetBytes) return "resumable";

  return "ready";
}

function upsertDatabaseForMutation(input: {
  databases: DesktopProjectDatabaseRecord[];
  mutation: DesktopProjectMutationRecord;
  mutationQueue: DesktopProjectMutationRecord[];
}) {
  const existing = input.databases.find(
    (database) => database.projectId === input.mutation.projectId,
  );
  const database =
    existing ??
    createDesktopProjectDatabaseSnapshot({
      projectId: input.mutation.projectId,
      projectName: input.mutation.projectName,
      baseUpdatedAt: input.mutation.baseUpdatedAt,
      localRevision: input.mutation.localRevision,
      document:
        input.mutation.document ??
        createEmptyDocumentFallback(input.mutation.projectName),
      savedAt: input.mutation.createdAt,
    });

  return [
    ...input.databases.filter(
      (item) => item.projectId !== input.mutation.projectId,
    ),
    reconcileDatabaseMutationIds(
      {
        ...database,
        projectName: input.mutation.projectName,
        localUpdatedAt: input.mutation.createdAt,
        localRevision: Math.max(
          database.localRevision,
          input.mutation.localRevision,
        ),
        document: input.mutation.document ?? database.document,
        assetReferences: input.mutation.document
          ? input.mutation.assetReferences
          : database.assetReferences,
        pendingMutationIds: unique([
          ...database.pendingMutationIds,
          input.mutation.id,
        ]),
      },
      input.mutationQueue,
    ),
  ];
}

function reconcileDatabaseMutationIds(
  database: DesktopProjectDatabaseRecord,
  mutations: DesktopProjectMutationRecord[],
): DesktopProjectDatabaseRecord {
  const projectMutations = mutations.filter(
    (mutation) => mutation.projectId === database.projectId,
  );
  const pendingMutationIds = projectMutations
    .filter(
      (mutation) =>
        mutation.status === "queued" ||
        mutation.status === "syncing" ||
        mutation.status === "failed",
    )
    .map((mutation) => mutation.id);
  const conflictMutationIds = projectMutations
    .filter((mutation) => mutation.status === "conflict")
    .map((mutation) => mutation.id);

  return {
    ...database,
    pendingMutationIds: unique(pendingMutationIds),
    conflictMutationIds: unique(conflictMutationIds),
  };
}

function readRawStorageState(storage: DesktopProjectStorageLike): {
  databases: unknown[];
  mutationQueue: unknown[];
} {
  try {
    const raw = storage.getItem(desktopProjectStorageKey);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;

    if (!parsed || typeof parsed !== "object") {
      return { databases: [], mutationQueue: [] };
    }

    const record = parsed as Record<string, unknown>;

    return {
      databases: Array.isArray(record.databases) ? record.databases : [],
      mutationQueue: Array.isArray(record.mutationQueue)
        ? record.mutationQueue
        : [],
    };
  } catch {
    return { databases: [], mutationQueue: [] };
  }
}

function createTotals(input: {
  databases: DesktopProjectDatabaseRecord[];
  mutationQueue: DesktopProjectMutationRecord[];
  replayPlan: DesktopProjectConflictReplayStep[];
}): DesktopProjectStorageState["totals"] {
  const assetReferences = input.databases.flatMap(
    (database) => database.assetReferences,
  );

  return {
    localDatabases: input.databases.length,
    assetReferences: assetReferences.length,
    pendingMutations: input.mutationQueue.filter(
      (mutation) =>
        mutation.status === "queued" ||
        mutation.status === "syncing" ||
        mutation.status === "failed",
    ).length,
    conflictMutations: input.mutationQueue.filter(
      (mutation) => mutation.status === "conflict",
    ).length,
    syncedMutations: input.mutationQueue.filter(
      (mutation) => mutation.status === "synced",
    ).length,
    blockedAssets: assetReferences.filter(
      (asset) => asset.resumeStatus === "blocked",
    ).length,
    resumableAssets: assetReferences.filter(
      (asset) => asset.resumeStatus === "resumable",
    ).length,
    replaySteps: input.replayPlan.length,
  };
}

function createFingerprint(input: {
  databases: DesktopProjectDatabaseRecord[];
  mutationQueue: DesktopProjectMutationRecord[];
  replayPlan: DesktopProjectConflictReplayStep[];
}) {
  const seed = [
    input.databases.map((database) =>
      [
        database.projectId,
        database.localRevision,
        database.baseUpdatedAt,
        database.localUpdatedAt,
      ].join(":"),
    ),
    input.mutationQueue.map((mutation) =>
      [
        mutation.id,
        mutation.status,
        mutation.localRevision,
        mutation.remoteUpdatedAt ?? "",
      ].join(":"),
    ),
    input.replayPlan.map((step) =>
      [step.id, step.order, step.status].join(":"),
    ),
  ]
    .flat()
    .sort()
    .join("|");

  return `desktop-storage-${hashString(seed)}`;
}

function createMutationId(input: {
  projectId: string;
  kind: DesktopProjectMutationKind;
  localRevision: number;
  createdAt: string;
}) {
  return [
    "desktop-mutation",
    slugify(input.projectId),
    input.kind,
    input.localRevision,
    slugify(input.createdAt),
  ].join("-");
}

function createEmptyDocumentFallback(projectName: string): DesignDocument {
  return {
    version: 1,
    width: 1080,
    height: 1080,
    activePageId: "page-1",
    pages: [
      {
        id: "page-1",
        name: projectName || "Page 1",
        background: "#ffffff",
        elements: [],
      },
    ],
  };
}

function compareDatabases(
  left: DesktopProjectDatabaseRecord,
  right: DesktopProjectDatabaseRecord,
) {
  return (
    Date.parse(right.localUpdatedAt) - Date.parse(left.localUpdatedAt) ||
    left.projectName.localeCompare(right.projectName) ||
    left.projectId.localeCompare(right.projectId)
  );
}

function compareMutations(
  left: DesktopProjectMutationRecord,
  right: DesktopProjectMutationRecord,
) {
  return (
    Date.parse(left.createdAt) - Date.parse(right.createdAt) ||
    left.localRevision - right.localRevision ||
    left.id.localeCompare(right.id)
  );
}

function isDesktopProjectDatabaseRecord(
  value: unknown,
): value is DesktopProjectDatabaseRecord {
  if (!isRecord(value)) return false;

  return (
    value.version === desktopProjectStorageVersion &&
    typeof value.projectId === "string" &&
    typeof value.projectName === "string" &&
    typeof value.baseUpdatedAt === "string" &&
    typeof value.localUpdatedAt === "string" &&
    typeof value.localRevision === "number" &&
    isDesignDocument(value.document) &&
    Array.isArray(value.assetReferences) &&
    Array.isArray(value.pendingMutationIds) &&
    Array.isArray(value.conflictMutationIds)
  );
}

function isDesktopProjectMutationRecord(
  value: unknown,
): value is DesktopProjectMutationRecord {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.projectId === "string" &&
    typeof value.projectName === "string" &&
    isMutationStatus(value.status) &&
    typeof value.baseUpdatedAt === "string" &&
    typeof value.localRevision === "number" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.assetReferences)
  );
}

function isMutationStatus(
  value: unknown,
): value is DesktopProjectMutationStatus {
  return (
    value === "queued" ||
    value === "syncing" ||
    value === "conflict" ||
    value === "synced" ||
    value === "failed"
  );
}

function isDesignDocument(value: unknown): value is DesignDocument {
  if (!isRecord(value)) return false;

  return value.version === 1 && Array.isArray(value.pages);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "item"
  );
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
