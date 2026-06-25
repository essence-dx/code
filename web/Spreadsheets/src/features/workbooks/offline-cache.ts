import {
  parseWorkbookBackup,
  workbookDocumentToBackupJson,
} from "@/features/workbooks/workbook-backup";
import type { WorkbookDocument } from "@/features/workbooks/types";
import {
  createOfflineRecoveryCheckpointMeta,
  pruneOfflineRecoveryCheckpoints,
  type OfflineWorkbookRecoveryCheckpointMeta,
  type OfflineWorkbookRecoveryKind,
  type OfflineWorkbookSnapshotMeta,
} from "@/features/workbooks/offline-sync";

type OfflineSnapshotRecord = {
  ciphertext: string;
  iv: string;
  meta: OfflineWorkbookSnapshotMeta;
  recoveryCheckpoints?: OfflineRecoveryCheckpointRecord[];
  version: 1;
};

type OfflineRecoveryCheckpointRecord = {
  ciphertext: string;
  iv: string;
  meta: OfflineWorkbookRecoveryCheckpointMeta;
};

type OfflineSnapshotInput = {
  baseServerUpdatedAt: string;
  conflictServerUpdatedAt?: string;
  document: WorkbookDocument;
  recoveryKind?: OfflineWorkbookRecoveryKind;
  recoveryLabel?: string;
  workbookId: string;
  workbookName: string;
};

const OFFLINE_CACHE_PREFIX = "essence-excel:offline-cache:";
const OFFLINE_CACHE_DB_NAME = "essence-excel-offline-cache";
const OFFLINE_CACHE_STORE_NAME = "workbook-keys";

export async function saveEncryptedOfflineWorkbookSnapshot({
  baseServerUpdatedAt,
  conflictServerUpdatedAt,
  document,
  recoveryKind = "draft",
  recoveryLabel,
  workbookId,
  workbookName,
}: OfflineSnapshotInput) {
  assertBrowserCrypto();
  const key = await getOrCreateWorkbookKey(workbookId);
  const encryptedSnapshot = await encryptWorkbookDocument({
    document,
    key,
    workbookName,
  });
  const meta: OfflineWorkbookSnapshotMeta = {
    baseServerUpdatedAt,
    documentHash: encryptedSnapshot.documentHash,
    encrypted: true,
    localUpdatedAt: new Date().toISOString(),
    schemaVersion: 1,
    workbookId,
    workbookName: workbookName.trim() || "Untitled workbook",
  };
  const existingRecord = readSnapshotRecord(workbookId);
  const checkpointMeta = createOfflineRecoveryCheckpointMeta({
    baseMeta: meta,
    conflictServerUpdatedAt,
    kind: recoveryKind,
    label: recoveryLabel,
  });
  const checkpointRecord: OfflineRecoveryCheckpointRecord = {
    ciphertext: encryptedSnapshot.ciphertext,
    iv: encryptedSnapshot.iv,
    meta: checkpointMeta,
  };
  const recoveryCheckpoints = createPrunedRecoveryCheckpointRecords([
    checkpointRecord,
    ...(existingRecord?.recoveryCheckpoints ?? []),
  ]);
  const record: OfflineSnapshotRecord = {
    ciphertext: encryptedSnapshot.ciphertext,
    iv: encryptedSnapshot.iv,
    meta,
    recoveryCheckpoints,
    version: 1,
  };

  window.localStorage.setItem(cacheKey(workbookId), JSON.stringify(record));

  return meta;
}

export async function loadEncryptedOfflineWorkbookSnapshot(
  workbookId: string,
  checkpointId?: string,
) {
  assertBrowserCrypto();
  const record = readSnapshotRecord(workbookId);

  if (!record) {
    throw new Error("No encrypted offline cache is available for this workbook.");
  }

  const key = await readWorkbookKey(workbookId);

  if (!key) {
    throw new Error("The encrypted offline cache key is missing.");
  }

  const source = checkpointId
    ? record.recoveryCheckpoints?.find(
        (checkpoint) => checkpoint.meta.checkpointId === checkpointId,
      )
    : record;

  if (!source) {
    throw new Error("The requested offline recovery checkpoint is not available.");
  }

  const decrypted = await crypto.subtle.decrypt(
    {
      iv: base64ToBytes(source.iv),
      name: "AES-GCM",
    },
    key,
    base64ToBytes(source.ciphertext),
  );
  const backup = parseWorkbookBackup(new TextDecoder().decode(decrypted));

  return {
    ...backup,
    meta: source.meta,
  };
}

export function getEncryptedOfflineWorkbookSnapshotMeta(workbookId: string) {
  return readSnapshotRecord(workbookId)?.meta ?? null;
}

export function getEncryptedOfflineWorkbookRecoveryCheckpoints(
  workbookId: string,
) {
  return readSnapshotRecord(workbookId)?.recoveryCheckpoints?.map(
    (checkpoint) => checkpoint.meta,
  ) ?? [];
}

export function deleteEncryptedOfflineWorkbookRecoveryCheckpoint(
  workbookId: string,
  checkpointId: string,
) {
  if (typeof window === "undefined") {
    return;
  }

  const record = readSnapshotRecord(workbookId);

  if (!record) {
    return;
  }

  window.localStorage.setItem(
    cacheKey(workbookId),
    JSON.stringify({
      ...record,
      recoveryCheckpoints: record.recoveryCheckpoints?.filter(
        (checkpoint) => checkpoint.meta.checkpointId !== checkpointId,
      ),
    }),
  );
}

export async function deleteEncryptedOfflineWorkbookSnapshot(workbookId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(cacheKey(workbookId));

  if (typeof indexedDB === "undefined") {
    return;
  }

  const database = await openOfflineCacheDatabase();

  try {
    await runStoreRequest<undefined>(database, "readwrite", (store) =>
      store.delete(workbookId),
    );
  } finally {
    database.close();
  }
}

function cacheKey(workbookId: string) {
  return `${OFFLINE_CACHE_PREFIX}${workbookId}`;
}

function readSnapshotRecord(workbookId: string): OfflineSnapshotRecord | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(cacheKey(workbookId));

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<OfflineSnapshotRecord>;

    if (
      parsed.version !== 1 ||
      parsed.meta?.encrypted !== true ||
      typeof parsed.ciphertext !== "string" ||
      typeof parsed.iv !== "string"
    ) {
      return null;
    }

    return parsed as OfflineSnapshotRecord;
  } catch {
    return null;
  }
}

async function encryptWorkbookDocument({
  document,
  key,
  workbookName,
}: {
  document: WorkbookDocument;
  key: CryptoKey;
  workbookName: string;
}) {
  const serialized = workbookDocumentToBackupJson({ document, workbookName });
  const encoded = new TextEncoder().encode(serialized);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { iv, name: "AES-GCM" },
    key,
    encoded,
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    documentHash: await digestText(serialized),
    iv: bytesToBase64(iv),
  };
}

function createPrunedRecoveryCheckpointRecords(
  records: OfflineRecoveryCheckpointRecord[],
) {
  const recordById = new Map(
    records.map((record) => [record.meta.checkpointId, record]),
  );

  return pruneOfflineRecoveryCheckpoints(
    records.map((record) => record.meta),
  )
    .map((meta) => recordById.get(meta.checkpointId))
    .filter((record): record is OfflineRecoveryCheckpointRecord =>
      Boolean(record),
    );
}

function assertBrowserCrypto() {
  if (
    typeof window === "undefined" ||
    typeof indexedDB === "undefined" ||
    !crypto.subtle
  ) {
    throw new Error("Encrypted offline cache is not available in this runtime.");
  }
}

async function getOrCreateWorkbookKey(workbookId: string) {
  const existingKey = await readWorkbookKey(workbookId);

  if (existingKey) {
    return existingKey;
  }

  const key = await crypto.subtle.generateKey(
    { length: 256, name: "AES-GCM" },
    false,
    ["decrypt", "encrypt"],
  );

  await writeWorkbookKey(workbookId, key);

  return key;
}

function openOfflineCacheDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_CACHE_DB_NAME, 1);

    request.addEventListener("upgradeneeded", () => {
      request.result.createObjectStore(OFFLINE_CACHE_STORE_NAME);
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () =>
      reject(request.error ?? new Error("Could not open offline cache.")),
    );
  });
}

async function readWorkbookKey(workbookId: string) {
  const database = await openOfflineCacheDatabase();

  try {
    return await runStoreRequest<CryptoKey | undefined>(
      database,
      "readonly",
      (store) => store.get(workbookId),
    );
  } finally {
    database.close();
  }
}

async function writeWorkbookKey(workbookId: string, key: CryptoKey) {
  const database = await openOfflineCacheDatabase();

  try {
    await runStoreRequest<IDBValidKey>(database, "readwrite", (store) =>
      store.put(key, workbookId),
    );
  } finally {
    database.close();
  }
}

function runStoreRequest<T>(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  createRequest: (store: IDBObjectStore) => IDBRequest,
) {
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(OFFLINE_CACHE_STORE_NAME, mode);
    const request = createRequest(
      transaction.objectStore(OFFLINE_CACHE_STORE_NAME),
    );

    request.addEventListener("success", () => resolve(request.result as T));
    request.addEventListener("error", () =>
      reject(request.error ?? new Error("Offline cache request failed.")),
    );
    transaction.addEventListener("error", () =>
      reject(
        transaction.error ?? new Error("Offline cache transaction failed."),
      ),
    );
  });
}

async function digestText(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );

  return bytesToBase64(new Uint8Array(digest));
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = window.atob(value);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
