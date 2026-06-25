import {
  getAppPackagePresetPayloads,
} from "@/features/projects/app-package-export";
import {
  getAbsoluteUrl,
  getAppPackagePath,
  getAndroidComposeEmbedCode,
  getEmbedCode,
  getEmbedPath,
  getKotlinSceneFetchCode,
  getPublicSceneApiPath,
  getReactEmbedCode,
  getRuntimeApiCode,
  getSceneFetchCode,
  getSharePath,
  getSwiftSceneFetchCode,
  getSwiftUIEmbedCode,
} from "@/features/projects/share-links";
import { createProjectExportLineageReport } from "@/features/projects/project-export-lineage";
import { getPlatformEmbedPresetPayloads } from "@/features/projects/platform-embed-presets";
import { getPublishedSharedProject } from "@/features/viewer/server/shared-project";

interface PublicSceneCodeRouteContext {
  params: Promise<{
    shareId: string;
  }>;
}

export async function GET(request: Request, context: PublicSceneCodeRouteContext) {
  const { shareId } = await context.params;
  const sceneId = new URL(request.url).searchParams.get("scene");
  const sharedScene = await getPublishedSharedProject(shareId, "allowCodeExport", sceneId);

  if (!sharedScene) {
    return Response.json({ error: "Scene not found" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const embedUrl = getAbsoluteUrl(origin, getEmbedPath(shareId, sharedScene.activeSceneId));
  const sceneApiUrl = getAbsoluteUrl(origin, getPublicSceneApiPath(shareId, sharedScene.activeSceneId));
  const shareUrl = getAbsoluteUrl(origin, getSharePath(shareId, sharedScene.activeSceneId));
  const embedOptions = sharedScene.shareSettings;
  const lineage = createProjectExportLineageReport({
    activeSceneId: sharedScene.activeSceneId,
    origin,
    project: sharedScene.project,
    sceneData: sharedScene.document,
  });

  return Response.json({
    code: {
      fetchScene: getSceneFetchCode(sceneApiUrl),
      iframe: getEmbedCode(embedUrl, sharedScene.document.name, embedOptions),
      kotlinFetch: getKotlinSceneFetchCode(sceneApiUrl),
      androidComposeView: getAndroidComposeEmbedCode(embedUrl),
      reactComponent: getReactEmbedCode(embedUrl, embedOptions),
      runtimeApi: getRuntimeApiCode(embedUrl, embedOptions),
      swiftFetch: getSwiftSceneFetchCode(sceneApiUrl),
      swiftUI: getSwiftUIEmbedCode(embedUrl),
    },
    platformEmbeds: getPlatformEmbedPresetPayloads({
      embedOptions,
      embedUrl,
      sceneName: sharedScene.document.name,
      shareUrl,
    }),
    appPackages: getAppPackagePresetPayloads({
      activeSceneId: sharedScene.activeSceneId,
      embedUrl,
      lineage: null,
      sceneApiUrl,
      sceneName: sharedScene.document.name,
      scenes: sharedScene.scenes,
      shareSettings: sharedScene.shareSettings,
      shareUrl,
    }).map((preset) => ({
      ...preset,
      downloadPath: getAppPackagePath(shareId, preset.id, sharedScene.activeSceneId),
    })),
    lineage,
    scene: {
      activeSceneId: sharedScene.activeSceneId,
      name: sharedScene.document.name,
      projectName: sharedScene.project.name,
      scenes: sharedScene.scenes,
      shareSettings: sharedScene.shareSettings,
      shareId,
      updatedAt: sharedScene.project.updatedAt.toISOString(),
    },
  });
}
