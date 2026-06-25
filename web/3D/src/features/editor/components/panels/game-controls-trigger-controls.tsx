"use client";

import { Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_GAME_CONTROLS_COOLDOWN_MS, DEFAULT_GAME_CONTROLS_DEADZONE, gameControlsDirections } from "../../interactions/game-controls";
import { useEditorStore } from "../../store/editor-store";
import type { GameControlsDirection, SceneObject } from "../../types";

const gameControlsDirectionLabels: Record<GameControlsDirection, string> = {
  any: "Any",
  down: "Down",
  left: "Left",
  primary: "Primary",
  right: "Right",
  secondary: "Secondary",
  up: "Up",
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function GameControlsTriggerControls({ object }: { object: SceneObject }) {
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const trigger = object.interaction?.gameControlsTrigger;

  return (
    <>
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={trigger?.enabled === true}
          onCheckedChange={(checked) =>
            updateInteraction(object.id, {
              gameControlsTrigger:
                checked === true
                  ? {
                      cooldownMs: trigger?.cooldownMs ?? DEFAULT_GAME_CONTROLS_COOLDOWN_MS,
                      deadzone: trigger?.deadzone ?? DEFAULT_GAME_CONTROLS_DEADZONE,
                      direction: trigger?.direction ?? "any",
                      enabled: true,
                    }
                  : undefined,
            })
          }
        />
        Run on game controls
      </Label>

      {trigger?.enabled === true ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-2 gap-2">
            {gameControlsDirections.map((direction) => (
              <Button
                key={direction}
                className="justify-start gap-2"
                size="sm"
                variant={(trigger.direction ?? "any") === direction ? "default" : "outline"}
                onClick={() =>
                  updateInteraction(object.id, {
                    gameControlsTrigger: {
                      ...trigger,
                      direction,
                      enabled: true,
                    },
                  })
                }
              >
                <Gamepad2 className="size-3.5 shrink-0" />
                {gameControlsDirectionLabels[direction]}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`game-controls-${object.id}-cooldown`}>Cooldown ms</Label>
              <Input
                id={`game-controls-${object.id}-cooldown`}
                min={0}
                max={5000}
                type="number"
                value={trigger.cooldownMs ?? DEFAULT_GAME_CONTROLS_COOLDOWN_MS}
                onChange={(inputEvent) =>
                  updateInteraction(object.id, {
                    gameControlsTrigger: {
                      ...trigger,
                      cooldownMs: Math.round(clamp(toNumber(inputEvent.target.value, DEFAULT_GAME_CONTROLS_COOLDOWN_MS), 0, 5000)),
                      enabled: true,
                    },
                  })
                }
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor={`game-controls-${object.id}-deadzone`}>Deadzone</Label>
              <Input
                id={`game-controls-${object.id}-deadzone`}
                max={1}
                min={0}
                step={0.05}
                type="number"
                value={trigger.deadzone ?? DEFAULT_GAME_CONTROLS_DEADZONE}
                onChange={(inputEvent) =>
                  updateInteraction(object.id, {
                    gameControlsTrigger: {
                      ...trigger,
                      deadzone: clamp(toNumber(inputEvent.target.value, DEFAULT_GAME_CONTROLS_DEADZONE), 0, 1),
                      enabled: true,
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
