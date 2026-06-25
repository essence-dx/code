import { APP_PACKAGE_PRESETS } from "@/features/projects/app-package-export";
import { createProjectExportLineageReport } from "@/features/projects/project-export-lineage";
import { getAppPackagePath, getEmbedPath, getSharePath } from "@/features/projects/share-links";
import { getPublishedSharedProject } from "@/features/viewer/server/shared-project";

interface PublicSceneRouteContext {
  params: Promise<{
    shareId: string;
  }>;
}

export async function GET(request: Request, context: PublicSceneRouteContext) {
  const { shareId } = await context.params;
  const sceneId = new URL(request.url).searchParams.get("scene");
  const sharedScene = await getPublishedSharedProject(shareId, "allowPublicApi", sceneId);

  if (!sharedScene) {
    return Response.json({ error: "Scene not found" }, { status: 404 });
  }

  const lineage = createProjectExportLineageReport({
    activeSceneId: sharedScene.activeSceneId,
    origin: new URL(request.url).origin,
    project: sharedScene.project,
    sceneData: sharedScene.document,
  });

  return Response.json({
    lineage,
    scene: {
      activeSceneId: sharedScene.activeSceneId,
      document: sharedScene.document,
      embedPath: getEmbedPath(shareId, sharedScene.activeSceneId),
      appPackagePaths: APP_PACKAGE_PRESETS.map((preset) => ({
        id: preset.id,
        label: preset.label,
        path: getAppPackagePath(shareId, preset.id, sharedScene.activeSceneId),
      })),
      name: sharedScene.document.name,
      publishedAt: sharedScene.project.publishedAt?.toISOString() ?? null,
      projectName: sharedScene.project.name,
      scenes: sharedScene.scenes,
      shareSettings: sharedScene.shareSettings,
      shareId,
      sharePath: getSharePath(shareId, sharedScene.activeSceneId),
      updatedAt: sharedScene.project.updatedAt.toISOString(),
    },
  });
}
