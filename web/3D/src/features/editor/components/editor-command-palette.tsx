"use client";

import { useEffect, useMemo } from "react";
import {
  Box,
  Camera,
  Circle,
  Copy,
  Cuboid,
  Eye,
  Folder,
  FolderMinus,
  FolderPlus,
  Frame,
  Lightbulb,
  MousePointerClick,
  Move3D,
  PanelTop,
  PenTool,
  Play,
  Redo2,
  Rotate3D,
  Scale3D,
  Search,
  Sparkles,
  Square,
  Star,
  TextCursorInput,
  Trash2,
  Triangle,
  Type,
  Undo2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useEditorStore, type EditorMode } from "../store/editor-store";
import type { PrimitiveKind } from "../types";

function isTextInputTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.matches("input, textarea, select, [contenteditable='true']");
}

export function EditorCommandPalette() {
  const open = useEditorStore((state) => state.commandPaletteOpen);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const cameraPreviewEnabled = useEditorStore((state) => state.cameraPreviewEnabled);
  const playModeEnabled = useEditorStore((state) => state.playModeEnabled);
  const surfaceMode = useEditorStore((state) => state.surfaceMode);
  const setOpen = useEditorStore((state) => state.setCommandPaletteOpen);
  const setMode = useEditorStore((state) => state.setMode);
  const setSurfaceMode = useEditorStore((state) => state.setSurfaceMode);
  const setCameraPreviewEnabled = useEditorStore((state) => state.setCameraPreviewEnabled);
  const setPlayModeEnabled = useEditorStore((state) => state.setPlayModeEnabled);
  const addObject = useEditorStore((state) => state.addObject);
  const addTwoDPage = useEditorStore((state) => state.addTwoDPage);
  const addTwoDFrame = useEditorStore((state) => state.addTwoDFrame);
  const addTwoDUiPrimitive = useEditorStore((state) => state.addTwoDUiPrimitive);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const duplicateObject = useEditorStore((state) => state.duplicateObject);
  const deleteObject = useEditorStore((state) => state.deleteObject);
  const groupSelectedObject = useEditorStore((state) => state.groupSelectedObject);
  const ungroupObject = useEditorStore((state) => state.ungroupObject);
  const selectedObject = useEditorStore((state) => state.document.objects.find((object) => object.id === selectedObjectId));

  const selectedCommandsDisabled = selectedObjectId === null;

  const objectCommands = useMemo<Array<{ kind: PrimitiveKind; label: string; icon: LucideIcon }>>(
    () => [
      { kind: "box", label: "Add cube", icon: Cuboid },
      { kind: "sphere", label: "Add sphere", icon: Box },
      { kind: "rectangle", label: "Add rectangle", icon: Square },
      { kind: "ellipse", label: "Add ellipse", icon: Circle },
      { kind: "triangle", label: "Add triangle", icon: Triangle },
      { kind: "star", label: "Add star", icon: Star },
      { kind: "text", label: "Add text", icon: Type },
      { kind: "path", label: "Add 3D path", icon: PenTool },
      { kind: "particles", label: "Add particles", icon: Sparkles },
      { kind: "pointLight", label: "Add point light", icon: Lightbulb },
      { kind: "directionalLight", label: "Add directional light", icon: Lightbulb },
      { kind: "spotLight", label: "Add spot light", icon: Lightbulb },
      { kind: "camera", label: "Add camera", icon: Camera },
      { kind: "group", label: "Add empty group", icon: Folder },
    ],
    [],
  );

  const toolCommands = useMemo<Array<{ mode: EditorMode; label: string; icon: LucideIcon; shortcut: string }>>(
    () => [
      { mode: "select", label: "Select tool", icon: Search, shortcut: "V" },
      { mode: "move", label: "Move tool", icon: Move3D, shortcut: "M" },
      { mode: "rotate", label: "Rotate tool", icon: Rotate3D, shortcut: "R" },
      { mode: "scale", label: "Scale tool", icon: Scale3D, shortcut: "S" },
    ],
    [],
  );

  function run(action: () => void) {
    action();
    setOpen(false);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(!open);
        return;
      }

      if (isTextInputTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();

      if (event.key === "Escape" && playModeEnabled) {
        event.preventDefault();
        setPlayModeEnabled(false);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === "d" && selectedObjectId) {
        event.preventDefault();
        duplicateObject(selectedObjectId);
        return;
      }

      if ((event.key === "Delete" || event.key === "Backspace") && selectedObjectId) {
        event.preventDefault();
        deleteObject(selectedObjectId);
        return;
      }

      const tool = toolCommands.find((command) => command.shortcut.toLowerCase() === key);
      if (tool && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        setMode(tool.mode);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteObject, duplicateObject, open, playModeEnabled, redo, selectedObjectId, setMode, setOpen, setPlayModeEnabled, toolCommands, undo]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command Palette" description="Search editor commands.">
      <CommandInput placeholder="Search commands" />
      <CommandList>
        <CommandEmpty>No command found.</CommandEmpty>
        <CommandGroup heading="Create">
          <CommandItem onSelect={() => run(addTwoDPage)}>
            <Frame className="size-4" />
            Add 2D page
          </CommandItem>
          <CommandItem onSelect={() => run(addTwoDFrame)}>
            <Square className="size-4" />
            Add 2D frame
          </CommandItem>
          <CommandItem onSelect={() => run(() => addTwoDUiPrimitive("button"))}>
            <MousePointerClick className="size-4" />
            Add 2D button
          </CommandItem>
          <CommandItem onSelect={() => run(() => addTwoDUiPrimitive("input"))}>
            <TextCursorInput className="size-4" />
            Add 2D input
          </CommandItem>
          <CommandItem onSelect={() => run(() => addTwoDUiPrimitive("card"))}>
            <PanelTop className="size-4" />
            Add 2D card
          </CommandItem>
          {objectCommands.map((command) => {
            const Icon = command.icon;

            return (
              <CommandItem key={command.kind} onSelect={() => run(() => addObject(command.kind))}>
                <Icon className="size-4" />
                {command.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Tools">
          {toolCommands.map((command) => {
            const Icon = command.icon;

            return (
              <CommandItem key={command.mode} onSelect={() => run(() => setMode(command.mode))}>
                <Icon className="size-4" />
                {command.label}
                <CommandShortcut>{command.shortcut}</CommandShortcut>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Edit">
          <CommandItem onSelect={() => run(() => setPlayModeEnabled(!playModeEnabled))}>
            {playModeEnabled ? <Square className="size-4" /> : <Play className="size-4" />}
            {playModeEnabled ? "Exit play mode" : "Play scene"}
            {playModeEnabled ? <CommandShortcut>Esc</CommandShortcut> : null}
          </CommandItem>
          <CommandItem disabled={playModeEnabled} onSelect={() => run(() => setCameraPreviewEnabled(!cameraPreviewEnabled))}>
            <Eye className="size-4" />
            {cameraPreviewEnabled ? "Exit camera preview" : "Preview active camera"}
          </CommandItem>
          <CommandItem disabled={playModeEnabled} onSelect={() => run(() => setSurfaceMode(surfaceMode === "2d" ? "3d" : "2d"))}>
            <Frame className="size-4" />
            {surfaceMode === "2d" ? "Switch to 3D canvas" : "Switch to 2D canvas"}
          </CommandItem>
          <CommandItem onSelect={() => run(undo)}>
            <Undo2 className="size-4" />
            Undo
            <CommandShortcut>Ctrl Z</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(redo)}>
            <Redo2 className="size-4" />
            Redo
            <CommandShortcut>Ctrl Y</CommandShortcut>
          </CommandItem>
          <CommandItem disabled={selectedCommandsDisabled} onSelect={() => selectedObjectId && run(() => duplicateObject(selectedObjectId))}>
            <Copy className="size-4" />
            Duplicate selected
            <CommandShortcut>Ctrl D</CommandShortcut>
          </CommandItem>
          <CommandItem disabled={selectedCommandsDisabled || selectedObject?.kind === "group"} onSelect={() => run(groupSelectedObject)}>
            <FolderPlus className="size-4" />
            Group selected
          </CommandItem>
          <CommandItem disabled={selectedObject?.kind !== "group"} onSelect={() => selectedObjectId && run(() => ungroupObject(selectedObjectId))}>
            <FolderMinus className="size-4" />
            Ungroup selected
          </CommandItem>
          <CommandItem disabled={selectedCommandsDisabled} onSelect={() => selectedObjectId && run(() => deleteObject(selectedObjectId))}>
            <Trash2 className="size-4" />
            Delete selected
            <CommandShortcut>Del</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
