import {
  APP_PACKAGE_PRESETS,
  createAppPackageZip,
  getAppPackageFileName,
  getAppPackageFiles,
  type AppPackagePresetId,
} from "@/features/projects/app-package-export";
import { validateAppPackageFiles } from "@/features/projects/app-package-validation";
import { createAppPackageLineageManifest, createProjectExportLineageReport } from "@/features/projects/project-export-lineage";
import {
  getAbsoluteUrl,
  getEmbedPath,
  getPublicSceneApiPath,
  getSharePath,
} from "@/features/projects/share-links";
import { getPublishedSharedProject } from "@/features/viewer/server/shared-project";

interface PublicSceneAppPackageRouteContext {
  params: Promise<{
    preset: string;
    shareId: string;
  }>;
}

function isAppPackagePreset(value: string): value is AppPackagePresetId {
  return APP_PACKAGE_PRESETS.some((preset) => preset.id === value);
}

export async function GET(request: Request, context: PublicSceneAppPackageRouteContext) {
  const { preset, shareId } = await context.params;

  if (!isAppPackagePreset(preset)) {
    return Response.json({ error: "Unknown app package preset" }, { status: 404 });
  }

  const sceneId = new URL(request.url).searchParams.get("scene");
  const sharedScene = await getPublishedSharedProject(shareId, "allowViewerDownload", sceneId);

  if (!sharedScene) {
    return Response.json({ error: "Scene not found" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const packageOptions = {
    activeSceneId: sharedScene.activeSceneId,
    embedUrl: getAbsoluteUrl(origin, getEmbedPath(shareId, sharedScene.activeSceneId)),
    lineage: createAppPackageLineageManifest(
      createProjectExportLineageReport({
        activeSceneId: sharedScene.activeSceneId,
        origin,
        project: sharedScene.project,
        sceneData: sharedScene.document,
      }),
      preset,
    ),
    sceneApiUrl: getAbsoluteUrl(origin, getPublicSceneApiPath(shareId, sharedScene.activeSceneId)),
    sceneName: sharedScene.document.name,
    scenes: sharedScene.scenes,
    shareSettings: sharedScene.shareSettings,
    shareUrl: getAbsoluteUrl(origin, getSharePath(shareId, sharedScene.activeSceneId)),
  };
  const files = getAppPackageFiles(preset, packageOptions);
  const validation = validateAppPackageFiles(preset, packageOptions, files);

  if (!validation.valid) {
    return Response.json({ error: "App package validation failed", issues: validation.issues }, { status: 500 });
  }

  return new Response(createAppPackageZip(files), {
    headers: {
      "Content-Disposition": `attachment; filename="${getAppPackageFileName(sharedScene.document.name, preset)}"`,
      "Content-Type": "application/zip",
    },
  });
}
