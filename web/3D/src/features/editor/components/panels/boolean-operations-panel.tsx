"use client";

import { nanoid } from "nanoid";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { booleanOperationLabels, canUseBooleanSource } from "../../scene/boolean-operations";
import type { BooleanOperation, BooleanOperationKind, SceneObject } from "../../types";

const operations = Object.entries(booleanOperationLabels) as Array<[BooleanOperationKind, string]>;

interface BooleanOperationsPanelProps {
  object: SceneObject;
  objects: SceneObject[];
  updateObject: (id: string, updater: (object: SceneObject) => SceneObject) => void;
}

export function BooleanOperationsPanel({ object, objects, updateObject }: BooleanOperationsPanelProps) {
  const sourceObjects = objects.filter((entry) => entry.id !== object.id && canUseBooleanSource(entry));
  const stack = object.booleans ?? [];
  const hasSources = sourceObjects.length > 0;

  function updateStack(nextStack: BooleanOperation[]) {
    updateObject(object.id, (currentObject) => ({
      ...currentObject,
      booleans: nextStack.length ? nextStack : undefined,
    }));
  }

  function addOperation() {
    const targetObject = sourceObjects[0];

    if (!targetObject) {
      return;
    }

    updateStack([
      ...stack,
      {
        id: nanoid(),
        enabled: true,
        operation: "subtract",
        targetObjectId: targetObject.id,
      },
    ]);
  }

  function updateOperation(operationId: string, patch: Partial<BooleanOperation>) {
    updateStack(stack.map((entry) => (entry.id === operationId ? { ...entry, ...patch } : entry)));
  }

  function removeOperation(operationId: string) {
    updateStack(stack.filter((entry) => entry.id !== operationId));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Booleans</div>
        <Button className="gap-2" disabled={!hasSources} size="sm" variant="ghost" onClick={addOperation}>
          <Plus className="size-4" />
          Add
        </Button>
      </div>

      {stack.length > 0 ? (
        <div className="space-y-2">
          {stack.map((entry, index) => (
            <div key={entry.id} className="space-y-2 rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <Label className="flex min-w-0 items-center gap-2 text-sm">
                  <Checkbox checked={entry.enabled !== false} onCheckedChange={(checked) => updateOperation(entry.id, { enabled: checked === true })} />
                  <span className="truncate">Operation {index + 1}</span>
                </Label>
                <Button aria-label={`Remove boolean operation ${index + 1}`} className="size-8" size="icon" variant="ghost" onClick={() => removeOperation(entry.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Mode</Label>
                  <Select value={entry.operation} onValueChange={(value) => updateOperation(entry.id, { operation: value as BooleanOperationKind })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {operations.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Source</Label>
                  <Select value={entry.targetObjectId ?? ""} onValueChange={(targetObjectId) => targetObjectId && updateOperation(entry.id, { targetObjectId })}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Object" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {sourceObjects.map((sourceObject) => (
                        <SelectItem key={sourceObject.id} value={sourceObject.id}>
                          {sourceObject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-border p-3 text-xs text-muted-foreground">{hasSources ? "No boolean stack on this object." : "Add another solid primitive to use as a boolean source."}</div>
      )}
    </div>
  );
}
