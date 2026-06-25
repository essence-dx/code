import {
  getAbsoluteUrl,
  getEmbedPath,
  getPublicSceneApiPath,
  getSharePath,
  getViewerPackageHtml,
} from "@/features/projects/share-links";
import { getPublishedSharedProject } from "@/features/viewer/server/shared-project";

interface PublicSceneViewerPackageRouteContext {
  params: Promise<{
    shareId: string;
  }>;
}

function getSafeFileName(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "essence-spline-scene";
}

export async function GET(request: Request, context: PublicSceneViewerPackageRouteContext) {
  const { shareId } = await context.params;
  const sceneId = new URL(request.url).searchParams.get("scene");
  const sharedScene = await getPublishedSharedProject(shareId, "allowViewerDownload", sceneId);

  if (!sharedScene) {
    return Response.json({ error: "Scene not found" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const html = getViewerPackageHtml({
    embedUrl: getAbsoluteUrl(origin, getEmbedPath(shareId, sharedScene.activeSceneId)),
    embedOptions: sharedScene.shareSettings,
    sceneApiUrl: getAbsoluteUrl(origin, getPublicSceneApiPath(shareId, sharedScene.activeSceneId)),
    sceneName: sharedScene.document.name,
    shareUrl: getAbsoluteUrl(origin, getSharePath(shareId, sharedScene.activeSceneId)),
  });

  return new Response(html, {
    headers: {
      "Content-Disposition": `attachment; filename="${getSafeFileName(sharedScene.document.name)}-viewer.html"`,
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
