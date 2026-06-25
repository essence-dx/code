"use client";

import { Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_STATE_CHANGE_TRIGGER_COOLDOWN_MS } from "../../interactions/state-change-triggers";
import { useEditorStore } from "../../store/editor-store";
import type { SceneObject, SceneState } from "../../types";

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function StateChangeTriggerControls({ object, sceneStates }: { object: SceneObject; sceneStates: SceneState[] }) {
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const trigger = object.interaction?.stateChangeTrigger;

  return (
    <>
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={trigger?.enabled === true}
          onCheckedChange={(checked) =>
            updateInteraction(object.id, {
              stateChangeTrigger:
                checked === true
                  ? {
                      enabled: true,
                      targetStateId: trigger?.targetStateId,
                      cooldownMs: trigger?.cooldownMs ?? DEFAULT_STATE_CHANGE_TRIGGER_COOLDOWN_MS,
                    }
                  : undefined,
            })
          }
        />
        Run on state change
      </Label>

      {trigger?.enabled === true ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="justify-start gap-2"
              size="sm"
              variant={!trigger.targetStateId ? "default" : "outline"}
              onClick={() =>
                updateInteraction(object.id, {
                  stateChangeTrigger: {
                    ...trigger,
                    enabled: true,
                    targetStateId: undefined,
                  },
                })
              }
            >
              <Layers3 className="size-3.5 shrink-0" />
              Any state
            </Button>
            {sceneStates.map((sceneState) => (
              <Button
                key={sceneState.id}
                className="min-w-0 justify-start gap-2"
                size="sm"
                variant={trigger.targetStateId === sceneState.id ? "default" : "outline"}
                onClick={() =>
                  updateInteraction(object.id, {
                    stateChangeTrigger: {
                      ...trigger,
                      enabled: true,
                      targetStateId: sceneState.id,
                    },
                  })
                }
              >
                <Layers3 className="size-3.5 shrink-0" />
                <span className="truncate">{sceneState.name}</span>
              </Button>
            ))}
          </div>

          {sceneStates.length ? null : <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">Capture a scene state before targeting one.</div>}

          <div className="space-y-1">
            <Label htmlFor={`state-change-trigger-${object.id}-cooldown`}>Cooldown ms</Label>
            <Input
              id={`state-change-trigger-${object.id}-cooldown`}
              min={0}
              max={5000}
              type="number"
              value={trigger.cooldownMs ?? DEFAULT_STATE_CHANGE_TRIGGER_COOLDOWN_MS}
              onChange={(event) =>
                updateInteraction(object.id, {
                  stateChangeTrigger: {
                    ...trigger,
                    enabled: true,
                    cooldownMs: Math.round(clamp(toNumber(event.target.value, DEFAULT_STATE_CHANGE_TRIGGER_COOLDOWN_MS), 0, 5000)),
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
