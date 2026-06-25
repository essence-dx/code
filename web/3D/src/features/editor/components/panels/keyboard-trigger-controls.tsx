"use client";

import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_KEYBOARD_TRIGGER_COOLDOWN_MS, DEFAULT_KEYBOARD_TRIGGER_EVENT, keyboardTriggerEvents } from "../../interactions/keyboard-triggers";
import { useEditorStore } from "../../store/editor-store";
import type { KeyboardTriggerEvent, SceneObject } from "../../types";

const keyboardTriggerEventLabels: Record<KeyboardTriggerEvent, string> = {
  down: "Key down",
  press: "Key press",
  up: "Key up",
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function KeyboardTriggerControls({ object }: { object: SceneObject }) {
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const trigger = object.interaction?.keyboardTrigger;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`keyboard-trigger-${object.id}`}>Keyboard trigger</Label>
        {trigger?.key ? (
          <Button size="sm" variant="ghost" onClick={() => updateInteraction(object.id, { keyboardTrigger: undefined })}>
            Clear
          </Button>
        ) : null}
      </div>
      <div className="grid grid-cols-[20px_1fr] items-center gap-2">
        <Keyboard className="size-4 text-muted-foreground" />
        <Input
          id={`keyboard-trigger-${object.id}`}
          placeholder="Space"
          value={trigger?.key ?? ""}
          onChange={(event) =>
            updateInteraction(object.id, {
              keyboardTrigger: event.target.value.trim()
                ? {
                    key: event.target.value,
                    event: trigger?.event ?? DEFAULT_KEYBOARD_TRIGGER_EVENT,
                    cooldownMs: trigger?.cooldownMs ?? DEFAULT_KEYBOARD_TRIGGER_COOLDOWN_MS,
                  }
                : undefined,
            })
          }
        />
      </div>

      {trigger?.key ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-3 gap-2">
            {keyboardTriggerEvents.map((event) => (
              <Button
                key={event}
                className="justify-start gap-2"
                size="sm"
                variant={(trigger.event ?? DEFAULT_KEYBOARD_TRIGGER_EVENT) === event ? "default" : "outline"}
                onClick={() =>
                  updateInteraction(object.id, {
                    keyboardTrigger: {
                      ...trigger,
                      event,
                    },
                  })
                }
              >
                <Keyboard className="size-3.5 shrink-0" />
                {keyboardTriggerEventLabels[event]}
              </Button>
            ))}
          </div>

          {trigger.event === "press" ? (
            <div className="space-y-1">
              <Label htmlFor={`keyboard-trigger-${object.id}-cooldown`}>Repeat ms</Label>
              <Input
                id={`keyboard-trigger-${object.id}-cooldown`}
                min={0}
                max={5000}
                type="number"
                value={trigger.cooldownMs ?? DEFAULT_KEYBOARD_TRIGGER_COOLDOWN_MS}
                onChange={(inputEvent) =>
                  updateInteraction(object.id, {
                    keyboardTrigger: {
                      ...trigger,
                      cooldownMs: Math.round(clamp(toNumber(inputEvent.target.value, DEFAULT_KEYBOARD_TRIGGER_COOLDOWN_MS), 0, 5000)),
                    },
                  })
                }
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
