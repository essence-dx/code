import Link from "next/link";
import { notFound } from "next/navigation";
import { Box, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SharedSceneNavigation } from "@/features/viewer/components/shared-scene-navigation";
import { SharedSceneViewer } from "@/features/viewer/components/shared-scene-viewer";
import { getPublishedSharedProject } from "@/features/viewer/server/shared-project";

interface SharedScenePageProps {
  params: Promise<{
    shareId: string;
  }>;
  searchParams: Promise<{
    scene?: string | string[];
  }>;
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Published";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(value);
}

function getRequestedSceneId(searchParams: Awaited<SharedScenePageProps["searchParams"]>) {
  return Array.isArray(searchParams.scene) ? searchParams.scene[0] : searchParams.scene;
}

export default async function SharedScenePage({ params, searchParams }: SharedScenePageProps) {
  const { shareId } = await params;
  const sceneId = getRequestedSceneId(await searchParams);
  const sharedScene = await getPublishedSharedProject(shareId, "allowView", sceneId);

  if (!sharedScene) {
    notFound();
  }

  return (
    <main className="min-h-dvh bg-background p-4 text-foreground md:p-6">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Box className="size-4" />
              Shared Essence Spline scene
            </div>
            <h1 className="truncate text-2xl font-semibold tracking-normal">{sharedScene.project.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge className="rounded-md" variant="secondary">
                {sharedScene.document.objects.length} objects
              </Badge>
              <Badge className="rounded-md" variant="outline">
                {sharedScene.document.name}
              </Badge>
              <span className="flex items-center gap-1">
                <CalendarClock className="size-3.5" />
                {formatDate(sharedScene.project.publishedAt)}
              </span>
            </div>
          </div>
          <Link className={buttonVariants({ variant: "secondary" })} href="/">
            Open editor
          </Link>
        </header>
        <SharedSceneNavigation activeSceneId={sharedScene.activeSceneId} scenes={sharedScene.scenes} shareId={shareId} />
        <SharedSceneViewer
          key={sharedScene.activeSceneId}
          controlsEnabled={sharedScene.shareSettings.embedCameraControls === "orbit"}
          document={sharedScene.document}
          showGrid={sharedScene.shareSettings.embedShowGrid}
        />
      </section>
    </main>
  );
}
