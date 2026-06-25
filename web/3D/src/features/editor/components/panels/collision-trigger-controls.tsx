"use client";

import { Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_COLLISION_TRIGGER_COOLDOWN_MS, collisionTriggerModes } from "../../interactions/collision-triggers";
import { canHavePhysics } from "../../scene/physics-settings";
import { useEditorStore } from "../../store/editor-store";
import type { CollisionTriggerMode, SceneObject } from "../../types";

const collisionTriggerModeLabels: Record<CollisionTriggerMode, string> = {
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

export function CollisionTriggerControls({ object, objects }: { object: SceneObject; objects: SceneObject[] }) {
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const trigger = object.interaction?.collisionTrigger;
  const targetObjects = objects.filter((entry) => entry.id !== object.id && canHavePhysics(entry.kind));

  return (
    <>
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={trigger?.enabled === true}
          onCheckedChange={(checked) =>
            updateInteraction(object.id, {
              collisionTrigger:
                checked === true
                  ? {
                      enabled: true,
                      mode: trigger?.mode ?? "enter",
                      targetObjectId: trigger?.targetObjectId,
                      cooldownMs: trigger?.cooldownMs ?? DEFAULT_COLLISION_TRIGGER_COOLDOWN_MS,
                    }
                  : undefined,
            })
          }
        />
        Run by collision
      </Label>

      {trigger?.enabled === true ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-3 gap-2">
            {collisionTriggerModes.map((mode) => (
              <Button
                key={mode}
                className="gap-2"
                size="sm"
                variant={(trigger.mode ?? "enter") === mode ? "default" : "outline"}
                onClick={() =>
                  updateInteraction(object.id, {
                    collisionTrigger: {
                      ...trigger,
                      enabled: true,
                      mode,
                    },
                  })
                }
              >
                <Box className="size-3.5 shrink-0" />
                {collisionTriggerModeLabels[mode]}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Target</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="justify-start gap-2"
                size="sm"
                variant={!trigger.targetObjectId ? "default" : "outline"}
                onClick={() =>
                  updateInteraction(object.id, {
                    collisionTrigger: {
                      ...trigger,
                      enabled: true,
                      targetObjectId: undefined,
                    },
                  })
                }
              >
                <Box className="size-3.5 shrink-0" />
                Any object
              </Button>
              {targetObjects.map((targetObject) => (
                <Button
                  key={targetObject.id}
                  className="min-w-0 justify-start gap-2"
                  size="sm"
                  variant={trigger.targetObjectId === targetObject.id ? "default" : "outline"}
                  onClick={() =>
                    updateInteraction(object.id, {
                      collisionTrigger: {
                        ...trigger,
                        enabled: true,
                        targetObjectId: targetObject.id,
                      },
                    })
                  }
                >
                  <Box className="size-3.5 shrink-0" />
                  <span className="truncate">{targetObject.name}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`collision-trigger-${object.id}-cooldown`}>Cooldown ms</Label>
            <Input
              id={`collision-trigger-${object.id}-cooldown`}
              min={0}
              max={5000}
              type="number"
              value={trigger.cooldownMs ?? DEFAULT_COLLISION_TRIGGER_COOLDOWN_MS}
              onChange={(event) =>
                updateInteraction(object.id, {
                  collisionTrigger: {
                    ...trigger,
                    enabled: true,
                    cooldownMs: Math.round(clamp(toNumber(event.target.value, DEFAULT_COLLISION_TRIGGER_COOLDOWN_MS), 0, 5000)),
                  },
                })
              }
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
