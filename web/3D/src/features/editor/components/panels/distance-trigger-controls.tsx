"use client";

import { Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_DISTANCE_TRIGGER_COOLDOWN_MS,
  DEFAULT_DISTANCE_TRIGGER_THRESHOLD,
  distanceTriggerModes,
} from "../../interactions/distance-triggers";
import { useEditorStore } from "../../store/editor-store";
import type { DistanceTriggerMode, SceneObject } from "../../types";

const distanceTriggerModeLabels: Record<DistanceTriggerMode, string> = {
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

export function DistanceTriggerControls({ object }: { object: SceneObject }) {
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const trigger = object.interaction?.distanceTrigger;

  return (
    <>
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={trigger?.enabled === true}
          onCheckedChange={(checked) =>
            updateInteraction(object.id, {
              distanceTrigger:
                checked === true
                  ? {
                      enabled: true,
                      mode: trigger?.mode ?? "enter",
                      threshold: trigger?.threshold ?? DEFAULT_DISTANCE_TRIGGER_THRESHOLD,
                      cooldownMs: trigger?.cooldownMs ?? DEFAULT_DISTANCE_TRIGGER_COOLDOWN_MS,
                    }
                  : undefined,
            })
          }
        />
        Run by distance
      </Label>

      {trigger?.enabled === true ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-3 gap-2">
            {distanceTriggerModes.map((mode) => (
              <Button
                key={mode}
                className="gap-2"
                size="sm"
                variant={(trigger.mode ?? "enter") === mode ? "default" : "outline"}
                onClick={() =>
                  updateInteraction(object.id, {
                    distanceTrigger: {
                      ...trigger,
                      enabled: true,
                      mode,
                    },
                  })
                }
              >
                <Radar className="size-3.5 shrink-0" />
                {distanceTriggerModeLabels[mode]}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`distance-trigger-${object.id}-threshold`}>Distance</Label>
              <Input
                id={`distance-trigger-${object.id}-threshold`}
                min={0.01}
                max={500}
                step={0.1}
                type="number"
                value={trigger.threshold ?? DEFAULT_DISTANCE_TRIGGER_THRESHOLD}
                onChange={(event) =>
                  updateInteraction(object.id, {
                    distanceTrigger: {
                      ...trigger,
                      enabled: true,
                      threshold: clamp(toNumber(event.target.value, DEFAULT_DISTANCE_TRIGGER_THRESHOLD), 0.01, 500),
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`distance-trigger-${object.id}-cooldown`}>Cooldown ms</Label>
              <Input
                id={`distance-trigger-${object.id}-cooldown`}
                min={0}
                max={5000}
                type="number"
                value={trigger.cooldownMs ?? DEFAULT_DISTANCE_TRIGGER_COOLDOWN_MS}
                onChange={(event) =>
                  updateInteraction(object.id, {
                    distanceTrigger: {
                      ...trigger,
                      enabled: true,
                      cooldownMs: Math.round(clamp(toNumber(event.target.value, DEFAULT_DISTANCE_TRIGGER_COOLDOWN_MS), 0, 5000)),
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
