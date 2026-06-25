"use client";

import { MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_POINTER_TRIGGER_COOLDOWN_MS, pointerTriggerEvents } from "../../interactions/pointer-triggers";
import { useEditorStore } from "../../store/editor-store";
import type { PointerTriggerEvent, SceneObject } from "../../types";

const pointerTriggerEventLabels: Record<PointerTriggerEvent, string> = {
  click: "Click",
  down: "Down",
  hoverEnter: "Hover in",
  hoverExit: "Hover out",
  press: "Press",
  up: "Up",
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function PointerTriggerControls({ object }: { object: SceneObject }) {
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const trigger = object.interaction?.pointerTrigger;

  return (
    <>
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={trigger?.enabled === true}
          onCheckedChange={(checked) =>
            updateInteraction(object.id, {
              pointerTrigger:
                checked === true
                  ? {
                      enabled: true,
                      event: trigger?.event ?? "click",
                      cooldownMs: trigger?.cooldownMs ?? DEFAULT_POINTER_TRIGGER_COOLDOWN_MS,
                    }
                  : undefined,
            })
          }
        />
        Run by pointer
      </Label>

      {trigger?.enabled === true ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-2 gap-2">
            {pointerTriggerEvents.map((event) => (
              <Button
                key={event}
                className="justify-start gap-2"
                size="sm"
                variant={(trigger.event ?? "click") === event ? "default" : "outline"}
                onClick={() =>
                  updateInteraction(object.id, {
                    pointerTrigger: {
                      ...trigger,
                      enabled: true,
                      event,
                    },
                  })
                }
              >
                <MousePointer2 className="size-3.5 shrink-0" />
                {pointerTriggerEventLabels[event]}
              </Button>
            ))}
          </div>

          <div className="space-y-1">
            <Label htmlFor={`pointer-trigger-${object.id}-cooldown`}>Cooldown ms</Label>
            <Input
              id={`pointer-trigger-${object.id}-cooldown`}
              min={0}
              max={5000}
              type="number"
              value={trigger.cooldownMs ?? DEFAULT_POINTER_TRIGGER_COOLDOWN_MS}
              onChange={(inputEvent) =>
                updateInteraction(object.id, {
                  pointerTrigger: {
                    ...trigger,
                    enabled: true,
                    cooldownMs: Math.round(clamp(toNumber(inputEvent.target.value, DEFAULT_POINTER_TRIGGER_COOLDOWN_MS), 0, 5000)),
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
