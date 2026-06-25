import { getSelfHostedPackageHtml } from "@/features/projects/self-hosted-export";
import { getPublishedSharedProject } from "@/features/viewer/server/shared-project";

interface PublicSceneSelfHostedRouteContext {
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

export async function GET(request: Request, context: PublicSceneSelfHostedRouteContext) {
  const { shareId } = await context.params;
  const sceneId = new URL(request.url).searchParams.get("scene");
  const sharedScene = await getPublishedSharedProject(shareId, "allowViewerDownload", sceneId);

  if (!sharedScene) {
    return Response.json({ error: "Scene not found" }, { status: 404 });
  }

  return new Response(getSelfHostedPackageHtml({ document: sharedScene.document, sceneName: sharedScene.document.name }), {
    headers: {
      "Content-Disposition": `attachment; filename="${getSafeFileName(sharedScene.document.name)}-self-hosted.html"`,
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
