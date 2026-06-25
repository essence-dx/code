"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearCreationDraftArchiveEvents,
  listCreationDraftArchiveEvents,
  recordCreationDraftArchiveEvent,
  serializeCreationDraftArchiveEvents,
  subscribeToCreationDraftArchiveEvents,
  type CreationDraftArchiveEvent,
  type CreationDraftArchiveEventInput,
} from "./creation-draft-archive-events";
import {
  clearCreationDraftRecoverySnapshot,
  deleteCreationDraft,
  deleteCreationDrafts,
  getCreationDraftRecoverySnapshot,
  importCreationDrafts,
  listCreationDrafts,
  previewCreationDraftArchive,
  previewCreationDraftRecoveryRestore,
  restoreCreationDraftsFromRecovery,
  saveCreationDraft,
  serializeCreationDrafts,
  setCreationDraftPinned,
  subscribeToCreationDrafts,
  updateCreationDraftNotes,
  type CreationDraft,
  type CreationDraftArchivePreview,
  type CreationDraftImportResult,
  type CreationDraftInput,
  type CreationDraftRecoverySnapshot,
  type CreationDraftRecoveryRestorePreview,
  type CreationDraftRecoveryRestoreResult,
} from "./creation-drafts";

export function useCreationDrafts() {
  const [archiveEvents, setArchiveEvents] = useState<
    CreationDraftArchiveEvent[]
  >([]);
  const [drafts, setDrafts] = useState<CreationDraft[]>([]);
  const [recoverySnapshot, setRecoverySnapshot] =
    useState<CreationDraftRecoverySnapshot | null>(null);

  const refresh = useCallback(() => {
    setArchiveEvents(listCreationDraftArchiveEvents());
    setDrafts(listCreationDrafts());
    setRecoverySnapshot(getCreationDraftRecoverySnapshot());
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribeDrafts = subscribeToCreationDrafts(refresh);
    const unsubscribeArchiveEvents =
      subscribeToCreationDraftArchiveEvents(refresh);

    return () => {
      unsubscribeDrafts();
      unsubscribeArchiveEvents();
    };
  }, [refresh]);

  const saveDraft = useCallback(
    (input: CreationDraftInput) => {
      const draft = saveCreationDraft(input);
      refresh();
      return draft;
    },
    [refresh],
  );

  const deleteDraft = useCallback(
    (id: string) => {
      deleteCreationDraft(id);
      refresh();
    },
    [refresh],
  );

  const deleteDraftBatch = useCallback(
    (ids: string[]) => {
      deleteCreationDrafts(ids);
      refresh();
    },
    [refresh],
  );

  const clearRecoverySnapshot = useCallback(() => {
    clearCreationDraftRecoverySnapshot();
    refresh();
  }, [refresh]);

  const clearArchiveEvents = useCallback(() => {
    clearCreationDraftArchiveEvents();
    refresh();
  }, [refresh]);

  const exportArchiveEvents = useCallback(
    () => serializeCreationDraftArchiveEvents(archiveEvents),
    [archiveEvents],
  );

  const importDrafts = useCallback(
    (raw: string): CreationDraftImportResult => {
      const result = importCreationDrafts(raw);
      refresh();
      return result;
    },
    [refresh],
  );

  const previewDraftArchive = useCallback(
    (raw: string): CreationDraftArchivePreview =>
      previewCreationDraftArchive(raw),
    [],
  );

  const previewRecoveryRestore = useCallback(
    (
      snapshot: CreationDraftRecoverySnapshot,
    ): CreationDraftRecoveryRestorePreview =>
      previewCreationDraftRecoveryRestore(snapshot),
    [],
  );

  const restoreRecoverySnapshot = useCallback(
    (
      snapshot: CreationDraftRecoverySnapshot,
    ): CreationDraftRecoveryRestoreResult => {
      const result = restoreCreationDraftsFromRecovery(snapshot);
      refresh();
      return result;
    },
    [refresh],
  );

  const recordArchiveEvent = useCallback(
    (input: CreationDraftArchiveEventInput) => {
      const event = recordCreationDraftArchiveEvent(input);
      refresh();
      return event;
    },
    [refresh],
  );

  const setDraftPinned = useCallback(
    (id: string, pinned: boolean) => {
      setCreationDraftPinned(id, pinned);
      refresh();
    },
    [refresh],
  );

  const updateDraftNotes = useCallback(
    (id: string, notes: string) => {
      updateCreationDraftNotes(id, notes);
      refresh();
    },
    [refresh],
  );

  return {
    archiveEvents,
    clearArchiveEvents,
    clearRecoverySnapshot,
    deleteDraft,
    deleteDraftBatch,
    drafts,
    exportArchiveEvents,
    exportDrafts: serializeCreationDrafts,
    importDrafts,
    previewDraftArchive,
    previewRecoveryRestore,
    recoverySnapshot,
    recordArchiveEvent,
    refresh,
    restoreRecoverySnapshot,
    saveDraft,
    setDraftPinned,
    updateDraftNotes,
  };
}
