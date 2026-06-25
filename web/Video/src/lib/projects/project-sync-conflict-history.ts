"use client";

import type { ProjectSyncConflictDetails } from "@/lib/projects/project-sync-conflicts";

export interface ProjectSyncConflictHistoryEntry extends ProjectSyncConflictDetails {
  id: string;
  projectId: string;
  recordedAt: string;
}

const conflictHistoryStorageKey = "essence.project.sync.conflicts.v1";
const maxConflictHistoryEntries = 12;

export function recordProjectSyncConflict(conflict: ProjectSyncConflictDetails, projectId: string) {
  const entry: ProjectSyncConflictHistoryEntry = {
    ...conflict,
    id: `sync_conflict_${Date.now()}_${projectId.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 72)}`,
    projectId,
    recordedAt: new Date().toISOString(),
  };
  const entries = [entry, ...loadProjectSyncConflictHistory()].slice(0, maxConflictHistoryEntries);
  saveProjectSyncConflictHistory(entries);
  return entries;
}

export function loadProjectSyncConflictHistory() {
  if (!hasBrowserStorage()) return [] as ProjectSyncConflictHistoryEntry[];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(conflictHistoryStorageKey) ?? "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .flatMap((entry) => {
        const normalized = normalizeProjectSyncConflictHistoryEntry(entry);
        return normalized ? [normalized] : [];
      })
      .sort((first, second) => second.recordedAt.localeCompare(first.recordedAt))
      .slice(0, maxConflictHistoryEntries);
  } catch {
    return [];
  }
}

export function clearProjectSyncConflictHistory() {
  if (hasBrowserStorage()) {
    window.localStorage.removeItem(conflictHistoryStorageKey);
  }

  return [] as ProjectSyncConflictHistoryEntry[];
}

function saveProjectSyncConflictHistory(entries: ProjectSyncConflictHistoryEntry[]) {
  if (hasBrowserStorage()) {
    window.localStorage.setItem(conflictHistoryStorageKey, JSON.stringify(entries));
  }
}

function normalizeProjectSyncConflictHistoryEntry(value: unknown): ProjectSyncConflictHistoryEntry | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<ProjectSyncConflictHistoryEntry>;
  if (candidate.code !== "project_conflict") return null;
  if (!candidate.id || !candidate.projectId || !candidate.recordedAt || !candidate.remoteUpdatedAt || !candidate.localUpdatedAt) return null;

  return {
    id: candidate.id,
    projectId: candidate.projectId,
    code: "project_conflict",
    baseUpdatedAt: candidate.baseUpdatedAt,
    remoteUpdatedAt: candidate.remoteUpdatedAt,
    localUpdatedAt: candidate.localUpdatedAt,
    recordedAt: candidate.recordedAt,
  };
}

function hasBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}
