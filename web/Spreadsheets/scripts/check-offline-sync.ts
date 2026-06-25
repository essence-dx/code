import { strict as assert } from "node:assert";
import {
  createOfflineRecoveryCheckpointMeta,
  createOfflineSyncPlan,
  describeOfflineRecoveryCheckpoint,
  normalizeSyncToken,
  pruneOfflineRecoveryCheckpoints,
  type OfflineWorkbookSnapshotMeta,
} from "@/features/workbooks/offline-sync";

function createMeta(
  baseServerUpdatedAt: string,
): OfflineWorkbookSnapshotMeta {
  return {
    baseServerUpdatedAt,
    documentHash: "hash",
    encrypted: true,
    localUpdatedAt: "2026-05-15T00:00:00.000Z",
    schemaVersion: 1,
    workbookId: "workbook-1",
    workbookName: "Offline model",
  };
}

const firstServerSave = "2026-05-15T00:00:00.000Z";
const secondServerSave = "2026-05-15T00:05:00.000Z";

assert.equal(
  createOfflineSyncPlan({
    cacheMeta: null,
    hasUnsavedClientChanges: false,
    serverUpdatedAt: firstServerSave,
  }).status,
  "no-cache",
  "missing cache reports no-cache",
);

assert.equal(
  createOfflineSyncPlan({
    cacheMeta: createMeta(firstServerSave),
    hasUnsavedClientChanges: false,
    serverUpdatedAt: firstServerSave,
  }).status,
  "synced",
  "matching clean cache reports synced",
);

assert.equal(
  createOfflineSyncPlan({
    cacheMeta: createMeta(firstServerSave),
    hasUnsavedClientChanges: true,
    serverUpdatedAt: firstServerSave,
  }).status,
  "upload-local",
  "matching dirty cache is ready to upload",
);

assert.equal(
  createOfflineSyncPlan({
    cacheMeta: createMeta(firstServerSave),
    hasUnsavedClientChanges: false,
    serverUpdatedAt: secondServerSave,
  }).status,
  "server-newer",
  "server movement without local edits prefers server-newer",
);

assert.equal(
  createOfflineSyncPlan({
    cacheMeta: createMeta(firstServerSave),
    hasUnsavedClientChanges: true,
    serverUpdatedAt: secondServerSave,
  }).status,
  "diverged",
  "server movement with local edits reports divergence",
);

assert.equal(
  normalizeSyncToken("bad-date"),
  "",
  "invalid sync tokens normalize to empty strings",
);

const draftCheckpoint = createOfflineRecoveryCheckpointMeta({
  baseMeta: createMeta(firstServerSave),
  kind: "draft",
  label: "Browser draft",
});
const duplicateOlderDraft = {
  ...draftCheckpoint,
  checkpointId: "older-draft",
  localUpdatedAt: "2026-05-14T23:59:00.000Z",
};
const conflictCheckpoint = createOfflineRecoveryCheckpointMeta({
  baseMeta: {
    ...createMeta(firstServerSave),
    documentHash: "conflict-hash",
    localUpdatedAt: "2026-05-15T00:02:00.000Z",
  },
  conflictServerUpdatedAt: secondServerSave,
  kind: "conflict",
});
const prunedCheckpoints = pruneOfflineRecoveryCheckpoints([
  duplicateOlderDraft,
  draftCheckpoint,
  conflictCheckpoint,
]);

assert.equal(
  prunedCheckpoints.length,
  2,
  "recovery checkpoints dedupe repeated draft hashes",
);
assert.equal(
  prunedCheckpoints[0]?.kind,
  "conflict",
  "conflict checkpoints stay easiest to restore",
);
assert.match(
  describeOfflineRecoveryCheckpoint(conflictCheckpoint),
  /server changed at/,
  "conflict checkpoint descriptions include server movement",
);

console.log("Offline sync checks passed.");
