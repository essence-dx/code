"use client";

import { Box, Circle, Cylinder, Lock, Shapes } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { resolvePhysicsSettings } from "../../scene/physics-settings";
import type { PhysicsBodyType, PhysicsColliderKind, PhysicsSettings, SceneObject } from "../../types";

const colliderOptions: Array<{ icon: typeof Box; kind: PhysicsColliderKind; label: string }> = [
  { icon: Box, kind: "box", label: "Box" },
  { icon: Circle, kind: "sphere", label: "Sphere" },
  { icon: Cylinder, kind: "capsule", label: "Capsule" },
  { icon: Shapes, kind: "mesh", label: "Mesh" },
];

const bodyTypeOptions: Array<{ icon: typeof Box; kind: PhysicsBodyType; label: string }> = [
  { icon: Box, kind: "dynamic", label: "Dynamic" },
  { icon: Lock, kind: "static", label: "Static" },
  { icon: Circle, kind: "trigger", label: "Trigger" },
];

function firstSliderValue(value: number | readonly number[]) {
  return Array.isArray(value) ? value[0] : value;
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function PhysicsPanel({
  object,
  updateObject,
}: {
  object: SceneObject;
  updateObject: (id: string, updater: (object: SceneObject) => SceneObject) => void;
}) {
  const physics = resolvePhysicsSettings(object);

  function updatePhysics(settings: Partial<PhysicsSettings>) {
    updateObject(object.id, (entry) => ({
      ...entry,
      physics: {
        ...resolvePhysicsSettings(entry),
        ...settings,
      },
    }));
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Physics</div>

      <Label className="flex items-center gap-2 text-sm">
        <Checkbox checked={physics.enabled} onCheckedChange={(checked) => updatePhysics({ enabled: checked === true })} />
        Enable rigid body properties
      </Label>

      {physics.enabled ? (
        <>
          <div className="space-y-2">
            <Label>Body type</Label>
            <div className="grid grid-cols-3 gap-2">
              {bodyTypeOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <Button key={option.kind} className="justify-start gap-2" size="sm" variant={physics.bodyType === option.kind ? "default" : "secondary"} onClick={() => updatePhysics({ bodyType: option.kind })}>
                    <Icon className="size-3.5" />
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Collider</Label>
            <div className="grid grid-cols-2 gap-2">
              {colliderOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <Button key={option.kind} className="justify-start gap-2" size="sm" variant={physics.collider === option.kind ? "default" : "secondary"} onClick={() => updatePhysics({ collider: option.kind })}>
                    <Icon className="size-3.5" />
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`physics-${object.id}-mass`}>Mass</Label>
              <Input
                id={`physics-${object.id}-mass`}
                inputMode="decimal"
                min={0}
                step={0.1}
                type="number"
                value={Number(physics.mass.toFixed(2))}
                onChange={(event) => updatePhysics({ mass: clamp(parseNumber(event.target.value, physics.mass), 0, 1000) })}
              />
            </div>
            <Label className="flex items-end gap-2 pb-2 text-sm">
              <Checkbox checked={physics.gravity} onCheckedChange={(checked) => updatePhysics({ gravity: checked === true })} />
              Gravity
            </Label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Friction</Label>
              <span className="font-mono text-[11px] text-muted-foreground">{Number(physics.friction.toFixed(2))}</span>
            </div>
            <Slider max={1} min={0} step={0.01} value={[physics.friction]} onValueChange={(value) => updatePhysics({ friction: firstSliderValue(value) })} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Bounce</Label>
              <span className="font-mono text-[11px] text-muted-foreground">{Number(physics.restitution.toFixed(2))}</span>
            </div>
            <Slider max={1} min={0} step={0.01} value={[physics.restitution]} onValueChange={(value) => updatePhysics({ restitution: firstSliderValue(value) })} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>Damping</Label>
              <span className="font-mono text-[11px] text-muted-foreground">{Number(physics.damping.toFixed(2))}</span>
            </div>
            <Slider max={1} min={0} step={0.01} value={[physics.damping]} onValueChange={(value) => updatePhysics({ damping: firstSliderValue(value) })} />
          </div>
        </>
      ) : null}
    </div>
  );
}
