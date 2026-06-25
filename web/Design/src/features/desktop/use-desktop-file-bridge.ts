"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { applyProjectAssetManifest } from "@/features/assets/project-asset-manifest";
import { collectOfflineAssetCacheRequests } from "@/features/desktop/desktop-asset-cache";
import {
  cacheOfflineDesktopAssets,
  createDesktopDesignFile,
  getSuggestedDesktopDesignFileName,
  isTauriRuntime,
  listRecentDesktopDesignFiles,
  openDesktopDesignFile,
  removeRecentDesktopDesignFile,
  saveDesktopDesignFile,
  type DesktopDesignFile,
  type DesktopRecentDesignFile,
} from "@/features/desktop/desktop-file-bridge";
import {
  createDesktopProjectDatabaseSnapshot,
  writeDesktopProjectDatabaseSnapshot,
} from "@/features/desktop/desktop-project-storage";
import type { DesignDocument } from "@/features/editor/types";

export type DesktopFileBridgeState =
  | "idle"
  | "saving"
  | "saved"
  | "opening"
  | "opened"
  | "caching"
  | "cached"
  | "error";

type UseDesktopFileBridgeInput = {
  projectId: string;
  projectName: string;
  document: DesignDocument;
  onOpenDesignFile: (file: DesktopDesignFile) => void;
};

export function useDesktopFileBridge({
  projectId,
  projectName,
  document,
  onOpenDesignFile,
}: UseDesktopFileBridgeInput) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [filePath, setFilePath] = useState("");
  const [recentFiles, setRecentFiles] = useState<DesktopRecentDesignFile[]>([]);
  const [state, setState] = useState<DesktopFileBridgeState>("idle");
  const [message, setMessage] = useState("");
  const [cachedAssetCount, setCachedAssetCount] = useState(0);
  const suggestedFileName = useMemo(
    () => getSuggestedDesktopDesignFileName(projectName),
    [projectName],
  );

  const refreshRecentFiles = useCallback(async () => {
    if (!isTauriRuntime()) return;

    setRecentFiles(await listRecentDesktopDesignFiles());
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const available = isTauriRuntime();

      setIsAvailable(available);

      if (available) {
        void refreshRecentFiles();
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [refreshRecentFiles]);

  const saveAsDesktopFile = useCallback(async () => {
    if (!filePath.trim()) {
      setState("error");
      setMessage(`Choose a path ending in ${suggestedFileName}.`);
      return;
    }

    setState("saving");
    setMessage("");

    try {
      const documentWithManifest = applyProjectAssetManifest(document);
      const result = await saveDesktopDesignFile({
        filePath,
        file: createDesktopDesignFile({
          projectId,
          projectName,
          document: documentWithManifest,
        }),
      });

      writeLocalProjectDatabaseSnapshot({
        projectId,
        projectName,
        baseUpdatedAt: result.file.exportedAt,
        localRevision: Date.parse(result.file.exportedAt),
        document: documentWithManifest,
      });
      setFilePath(result.filePath);
      setState("saved");
      setMessage("Saved local design file.");
      await refreshRecentFiles();
    } catch (error) {
      setState("error");
      setMessage(getErrorMessage(error));
    }
  }, [
    document,
    filePath,
    projectId,
    projectName,
    refreshRecentFiles,
    suggestedFileName,
  ]);

  const openFromDesktopFile = useCallback(
    async (nextFilePath = filePath) => {
      if (!nextFilePath.trim()) {
        setState("error");
        setMessage("Choose a local design file to open.");
        return;
      }

      setState("opening");
      setMessage("");

      try {
        const result = await openDesktopDesignFile(nextFilePath);

        setFilePath(result.filePath);
        writeLocalProjectDatabaseSnapshot({
          projectId: result.file.projectId,
          projectName: result.file.projectName,
          baseUpdatedAt: result.file.exportedAt,
          localRevision: Date.parse(result.file.exportedAt),
          document: result.file.document,
        });
        onOpenDesignFile(result.file);
        setState("opened");
        setMessage("Opened local design file.");
        await refreshRecentFiles();
      } catch (error) {
        setState("error");
        setMessage(getErrorMessage(error));
      }
    },
    [filePath, onOpenDesignFile, refreshRecentFiles],
  );

  const removeRecentFile = useCallback(async (nextFilePath: string) => {
    setRecentFiles(await removeRecentDesktopDesignFile(nextFilePath));
  }, []);

  const cacheOfflineAssets = useCallback(async () => {
    const assets = collectOfflineAssetCacheRequests(document);

    if (!assets.length) {
      setCachedAssetCount(0);
      setState("cached");
      setMessage("No data-url assets to cache.");
      return;
    }

    setState("caching");
    setMessage("");

    try {
      const entries = await cacheOfflineDesktopAssets(assets);

      setCachedAssetCount(entries.length);
      setState("cached");
      setMessage(`Cached ${entries.length} offline asset files.`);
    } catch (error) {
      setState("error");
      setMessage(getErrorMessage(error));
    }
  }, [document]);

  return {
    isAvailable,
    filePath,
    setFilePath,
    recentFiles,
    state,
    message,
    cachedAssetCount,
    suggestedFileName,
    refreshRecentFiles,
    saveAsDesktopFile,
    openFromDesktopFile,
    removeRecentFile,
    cacheOfflineAssets,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function writeLocalProjectDatabaseSnapshot(input: {
  projectId: string;
  projectName: string;
  baseUpdatedAt: string;
  localRevision: number;
  document: DesignDocument;
}) {
  if (typeof window === "undefined") return;

  try {
    writeDesktopProjectDatabaseSnapshot(
      createDesktopProjectDatabaseSnapshot({
        projectId: input.projectId,
        projectName: input.projectName,
        baseUpdatedAt: input.baseUpdatedAt,
        localRevision: Number.isFinite(input.localRevision)
          ? input.localRevision
          : 0,
        document: input.document,
      }),
      window.localStorage,
    );
  } catch {
    return;
  }
}
