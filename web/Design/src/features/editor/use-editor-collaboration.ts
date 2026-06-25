"use client";

import { useCallback } from "react";
import type { MutableRefObject } from "react";

import { useProjectCollaborationSync } from "@/features/editor/use-project-collaboration-sync";
import { useProjectPresence } from "@/features/editor/use-project-presence";
import type { SaveState } from "@/features/editor/use-editor-project-persistence";
import type {
  DesignDocument,
  ProjectDetail,
  ProjectPresenceSummary,
} from "@/features/editor/types";

type UseEditorCollaborationInput = {
  projectId: string;
  initialUpdatedAt: string;
  editShareId: string | null;
  enabled?: boolean;
  projectName: string;
  document: DesignDocument;
  saveState: SaveState;
  changeRevision: number;
  changeRevisionRef: MutableRefObject<number>;
  pageId: string;
  initialPresence: ProjectPresenceSummary[];
  replacePresent: (document: DesignDocument) => void;
  setProjectName: (name: string) => void;
  setSelectedElementIds: (ids: string[]) => void;
  setSaveState: (state: SaveState) => void;
};

export function useEditorCollaboration({
  projectId,
  initialUpdatedAt,
  editShareId,
  enabled = true,
  projectName,
  document,
  saveState,
  changeRevision,
  changeRevisionRef,
  pageId,
  initialPresence,
  replacePresent,
  setProjectName,
  setSelectedElementIds,
  setSaveState,
}: UseEditorCollaborationInput) {
  const { presence, updateCursor } = useProjectPresence({
    projectId,
    pageId,
    editShareId,
    enabled,
    initialPresence,
  });

  const applyRemoteProject = useCallback(
    (remoteProject: ProjectDetail) => {
      replacePresent(remoteProject.document);
      setProjectName(remoteProject.name);
      setSelectedElementIds([]);
      setSaveState("saved");
    },
    [replacePresent, setProjectName, setSaveState, setSelectedElementIds],
  );

  const {
    status,
    pendingProject,
    lastSyncedAt,
    markSynced,
    applyPendingProject,
  } = useProjectCollaborationSync({
    projectId,
    initialUpdatedAt,
    editShareId,
    enabled,
    projectName,
    document,
    saveState,
    changeRevision,
    onRemoteProject: applyRemoteProject,
    onLocalSyncStart: () => setSaveState("saving"),
    onLocalSyncSaved: (_syncedProject, syncedRevision) => {
      setSaveState(
        syncedRevision === changeRevisionRef.current ? "saved" : "dirty",
      );
    },
    onLocalSyncError: () => setSaveState("error"),
  });

  return {
    presence,
    updatePresenceCursor: updateCursor,
    collaborationSyncStatus: status,
    pendingCollaborationProject: pendingProject,
    lastSyncedAt,
    markProjectSynced: markSynced,
    applyPendingCollaborationProject: applyPendingProject,
  };
}
