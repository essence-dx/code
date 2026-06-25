import Link from "next/link";
import { Layers3 } from "lucide-react";
import { getEmbedPath, getSharePath } from "@/features/projects/share-links";
import type { SharedSceneSummary } from "@/features/viewer/server/shared-project";
import { cn } from "@/lib/utils";

interface SharedSceneNavigationProps {
  activeSceneId: string;
  className?: string;
  scenes: SharedSceneSummary[];
  shareId: string;
  surface?: "embed" | "share";
}

export function SharedSceneNavigation({ activeSceneId, className, scenes, shareId, surface = "share" }: SharedSceneNavigationProps) {
  if (scenes.length <= 1) {
    return null;
  }

  const compact = surface === "embed";
  const getScenePath = surface === "embed" ? getEmbedPath : getSharePath;

  return (
    <nav
      aria-label="Scenes"
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md border border-border bg-card/95 p-2 text-card-foreground shadow-sm backdrop-blur",
        compact ? "max-w-[calc(100vw-1.5rem)]" : "w-full",
        className,
      )}
    >
      <div className={cn("flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground", compact && "sr-only")}>
        <Layers3 className="size-3.5" />
        Scenes
      </div>
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {scenes.map((scene) => {
          const active = scene.id === activeSceneId;

          return (
            <Link
              key={scene.id}
              aria-current={active ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              href={getScenePath(shareId, scene.id)}
              title={`${scene.name} - ${scene.objectCount} objects`}
            >
              {scene.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
