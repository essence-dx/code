"use client";

import { useState } from "react";
import type { DashboardMessage } from "@/features/dashboard/dashboard-types";
import type { EditorProject, MediaAsset } from "@/lib/editor/types";
import { loadLocalProject, saveLocalProject, trySaveLocalProject } from "@/lib/projects/local-project-store";
import {
  cloudSummaryToLocalRecord,
  deleteCloudProject,
  listCloudProjects,
  loadCloudProject,
  saveCloudProject,
  type SyncedProjectSummary,
} from "@/lib/projects/project-sync-client";
import { recordProjectSyncConflict } from "@/lib/projects/project-sync-conflict-history";
import { ProjectSyncConflictError } from "@/lib/projects/project-sync-conflicts";
import { isClientApiUnavailableError, useHasClientApiRuntime } from "@/lib/runtime/client-api";

interface UseDashboardCloudLibraryInput {
  currentProject: EditorProject;
  loadProject: (project: EditorProject, mediaAssets: MediaAsset[]) => void;
  refreshLocalProjects: () => Promise<void>;
  openEditor: () => void;
}

export function useDashboardCloudLibrary({
  currentProject,
  loadProject,
  refreshLocalProjects,
  openEditor,
}: UseDashboardCloudLibraryInput) {
  const [cloudProjects, setCloudProjects] = useState<SyncedProjectSummary[]>([]);
  const [syncMessage, setSyncMessage] = useState<DashboardMessage | null>(null);
  const [isCloudActionPending, setIsCloudActionPending] = useState(false);
  const canUseOnlineLibrary = useHasClientApiRuntime();

  async function refreshCloudProjects() {
    setSyncMessage(null);
    if (!canUseOnlineLibrary) {
      setSyncMessage({ tone: "destructive", text: "Signed-in library is unavailable in this desktop build." });
      return;
    }

    setIsCloudActionPending(true);
    try {
      setCloudProjects(await listCloudProjects());
    } catch (error) {
      setSyncMessage({ tone: "destructive", text: syncFailureMessage(error, "Signed-in project library is unavailable right now.") });
    } finally {
      setIsCloudActionPending(false);
    }
  }

  async function syncCurrentProject() {
    setSyncMessage(null);
    if (!canUseOnlineLibrary) {
      setSyncMessage({ tone: "destructive", text: "Signed-in library is unavailable in this desktop build." });
      return;
    }

    setIsCloudActionPending(true);
    try {
      const record = await loadLocalProject(currentProject.id);
      const knownCloudProject = cloudProjects.find((project) => project.id === currentProject.id);
      await saveCloudProject(currentProject, record?.mediaAssets ?? [], {
        baseUpdatedAt: knownCloudProject?.updatedAt,
        mode: "reject-stale",
      });
      setCloudProjects(await listCloudProjects());
      setSyncMessage({ tone: "default", text: "Current project synced." });
    } catch (error) {
      if (error instanceof ProjectSyncConflictError) {
        recordProjectSyncConflict(error.conflict, currentProject.id);
      }
      setSyncMessage({ tone: "destructive", text: syncFailureMessage(error, "Project sync failed. Try again.") });
    } finally {
      setIsCloudActionPending(false);
    }
  }

  async function pullCloudProject(id: string) {
    setSyncMessage(null);
    if (!canUseOnlineLibrary) {
      setSyncMessage({ tone: "destructive", text: "Signed-in library is unavailable in this desktop build." });
      return;
    }

    setIsCloudActionPending(true);
    try {
      const payload = await loadCloudProject(id);
      await saveLocalProject(payload.project, payload.mediaAssets);
      loadProject(payload.project, payload.mediaAssets);
      await refreshLocalProjects();
      openEditor();
    } catch (error) {
      setSyncMessage({ tone: "destructive", text: syncFailureMessage(error, "Project could not be loaded.") });
    } finally {
      setIsCloudActionPending(false);
    }
  }

  async function removeCloudProject(id: string) {
    setSyncMessage(null);
    if (!canUseOnlineLibrary) {
      setSyncMessage({ tone: "destructive", text: "Signed-in library is unavailable in this desktop build." });
      return;
    }

    setIsCloudActionPending(true);
    try {
      await deleteCloudProject(id);
      setCloudProjects(await listCloudProjects());
      setSyncMessage({ tone: "default", text: "Project deleted from signed-in library." });
    } catch (error) {
      setSyncMessage({ tone: "destructive", text: syncFailureMessage(error, "Project could not be deleted.") });
    } finally {
      setIsCloudActionPending(false);
    }
  }

  async function saveCloudMetadataLocally(item: SyncedProjectSummary) {
    setSyncMessage(null);
    setIsCloudActionPending(true);

    try {
      const shell = cloudSummaryToLocalRecord(item);
      const saved = await trySaveLocalProject(shell.project, shell.mediaAssets);
      if (!saved) {
        setSyncMessage({ tone: "destructive", text: "Project metadata could not be saved locally." });
        return;
      }

      await refreshLocalProjects();
      setSyncMessage({ tone: "default", text: "Project metadata saved locally." });
    } catch {
      setSyncMessage({ tone: "destructive", text: "Project metadata could not be saved locally." });
    } finally {
      setIsCloudActionPending(false);
    }
  }

  return {
    canUseOnlineLibrary,
    cloudProjects,
    isCloudActionPending,
    pullCloudProject,
    refreshCloudProjects,
    removeCloudProject,
    saveCloudMetadataLocally,
    setSyncMessage,
    syncCurrentProject,
    syncMessage,
  };
}

export type DashboardCloudLibrary = ReturnType<typeof useDashboardCloudLibrary>;

function syncFailureMessage(error: unknown, fallback: string) {
  if (error instanceof ProjectSyncConflictError) return "Cloud copy changed. Refresh the signed-in library and review versions before syncing.";
  return isClientApiUnavailableError(error) ? "Signed-in library is unavailable in this desktop build." : fallback;
}
