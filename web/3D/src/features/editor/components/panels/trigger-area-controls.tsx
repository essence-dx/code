"use client";

import { Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_TRIGGER_AREA_COOLDOWN_MS, DEFAULT_TRIGGER_AREA_RADIUS, triggerAreaModes } from "../../interactions/trigger-area";
import { useEditorStore } from "../../store/editor-store";
import type { SceneObject, TriggerAreaMode } from "../../types";

const triggerAreaModeLabels: Record<TriggerAreaMode, string> = {
  enter: "Enter",
  inside: "Inside",
  exit: "Exit",
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function TriggerAreaControls({ object, objects }: { object: SceneObject; objects: SceneObject[] }) {
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const triggerArea = object.interaction?.triggerArea;
  const targetObjects = objects.filter((entry) => entry.id !== object.id && entry.kind !== "group");

  return (
    <>
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={triggerArea?.enabled === true}
          onCheckedChange={(checked) =>
            updateInteraction(object.id, {
              triggerArea:
                checked === true
                  ? {
                      enabled: true,
                      mode: triggerArea?.mode ?? "enter",
                      radius: triggerArea?.radius ?? DEFAULT_TRIGGER_AREA_RADIUS,
                      targetObjectId: triggerArea?.targetObjectId,
                      cooldownMs: triggerArea?.cooldownMs ?? DEFAULT_TRIGGER_AREA_COOLDOWN_MS,
                    }
                  : undefined,
            })
          }
        />
        Run by trigger area
      </Label>

      {triggerArea?.enabled === true ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-3 gap-2">
            {triggerAreaModes.map((mode) => (
              <Button
                key={mode}
                className="gap-2"
                size="sm"
                variant={(triggerArea.mode ?? "enter") === mode ? "default" : "outline"}
                onClick={() =>
                  updateInteraction(object.id, {
                    triggerArea: {
                      ...triggerArea,
                      enabled: true,
                      mode,
                    },
                  })
                }
              >
                <Crosshair className="size-3.5 shrink-0" />
                {triggerAreaModeLabels[mode]}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Target</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="justify-start gap-2"
                size="sm"
                variant={!triggerArea.targetObjectId ? "default" : "outline"}
                onClick={() =>
                  updateInteraction(object.id, {
                    triggerArea: {
                      ...triggerArea,
                      enabled: true,
                      targetObjectId: undefined,
                    },
                  })
                }
              >
                <Crosshair className="size-3.5 shrink-0" />
                Viewer camera
              </Button>
              {targetObjects.map((targetObject) => (
                <Button
                  key={targetObject.id}
                  className="min-w-0 justify-start"
                  size="sm"
                  variant={triggerArea.targetObjectId === targetObject.id ? "default" : "outline"}
                  onClick={() =>
                    updateInteraction(object.id, {
                      triggerArea: {
                        ...triggerArea,
                        enabled: true,
                        targetObjectId: targetObject.id,
                      },
                    })
                  }
                >
                  <span className="truncate">{targetObject.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`trigger-area-${object.id}-radius`}>Radius</Label>
              <Input
                id={`trigger-area-${object.id}-radius`}
                min={0.01}
                max={500}
                step={0.1}
                type="number"
                value={triggerArea.radius ?? DEFAULT_TRIGGER_AREA_RADIUS}
                onChange={(event) =>
                  updateInteraction(object.id, {
                    triggerArea: {
                      ...triggerArea,
                      enabled: true,
                      radius: clamp(toNumber(event.target.value, DEFAULT_TRIGGER_AREA_RADIUS), 0.01, 500),
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`trigger-area-${object.id}-cooldown`}>Cooldown ms</Label>
              <Input
                id={`trigger-area-${object.id}-cooldown`}
                min={0}
                max={5000}
                type="number"
                value={triggerArea.cooldownMs ?? DEFAULT_TRIGGER_AREA_COOLDOWN_MS}
                onChange={(event) =>
                  updateInteraction(object.id, {
                    triggerArea: {
                      ...triggerArea,
                      enabled: true,
                      cooldownMs: Math.round(clamp(toNumber(event.target.value, DEFAULT_TRIGGER_AREA_COOLDOWN_MS), 0, 5000)),
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
