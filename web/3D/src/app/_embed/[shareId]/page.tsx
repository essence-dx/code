import { notFound } from "next/navigation";
import { SharedSceneNavigation } from "@/features/viewer/components/shared-scene-navigation";
import { SharedSceneViewer } from "@/features/viewer/components/shared-scene-viewer";
import { getPublishedSharedProject } from "@/features/viewer/server/shared-project";

interface EmbedScenePageProps {
  params: Promise<{
    shareId: string;
  }>;
  searchParams: Promise<{
    scene?: string | string[];
  }>;
}

function getRequestedSceneId(searchParams: Awaited<EmbedScenePageProps["searchParams"]>) {
  return Array.isArray(searchParams.scene) ? searchParams.scene[0] : searchParams.scene;
}

export default async function EmbedScenePage({ params, searchParams }: EmbedScenePageProps) {
  const { shareId } = await params;
  const sceneId = getRequestedSceneId(await searchParams);
  const sharedScene = await getPublishedSharedProject(shareId, "allowEmbed", sceneId);

  if (!sharedScene) {
    notFound();
  }

  return (
    <main className="relative h-dvh overflow-hidden text-foreground" style={{ backgroundColor: sharedScene.shareSettings.embedTransparentBackground ? "transparent" : undefined }}>
      <SharedSceneViewer
        key={sharedScene.activeSceneId}
        className="h-dvh min-h-dvh rounded-none border-0"
        controlsEnabled={sharedScene.shareSettings.embedCameraControls === "orbit"}
        document={sharedScene.document}
        showGrid={sharedScene.shareSettings.embedShowGrid}
        transparentBackground={sharedScene.shareSettings.embedTransparentBackground}
      />
      {sharedScene.shareSettings.embedShowNavigation ? (
        <SharedSceneNavigation
          activeSceneId={sharedScene.activeSceneId}
          className="absolute left-3 top-3 z-10"
          scenes={sharedScene.scenes}
          shareId={shareId}
          surface="embed"
        />
      ) : null}
    </main>
  );
}
