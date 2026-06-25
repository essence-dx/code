import { applySceneSnapshot, ensureDocumentScenes, syncActiveScene } from "@/features/editor/scene/multi-scene";
import type { SceneDocument } from "@/features/editor/types";

export function getProjectCollaborationSceneId(document: SceneDocument | null) {
  return document?.activeSceneId ?? document?.id ?? null;
}

export function resolveProjectCollaborationSceneBaseline(baseDocument: SceneDocument | null, currentDocument: SceneDocument) {
  if (!baseDocument) {
    return null;
  }

  const sceneId = getProjectCollaborationSceneId(currentDocument);
  const preparedDocument = ensureDocumentScenes(baseDocument);
  const scene = sceneId ? preparedDocument.scenes?.find((entry) => entry.id === sceneId) : null;

  return scene ? syncActiveScene(applySceneSnapshot({ ...preparedDocument, activeSceneId: scene.id }, scene)) : preparedDocument;
}
