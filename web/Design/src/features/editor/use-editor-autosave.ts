"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  clearEditorAutosaveSnapshot,
  createEditorAutosaveSnapshot,
  getEditorAutosaveConflictStatus,
  readEditorAutosaveSnapshot,
  shouldOfferEditorAutosaveSnapshot,
  writeEditorAutosaveSnapshot,
  type EditorAutosaveConflictStatus,
  type EditorAutosaveSnapshot,
} from "@/features/editor/editor-autosave";
import type { DesignDocument } from "@/features/editor/types";
import type { SaveState } from "@/features/editor/use-editor-project-persistence";

export type EditorAutosaveState = "idle" | "saving" | "saved" | "error";

type UseEditorAutosaveInput = {
  projectId: string;
  projectName: string;
  baseUpdatedAt: string;
  document: DesignDocument;
  saveState: SaveState;
  replacePresent: (document: DesignDocument) => void;
  setProjectName: (name: string) => void;
  setSelectedElementIds: (ids: string[]) => void;
  setSaveState: (state: SaveState) => void;
  delayMs?: number;
};

export function useEditorAutosave({
  projectId,
  projectName,
  baseUpdatedAt,
  document,
  saveState,
  replacePresent,
  setProjectName,
  setSelectedElementIds,
  setSaveState,
  delayMs = 900,
}: UseEditorAutosaveInput) {
  const scannedProjectRef = useRef<string | null>(null);
  const [autosaveState, setAutosaveState] =
    useState<EditorAutosaveState>("idle");
  const [recoverableSnapshot, setRecoverableSnapshot] =
    useState<EditorAutosaveSnapshot | null>(null);

  useEffect(() => {
    if (scannedProjectRef.current === projectId) return;

    scannedProjectRef.current = projectId;
    const snapshot = readEditorAutosaveSnapshot(projectId, window.localStorage);

    if (!snapshot) return;

    if (
      shouldOfferEditorAutosaveSnapshot({
        snapshot,
        currentProjectName: projectName,
        currentDocument: document,
      })
    ) {
      setRecoverableSnapshot(snapshot);
      return;
    }

    clearEditorAutosaveSnapshot(projectId, window.localStorage);
  }, [document, projectId, projectName]);

  useEffect(() => {
    if (saveState !== "dirty") return;

    const timeout = window.setTimeout(() => {
      setAutosaveState("saving");
      const snapshot = createEditorAutosaveSnapshot({
        projectId,
        projectName,
        baseUpdatedAt,
        document,
      });
      const saved = writeEditorAutosaveSnapshot(snapshot, window.localStorage);

      setAutosaveState(saved ? "saved" : "error");
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [baseUpdatedAt, delayMs, document, projectId, projectName, saveState]);

  const clearAutosaveSnapshot = useCallback(() => {
    clearEditorAutosaveSnapshot(projectId, window.localStorage);
    setRecoverableSnapshot(null);
    setAutosaveState("idle");
  }, [projectId]);

  const restoreAutosaveSnapshot = useCallback(() => {
    if (!recoverableSnapshot) return;

    replacePresent(recoverableSnapshot.document);
    setProjectName(recoverableSnapshot.projectName);
    setSelectedElementIds([]);
    setSaveState("dirty");
    setRecoverableSnapshot(null);
    setAutosaveState("saved");
  }, [
    recoverableSnapshot,
    replacePresent,
    setProjectName,
    setSaveState,
    setSelectedElementIds,
  ]);

  const conflictStatus: EditorAutosaveConflictStatus | null =
    recoverableSnapshot
      ? getEditorAutosaveConflictStatus({
          snapshot: recoverableSnapshot,
          currentBaseUpdatedAt: baseUpdatedAt,
        })
      : null;

  return {
    autosaveState,
    recoverableSnapshot,
    recoverableSnapshotConflictStatus: conflictStatus,
    clearAutosaveSnapshot,
    restoreAutosaveSnapshot,
  };
}
