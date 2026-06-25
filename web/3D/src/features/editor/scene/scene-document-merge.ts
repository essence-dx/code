import type { SceneDocument, SceneObject } from "../types";
import { documentCollaborationFields, objectCollaborationFields } from "./scene-collaboration-fields";

export type SceneMergeConflictResolution = "local" | "remote";

export interface SceneDocumentMergeConflict {
  field: string;
  objectId?: string;
  objectName?: string;
  resolution: SceneMergeConflictResolution;
  scope: "document" | "object";
}

export interface SceneDocumentMergeResult {
  conflicts: SceneDocumentMergeConflict[];
  document: SceneDocument;
  mergedObjectCount: number;
}

function cloneValue<T>(value: T): T {
  return structuredClone(value);
}

function areEqual(left: unknown, right: unknown) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function mapObjects(objects: SceneObject[]) {
  return new Map(objects.map((object) => [object.id, object]));
}

function setObjectField<Key extends keyof SceneObject>(object: SceneObject, field: Key, value: SceneObject[Key]) {
  object[field] = cloneValue(value);
}

function setDocumentField<Key extends keyof SceneDocument>(document: SceneDocument, field: Key, value: SceneDocument[Key]) {
  document[field] = cloneValue(value);
}

function getConflictObjectName(base: SceneObject | undefined, local: SceneObject | undefined, remote: SceneObject | undefined) {
  return local?.name || remote?.name || base?.name;
}

function mergeObject(base: SceneObject | undefined, local: SceneObject, remote: SceneObject, conflicts: SceneDocumentMergeConflict[]) {
  const merged = cloneValue(remote);
  const objectName = getConflictObjectName(base, local, remote);

  for (const field of objectCollaborationFields) {
    const baseValue = base?.[field];
    const localValue = local[field];
    const remoteValue = remote[field];
    const localChanged = !areEqual(localValue, baseValue);
    const remoteChanged = !areEqual(remoteValue, baseValue);

    if (!localChanged || areEqual(localValue, remoteValue)) {
      continue;
    }

    if (remoteChanged) {
      conflicts.push({
        field,
        objectId: local.id,
        objectName,
        resolution: "local",
        scope: "object",
      });
    }

    setObjectField(merged, field, localValue);
  }

  return merged;
}

function resolveObject(base: SceneObject | undefined, local: SceneObject | undefined, remote: SceneObject | undefined, conflicts: SceneDocumentMergeConflict[]) {
  if (!base) {
    if (local && remote) {
      return mergeObject(undefined, local, remote, conflicts);
    }

    return local ? cloneValue(local) : remote ? cloneValue(remote) : null;
  }

  if (!local && !remote) {
    return null;
  }

  if (!local && remote) {
    if (!areEqual(remote, base)) {
      conflicts.push({
        field: "object",
        objectId: remote.id,
        objectName: getConflictObjectName(base, local, remote),
        resolution: "remote",
        scope: "object",
      });

      return cloneValue(remote);
    }

    return null;
  }

  if (local && !remote) {
    if (!areEqual(local, base)) {
      conflicts.push({
        field: "object",
        objectId: local.id,
        objectName: getConflictObjectName(base, local, remote),
        resolution: "local",
        scope: "object",
      });

      return cloneValue(local);
    }

    return null;
  }

  if (local && remote) {
    return mergeObject(base, local, remote, conflicts);
  }

  return null;
}

export function mergeSceneDocumentsByObject(base: SceneDocument, local: SceneDocument, remote: SceneDocument): SceneDocumentMergeResult {
  const conflicts: SceneDocumentMergeConflict[] = [];
  const mergedDocument = cloneValue(remote);

  for (const field of documentCollaborationFields) {
    const baseValue = base[field];
    const localValue = local[field];
    const remoteValue = remote[field];
    const localChanged = !areEqual(localValue, baseValue);
    const remoteChanged = !areEqual(remoteValue, baseValue);

    if (!localChanged || areEqual(localValue, remoteValue)) {
      continue;
    }

    if (remoteChanged) {
      conflicts.push({
        field,
        resolution: "local",
        scope: "document",
      });
    }

    setDocumentField(mergedDocument, field, localValue);
  }

  const baseObjects = mapObjects(base.objects);
  const localObjects = mapObjects(local.objects);
  const remoteObjects = mapObjects(remote.objects);
  const objectIds = new Set([...baseObjects.keys(), ...localObjects.keys(), ...remoteObjects.keys()]);
  const mergedObjectsById = new Map<string, SceneObject>();

  for (const objectId of objectIds) {
    const mergedObject = resolveObject(baseObjects.get(objectId), localObjects.get(objectId), remoteObjects.get(objectId), conflicts);

    if (mergedObject) {
      mergedObjectsById.set(objectId, mergedObject);
    }
  }

  const orderedIds = [...local.objects.map((object) => object.id), ...remote.objects.map((object) => object.id)].filter((objectId, index, ids) => {
    return mergedObjectsById.has(objectId) && ids.indexOf(objectId) === index;
  });

  return {
    conflicts,
    document: {
      ...mergedDocument,
      objects: orderedIds.flatMap((objectId) => {
        const object = mergedObjectsById.get(objectId);

        return object ? [object] : [];
      }),
      updatedAt: local.updatedAt,
    },
    mergedObjectCount: mergedObjectsById.size,
  };
}

function formatConflict(conflict: SceneDocumentMergeConflict) {
  const owner = conflict.resolution === "local" ? "kept local" : "kept remote";

  if (conflict.scope === "document") {
    return `Document ${conflict.field} ${owner}`;
  }

  return `Object ${conflict.objectName ?? conflict.objectId ?? "unknown"} ${conflict.field} ${owner}`;
}

export function summarizeSceneDocumentMergeConflicts(conflicts: SceneDocumentMergeConflict[], maxEntries = 4) {
  if (conflicts.length === 0) {
    return null;
  }

  const visibleEntries = conflicts.slice(0, maxEntries).map(formatConflict);
  const hiddenCount = conflicts.length - visibleEntries.length;

  if (hiddenCount > 0) {
    visibleEntries.push(`${hiddenCount} more ${hiddenCount === 1 ? "field" : "fields"} resolved`);
  }

  return visibleEntries.join("\n");
}
