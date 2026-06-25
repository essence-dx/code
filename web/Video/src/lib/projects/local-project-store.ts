"use client";

import Dexie, { type EntityTable } from "dexie";
import type { EditorProject, MediaAsset } from "@/lib/editor/types";
import {
  createLocalProjectRecord,
  createLocalProjectSnapshotRecord,
  createLocalProjectTrashRecord,
  parseLocalProjectRecord,
  parseLocalProjectSnapshotRecord,
  parseLocalProjectTrashRecord,
  type LocalProjectRecord,
  type LocalProjectSnapshotRecord,
  type LocalProjectTrashRecord,
} from "@/lib/projects/local-project-record";
import { readProjectBundleFile } from "@/lib/projects/project-bundle";
import { projectBundleSchema } from "@/lib/projects/project-sync-schema";

const db = new Dexie("essence-kapwing-projects") as Dexie & {
  projects: EntityTable<LocalProjectRecord, "id">;
  snapshots: EntityTable<LocalProjectSnapshotRecord, "id">;
  trash: EntityTable<LocalProjectTrashRecord, "id">;
};

db.version(1).stores({
  projects: "id, title, aspectRatio, updatedAt, createdAt",
});

db.version(2).stores({
  projects: "id, title, aspectRatio, updatedAt, createdAt",
  snapshots: "id, projectId, createdAt",
});

db.version(3).stores({
  projects: "id, title, aspectRatio, updatedAt, createdAt",
  snapshots: "id, projectId, createdAt",
  trash: "id, title, deletedAt",
});

export async function saveLocalProject(project: EditorProject, mediaAssets: MediaAsset[]) {
  const existing = await db.projects.get(project.id);
  const now = new Date().toISOString();
  const record = createLocalProjectRecord({
    project,
    mediaAssets,
    createdAt: parseLocalProjectRecord(existing)?.createdAt ?? now,
    updatedAt: now,
  });

  await db.projects.put(record);
  return record;
}

export async function trySaveLocalProject(project: EditorProject, mediaAssets: MediaAsset[]) {
  try {
    await saveLocalProject(project, mediaAssets);
    return true;
  } catch {
    return false;
  }
}

export async function importLocalProjectBundle(input: unknown) {
  const payload = projectBundleSchema.parse(input);
  return saveLocalProject(payload.project, payload.mediaAssets);
}

export async function importLocalProjectBundleFile(file: File) {
  const payload = await readProjectBundleFile(file);
  return saveLocalProject(payload.project, payload.mediaAssets);
}

export async function listLocalProjects() {
  const records = await db.projects.orderBy("updatedAt").reverse().toArray();
  return records.flatMap((record) => {
    const parsed = parseLocalProjectRecord(record);
    return parsed ? [parsed] : [];
  });
}

export async function loadLocalProject(id: string) {
  return parseLocalProjectRecord(await db.projects.get(id));
}

export async function deleteLocalProject(id: string) {
  const record = await loadLocalProject(id);
  if (!record) return null;

  const trashRecord = createLocalProjectTrashRecord(record, new Date().toISOString());
  await db.transaction("rw", db.projects, db.trash, async () => {
    await db.trash.put(trashRecord);
    await db.projects.delete(id);
  });
  return trashRecord;
}

export async function duplicateLocalProject(id: string) {
  const record = await loadLocalProject(id);
  if (!record) return null;

  const now = new Date().toISOString();
  const cloneId = crypto.randomUUID();
  const clone = createLocalProjectRecord({
    project: {
      ...record.project,
      id: cloneId,
      title: `${record.project.title} copy`,
      updatedAt: now,
    },
    mediaAssets: record.mediaAssets,
    createdAt: now,
    updatedAt: now,
  });

  await db.projects.put(clone);
  return clone;
}

export async function createLocalProjectSnapshot(project: EditorProject, mediaAssets: MediaAsset[], label?: string) {
  const snapshot = createLocalProjectSnapshotRecord({
    project,
    mediaAssets,
    label,
    createdAt: new Date().toISOString(),
  });

  await db.snapshots.put(snapshot);
  await pruneLocalProjectSnapshots(project.id);
  return snapshot;
}

export async function listLocalProjectSnapshots(projectId?: string) {
  const records = projectId
    ? await db.snapshots.where("projectId").equals(projectId).toArray()
    : await db.snapshots.toArray();

  return records
    .flatMap((record) => {
      const parsed = parseLocalProjectSnapshotRecord(record);
      return parsed ? [parsed] : [];
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function restoreLocalProjectSnapshot(snapshotId: string) {
  const snapshot = parseLocalProjectSnapshotRecord(await db.snapshots.get(snapshotId));
  if (!snapshot) return null;

  return saveLocalProject(snapshot.project, snapshot.mediaAssets);
}

export async function deleteLocalProjectSnapshot(snapshotId: string) {
  await db.snapshots.delete(snapshotId);
}

export async function listLocalProjectTrash() {
  const records = await db.trash.toArray();
  return records
    .flatMap((record) => {
      const parsed = parseLocalProjectTrashRecord(record);
      return parsed ? [parsed] : [];
    })
    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}

export async function restoreLocalProjectFromTrash(id: string) {
  const trashRecord = parseLocalProjectTrashRecord(await db.trash.get(id));
  if (!trashRecord) return null;

  const restored = createLocalProjectRecord({
    project: trashRecord.project,
    mediaAssets: trashRecord.mediaAssets,
    createdAt: trashRecord.createdAt,
    updatedAt: new Date().toISOString(),
  });

  await db.transaction("rw", db.projects, db.trash, async () => {
    await db.projects.put(restored);
    await db.trash.delete(id);
  });
  return restored;
}

export async function permanentlyDeleteLocalProject(id: string) {
  await db.transaction("rw", db.trash, db.snapshots, async () => {
    await db.trash.delete(id);
    await db.snapshots.where("projectId").equals(id).delete();
  });
}

async function pruneLocalProjectSnapshots(projectId: string, keep = 12) {
  const snapshots = (await db.snapshots.where("projectId").equals(projectId).toArray()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const staleSnapshots = snapshots.slice(keep);
  if (staleSnapshots.length > 0) {
    await db.snapshots.bulkDelete(staleSnapshots.map((snapshot) => snapshot.id));
  }
}
