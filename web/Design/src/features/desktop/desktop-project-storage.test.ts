import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createDesktopProjectDatabaseSnapshot,
  markDesktopProjectMutationConflict,
  markDesktopProjectMutationSynced,
  queueDesktopProjectMutation,
  readDesktopProjectStorageState,
  writeDesktopProjectDatabaseSnapshot,
} from "@/features/desktop/desktop-project-storage";
import type { DesignDocument } from "@/features/editor/types";

describe("desktop project storage", () => {
  test("persists a local project database snapshot with resumable asset references", () => {
    const storage = new MemoryStorage();
    const snapshot = createDesktopProjectDatabaseSnapshot({
      projectId: "project-1",
      projectName: "Launch",
      baseUpdatedAt: "2026-05-18T10:00:00.000Z",
      localRevision: 3,
      document: createDocument({
        dataUrl: `data:image/png;base64,${"a".repeat(128 * 1024)}`,
      }),
      savedAt: "2026-05-18T10:05:00.000Z",
    });

    writeDesktopProjectDatabaseSnapshot(snapshot, storage);
    const state = readDesktopProjectStorageState(storage);

    assert.equal(state.databases.length, 1);
    assert.equal(state.databases[0]?.projectId, "project-1");
    assert.equal(state.databases[0]?.localRevision, 3);
    assert.equal(state.databases[0]?.assetReferences.length, 1);
    assert.equal(state.databases[0]?.assetReferences[0]?.resumeStatus, "ready");
    assert.equal(state.totals.localDatabases, 1);
    assert.equal(state.totals.assetReferences, 1);
  });

  test("queues local document mutations and creates a deterministic conflict replay plan", () => {
    const storage = new MemoryStorage();
    const document = createDocument({
      dataUrl: `data:image/png;base64,${"b".repeat(12 * 1024 * 1024)}`,
    });

    writeDesktopProjectDatabaseSnapshot(
      createDesktopProjectDatabaseSnapshot({
        projectId: "project-1",
        projectName: "Launch",
        baseUpdatedAt: "2026-05-18T10:00:00.000Z",
        localRevision: 1,
        document,
        savedAt: "2026-05-18T10:01:00.000Z",
      }),
      storage,
    );
    const mutation = queueDesktopProjectMutation(
      {
        projectId: "project-1",
        projectName: "Launch",
        kind: "project-document-save",
        baseUpdatedAt: "2026-05-18T10:00:00.000Z",
        localRevision: 2,
        document,
        createdAt: "2026-05-18T10:02:00.000Z",
      },
      storage,
    );

    markDesktopProjectMutationConflict(
      {
        mutationId: mutation.id,
        remoteUpdatedAt: "2026-05-18T10:03:00.000Z",
        reason: "Remote project changed before desktop replay.",
        checkedAt: "2026-05-18T10:04:00.000Z",
      },
      storage,
    );

    const state = readDesktopProjectStorageState(storage);

    assert.equal(state.mutationQueue.length, 1);
    assert.equal(state.mutationQueue[0]?.status, "conflict");
    assert.equal(state.replayPlan.length, 5);
    assert.deepEqual(
      state.replayPlan.map((step) => step.action),
      [
        "load-base",
        "resume-assets",
        "apply-local-document",
        "compare-remote",
        "mark-conflict",
      ],
    );
    assert.equal(state.replayPlan[1]?.status, "review");
    assert.match(state.fingerprint, /^desktop-storage-/);
  });

  test("marks synced mutations resolved and removes them from pending database state", () => {
    const storage = new MemoryStorage();
    const mutation = queueDesktopProjectMutation(
      {
        projectId: "project-1",
        projectName: "Launch",
        kind: "project-document-save",
        baseUpdatedAt: "2026-05-18T10:00:00.000Z",
        localRevision: 4,
        document: createDocument(),
        createdAt: "2026-05-18T10:02:00.000Z",
      },
      storage,
    );

    markDesktopProjectMutationSynced(
      {
        mutationId: mutation.id,
        syncedAt: "2026-05-18T10:05:00.000Z",
      },
      storage,
    );

    const state = readDesktopProjectStorageState(storage);

    assert.equal(state.mutationQueue[0]?.status, "synced");
    assert.equal(state.databases[0]?.pendingMutationIds.length, 0);
    assert.equal(state.totals.pendingMutations, 0);
    assert.equal(state.totals.syncedMutations, 1);
  });
});

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function createDocument(input: { dataUrl?: string } = {}): DesignDocument {
  return {
    version: 1,
    width: 1080,
    height: 1080,
    activePageId: "page-1",
    pages: [
      {
        id: "page-1",
        name: "Page 1",
        background: "#ffffff",
        elements: input.dataUrl
          ? [
              {
                id: "image-1",
                type: "image",
                x: 0,
                y: 0,
                width: 320,
                height: 240,
                rotation: 0,
                opacity: 1,
                src: input.dataUrl,
                alt: "Launch image",
                objectFit: "cover",
              },
            ]
          : [],
      },
    ],
  };
}
