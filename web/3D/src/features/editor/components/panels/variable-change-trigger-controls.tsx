"use client";

import { Hash, Palette, ToggleLeft, Type as TypeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_VARIABLE_CHANGE_TRIGGER_COOLDOWN_MS } from "../../interactions/variable-change-triggers";
import { useEditorStore } from "../../store/editor-store";
import type { SceneObject, SceneVariable } from "../../types";

const variableIcons = {
  number: Hash,
  boolean: ToggleLeft,
  text: TypeIcon,
  color: Palette,
} as const;

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function VariableChangeTriggerControls({ object, variables }: { object: SceneObject; variables: SceneVariable[] }) {
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const trigger = object.interaction?.variableChangeTrigger;

  return (
    <>
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={trigger?.enabled === true}
          onCheckedChange={(checked) =>
            updateInteraction(object.id, {
              variableChangeTrigger:
                checked === true
                  ? {
                      enabled: true,
                      variableId: trigger?.variableId,
                      cooldownMs: trigger?.cooldownMs ?? DEFAULT_VARIABLE_CHANGE_TRIGGER_COOLDOWN_MS,
                    }
                  : undefined,
            })
          }
        />
        Run on variable change
      </Label>

      {trigger?.enabled === true ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="justify-start"
              size="sm"
              variant={!trigger.variableId ? "default" : "outline"}
              onClick={() =>
                updateInteraction(object.id, {
                  variableChangeTrigger: {
                    ...trigger,
                    enabled: true,
                    variableId: undefined,
                  },
                })
              }
            >
              Any variable
            </Button>
            {variables.map((variable) => {
              const Icon = variableIcons[variable.type];

              return (
                <Button
                  key={variable.id}
                  className="min-w-0 justify-start gap-2"
                  size="sm"
                  variant={trigger.variableId === variable.id ? "default" : "outline"}
                  onClick={() =>
                    updateInteraction(object.id, {
                      variableChangeTrigger: {
                        ...trigger,
                        enabled: true,
                        variableId: variable.id,
                      },
                    })
                  }
                >
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">{variable.name}</span>
                </Button>
              );
            })}
          </div>

          {variables.length ? null : <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">Create a scene variable before targeting one.</div>}

          <div className="space-y-1">
            <Label htmlFor={`variable-change-trigger-${object.id}-cooldown`}>Cooldown ms</Label>
            <Input
              id={`variable-change-trigger-${object.id}-cooldown`}
              min={0}
              max={5000}
              type="number"
              value={trigger.cooldownMs ?? DEFAULT_VARIABLE_CHANGE_TRIGGER_COOLDOWN_MS}
              onChange={(event) =>
                updateInteraction(object.id, {
                  variableChangeTrigger: {
                    ...trigger,
                    enabled: true,
                    cooldownMs: Math.round(clamp(toNumber(event.target.value, DEFAULT_VARIABLE_CHANGE_TRIGGER_COOLDOWN_MS), 0, 5000)),
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
