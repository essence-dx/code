"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  healthFilterLabels,
  matchesHealthFilter,
  type HealthFilter,
} from "@/features/dashboard/components/project-health-dashboard";
import type { DashboardMessage } from "@/features/dashboard/dashboard-types";
import { createProject } from "@/lib/editor/factory";
import {
  createProjectReviewSummary,
  type ProjectReviewSummary,
  type ProjectReviewSummaryStatus,
} from "@/lib/editor/project-review-summary";
import type { EditorProject, MediaAsset } from "@/lib/editor/types";
import {
  assignProjectFolder,
  createProjectFolder,
  deleteProjectFolder,
  getProjectFolderAssignment,
  listProjectFolders,
  renameProjectFolder,
  type ProjectFolder,
  type ProjectFolderAssignment,
} from "@/lib/projects/collaboration-store";
import type { LocalProjectRecord, LocalProjectTrashRecord } from "@/lib/projects/local-project-record";
import { saveProjectBundle } from "@/lib/projects/project-bundle-export";
import {
  createProjectHealthSummary,
  createProjectLibraryHealthReport,
} from "@/lib/projects/project-health";
import {
  deleteLocalProject,
  deleteLocalProjectSnapshot,
  duplicateLocalProject,
  importLocalProjectBundleFile,
  listLocalProjectSnapshots,
  listLocalProjectTrash,
  listLocalProjects,
  loadLocalProject,
  permanentlyDeleteLocalProject,
  restoreLocalProjectFromTrash,
  restoreLocalProjectSnapshot,
  saveLocalProject,
} from "@/lib/projects/local-project-store";

export type SortMode = "updated" | "title" | "duration";
export type ReviewFilter = "all" | ProjectReviewSummaryStatus;
export type FolderFilter = "all" | "none" | string;

export const reviewFilterLabels: Record<ReviewFilter, string> = {
  all: "All review",
  clean: "Clean",
  notes: "Notes",
  "needs-review": "Needs review",
  "changes-requested": "Changes",
  approved: "Approved",
};

interface UseDashboardLocalLibraryInput {
  loadProject: (project: EditorProject, mediaAssets: MediaAsset[]) => void;
  openEditor: () => void;
}

export function useDashboardLocalLibrary({ loadProject, openEditor }: UseDashboardLocalLibraryInput) {
  const [projects, setProjects] = useState<LocalProjectRecord[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [folderAssignments, setFolderAssignments] = useState<Record<string, ProjectFolderAssignment>>({});
  const [snapshotCounts, setSnapshotCounts] = useState<Record<string, number>>({});
  const [trashProjects, setTrashProjects] = useState<LocalProjectTrashRecord[]>([]);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [healthFilter, setHealthFilter] = useState<HealthFilter>("all");
  const [libraryMessage, setLibraryMessage] = useState<DashboardMessage | null>(null);
  const [isLibraryActionPending, setIsLibraryActionPending] = useState(false);

  useEffect(() => {
    void refreshProjects().catch(() => undefined);
  }, []);

  useEffect(() => {
    const projectIds = new Set(projects.map((item) => item.id));
    setSelectedProjectIds((current) => current.filter((id) => projectIds.has(id)));
  }, [projects]);

  const healthByProjectId = useMemo(
    () => new Map(projects.map((item) => [item.id, createProjectHealthSummary(item)])),
    [projects],
  );
  const folderById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders]);
  const folderCounts = useMemo(
    () =>
      Object.values(folderAssignments).reduce<Record<string, number>>((counts, assignment) => {
        counts[assignment.folderId] = (counts[assignment.folderId] ?? 0) + 1;
        return counts;
      }, {}),
    [folderAssignments],
  );
  const libraryHealth = useMemo(() => createProjectLibraryHealthReport(projects), [projects]);
  const filteredProjects = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = normalized
      ? projects.filter((item) => item.title.toLowerCase().includes(normalized) || item.aspectRatio.includes(normalized))
      : projects;
    const folderMatches = matches.filter((item) => matchesFolderFilter(folderAssignments[item.id], folderFilter));
    const healthMatches = folderMatches.filter((item) => matchesHealthFilter(healthByProjectId.get(item.id), healthFilter));
    const reviewMatches = healthMatches.filter((item) => matchesReviewFilter(createProjectReviewSummary(item.project), reviewFilter));

    return [...reviewMatches].sort((a, b) => {
      if (sortMode === "title") return a.title.localeCompare(b.title);
      if (sortMode === "duration") return b.duration - a.duration;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [folderAssignments, folderFilter, healthByProjectId, healthFilter, projects, query, reviewFilter, sortMode]);
  const selectedProjectIdSet = useMemo(() => new Set(selectedProjectIds), [selectedProjectIds]);
  const filteredProjectIds = useMemo(() => filteredProjects.map((item) => item.id), [filteredProjects]);
  const allVisibleProjectsSelected =
    filteredProjectIds.length > 0 && filteredProjectIds.every((projectId) => selectedProjectIdSet.has(projectId));

  async function refreshProjects() {
    try {
      const [records, snapshots, trash, nextFolders] = await Promise.all([
        listLocalProjects(),
        listLocalProjectSnapshots(),
        listLocalProjectTrash(),
        listProjectFolders(),
      ]);
      const assignments = await Promise.all(
        records.map(async (record) => [record.id, await getProjectFolderAssignment(record.id)] as const),
      );
      const counts = snapshots.reduce<Record<string, number>>((nextCounts, snapshot) => {
        nextCounts[snapshot.projectId] = (nextCounts[snapshot.projectId] ?? 0) + 1;
        return nextCounts;
      }, {});
      setProjects(records);
      setFolders(nextFolders);
      setFolderAssignments(
        assignments.reduce<Record<string, ProjectFolderAssignment>>((nextAssignments, [projectId, assignment]) => {
          if (assignment) nextAssignments[projectId] = assignment;
          return nextAssignments;
        }, {}),
      );
      setSnapshotCounts(counts);
      setTrashProjects(trash);
    } catch {
      setLibraryMessage({ tone: "destructive", text: "Local project library could not be loaded." });
    }
  }

  async function openProject(id: string) {
    await runLocalLibraryAction(async () => {
      const record = await loadLocalProject(id);
      if (!record) {
        setLibraryMessage({ tone: "destructive", text: "Project could not be opened." });
        return;
      }
      loadProject(record.project, record.mediaAssets);
      openEditor();
    }, "Project could not be opened.");
  }

  async function createPresetProject(title: string, aspectRatio: string) {
    await runLocalLibraryAction(async () => {
      const nextProject = createProject(title, aspectRatio);
      await saveLocalProject(nextProject, []);
      loadProject(nextProject, []);
      await refreshProjects();
      openEditor();
    }, "Project could not be created.");
  }

  async function duplicateProject(id: string) {
    await runLocalLibraryAction(async () => {
      const duplicate = await duplicateLocalProject(id);
      if (!duplicate) {
        setLibraryMessage({ tone: "destructive", text: "Project could not be duplicated." });
        return;
      }
      await refreshProjects();
      setLibraryMessage({ tone: "default", text: `${duplicate.title} duplicated.` });
    }, "Project could not be duplicated.");
  }

  async function exportProjectBundleFromLibrary(id: string) {
    await runLocalLibraryAction(async () => {
      const record = await loadLocalProject(id);
      if (!record) {
        throw new Error("Project bundle could not be exported.");
      }

      await saveProjectBundle(record.project, record.mediaAssets);
      setLibraryMessage({ tone: "default", text: `${record.title} bundle exported.` });
    }, "Project bundle could not be exported.");
  }

  async function deleteProject(id: string) {
    await runLocalLibraryAction(async () => {
      const removed = await deleteLocalProject(id);
      if (!removed) {
        setLibraryMessage({ tone: "destructive", text: "Project could not be moved to trash." });
        return;
      }
      await refreshProjects();
      setLibraryMessage({ tone: "default", text: `${removed.title} moved to trash.` });
    }, "Project could not be deleted.");
  }

  async function bulkAssignSelectedProjects(folderId: string | null) {
    const projectIds = selectedProjectIds.filter((id) => projects.some((item) => item.id === id));
    if (projectIds.length === 0) return false;

    return runLocalLibraryAction(async () => {
      await Promise.all(projectIds.map((projectId) => assignProjectFolder(projectId, folderId)));
      await refreshProjects();
      setLibraryMessage({ tone: "default", text: `${projectIds.length} projects moved.` });
    }, "Selected projects could not be moved.");
  }

  async function bulkDuplicateSelectedProjects() {
    const projectIds = selectedProjectIds.filter((id) => projects.some((item) => item.id === id));
    if (projectIds.length === 0) return false;

    return runLocalLibraryAction(async () => {
      const duplicates = await Promise.all(projectIds.map((projectId) => duplicateLocalProject(projectId)));
      const createdCount = duplicates.filter(Boolean).length;
      if (createdCount === 0) {
        throw new Error("No selected projects could be duplicated.");
      }

      setSelectedProjectIds([]);
      await refreshProjects();
      setLibraryMessage({ tone: "default", text: `${createdCount} projects duplicated.` });
    }, "Selected projects could not be duplicated.");
  }

  async function bulkExportSelectedProjectBundles() {
    const projectIds = selectedProjectIds.filter((id) => projects.some((item) => item.id === id));
    if (projectIds.length === 0) return false;

    return runLocalLibraryAction(async () => {
      let exportedCount = 0;
      for (const projectId of projectIds) {
        const record = await loadLocalProject(projectId);
        if (record) {
          await saveProjectBundle(record.project, record.mediaAssets);
          exportedCount += 1;
        }
      }

      if (exportedCount === 0) {
        throw new Error("No selected project bundles could be exported.");
      }

      setLibraryMessage({ tone: "default", text: `${exportedCount} project bundles exported.` });
    }, "Selected project bundles could not be exported.");
  }

  async function bulkMoveSelectedProjectsToTrash() {
    const projectIds = selectedProjectIds.filter((id) => projects.some((item) => item.id === id));
    if (projectIds.length === 0) return false;

    return runLocalLibraryAction(async () => {
      const removed = await Promise.all(projectIds.map((projectId) => deleteLocalProject(projectId)));
      const removedCount = removed.filter(Boolean).length;
      if (removedCount === 0) {
        throw new Error("No selected projects could be moved to trash.");
      }

      setSelectedProjectIds([]);
      await refreshProjects();
      setLibraryMessage({ tone: "default", text: `${removedCount} projects moved to trash.` });
    }, "Selected projects could not be moved to trash.");
  }

  async function restoreTrashProjects(ids: string[]) {
    if (ids.length === 0) return false;

    return runLocalLibraryAction(async () => {
      const restored = await Promise.all(ids.map((id) => restoreLocalProjectFromTrash(id)));
      const restoredProjects = restored.filter(Boolean);
      if (restoredProjects.length === 0) {
        throw new Error("Projects could not be restored.");
      }

      await refreshProjects();
      setLibraryMessage({ tone: "default", text: `${restoredProjects.length} projects restored.` });
    }, "Projects could not be restored.");
  }

  async function restoreTrashProject(id: string) {
    return restoreTrashProjects([id]);
  }

  async function permanentlyDeleteTrashProjects(ids: string[]) {
    if (ids.length === 0) return false;

    return runLocalLibraryAction(async () => {
      await Promise.all(ids.map((id) => permanentlyDeleteLocalProject(id)));
      await refreshProjects();
      setLibraryMessage({ tone: "default", text: `${ids.length} projects permanently deleted.` });
    }, "Projects could not be permanently deleted.");
  }

  async function permanentlyDeleteTrashProject(id: string) {
    return permanentlyDeleteTrashProjects([id]);
  }

  async function restoreSnapshot(snapshotId: string) {
    return runLocalLibraryAction(async () => {
      const restored = await restoreLocalProjectSnapshot(snapshotId);
      if (!restored) {
        throw new Error("Checkpoint could not be restored.");
      }

      loadProject(restored.project, restored.mediaAssets);
      await refreshProjects();
      setLibraryMessage({ tone: "default", text: `${restored.title} restored from checkpoint.` });
    }, "Checkpoint could not be restored.");
  }

  async function deleteSnapshot(snapshotId: string) {
    return runLocalLibraryAction(async () => {
      await deleteLocalProjectSnapshot(snapshotId);
      await refreshProjects();
      setLibraryMessage({ tone: "default", text: "Checkpoint removed." });
    }, "Checkpoint could not be removed.");
  }

  async function assignProjectToFolder(projectId: string, folderId: string | null) {
    return runLocalLibraryAction(async () => {
      await assignProjectFolder(projectId, folderId);
      await refreshProjects();
      setLibraryMessage({ tone: "default", text: "Project folder updated." });
    }, "Project folder could not be updated.");
  }

  async function createAndAssignProjectFolder(projectId: string, name: string) {
    return runLocalLibraryAction(async () => {
      const folder = await createProjectFolder(name);
      if (!folder) {
        throw new Error("Folder could not be created.");
      }

      await assignProjectFolder(projectId, folder.id);
      await refreshProjects();
      setFolderFilter(folder.id);
      setLibraryMessage({ tone: "default", text: `${folder.name} created and assigned.` });
    }, "Folder could not be created.");
  }

  async function createLibraryFolder(name: string) {
    return runLocalLibraryAction(async () => {
      const folder = await createProjectFolder(name);
      if (!folder) {
        throw new Error("Folder could not be created.");
      }

      await refreshProjects();
      setFolderFilter(folder.id);
      setLibraryMessage({ tone: "default", text: `${folder.name} created.` });
    }, "Folder could not be created.");
  }

  async function renameLibraryFolder(folderId: string, name: string) {
    return runLocalLibraryAction(async () => {
      const folder = await renameProjectFolder(folderId, name);
      if (!folder) {
        throw new Error("Folder could not be renamed.");
      }

      await refreshProjects();
      setLibraryMessage({ tone: "default", text: `${folder.name} renamed.` });
    }, "Folder could not be renamed.");
  }

  async function deleteLibraryFolder(folderId: string) {
    return runLocalLibraryAction(async () => {
      await deleteProjectFolder(folderId);
      if (folderFilter === folderId) {
        setFolderFilter("all");
      }
      await refreshProjects();
      setLibraryMessage({ tone: "default", text: "Folder removed and projects left unfiled." });
    }, "Folder could not be removed.");
  }

  async function importBundle(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLibraryMessage(null);

    try {
      const record = await importLocalProjectBundleFile(file);
      loadProject(record.project, record.mediaAssets);
      await refreshProjects();
      setLibraryMessage({ tone: "default", text: `${record.title} imported. Reconnect media files if this bundle only contains metadata.` });
    } catch {
      setLibraryMessage({ tone: "destructive", text: "Project bundle could not be imported." });
    } finally {
      event.target.value = "";
    }
  }

  function toggleProjectSelection(projectId: string, isSelected: boolean) {
    setSelectedProjectIds((current) => {
      if (isSelected) return current.includes(projectId) ? current : [...current, projectId];
      return current.filter((id) => id !== projectId);
    });
  }

  function selectVisibleProjects() {
    setSelectedProjectIds((current) => [...new Set([...current, ...filteredProjectIds])]);
  }

  function deselectVisibleProjects() {
    setSelectedProjectIds((current) => current.filter((id) => !filteredProjectIds.includes(id)));
  }

  function clearSelectedProjects() {
    setSelectedProjectIds([]);
  }

  async function runLocalLibraryAction(action: () => Promise<void>, failureMessage: string) {
    setLibraryMessage(null);
    setIsLibraryActionPending(true);

    try {
      await action();
      return true;
    } catch {
      setLibraryMessage({ tone: "destructive", text: failureMessage });
      return false;
    } finally {
      setIsLibraryActionPending(false);
    }
  }

  return {
    allVisibleProjectsSelected,
    assignProjectToFolder,
    bulkAssignSelectedProjects,
    bulkDuplicateSelectedProjects,
    bulkExportSelectedProjectBundles,
    bulkMoveSelectedProjectsToTrash,
    clearSelectedProjects,
    createAndAssignProjectFolder,
    createLibraryFolder,
    createPresetProject,
    deleteLibraryFolder,
    deleteProject,
    deleteSnapshot,
    deselectVisibleProjects,
    duplicateProject,
    exportProjectBundleFromLibrary,
    filteredProjectIds,
    filteredProjects,
    folderAssignments,
    folderById,
    folderCounts,
    folderFilter,
    folders,
    healthByProjectId,
    healthFilter,
    importBundle,
    isLibraryActionPending,
    libraryHealth,
    libraryMessage,
    openProject,
    permanentlyDeleteTrashProject,
    permanentlyDeleteTrashProjects,
    query,
    refreshProjects,
    renameLibraryFolder,
    restoreSnapshot,
    restoreTrashProject,
    restoreTrashProjects,
    reviewFilter,
    selectedProjectIds,
    selectedProjectIdSet,
    selectVisibleProjects,
    setFolderFilter,
    setHealthFilter,
    setQuery,
    setReviewFilter,
    setSortMode,
    snapshotCounts,
    sortMode,
    toggleProjectSelection,
    trashProjects,
  };
}

export type DashboardLocalLibrary = ReturnType<typeof useDashboardLocalLibrary>;

export function matchesReviewFilter(summary: ProjectReviewSummary, filter: ReviewFilter) {
  if (filter === "all") return true;
  if (filter === "changes-requested") return summary.changesRequested > 0;
  if (filter === "needs-review") return summary.needsReview > 0;
  if (filter === "notes") return summary.withNotes > 0;
  if (filter === "approved") return summary.approved > 0;
  return summary.status === "clean";
}

export function matchesFolderFilter(assignment: ProjectFolderAssignment | undefined, filter: FolderFilter) {
  if (filter === "all") return true;
  if (filter === "none") return !assignment;
  return assignment?.folderId === filter;
}

export { healthFilterLabels };
