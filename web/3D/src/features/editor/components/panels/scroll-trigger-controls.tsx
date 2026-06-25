"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_SCROLL_TRIGGER_COOLDOWN_MS, DEFAULT_SCROLL_TRIGGER_MIN_DELTA, scrollTriggerDirections } from "../../interactions/scroll-triggers";
import { useEditorStore } from "../../store/editor-store";
import type { SceneObject, ScrollTriggerDirection } from "../../types";

const scrollDirectionLabels: Record<ScrollTriggerDirection, string> = {
  any: "Any",
  down: "Down",
  up: "Up",
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function ScrollTriggerControls({ object }: { object: SceneObject }) {
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const scrollTrigger = object.interaction?.scrollTrigger;

  return (
    <>
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={scrollTrigger?.enabled === true}
          onCheckedChange={(checked) =>
            updateInteraction(object.id, {
              scrollTrigger:
                checked === true
                  ? {
                      enabled: true,
                      direction: scrollTrigger?.direction ?? "any",
                      minDelta: scrollTrigger?.minDelta ?? DEFAULT_SCROLL_TRIGGER_MIN_DELTA,
                      cooldownMs: scrollTrigger?.cooldownMs ?? DEFAULT_SCROLL_TRIGGER_COOLDOWN_MS,
                    }
                  : undefined,
            })
          }
        />
        Run on scroll
      </Label>

      {scrollTrigger?.enabled === true ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-3 gap-2">
            {scrollTriggerDirections.map((direction) => (
              <Button
                key={direction}
                size="sm"
                variant={(scrollTrigger.direction ?? "any") === direction ? "default" : "outline"}
                onClick={() =>
                  updateInteraction(object.id, {
                    scrollTrigger: {
                      ...scrollTrigger,
                      enabled: true,
                      direction,
                    },
                  })
                }
              >
                {scrollDirectionLabels[direction]}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`scroll-trigger-${object.id}-min-delta`}>Minimum delta</Label>
              <Input
                id={`scroll-trigger-${object.id}-min-delta`}
                min={0}
                max={1000}
                type="number"
                value={scrollTrigger.minDelta ?? DEFAULT_SCROLL_TRIGGER_MIN_DELTA}
                onChange={(event) =>
                  updateInteraction(object.id, {
                    scrollTrigger: {
                      ...scrollTrigger,
                      enabled: true,
                      minDelta: clamp(toNumber(event.target.value, DEFAULT_SCROLL_TRIGGER_MIN_DELTA), 0, 1000),
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`scroll-trigger-${object.id}-cooldown`}>Cooldown ms</Label>
              <Input
                id={`scroll-trigger-${object.id}-cooldown`}
                min={0}
                max={5000}
                type="number"
                value={scrollTrigger.cooldownMs ?? DEFAULT_SCROLL_TRIGGER_COOLDOWN_MS}
                onChange={(event) =>
                  updateInteraction(object.id, {
                    scrollTrigger: {
                      ...scrollTrigger,
                      enabled: true,
                      cooldownMs: Math.round(clamp(toNumber(event.target.value, DEFAULT_SCROLL_TRIGGER_COOLDOWN_MS), 0, 5000)),
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
