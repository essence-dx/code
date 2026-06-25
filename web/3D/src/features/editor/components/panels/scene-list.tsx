"use client";

import { useState, type KeyboardEvent } from "react";
import { ArrowDown, ArrowUp, Copy, Layers3, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { IconButton } from "../icon-button";
import { useEditorStore } from "../../store/editor-store";
import type { SceneFileScene } from "../../types";

const emptyScenes: SceneFileScene[] = [];

export function SceneList() {
  const scenes = useEditorStore(
    (state) => state.document.scenes ?? emptyScenes,
  );
  const activeSceneId = useEditorStore(
    (state) =>
      state.document.activeSceneId ??
      state.document.scenes?.[0]?.id ??
      state.document.id,
  );
  const addScene = useEditorStore((state) => state.addScene);
  const deleteScene = useEditorStore((state) => state.deleteScene);
  const duplicateScene = useEditorStore((state) => state.duplicateScene);
  const moveScene = useEditorStore((state) => state.moveScene);
  const renameScene = useEditorStore((state) => state.renameScene);
  const switchScene = useEditorStore((state) => state.switchScene);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  function beginRename(sceneId: string, name: string) {
    setEditingSceneId(sceneId);
    setDraftName(name);
  }

  function commitRename() {
    if (editingSceneId) {
      renameScene(editingSceneId, draftName);
    }

    setEditingSceneId(null);
    setDraftName("");
  }

  function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      commitRename();
    }

    if (event.key === "Escape") {
      setEditingSceneId(null);
      setDraftName("");
    }
  }

  return (
    <section className="grid h-48 min-h-0 grid-rows-[40px_1fr] border-b border-border">
      <div className="flex items-center justify-between gap-2 px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className="flex items-center gap-2">
          <Layers3 className="size-3.5" />
          Scenes
        </span>
        <IconButton
          label="Add scene"
          className="size-7"
          size="icon-sm"
          variant="ghost"
          onClick={addScene}
        >
          <Plus className="size-3.5" />
        </IconButton>
      </div>
      <ScrollArea className="min-h-0">
        <div className="space-y-1 p-2">
          {scenes.map((scene, index) => {
            const active = scene.id === activeSceneId;
            const editing = editingSceneId === scene.id;

            return (
              <div
                key={scene.id}
                className={cn(
                  "group grid grid-cols-[1fr_auto] items-center gap-1 rounded-md p-1 text-sm",
                  active
                    ? "bg-primary/15 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {editing ? (
                  <Input
                    autoFocus
                    className="h-7"
                    value={draftName}
                    onBlur={commitRename}
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={handleRenameKeyDown}
                  />
                ) : (
                  <Button
                    className="h-auto min-w-0 justify-start truncate px-1 py-1 text-left"
                    type="button"
                    variant="ghost"
                    onClick={() => switchScene(scene.id)}
                    onDoubleClick={() => beginRename(scene.id, scene.name)}
                  >
                    <span className="truncate">{scene.name}</span>
                    <span className="ml-2 text-[11px] text-muted-foreground">
                      {scene.objects.length} objects
                    </span>
                    <span className="sr-only">Scene {index + 1}</span>
                  </Button>
                )}
                <div className="flex items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  <IconButton
                    label={`Move ${scene.name} up`}
                    className="size-7"
                    disabled={index === 0}
                    size="icon"
                    variant="ghost"
                    onClick={() => moveScene(scene.id, -1)}
                  >
                    <ArrowUp className="size-3.5" />
                  </IconButton>
                  <IconButton
                    label={`Move ${scene.name} down`}
                    className="size-7"
                    disabled={index === scenes.length - 1}
                    size="icon"
                    variant="ghost"
                    onClick={() => moveScene(scene.id, 1)}
                  >
                    <ArrowDown className="size-3.5" />
                  </IconButton>
                  <IconButton
                    label={`Duplicate ${scene.name}`}
                    className="size-7"
                    size="icon"
                    variant="ghost"
                    onClick={() => duplicateScene(scene.id)}
                  >
                    <Copy className="size-3.5" />
                  </IconButton>
                  <IconButton
                    label={`Delete ${scene.name}`}
                    className="size-7"
                    disabled={scenes.length <= 1}
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteScene(scene.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </section>
  );
}
