"use client";

import { RadioTower } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_NETWORK_TRIGGER_COOLDOWN_MS, networkTriggerEvents } from "../../interactions/network-triggers";
import { useEditorStore } from "../../store/editor-store";
import type { NetworkTriggerEvent, SceneObject } from "../../types";

const networkTriggerEventLabels: Record<NetworkTriggerEvent, string> = {
  apiUpdated: "API updated",
  webhookCalled: "Webhook called",
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function NetworkTriggerControls({ object }: { object: SceneObject }) {
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const trigger = object.interaction?.networkTrigger;

  return (
    <>
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={trigger?.enabled === true}
          onCheckedChange={(checked) =>
            updateInteraction(object.id, {
              networkTrigger:
                checked === true
                  ? {
                      cooldownMs: trigger?.cooldownMs ?? DEFAULT_NETWORK_TRIGGER_COOLDOWN_MS,
                      enabled: true,
                      event: trigger?.event ?? "apiUpdated",
                    }
                  : undefined,
            })
          }
        />
        Run after network
      </Label>

      {trigger?.enabled === true ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-2 gap-2">
            {networkTriggerEvents.map((event) => (
              <Button
                key={event}
                className="justify-start gap-2"
                size="sm"
                variant={(trigger.event ?? "apiUpdated") === event ? "default" : "outline"}
                onClick={() =>
                  updateInteraction(object.id, {
                    networkTrigger: {
                      ...trigger,
                      enabled: true,
                      event,
                    },
                  })
                }
              >
                <RadioTower className="size-3.5 shrink-0" />
                {networkTriggerEventLabels[event]}
              </Button>
            ))}
          </div>

          <div className="space-y-1">
            <Label htmlFor={`network-trigger-${object.id}-cooldown`}>Cooldown ms</Label>
            <Input
              id={`network-trigger-${object.id}-cooldown`}
              min={0}
              max={5000}
              type="number"
              value={trigger.cooldownMs ?? DEFAULT_NETWORK_TRIGGER_COOLDOWN_MS}
              onChange={(inputEvent) =>
                updateInteraction(object.id, {
                  networkTrigger: {
                    ...trigger,
                    cooldownMs: Math.round(clamp(toNumber(inputEvent.target.value, DEFAULT_NETWORK_TRIGGER_COOLDOWN_MS), 0, 5000)),
                    enabled: true,
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
