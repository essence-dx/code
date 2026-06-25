"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { EditorCommandPalette } from "./editor-command-palette";
import { ProjectCommentLoader } from "@/features/projects/components/project-comment-loader";
import { ProjectRouteLoader } from "@/features/projects/components/project-route-loader";
import { AssetPanel } from "./panels/asset-panel";
import { InspectorPanel } from "./panels/inspector-panel";
import { SceneList } from "./panels/scene-list";
import { SceneTree } from "./panels/scene-tree";
import { TopBar } from "./top-bar";
import { ToolRail } from "./tool-rail";
import { useEditorStore } from "../store/editor-store";

const EditorViewport = dynamic(
  () =>
    import("./viewport/editor-viewport").then(
      (module) => module.EditorViewport,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-background text-sm text-muted-foreground">
        Loading viewport
      </div>
    ),
  },
);

type EditorWorkspaceProps = {
  embedded?: boolean;
};

export function EditorWorkspace({ embedded = false }: EditorWorkspaceProps) {
  const playModeEnabled = useEditorStore((state) => state.playModeEnabled);
  const detachProject = useEditorStore((state) => state.detachProject);
  const workspaceClassName = playModeEnabled
    ? "grid min-h-0"
    : "grid min-h-0 grid-cols-[260px_minmax(0,1fr)_300px] max-xl:grid-cols-[240px_minmax(0,1fr)_280px] max-lg:grid-cols-[minmax(0,1fr)]";

  useEffect(() => {
    if (embedded) {
      detachProject();
    }
  }, [detachProject, embedded]);

  return (
    <main className="relative grid h-dvh grid-rows-[48px_minmax(0,1fr)] overflow-hidden bg-background text-foreground">
      <TopBar cloudEnabled={!embedded} />
      <EditorCommandPalette />
      {!embedded ? <ProjectRouteLoader /> : null}
      {!embedded ? <ProjectCommentLoader /> : null}
      <section className={workspaceClassName}>
        {playModeEnabled ? (
          <EditorViewport collaborationEnabled={!embedded} />
        ) : (
          <>
            <aside className="grid min-h-0 grid-rows-[192px_minmax(0,1fr)_minmax(0,1fr)] border-r border-border bg-sidebar max-lg:hidden">
              <SceneList />
              <SceneTree />
              <AssetPanel />
            </aside>
            <EditorViewport collaborationEnabled={!embedded} />
            <aside className="min-h-0 border-l border-border bg-sidebar max-lg:hidden">
              <InspectorPanel />
            </aside>
          </>
        )}
      </section>
      {!playModeEnabled ? <ToolRail /> : null}
    </main>
  );
}
