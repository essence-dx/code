import type { SceneDocument, SceneObject } from "../types";

export interface SceneSaveStatus {
  changedObjectCount: number;
  detail: string;
  documentSettingsChanged: boolean;
  label: string;
  status: "detached" | "saved" | "unsaved";
}

export interface CloudProjectSyncStatus {
  detail: string;
  label: string;
  status: "detached" | "remote-changed" | "synced" | "unknown";
}

function areEqual(left: unknown, right: unknown) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function parseTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : null;
}

function mapObjects(objects: SceneObject[]) {
  return new Map(objects.map((object) => [object.id, object]));
}

function hasDocumentSettingsChanged(current: SceneDocument, saved: SceneDocument) {
  const { objects: _currentObjects, updatedAt: _currentUpdatedAt, ...currentSettings } = current;
  const { objects: _savedObjects, updatedAt: _savedUpdatedAt, ...savedSettings } = saved;

  return !areEqual(currentSettings, savedSettings);
}

function countChangedObjects(current: SceneDocument, saved: SceneDocument) {
  const currentObjects = mapObjects(current.objects);
  const savedObjects = mapObjects(saved.objects);
  const objectIds = new Set([...currentObjects.keys(), ...savedObjects.keys()]);
  let changed = 0;

  for (const objectId of objectIds) {
    if (!areEqual(currentObjects.get(objectId), savedObjects.get(objectId))) {
      changed += 1;
    }
  }

  return changed;
}

export function summarizeSceneSaveStatus(current: SceneDocument, saved: SceneDocument | null): SceneSaveStatus {
  if (!saved) {
    return {
      changedObjectCount: current.objects.length,
      detail: "This scene has not been saved to a cloud project yet.",
      documentSettingsChanged: true,
      label: "Local only",
      status: "detached",
    };
  }

  const changedObjectCount = countChangedObjects(current, saved);
  const documentSettingsChanged = hasDocumentSettingsChanged(current, saved);

  if (changedObjectCount === 0 && !documentSettingsChanged) {
    return {
      changedObjectCount,
      detail: "No local changes since the last cloud save.",
      documentSettingsChanged,
      label: "Saved",
      status: "saved",
    };
  }

  const objectDetail = changedObjectCount === 1 ? "1 object changed" : `${changedObjectCount} objects changed`;
  const settingsDetail = documentSettingsChanged ? "document settings changed" : null;

  return {
    changedObjectCount,
    detail: [changedObjectCount > 0 ? objectDetail : null, settingsDetail].filter(Boolean).join("; "),
    documentSettingsChanged,
    label: "Unsaved",
    status: "unsaved",
  };
}

export function summarizeCloudProjectSyncStatus(lastSavedAt: string | null, remoteUpdatedAt?: string | null): CloudProjectSyncStatus {
  const localTime = parseTimestamp(lastSavedAt);
  const remoteTime = parseTimestamp(remoteUpdatedAt);

  if (!localTime) {
    return {
      detail: "This scene is not attached to a saved cloud project.",
      label: "No cloud baseline",
      status: "detached",
    };
  }

  if (!remoteTime) {
    return {
      detail: "Refresh cloud projects to compare this editor with the latest saved copy.",
      label: "Cloud check pending",
      status: "unknown",
    };
  }

  if (remoteTime > localTime + 1000) {
    return {
      detail: "The cloud project changed after this editor's saved baseline. Saving will merge local and cloud changes.",
      label: "Cloud changed",
      status: "remote-changed",
    };
  }

  return {
    detail: "This editor is aligned with the latest loaded cloud project timestamp.",
    label: "Cloud synced",
    status: "synced",
  };
}
