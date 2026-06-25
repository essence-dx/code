import { nanoid } from "nanoid";
import { resolveSceneSettings } from "./default-document";
import type { SceneDocument, SceneObject, SceneState, SceneStateObject, Transform } from "../types";

function cloneTransform(transform: Transform): Transform {
  return {
    position: [...transform.position],
    rotation: [...transform.rotation],
    scale: [...transform.scale],
  };
}

function captureObjectState(object: SceneObject): SceneStateObject {
  return {
    objectId: object.id,
    visible: object.visible,
    transform: cloneTransform(object.transform),
  };
}

export function createSceneStateFromDocument(document: SceneDocument, name?: string): SceneState {
  const now = new Date().toISOString();
  const index = (document.sceneStates?.length ?? 0) + 1;

  return {
    id: nanoid(),
    name: name ?? `Scene State ${index}`,
    activeCameraId: document.activeCameraId ?? null,
    sceneSettings: resolveSceneSettings(document.sceneSettings),
    objects: document.objects.map(captureObjectState),
    createdAt: now,
    updatedAt: now,
  };
}

export function recaptureSceneState(sceneState: SceneState, document: SceneDocument): SceneState {
  return {
    ...sceneState,
    activeCameraId: document.activeCameraId ?? null,
    sceneSettings: resolveSceneSettings(document.sceneSettings),
    objects: document.objects.map(captureObjectState),
    updatedAt: new Date().toISOString(),
  };
}

export function applySceneStateToDocument(document: SceneDocument, sceneState: SceneState): SceneDocument {
  const objectStateById = new Map(sceneState.objects.map((objectState) => [objectState.objectId, objectState]));
  const objects = document.objects.map((object) => {
    const objectState = objectStateById.get(object.id);

    if (!objectState) {
      return object;
    }

    return {
      ...object,
      visible: objectState.visible,
      transform: cloneTransform(objectState.transform),
    };
  });
  const activeCameraId =
    sceneState.activeCameraId && objects.some((object) => object.id === sceneState.activeCameraId && object.kind === "camera")
      ? sceneState.activeCameraId
      : document.activeCameraId;

  return {
    ...document,
    activeCameraId,
    sceneSettings: sceneState.sceneSettings ? resolveSceneSettings(sceneState.sceneSettings) : document.sceneSettings,
    objects,
  };
}
