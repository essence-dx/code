"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEditorStore } from "@/features/editor/state/editor-store";
import { restoreBrowserMediaAssets } from "@/lib/media/browser-media-store";
import { restoreTauriMediaAssets } from "@/lib/media/tauri-media";
import { restoreSelfHostedMediaAssets } from "@/lib/media/self-hosted-media";
import {
  recoverMediaAssets,
  type MediaRecoveryAdapter,
} from "@/lib/media/media-recovery";
import {
  loadLocalProject,
  trySaveLocalProject,
} from "@/lib/projects/local-project-store";
import { ProjectTopbar } from "@/features/editor/components/project-topbar";
import { ToolRail } from "@/features/editor/components/tool-rail";
import { MediaBin } from "@/features/editor/components/media-bin";
import { PreviewCanvas } from "@/features/editor/components/preview-canvas";
import { InspectorPanel } from "@/features/editor/components/inspector-panel";
import { TimelinePanel } from "@/features/editor/components/timeline-panel";
import { BrandFontLoader } from "@/features/editor/components/brand-font-loader";
import { useEditorShortcuts } from "@/features/editor/hooks/use-editor-shortcuts";
import { usePlaybackClock } from "@/features/editor/hooks/use-playback-clock";
import { preloadFfmpeg } from "@/lib/render/ffmpeg-loader";

const AiAssistantPanel = lazy(() =>
  import("@/features/editor/components/ai-assistant-panel").then((m) => ({
    default: m.AiAssistantPanel,
  })),
);

const ExportPanel = lazy(() =>
  import("@/features/editor/components/export-panel").then((m) => ({
    default: m.ExportPanel,
  })),
);

type EditorNotice = {
  tone: "default" | "destructive";
  message: string;
};

const missingMediaNotice: EditorNotice = {
  tone: "default",
  message:
    "Use the media panel reconnect controls to relink missing browser, desktop, or hosted source files.",
};

type EditorShellProps = {
  embedded?: boolean;
};

export function EditorShell({ embedded = false }: EditorShellProps) {
  const searchParams = useSearchParams();
  const mediaAssets = useEditorStore((state) => state.mediaAssets);
  const project = useEditorStore((state) => state.project);
  const addMediaAsset = useEditorStore((state) => state.addMediaAsset);
  const loadProject = useEditorStore((state) => state.loadProject);
  const restoreAttemptedRef = useRef(new Set<string>());
  const [notice, setNotice] = useState<EditorNotice | null>(null);
  usePlaybackClock();
  useEditorShortcuts();
  const visibleNotice =
    notice ??
    (searchParams.get("recovery") === "missing-media"
      ? missingMediaNotice
      : null);

  useEffect(() => {
    let mounted = true;
    const projectId = searchParams.get("project");
    if (!projectId || projectId === project.id) return;

    loadLocalProject(projectId)
      .then((record) => {
        if (!mounted) return;
        if (!record) {
          setNotice({
            tone: "destructive",
            message: "Local project could not be opened.",
          });
          return;
        }

        loadProject(record.project, record.mediaAssets);
        setNotice(null);
      })
      .catch(() => {
        if (mounted) {
          setNotice({
            tone: "destructive",
            message: "Local project could not be opened.",
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, [loadProject, project.id, searchParams]);

  useEffect(() => {
    let mounted = true;
    const adapters: MediaRecoveryAdapter[] = [
      {
        source: "browser-indexeddb",
        restore: async (asset) =>
          (await restoreBrowserMediaAssets([asset]))[0] ?? asset,
      },
      {
        source: "tauri-fs",
        restore: async (asset) =>
          (await restoreTauriMediaAssets([asset]))[0] ?? asset,
      },
      {
        source: "self-hosted-url",
        restore: async (asset) =>
          (await restoreSelfHostedMediaAssets([asset]))[0] ?? asset,
      },
    ];

    recoverMediaAssets(
      project.id,
      mediaAssets,
      adapters,
      restoreAttemptedRef.current,
    )
      .then(({ recovered, unavailable }) => {
        if (!mounted) return;
        recovered.forEach(addMediaAsset);

        if (unavailable.length > 0) {
          setNotice({
            tone: "default",
            message:
              "Some media could not be reconnected. Use the media panel to reconnect missing files.",
          });
        }
      })
      .catch(() => {
        if (mounted) {
          setNotice({
            tone: "default",
            message:
              "Some media could not be reconnected. Use the media panel to reconnect missing files.",
          });
        }
      });

    return () => {
      mounted = false;
    };
  }, [addMediaAsset, mediaAssets, project.id]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void trySaveLocalProject(project, mediaAssets);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [mediaAssets, project]);

  useEffect(() => {
    preloadFfmpeg().catch(() => {});
  }, []);

  const workspaceClassName = embedded
    ? "flex min-h-0 flex-1 overflow-hidden"
    : "flex min-h-0 flex-1 overflow-hidden";
  const mediaBinClassName = embedded
    ? "hidden min-h-0 w-[clamp(220px,24vw,320px)] shrink-0 resize-x overflow-hidden lg:block"
    : "min-h-0 w-[280px] shrink-0 resize-x overflow-hidden";
  const inspectorClassName = embedded
    ? "hidden min-h-0 w-[clamp(280px,25vw,360px)] shrink-0 resize-x overflow-hidden border-l border-border xl:grid xl:grid-rows-[minmax(0,1fr)_minmax(180px,260px)]"
    : "grid min-h-0 w-[340px] shrink-0 resize-x overflow-hidden border-l border-border grid-rows-[1fr_330px]";

  return (
    <main
      className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background"
      aria-label="Essence Studio editor"
    >
      <BrandFontLoader />
      <ProjectTopbar embedded={embedded} />
      {visibleNotice ? (
        <div className="border-t border-border bg-card px-3 py-2">
          <Alert variant={visibleNotice.tone} className="rounded-md py-2">
            <AlertCircle className="size-4" />
            <AlertDescription>{visibleNotice.message}</AlertDescription>
          </Alert>
        </div>
      ) : null}
      <div
        className={workspaceClassName}
        role="region"
        aria-label="Editor workspace"
      >
        {embedded ? null : <ToolRail />}
        <div className={mediaBinClassName} data-editor-region="media-library" tabIndex={-1}>
          <MediaBin />
        </div>
        <section
          className="flex min-w-0 flex-1 flex-col bg-background"
          aria-label="Preview and timeline workspace"
        >
          <div className="relative flex min-h-0 flex-1 flex-col">
            <PreviewCanvas />
            {embedded ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
                <ToolRail variant="bottom" />
              </div>
            ) : null}
          </div>
          <TimelinePanel />
        </section>
        <aside
          className={inspectorClassName}
          aria-label="Inspector and assistant"
        >
          <InspectorPanel />
          <div
            className="min-h-0 border-t border-border"
            role="region"
            aria-label="AI assistant"
          >
            <Suspense fallback={null}><AiAssistantPanel /></Suspense>
          </div>
        </aside>
      </div>
      <Suspense fallback={null}><ExportPanel /></Suspense>
    </main>
  );
}
