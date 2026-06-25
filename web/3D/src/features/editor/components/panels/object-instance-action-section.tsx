"use client";

import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { defaultInstanceOffset } from "../../interactions/object-instance-actions";
import { useEditorStore } from "../../store/editor-store";
import type { ObjectInstanceActionOperation, SceneObject, Vec3 } from "../../types";

const instanceActionOperations: ObjectInstanceActionOperation[] = ["create", "destroy", "toggle"];
const axes = ["X", "Y", "Z"] as const;

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function moveVec3(vector: Vec3, index: number, value: number): Vec3 {
  return vector.map((entry, entryIndex) => (entryIndex === index ? value : entry)) as Vec3;
}

function actionOffset(actionOffset: Vec3 | undefined): Vec3 {
  return actionOffset ?? defaultInstanceOffset;
}

export function ObjectInstanceActionSection({ object }: { object: SceneObject }) {
  const objects = useEditorStore((state) => state.document.objects);
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const action = object.interaction?.objectInstanceAction;
  const selectedSource = objects.find((entry) => entry.id === action?.sourceObjectId);
  const offset = actionOffset(action?.offset);

  function chooseSource(source: SceneObject) {
    updateInteraction(object.id, {
      objectInstanceAction: {
        sourceObjectId: source.id,
        operation: action?.operation ?? "create",
        offset,
        maxInstances: action?.maxInstances ?? 12,
      },
    });
  }

  function updateAction(updates: Partial<{ maxInstances: number; offset: Vec3; operation: ObjectInstanceActionOperation }>) {
    if (!selectedSource) {
      return;
    }

    updateInteraction(object.id, {
      objectInstanceAction: {
        sourceObjectId: selectedSource.id,
        operation: action?.operation ?? "create",
        offset,
        maxInstances: action?.maxInstances ?? 12,
        ...updates,
      },
    });
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Object instance</Label>
          {action?.sourceObjectId ? (
            <Button size="sm" variant="ghost" onClick={() => updateInteraction(object.id, { objectInstanceAction: undefined })}>
              Clear
            </Button>
          ) : null}
        </div>
        {objects.length ? (
          <div className="grid grid-cols-2 gap-2">
            {objects.map((source) => (
              <Button
                key={source.id}
                className="min-w-0 justify-start gap-2"
                size="sm"
                variant={source.id === action?.sourceObjectId ? "default" : "outline"}
                onClick={() => chooseSource(source)}
              >
                <Copy className="size-3.5 shrink-0" />
                <span className="truncate">{source.name}</span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">Create an object before assigning an instance action.</div>
        )}
      </div>

      {selectedSource ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {(action?.operation ?? "create") === "destroy" ? <Trash2 className="size-3.5 shrink-0" /> : <Copy className="size-3.5 shrink-0" />}
            <span className="min-w-0 truncate">{selectedSource.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {instanceActionOperations.map((operation) => (
              <Button key={operation} size="sm" variant={(action?.operation ?? "create") === operation ? "default" : "outline"} onClick={() => updateAction({ operation })}>
                {operation}
              </Button>
            ))}
          </div>
          {(action?.operation ?? "create") !== "destroy" ? (
            <>
              <div className="space-y-1">
                <Label htmlFor={`instance-action-${object.id}-max`}>Max live copies</Label>
                <Input
                  id={`instance-action-${object.id}-max`}
                  inputMode="numeric"
                  max={50}
                  min={1}
                  step={1}
                  type="number"
                  value={action?.maxInstances ?? 12}
                  onChange={(event) => updateAction({ maxInstances: Math.round(clampNumber(toNumber(event.target.value, action?.maxInstances ?? 12), 1, 50)) })}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {axes.map((axis, index) => (
                  <div key={axis} className="space-y-1">
                    <Label htmlFor={`instance-action-${object.id}-${axis}`} className="text-[11px] text-muted-foreground">
                      Offset {axis}
                    </Label>
                    <Input
                      id={`instance-action-${object.id}-${axis}`}
                      inputMode="decimal"
                      step={0.1}
                      type="number"
                      value={Number(offset[index].toFixed(2))}
                      onChange={(event) => updateAction({ offset: moveVec3(offset, index, toNumber(event.target.value, offset[index])) })}
                    />
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

