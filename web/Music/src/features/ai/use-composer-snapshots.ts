"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteComposerSnapshot,
  deleteComposerSnapshots,
  importComposerSnapshots,
  listComposerSnapshots,
  saveComposerSnapshot,
  serializeComposerSnapshots,
  subscribeToComposerSnapshots,
  toggleComposerSnapshotPin,
  updateComposerSnapshotNote,
  type ComposerSnapshot,
  type ComposerSnapshotImportResult,
  type ComposerSnapshotInput,
} from "./composer-snapshots";

export function useComposerSnapshots() {
  const [snapshots, setSnapshots] = useState<ComposerSnapshot[]>([]);

  const refresh = useCallback(() => {
    setSnapshots(listComposerSnapshots());
  }, []);

  useEffect(() => {
    refresh();
    return subscribeToComposerSnapshots(refresh);
  }, [refresh]);

  const saveSnapshot = useCallback(
    (input: ComposerSnapshotInput) => {
      const snapshot = saveComposerSnapshot(input);
      refresh();
      return snapshot;
    },
    [refresh],
  );

  const deleteSnapshot = useCallback(
    (id: string) => {
      deleteComposerSnapshot(id);
      refresh();
    },
    [refresh],
  );

  const deleteSnapshots = useCallback(
    (ids: string[]) => {
      deleteComposerSnapshots(ids);
      refresh();
    },
    [refresh],
  );

  const importSnapshots = useCallback(
    (raw: string): ComposerSnapshotImportResult => {
      const result = importComposerSnapshots(raw);
      refresh();
      return result;
    },
    [refresh],
  );

  const updateSnapshotNote = useCallback(
    (id: string, note: string) => {
      updateComposerSnapshotNote(id, note);
      refresh();
    },
    [refresh],
  );

  const toggleSnapshotPin = useCallback(
    (id: string) => {
      toggleComposerSnapshotPin(id);
      refresh();
    },
    [refresh],
  );

  return {
    deleteSnapshot,
    deleteSnapshots,
    exportSnapshots: serializeComposerSnapshots,
    importSnapshots,
    refresh,
    saveSnapshot,
    snapshots,
    toggleSnapshotPin,
    updateSnapshotNote,
  };
}
