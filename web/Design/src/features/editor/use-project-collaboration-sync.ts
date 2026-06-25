"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { applyProjectAssetManifest } from "@/features/assets/project-asset-manifest";
import {
  createDesktopProjectDatabaseSnapshot,
  markDesktopProjectMutationConflict,
  markDesktopProjectMutationFailed,
  markDesktopProjectMutationSynced,
  markDesktopProjectMutationSyncing,
  queueDesktopProjectMutation,
  writeDesktopProjectDatabaseSnapshot,
  type DesktopProjectMutationRecord,
} from "@/features/desktop/desktop-project-storage";
import {
  createProjectCollaborationOperationId,
  createProjectSyncUrl,
  isRemoteProjectNewer,
} from "@/features/editor/project-collaboration-sync";
import type { DesignDocument, ProjectDetail } from "@/features/editor/types";

export type CollaborationSyncStatus = "idle" | "syncing" | "pending" | "error";

type SaveState = "dirty" | "saving" | "saved" | "error";

type UseProjectCollaborationSyncInput = {
  projectId: string;
  initialUpdatedAt: string;
  editShareId?: string | null;
  enabled?: boolean;
  projectName: string;
  document: DesignDocument;
  saveState: SaveState;
  changeRevision: number;
  onRemoteProject: (project: ProjectDetail) => void;
  onLocalSyncStart: () => void;
  onLocalSyncSaved: (project: ProjectDetail, syncedRevision: number) => void;
  onLocalSyncError: () => void;
};

export function useProjectCollaborationSync({
  projectId,
  initialUpdatedAt,
  editShareId,
  enabled = true,
  projectName,
  document,
  saveState,
  changeRevision,
  onRemoteProject,
  onLocalSyncStart,
  onLocalSyncSaved,
  onLocalSyncError,
}: UseProjectCollaborationSyncInput) {
  const [status, setStatus] = useState<CollaborationSyncStatus>("idle");
  const [pendingProject, setPendingProject] = useState<ProjectDetail | null>(
    null,
  );
  const [lastSyncedAt, setLastSyncedAt] = useState(initialUpdatedAt);
  const lastSyncedAtRef = useRef(initialUpdatedAt);
  const documentRef = useRef(document);
  const projectNameRef = useRef(projectName);
  const saveStateRef = useRef(saveState);
  const changeRevisionRef = useRef(changeRevision);
  const syncingRef = useRef(false);
  const url = createProjectSyncUrl({ projectId, editShareId });

  useEffect(() => {
    documentRef.current = document;
  }, [document]);

  useEffect(() => {
    projectNameRef.current = projectName;
  }, [projectName]);

  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  useEffect(() => {
    changeRevisionRef.current = changeRevision;
  }, [changeRevision]);

  const markSynced = useCallback((project: ProjectDetail) => {
    lastSyncedAtRef.current = project.updatedAt;
    setLastSyncedAt(project.updatedAt);
    setPendingProject(null);
    setStatus("idle");
  }, []);

  const applyPendingProject = useCallback(() => {
    if (!pendingProject) return;

    markSynced(pendingProject);
    onRemoteProject(pendingProject);
  }, [markSynced, onRemoteProject, pendingProject]);

  const fetchRemoteProject = useCallback(async () => {
    if (!enabled) return;
    if (syncingRef.current) return;

    try {
      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        setStatus((current) => (current === "pending" ? current : "error"));
        return;
      }

      const body = (await response.json()) as { project: ProjectDetail };

      if (
        !isRemoteProjectNewer({
          remoteUpdatedAt: body.project.updatedAt,
          lastSyncedAt: lastSyncedAtRef.current,
        })
      ) {
        if (!pendingProject) {
          setStatus("idle");
        }
        return;
      }

      if (saveStateRef.current === "saved") {
        markSynced(body.project);
        onRemoteProject(body.project);
        return;
      }

      setPendingProject(body.project);
      setStatus("pending");
    } catch {
      setStatus((current) => (current === "pending" ? current : "error"));
    }
  }, [enabled, markSynced, onRemoteProject, pendingProject, url]);

  const syncLocalDocument = useCallback(async () => {
    if (!enabled) return;
    if (syncingRef.current || pendingProject) return;

    syncingRef.current = true;
    setStatus("syncing");
    onLocalSyncStart();
    const syncedRevision = changeRevisionRef.current;
    const document = applyProjectAssetManifest(documentRef.current);
    const localMutation = queueLocalSyncMutation({
      projectId,
      projectName: projectNameRef.current,
      baseUpdatedAt: lastSyncedAtRef.current,
      localRevision: syncedRevision,
      document,
    });

    try {
      if (localMutation) {
        markLocalMutationSyncing(localMutation.id);
      }

      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectNameRef.current,
          document,
          sync: true,
          baseUpdatedAt: lastSyncedAtRef.current,
          operationId: createProjectCollaborationOperationId({
            projectId,
            revision: syncedRevision,
            kind: "autosave-sync",
          }),
          operationKind: "autosave-sync",
          clientRevision: syncedRevision,
          ...(editShareId ? { editShareId } : {}),
        }),
      });

      const body = (await response.json()) as {
        project?: ProjectDetail;
      };

      if (response.status === 409 && body.project) {
        if (localMutation) {
          markLocalMutationConflict({
            mutationId: localMutation.id,
            remoteUpdatedAt: body.project.updatedAt,
            reason: "Remote project changed before local desktop replay.",
          });
        }
        setPendingProject(body.project);
        setStatus("pending");
        onLocalSyncError();
        return;
      }

      if (!response.ok || !body.project) {
        if (localMutation) {
          markLocalMutationFailed({
            mutationId: localMutation.id,
            reason: `Project sync failed with ${response.status}.`,
          });
        }
        setStatus("error");
        onLocalSyncError();
        return;
      }

      if (localMutation) {
        markLocalMutationSynced({
          mutationId: localMutation.id,
          syncedAt: body.project.updatedAt,
        });
        writeLocalProjectDatabaseSnapshot({
          projectId,
          projectName: body.project.name,
          baseUpdatedAt: body.project.updatedAt,
          localRevision: syncedRevision,
          document: body.project.document,
        });
      }
      markSynced(body.project);
      onLocalSyncSaved(body.project, syncedRevision);
    } catch {
      if (localMutation) {
        markLocalMutationFailed({
          mutationId: localMutation.id,
          reason: "Project sync failed while offline or unreachable.",
        });
      }
      setStatus("error");
      onLocalSyncError();
    } finally {
      syncingRef.current = false;
    }
  }, [
    editShareId,
    enabled,
    markSynced,
    onLocalSyncError,
    onLocalSyncSaved,
    onLocalSyncStart,
    pendingProject,
    projectId,
  ]);

  useEffect(() => {
    if (!enabled) return;

    const interval = window.setInterval(() => {
      void fetchRemoteProject();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [enabled, fetchRemoteProject]);

  useEffect(() => {
    if (!enabled) return;
    if (saveState !== "dirty" || pendingProject) return;

    const timeout = window.setTimeout(() => {
      void syncLocalDocument();
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [enabled, pendingProject, saveState, syncLocalDocument]);

  return {
    status,
    pendingProject,
    lastSyncedAt,
    markSynced,
    applyPendingProject,
  };
}

function queueLocalSyncMutation(input: {
  projectId: string;
  projectName: string;
  baseUpdatedAt: string;
  localRevision: number;
  document: DesignDocument;
}): DesktopProjectMutationRecord | null {
  if (typeof window === "undefined") return null;

  try {
    writeLocalProjectDatabaseSnapshot({
      projectId: input.projectId,
      projectName: input.projectName,
      baseUpdatedAt: input.baseUpdatedAt,
      localRevision: input.localRevision,
      document: input.document,
    });

    return queueDesktopProjectMutation(
      {
        projectId: input.projectId,
        projectName: input.projectName,
        kind: "project-document-save",
        baseUpdatedAt: input.baseUpdatedAt,
        localRevision: input.localRevision,
        document: input.document,
      },
      window.localStorage,
    );
  } catch {
    return null;
  }
}

function writeLocalProjectDatabaseSnapshot(input: {
  projectId: string;
  projectName: string;
  baseUpdatedAt: string;
  localRevision: number;
  document: DesignDocument;
}) {
  if (typeof window === "undefined") return;

  withLocalProjectStorage(() => {
    writeDesktopProjectDatabaseSnapshot(
      createDesktopProjectDatabaseSnapshot({
        projectId: input.projectId,
        projectName: input.projectName,
        baseUpdatedAt: input.baseUpdatedAt,
        localRevision: input.localRevision,
        document: input.document,
      }),
      window.localStorage,
    );
  });
}

function markLocalMutationSyncing(mutationId: string) {
  withLocalProjectStorage(() => {
    markDesktopProjectMutationSyncing({ mutationId }, window.localStorage);
  });
}

function markLocalMutationSynced(input: {
  mutationId: string;
  syncedAt: string;
}) {
  withLocalProjectStorage(() => {
    markDesktopProjectMutationSynced(input, window.localStorage);
  });
}

function markLocalMutationConflict(input: {
  mutationId: string;
  remoteUpdatedAt: string;
  reason: string;
}) {
  withLocalProjectStorage(() => {
    markDesktopProjectMutationConflict(input, window.localStorage);
  });
}

function markLocalMutationFailed(input: {
  mutationId: string;
  reason: string;
}) {
  withLocalProjectStorage(() => {
    markDesktopProjectMutationFailed(input, window.localStorage);
  });
}

function withLocalProjectStorage(action: () => void) {
  try {
    action();
  } catch {
    return;
  }
}
