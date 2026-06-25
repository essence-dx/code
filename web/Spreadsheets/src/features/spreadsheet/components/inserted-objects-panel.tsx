"use client";

import { Image as ImageIcon, Square, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { InsertedObjectEditor } from "@/features/spreadsheet/components/inserted-object-editor";
import type {
  InsertedObjectLayerAction,
  InsertedObjectUpdate,
} from "@/features/spreadsheet/inserted-objects";
import type { InsertedObjectDefinition } from "@/features/workbooks/types";
import { cn } from "@/lib/utils";

export function InsertedObjectsPanel({
  disabled,
  objects,
  selectedObjectId,
  onDeleteObject,
  onMoveObjectToSelection,
  onReorderObject,
  onSelectObject,
  onUpdateObject,
}: {
  disabled: boolean;
  objects: InsertedObjectDefinition[];
  selectedObjectId: string | null;
  onDeleteObject: (objectId: string) => void;
  onMoveObjectToSelection: (objectId: string) => void;
  onReorderObject: (
    objectId: string,
    action: InsertedObjectLayerAction,
  ) => void;
  onSelectObject: (objectId: string | null) => void;
  onUpdateObject: (objectId: string, updates: InsertedObjectUpdate) => void;
}) {
  const selectedObject =
    objects.find((object) => object.id === selectedObjectId) ?? objects[0] ?? null;

  return (
    <section className="rounded-md border bg-background p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Objects</h2>
          <p className="text-xs text-muted-foreground">
            {objects.length} on this sheet
          </p>
        </div>
        {selectedObject ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => onMoveObjectToSelection(selectedObject.id)}
          >
            Move here
          </Button>
        ) : null}
      </div>
      {objects.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          No inserted objects.
        </p>
      ) : (
        <ObjectList
          objects={objects}
          selectedObjectId={selectedObject?.id ?? null}
          onSelectObject={onSelectObject}
        />
      )}
      {selectedObject ? (
        <>
          <Separator className="my-3" />
          <InsertedObjectEditor
            disabled={disabled}
            object={selectedObject}
            onDeleteObject={onDeleteObject}
            onReorderObject={onReorderObject}
            onUpdateObject={onUpdateObject}
          />
        </>
      ) : null}
    </section>
  );
}

function ObjectList({
  objects,
  selectedObjectId,
  onSelectObject,
}: {
  objects: InsertedObjectDefinition[];
  selectedObjectId: string | null;
  onSelectObject: (objectId: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      {objects
        .slice()
        .sort((left, right) => right.zIndex - left.zIndex)
        .map((object) => (
          <button
            key={object.id}
            type="button"
            className={cn(
              "flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-sm hover:bg-accent",
              object.id === selectedObjectId &&
                "border-primary bg-primary/10 text-primary",
            )}
            onClick={() => onSelectObject(object.id)}
          >
            <ObjectIcon object={object} />
            <span className="min-w-0 flex-1 truncate">{object.name}</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {object.zIndex}
            </span>
          </button>
        ))}
    </div>
  );
}

function ObjectIcon({ object }: { object: InsertedObjectDefinition }) {
  if (object.kind === "image") {
    return <ImageIcon className="h-4 w-4 shrink-0" />;
  }

  if (object.kind === "textBox") {
    return <Type className="h-4 w-4 shrink-0" />;
  }

  return <Square className="h-4 w-4 shrink-0" />;
}
