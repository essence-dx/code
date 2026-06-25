import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  clearEditorAutosaveSnapshot,
  createEditorAutosaveKey,
  createEditorAutosaveSnapshot,
  getEditorAutosaveConflictStatus,
  readEditorAutosaveSnapshot,
  shouldOfferEditorAutosaveSnapshot,
  writeEditorAutosaveSnapshot,
  type EditorAutosaveStorage,
} from "@/features/editor/editor-autosave";
import type { DesignDocument } from "@/features/editor/types";

describe("editor autosave helpers", () => {
  test("writes and reads a project-scoped recovery snapshot", () => {
    const storage = new MemoryStorage();
    const snapshot = createEditorAutosaveSnapshot({
      projectId: "project-1",
      projectName: "Launch poster",
      baseUpdatedAt: "2026-05-15T10:00:00.000Z",
      document: createDocument("page-a"),
      now: new Date("2026-05-15T10:05:00.000Z"),
    });

    assert.equal(writeEditorAutosaveSnapshot(snapshot, storage), true);
    assert.deepEqual(readEditorAutosaveSnapshot("project-1", storage), {
      ...snapshot,
      updatedAt: "2026-05-15T10:05:00.000Z",
    });
  });

  test("ignores invalid or cross-project snapshots", () => {
    const storage = new MemoryStorage();

    storage.setItem(createEditorAutosaveKey("project-1"), "{broken json");
    assert.equal(readEditorAutosaveSnapshot("project-1", storage), null);

    storage.setItem(
      createEditorAutosaveKey("project-1"),
      JSON.stringify({
        ...createEditorAutosaveSnapshot({
          projectId: "project-2",
          projectName: "Other",
          baseUpdatedAt: "2026-05-15T10:00:00.000Z",
          document: createDocument("page-a"),
        }),
      }),
    );

    assert.equal(readEditorAutosaveSnapshot("project-1", storage), null);
  });

  test("offers recovery only when the local draft differs", () => {
    const document = createDocument("page-a");
    const snapshot = createEditorAutosaveSnapshot({
      projectId: "project-1",
      projectName: "Launch poster",
      baseUpdatedAt: "2026-05-15T10:00:00.000Z",
      document,
    });

    assert.equal(
      shouldOfferEditorAutosaveSnapshot({
        snapshot,
        currentProjectName: "Launch poster",
        currentDocument: document,
      }),
      false,
    );

    assert.equal(
      shouldOfferEditorAutosaveSnapshot({
        snapshot: {
          ...snapshot,
          document: createDocument("page-b"),
        },
        currentProjectName: "Launch poster",
        currentDocument: document,
      }),
      true,
    );
  });

  test("reports conflict status when the remote base changed", () => {
    const snapshot = createEditorAutosaveSnapshot({
      projectId: "project-1",
      projectName: "Launch poster",
      baseUpdatedAt: "2026-05-15T10:00:00.000Z",
      document: createDocument("page-a"),
    });

    assert.equal(
      getEditorAutosaveConflictStatus({
        snapshot,
        currentBaseUpdatedAt: "2026-05-15T10:00:00.000Z",
      }),
      "same-base",
    );
    assert.equal(
      getEditorAutosaveConflictStatus({
        snapshot,
        currentBaseUpdatedAt: "2026-05-15T11:00:00.000Z",
      }),
      "server-changed",
    );
  });

  test("clears project snapshots without touching other projects", () => {
    const storage = new MemoryStorage();

    writeEditorAutosaveSnapshot(
      createEditorAutosaveSnapshot({
        projectId: "project-1",
        projectName: "One",
        baseUpdatedAt: "2026-05-15T10:00:00.000Z",
        document: createDocument("page-a"),
      }),
      storage,
    );
    writeEditorAutosaveSnapshot(
      createEditorAutosaveSnapshot({
        projectId: "project-2",
        projectName: "Two",
        baseUpdatedAt: "2026-05-15T10:00:00.000Z",
        document: createDocument("page-b"),
      }),
      storage,
    );

    assert.equal(clearEditorAutosaveSnapshot("project-1", storage), true);
    assert.equal(readEditorAutosaveSnapshot("project-1", storage), null);
    assert.notEqual(readEditorAutosaveSnapshot("project-2", storage), null);
  });
});

function createDocument(pageId: string): DesignDocument {
  return {
    version: 1,
    width: 1080,
    height: 1080,
    activePageId: pageId,
    pages: [
      {
        id: pageId,
        name: "Page",
        background: "#ffffff",
        elements: [],
      },
    ],
  };
}

class MemoryStorage implements EditorAutosaveStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}
