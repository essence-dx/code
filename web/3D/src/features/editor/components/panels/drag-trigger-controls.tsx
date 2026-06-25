"use client";

import { MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_DRAG_TRIGGER_COOLDOWN_MS, dragTriggerEvents } from "../../interactions/drag-triggers";
import { useEditorStore } from "../../store/editor-store";
import type { DragTriggerEvent, SceneObject } from "../../types";

const dragTriggerEventLabels: Record<DragTriggerEvent, string> = {
  drag: "Drag",
  drop: "Drop",
  start: "Start",
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function DragTriggerControls({ object }: { object: SceneObject }) {
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const trigger = object.interaction?.dragTrigger;

  return (
    <>
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={trigger?.enabled === true}
          onCheckedChange={(checked) =>
            updateInteraction(object.id, {
              dragTrigger:
                checked === true
                  ? {
                      enabled: true,
                      event: trigger?.event ?? "drop",
                      cooldownMs: trigger?.cooldownMs ?? DEFAULT_DRAG_TRIGGER_COOLDOWN_MS,
                    }
                  : undefined,
            })
          }
        />
        Run by drag/drop
      </Label>

      {trigger?.enabled === true ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-3 gap-2">
            {dragTriggerEvents.map((event) => (
              <Button
                key={event}
                className="gap-2"
                size="sm"
                variant={(trigger.event ?? "drop") === event ? "default" : "outline"}
                onClick={() =>
                  updateInteraction(object.id, {
                    dragTrigger: {
                      ...trigger,
                      enabled: true,
                      event,
                    },
                  })
                }
              >
                <MousePointer2 className="size-3.5 shrink-0" />
                {dragTriggerEventLabels[event]}
              </Button>
            ))}
          </div>

          <div className="space-y-1">
            <Label htmlFor={`drag-trigger-${object.id}-cooldown`}>Cooldown ms</Label>
            <Input
              id={`drag-trigger-${object.id}-cooldown`}
              min={0}
              max={5000}
              type="number"
              value={trigger.cooldownMs ?? DEFAULT_DRAG_TRIGGER_COOLDOWN_MS}
              onChange={(event) =>
                updateInteraction(object.id, {
                  dragTrigger: {
                    ...trigger,
                    enabled: true,
                    cooldownMs: Math.round(clamp(toNumber(event.target.value, DEFAULT_DRAG_TRIGGER_COOLDOWN_MS), 0, 5000)),
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
