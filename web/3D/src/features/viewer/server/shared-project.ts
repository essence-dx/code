import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { project } from "@/db/schema";
import { applySceneSnapshot, ensureDocumentScenes } from "@/features/editor/scene/multi-scene";
import { sceneDocumentSchema, type SceneDocument } from "@/features/editor/types";
import { getSharePermissionReviewGate } from "@/features/projects/project-review-gates";
import { hasSharePermission, resolveShareSettings, type SharePermission } from "@/features/projects/share-settings";

export interface SharedSceneSummary {
  id: string;
  name: string;
  objectCount: number;
  updatedAt: string;
}

export interface SharedSceneSelection {
  activeSceneId: string;
  document: SceneDocument;
  scenes: SharedSceneSummary[];
}

function normalizeRequestedSceneId(sceneId?: string | null) {
  const normalizedSceneId = sceneId?.trim();

  return normalizedSceneId ? normalizedSceneId : null;
}

export function resolveSharedSceneSelection(document: SceneDocument, requestedSceneId?: string | null): SharedSceneSelection | null {
  const requestedScene = normalizeRequestedSceneId(requestedSceneId);
  const normalizedDocument = ensureDocumentScenes(document);
  const scenes = normalizedDocument.scenes ?? [];
  const activeSceneId = normalizedDocument.activeSceneId ?? scenes[0]?.id ?? normalizedDocument.id;
  const selectedScene = requestedScene
    ? scenes.find((scene) => scene.id === requestedScene)
    : scenes.find((scene) => scene.id === activeSceneId) ?? scenes[0];

  if (!selectedScene) {
    return requestedScene
      ? null
      : {
          activeSceneId,
          document: normalizedDocument,
          scenes: [],
        };
  }

  return {
    activeSceneId: selectedScene.id,
    document: applySceneSnapshot(normalizedDocument, selectedScene),
    scenes: scenes.map((scene) => ({
      id: scene.id,
      name: scene.name,
      objectCount: scene.objects.length,
      updatedAt: scene.updatedAt,
    })),
  };
}

export async function getPublishedSharedProject(shareId: string, permission: SharePermission = "allowView", sceneId?: string | null) {
  const rows = await getDb()
    .select()
    .from(project)
    .where(and(eq(project.shareId, shareId), isNotNull(project.publishedAt), isNull(project.archivedAt)))
    .limit(1);
  const sharedProject = rows[0];

  if (!sharedProject) {
    return null;
  }

  const shareSettings = resolveShareSettings(sharedProject.shareSettings);

  if (!hasSharePermission(shareSettings, permission)) {
    return null;
  }

  if (!getSharePermissionReviewGate(shareSettings, permission).allowed) {
    return null;
  }

  const parsedScene = sceneDocumentSchema.safeParse(sharedProject.sceneData);

  if (!parsedScene.success) {
    return null;
  }

  const selectedScene = resolveSharedSceneSelection(parsedScene.data, sceneId);

  if (!selectedScene) {
    return null;
  }

  return {
    activeSceneId: selectedScene.activeSceneId,
    document: selectedScene.document,
    project: sharedProject,
    scenes: selectedScene.scenes,
    shareSettings,
  };
}
