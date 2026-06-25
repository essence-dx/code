"use client";

import { Eye, LocateFixed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { LookAtBehavior, SceneObject } from "../../types";

interface LookAtBehaviorPanelProps {
  object: SceneObject;
  objects: SceneObject[];
  updateObject: (id: string, updater: (object: SceneObject) => SceneObject) => void;
}

export function LookAtBehaviorPanel({ object, objects, updateObject }: LookAtBehaviorPanelProps) {
  const lookAt = object.lookAt;
  const targetObjects = objects.filter((entry) => entry.id !== object.id && entry.kind !== "group");

  function setLookAt(nextLookAt: LookAtBehavior | undefined) {
    updateObject(object.id, (entry) => ({
      ...entry,
      lookAt: nextLookAt,
    }));
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Look At</div>
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={lookAt?.enabled === true}
          onCheckedChange={(checked) =>
            setLookAt(
              checked === true
                ? {
                    enabled: true,
                    targetKind: lookAt?.targetKind ?? "camera",
                    targetObjectId: lookAt?.targetObjectId,
                  }
                : undefined,
            )
          }
        />
        Face a runtime target
      </Label>

      {lookAt?.enabled === true ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="justify-start gap-2"
              size="sm"
              variant={(lookAt.targetKind ?? "camera") === "camera" ? "default" : "outline"}
              onClick={() =>
                setLookAt({
                  ...lookAt,
                  enabled: true,
                  targetKind: "camera",
                  targetObjectId: undefined,
                })
              }
            >
              <Eye className="size-3.5 shrink-0" />
              Viewer camera
            </Button>
            {targetObjects.map((targetObject) => (
              <Button
                key={targetObject.id}
                className="min-w-0 justify-start gap-2"
                size="sm"
                variant={lookAt.targetKind === "object" && lookAt.targetObjectId === targetObject.id ? "default" : "outline"}
                onClick={() =>
                  setLookAt({
                    ...lookAt,
                    enabled: true,
                    targetKind: "object",
                    targetObjectId: targetObject.id,
                  })
                }
              >
                <LocateFixed className="size-3.5 shrink-0" />
                <span className="truncate">{targetObject.name}</span>
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
