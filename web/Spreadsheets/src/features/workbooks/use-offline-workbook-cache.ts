"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteEncryptedOfflineWorkbookRecoveryCheckpoint,
  deleteEncryptedOfflineWorkbookSnapshot,
  getEncryptedOfflineWorkbookRecoveryCheckpoints,
  getEncryptedOfflineWorkbookSnapshotMeta,
  loadEncryptedOfflineWorkbookSnapshot,
  saveEncryptedOfflineWorkbookSnapshot,
} from "@/features/workbooks/offline-cache";
import {
  createOfflineSyncPlan,
  type OfflineWorkbookRecoveryKind,
} from "@/features/workbooks/offline-sync";
import type { WorkbookDocument } from "@/features/workbooks/types";

type OfflineWorkbookCacheInput = {
  document: WorkbookDocument;
  isDirty: boolean;
  isReadOnlyAccess: boolean;
  serverUpdatedAt: string;
  workbookId: string;
  workbookName: string;
};

export function useOfflineWorkbookCache({
  document,
  isDirty,
  isReadOnlyAccess,
  serverUpdatedAt,
  workbookId,
  workbookName,
}: OfflineWorkbookCacheInput) {
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [offlineCacheMeta, setOfflineCacheMeta] = useState<ReturnType<
    typeof getEncryptedOfflineWorkbookSnapshotMeta
  >>(null);
  const [offlineRecoveryCheckpoints, setOfflineRecoveryCheckpoints] = useState<
    ReturnType<typeof getEncryptedOfflineWorkbookRecoveryCheckpoints>
  >([]);
  const latestDocument = useRef(document);

  useEffect(() => {
    latestDocument.current = document;
  }, [document]);

  const offlineSyncPlan = useMemo(
    () =>
      createOfflineSyncPlan({
        cacheMeta: offlineCacheMeta,
        hasUnsavedClientChanges: isDirty,
        serverUpdatedAt,
      }),
    [isDirty, offlineCacheMeta, serverUpdatedAt],
  );

  const cacheCurrentWorkbookSnapshot = useCallback(
    async (
      baseServerUpdatedAt = serverUpdatedAt,
      options?: {
        conflictServerUpdatedAt?: string;
        recoveryKind?: OfflineWorkbookRecoveryKind;
        recoveryLabel?: string;
      },
    ) => {
      if (isReadOnlyAccess) {
        return null;
      }

      const meta = await saveEncryptedOfflineWorkbookSnapshot({
        baseServerUpdatedAt,
        conflictServerUpdatedAt: options?.conflictServerUpdatedAt,
        document: latestDocument.current,
        recoveryKind: options?.recoveryKind,
        recoveryLabel: options?.recoveryLabel,
        workbookId,
        workbookName,
      });

      setOfflineCacheMeta(meta);
      setOfflineRecoveryCheckpoints(
        getEncryptedOfflineWorkbookRecoveryCheckpoints(workbookId),
      );
      return meta;
    },
    [isReadOnlyAccess, serverUpdatedAt, workbookId, workbookName],
  );

  const restoreOfflineCache = useCallback(async (checkpointId?: string) => {
    const snapshot = await loadEncryptedOfflineWorkbookSnapshot(
      workbookId,
      checkpointId,
    );

    setOfflineCacheMeta(snapshot.meta);

    return snapshot;
  }, [workbookId]);

  const deleteOfflineRecoveryCheckpoint = useCallback(
    (checkpointId: string) => {
      deleteEncryptedOfflineWorkbookRecoveryCheckpoint(workbookId, checkpointId);
      setOfflineRecoveryCheckpoints(
        getEncryptedOfflineWorkbookRecoveryCheckpoints(workbookId),
      );
    },
    [workbookId],
  );

  const clearOfflineCache = useCallback(async () => {
    await deleteEncryptedOfflineWorkbookSnapshot(workbookId);
    setOfflineCacheMeta(null);
    setOfflineRecoveryCheckpoints([]);
    setOfflineNotice("Encrypted offline cache cleared for this workbook.");
  }, [workbookId]);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      setOfflineCacheMeta(getEncryptedOfflineWorkbookSnapshotMeta(workbookId));
      setOfflineRecoveryCheckpoints(
        getEncryptedOfflineWorkbookRecoveryCheckpoints(workbookId),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [workbookId]);

  useEffect(() => {
    if (isReadOnlyAccess) {
      return;
    }

    const timeout = window.setTimeout(() => {
      cacheCurrentWorkbookSnapshot(serverUpdatedAt, {
        recoveryKind: "draft",
        recoveryLabel: "Autosaved browser draft",
      }).catch(() => {
        setOfflineNotice("Encrypted offline cache could not be updated.");
      });
    }, isDirty ? 900 : 2400);

    return () => window.clearTimeout(timeout);
  }, [
    cacheCurrentWorkbookSnapshot,
    document,
    isDirty,
    isReadOnlyAccess,
    serverUpdatedAt,
  ]);

  return {
    cacheCurrentWorkbookSnapshot,
    clearOfflineCache,
    deleteOfflineRecoveryCheckpoint,
    offlineCacheMeta,
    offlineNotice,
    offlineRecoveryCheckpoints,
    offlineSyncPlan,
    restoreOfflineCache,
    setOfflineNotice,
  };
}
