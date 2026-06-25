import type { SceneDocument, SceneFileScene } from "../types";

function getNowIso() {
  return new Date().toISOString();
}

export function createSceneSnapshotFromDocument(document: SceneDocument, sceneId = document.activeSceneId ?? document.id, sceneName = document.name): SceneFileScene {
  return {
    id: sceneId,
    name: sceneName,
    activeCameraId: document.activeCameraId ?? null,
    sceneSettings: document.sceneSettings,
    sceneStates: structuredClone(document.sceneStates ?? []),
    inputControls: structuredClone(document.inputControls ?? []),
    variables: structuredClone(document.variables ?? []),
    animationTracks: structuredClone(document.animationTracks ?? []),
    objects: structuredClone(document.objects),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export function applySceneSnapshot(document: SceneDocument, scene: SceneFileScene): SceneDocument {
  return {
    ...document,
    name: scene.name,
    activeSceneId: scene.id,
    activeCameraId: scene.activeCameraId ?? null,
    sceneSettings: scene.sceneSettings,
    sceneStates: structuredClone(scene.sceneStates ?? []),
    inputControls: structuredClone(scene.inputControls ?? []),
    variables: structuredClone(scene.variables ?? []),
    animationTracks: structuredClone(scene.animationTracks ?? []),
    objects: structuredClone(scene.objects),
    updatedAt: scene.updatedAt,
  };
}

export function ensureDocumentScenes(document: SceneDocument): SceneDocument {
  if (document.scenes?.length) {
    const activeSceneId = document.activeSceneId && document.scenes.some((scene) => scene.id === document.activeSceneId) ? document.activeSceneId : document.scenes[0]?.id;
    const activeScene = document.scenes.find((scene) => scene.id === activeSceneId) ?? document.scenes[0];

    if (!activeScene) {
      return document;
    }

    return syncActiveScene({
      ...document,
      activeSceneId: activeScene.id,
    });
  }

  const activeSceneId = document.activeSceneId ?? document.id;

  return {
    ...document,
    activeSceneId,
    scenes: [createSceneSnapshotFromDocument(document, activeSceneId, document.name)],
  };
}

export function syncActiveScene(document: SceneDocument): SceneDocument {
  const activeSceneId = document.activeSceneId ?? document.scenes?.[0]?.id ?? document.id;
  const scenes = document.scenes?.length ? document.scenes : [createSceneSnapshotFromDocument(document, activeSceneId, document.name)];
  const snapshot = {
    ...createSceneSnapshotFromDocument(document, activeSceneId, document.name),
    updatedAt: document.updatedAt,
  };

  return {
    ...document,
    activeSceneId,
    scenes: scenes.map((scene) => (scene.id === activeSceneId ? snapshot : scene)),
  };
}

export function createSceneSnapshotFromTemplate(document: SceneDocument, sceneId: string, name: string): SceneFileScene {
  const now = getNowIso();

  return {
    ...createSceneSnapshotFromDocument(document, sceneId, name),
    id: sceneId,
    name,
    createdAt: now,
    updatedAt: now,
  };
}

export function getUniqueSceneName(scenes: SceneFileScene[], baseName: string) {
  const existing = new Set(scenes.map((scene) => scene.name.trim().toLowerCase()));
  const trimmedBase = baseName.trim() || "Scene";

  if (!existing.has(trimmedBase.toLowerCase())) {
    return trimmedBase;
  }

  let index = 2;
  let name = `${trimmedBase} ${index}`;

  while (existing.has(name.toLowerCase())) {
    index += 1;
    name = `${trimmedBase} ${index}`;
  }

  return name;
}
