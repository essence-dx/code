"use client";

import { Copy, Eye, EyeOff, Folder, Frame, Lock, Trash2, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { buildSceneTree, type SceneObjectNode } from "../../scene/scene-tree-utils";
import { useEditorStore } from "../../store/editor-store";
import type { SceneObject } from "../../types";

function SceneTreeRow({
  node,
  depth,
  selectedObjectId,
  selectObject,
  updateObject,
  duplicateObject,
  deleteObject,
}: {
  node: SceneObjectNode;
  depth: number;
  selectedObjectId: string | null;
  selectObject: (id: string | null) => void;
  updateObject: (id: string, updater: (object: SceneObject) => SceneObject) => void;
  duplicateObject: (id: string) => void;
  deleteObject: (id: string) => void;
}) {
  const { object, children } = node;
  const selected = object.id === selectedObjectId;

  return (
    <div>
      <div
        className={cn(
          "group grid grid-cols-[1fr_auto] items-center gap-1 rounded-md py-1.5 pr-2 text-sm",
          selected ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <Button className="h-auto min-w-0 justify-start gap-2 truncate px-1 py-0 text-left" type="button" variant="ghost" onClick={() => selectObject(object.id)}>
          {object.kind === "group" ? <Folder className="size-3.5 shrink-0" /> : null}
          {object.twoD ? <Frame className="size-3.5 shrink-0" /> : null}
          <span className="truncate">{object.name}</span>
        </Button>
        <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            aria-label={object.visible ? "Hide object" : "Show object"}
            className="size-7"
            size="icon"
            variant="ghost"
            onClick={() => updateObject(object.id, (entry) => ({ ...entry, visible: !entry.visible }))}
          >
            {object.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
          </Button>
          <Button
            aria-label={object.locked ? "Unlock object" : "Lock object"}
            className="size-7"
            size="icon"
            variant="ghost"
            onClick={() => updateObject(object.id, (entry) => ({ ...entry, locked: !entry.locked }))}
          >
            {object.locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}
          </Button>
          <Button aria-label="Duplicate object" className="size-7" size="icon" variant="ghost" onClick={() => duplicateObject(object.id)}>
            <Copy className="size-3.5" />
          </Button>
          <Button aria-label="Delete object" className="size-7" size="icon" variant="ghost" onClick={() => deleteObject(object.id)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>
      {children.map((child) => (
        <SceneTreeRow
          key={child.object.id}
          node={child}
          depth={depth + 1}
          selectedObjectId={selectedObjectId}
          selectObject={selectObject}
          updateObject={updateObject}
          duplicateObject={duplicateObject}
          deleteObject={deleteObject}
        />
      ))}
    </div>
  );
}

export function SceneTree() {
  const objects = useEditorStore((state) => state.document.objects);
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const selectObject = useEditorStore((state) => state.selectObject);
  const updateObject = useEditorStore((state) => state.updateObject);
  const duplicateObject = useEditorStore((state) => state.duplicateObject);
  const deleteObject = useEditorStore((state) => state.deleteObject);
  const tree = buildSceneTree(objects);

  return (
    <section className="grid min-h-0 grid-rows-[40px_1fr] border-b border-border">
      <div className="flex items-center px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Scene</div>
      <ScrollArea className="min-h-0">
        <div className="space-y-1 p-2">
          {tree.map((node) => (
            <SceneTreeRow
              key={node.object.id}
              node={node}
              depth={0}
              selectedObjectId={selectedObjectId}
              selectObject={selectObject}
              updateObject={updateObject}
              duplicateObject={duplicateObject}
              deleteObject={deleteObject}
            />
          ))}
        </div>
      </ScrollArea>
      <Separator />
    </section>
  );
}
