"use client";

import { BoxSelect, Frame, MousePointerClick, Move3D, PanelTop, Rotate3D, Scale3D, Square, TextCursorInput } from "lucide-react";
import { IconButton } from "./icon-button";
import { useEditorStore, type EditorMode, type EditorSurfaceMode } from "../store/editor-store";

const tools: Array<{ id: EditorMode; label: string; icon: typeof BoxSelect }> = [
  { id: "select", label: "Select", icon: BoxSelect },
  { id: "move", label: "Move", icon: Move3D },
  { id: "rotate", label: "Rotate", icon: Rotate3D },
  { id: "scale", label: "Scale", icon: Scale3D },
];

const surfaces: Array<{ id: EditorSurfaceMode; label: string; icon: typeof BoxSelect }> = [
  { id: "3d", label: "3D canvas", icon: BoxSelect },
  { id: "2d", label: "2D canvas", icon: Frame },
];

export function ToolRail() {
  const mode = useEditorStore((state) => state.mode);
  const surfaceMode = useEditorStore((state) => state.surfaceMode);
  const setMode = useEditorStore((state) => state.setMode);
  const setSurfaceMode = useEditorStore((state) => state.setSurfaceMode);
  const addTwoDPage = useEditorStore((state) => state.addTwoDPage);
  const addTwoDFrame = useEditorStore((state) => state.addTwoDFrame);
  const addTwoDUiPrimitive = useEditorStore((state) => state.addTwoDUiPrimitive);

  return (
    <nav className="fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center justify-start gap-3 overflow-x-auto [scrollbar-width:none] sm:justify-center [&::-webkit-scrollbar]:hidden">
      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
        {tools.map((tool) => {
          const Icon = tool.icon;

          return (
            <IconButton key={tool.id} label={tool.label} onClick={() => setMode(tool.id)} variant={mode === tool.id ? "secondary" : "ghost"}>
              <Icon className="size-4" />
            </IconButton>
          );
        })}
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
        {surfaces.map((surface) => {
          const Icon = surface.icon;

          return (
            <IconButton key={surface.id} label={surface.label} onClick={() => setSurfaceMode(surface.id)} variant={surfaceMode === surface.id ? "secondary" : "ghost"}>
              <Icon className="size-4" />
            </IconButton>
          );
        })}
      </div>
      <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
        <IconButton label="Add 2D page" onClick={addTwoDPage} variant="ghost">
          <Frame className="size-4" />
        </IconButton>
        <IconButton label="Add 2D frame" onClick={addTwoDFrame} variant="ghost">
          <Square className="size-4" />
        </IconButton>
        <IconButton label="Add 2D button" onClick={() => addTwoDUiPrimitive("button")} variant="ghost">
          <MousePointerClick className="size-4" />
        </IconButton>
        <IconButton label="Add 2D input" onClick={() => addTwoDUiPrimitive("input")} variant="ghost">
          <TextCursorInput className="size-4" />
        </IconButton>
        <IconButton label="Add 2D card" onClick={() => addTwoDUiPrimitive("card")} variant="ghost">
          <PanelTop className="size-4" />
        </IconButton>
      </div>
    </nav>
  );
}
