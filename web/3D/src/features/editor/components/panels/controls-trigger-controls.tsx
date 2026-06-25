"use client";

import { Orbit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { controlsTriggerEvents, DEFAULT_CONTROLS_TRIGGER_COOLDOWN_MS } from "../../interactions/controls-triggers";
import { useEditorStore } from "../../store/editor-store";
import type { ControlsTriggerEvent, SceneObject } from "../../types";

const controlsTriggerEventLabels: Record<ControlsTriggerEvent, string> = {
  change: "Change",
  end: "End",
  start: "Start",
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function ControlsTriggerControls({ object }: { object: SceneObject }) {
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const trigger = object.interaction?.controlsTrigger;

  return (
    <>
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={trigger?.enabled === true}
          onCheckedChange={(checked) =>
            updateInteraction(object.id, {
              controlsTrigger:
                checked === true
                  ? {
                      enabled: true,
                      event: trigger?.event ?? "start",
                      cooldownMs: trigger?.cooldownMs ?? DEFAULT_CONTROLS_TRIGGER_COOLDOWN_MS,
                    }
                  : undefined,
            })
          }
        />
        Run on controls
      </Label>

      {trigger?.enabled === true ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-3 gap-2">
            {controlsTriggerEvents.map((event) => (
              <Button
                key={event}
                className="gap-2"
                size="sm"
                variant={(trigger.event ?? "start") === event ? "default" : "outline"}
                onClick={() =>
                  updateInteraction(object.id, {
                    controlsTrigger: {
                      ...trigger,
                      enabled: true,
                      event,
                    },
                  })
                }
              >
                <Orbit className="size-3.5 shrink-0" />
                {controlsTriggerEventLabels[event]}
              </Button>
            ))}
          </div>

          <div className="space-y-1">
            <Label htmlFor={`controls-trigger-${object.id}-cooldown`}>Cooldown ms</Label>
            <Input
              id={`controls-trigger-${object.id}-cooldown`}
              min={0}
              max={5000}
              type="number"
              value={trigger.cooldownMs ?? DEFAULT_CONTROLS_TRIGGER_COOLDOWN_MS}
              onChange={(inputEvent) =>
                updateInteraction(object.id, {
                  controlsTrigger: {
                    ...trigger,
                    enabled: true,
                    cooldownMs: Math.round(clamp(toNumber(inputEvent.target.value, DEFAULT_CONTROLS_TRIGGER_COOLDOWN_MS), 0, 5000)),
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
