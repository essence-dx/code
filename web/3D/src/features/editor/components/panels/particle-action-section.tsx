"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveParticleSettings } from "../../scene/particle-settings";
import { useEditorStore } from "../../store/editor-store";
import type {
  ParticleActionOperation,
  ParticleSettings,
  SceneObject,
} from "../../types";

const particleActionOperations: ParticleActionOperation[] = [
  "toggle",
  "start",
  "stop",
  "set",
];
const particleControls: Array<{
  id: keyof ParticleSettings;
  integer?: boolean;
  label: string;
  max: number;
  min: number;
  step: number;
}> = [
  { id: "count", integer: true, label: "Count", min: 1, max: 2000, step: 1 },
  { id: "spread", label: "Spread", min: 0.1, max: 24, step: 0.1 },
  { id: "speed", label: "Speed", min: 0, max: 8, step: 0.05 },
  { id: "size", label: "Size", min: 0.01, max: 1, step: 0.01 },
];

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseParticleValue(
  value: string,
  fallback: number,
  control: (typeof particleControls)[number],
) {
  const parsed = clampNumber(
    toNumber(value, fallback),
    control.min,
    control.max,
  );

  return control.integer ? Math.round(parsed) : parsed;
}

export function ParticleActionSection({ object }: { object: SceneObject }) {
  const objects = useEditorStore((state) => state.document.objects);
  const updateInteraction = useEditorStore((state) => state.updateInteraction);
  const particles = useMemo(
    () => objects.filter((entry) => entry.kind === "particles"),
    [objects],
  );
  const action = object.interaction?.particleAction;
  const selectedParticle = particles.find(
    (entry) => entry.id === action?.targetObjectId,
  );
  const selectedSettings = selectedParticle
    ? resolveParticleSettings(selectedParticle)
    : null;

  function chooseParticle(target: SceneObject) {
    const settings = resolveParticleSettings(target);

    updateInteraction(object.id, {
      particleAction: {
        targetObjectId: target.id,
        operation: action?.operation ?? "toggle",
        count: action?.count ?? settings.count,
        spread: action?.spread ?? settings.spread,
        speed: action?.speed ?? settings.speed,
        size: action?.size ?? settings.size,
      },
    });
  }

  function updateParticleAction(settings: Partial<ParticleSettings>) {
    if (!selectedParticle) {
      return;
    }

    const baseSettings =
      selectedSettings ?? resolveParticleSettings(selectedParticle);

    updateInteraction(object.id, {
      particleAction: {
        targetObjectId: selectedParticle.id,
        operation: action?.operation ?? "set",
        count: action?.count ?? baseSettings.count,
        spread: action?.spread ?? baseSettings.spread,
        speed: action?.speed ?? baseSettings.speed,
        size: action?.size ?? baseSettings.size,
        ...settings,
      },
    });
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Particle action</Label>
          {action?.targetObjectId ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                updateInteraction(object.id, { particleAction: undefined })
              }
            >
              Clear
            </Button>
          ) : null}
        </div>
        {particles.length ? (
          <div className="grid grid-cols-2 gap-2">
            {particles.map((target) => (
              <Button
                key={target.id}
                className="min-w-0 justify-start gap-2"
                size="sm"
                variant={
                  target.id === action?.targetObjectId ? "default" : "outline"
                }
                onClick={() => chooseParticle(target)}
              >
                <Sparkles className="size-3.5 shrink-0" />
                <span className="truncate">{target.name}</span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            Add a particle object before assigning a particle action.
          </div>
        )}
      </div>

      {selectedParticle && selectedSettings ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="size-3.5 shrink-0" />
            <span className="min-w-0 truncate">{selectedParticle.name}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {particleActionOperations.map((operation) => (
              <Button
                key={operation}
                size="sm"
                variant={
                  (action?.operation ?? "toggle") === operation
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  updateInteraction(object.id, {
                    particleAction: {
                      targetObjectId: selectedParticle.id,
                      operation,
                      count: action?.count ?? selectedSettings.count,
                      spread: action?.spread ?? selectedSettings.spread,
                      speed: action?.speed ?? selectedSettings.speed,
                      size: action?.size ?? selectedSettings.size,
                    },
                  })
                }
              >
                {operation}
              </Button>
            ))}
          </div>
          {(action?.operation ?? "toggle") === "set" ? (
            <div className="grid grid-cols-2 gap-2">
              {particleControls.map((control) => {
                const value =
                  action?.[control.id] ?? selectedSettings[control.id];

                return (
                  <div key={control.id} className="space-y-1">
                    <Label
                      htmlFor={`particle-action-${object.id}-${control.id}`}
                    >
                      {control.label}
                    </Label>
                    <Input
                      id={`particle-action-${object.id}-${control.id}`}
                      inputMode="decimal"
                      max={control.max}
                      min={control.min}
                      step={control.step}
                      type="number"
                      value={Number(value.toFixed(control.integer ? 0 : 2))}
                      onChange={(event) =>
                        updateParticleAction({
                          [control.id]: parseParticleValue(
                            event.target.value,
                            value,
                            control,
                          ),
                        } as Partial<ParticleSettings>)
                      }
                    />
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
