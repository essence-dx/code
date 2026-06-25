"use client";

import { CircleDot, Grid3X3, MoveRight, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canHaveCloner, resolveClonerSettings } from "../../scene/cloner-settings";
import type { ClonerMode, ClonerSettings, ClonerStaggerOrder, SceneObject, Vec3 } from "../../types";

const modeOptions: Array<{ icon: typeof MoveRight; label: string; mode: ClonerMode }> = [
  { icon: MoveRight, label: "Linear", mode: "linear" },
  { icon: CircleDot, label: "Radial", mode: "radial" },
  { icon: Grid3X3, label: "Grid", mode: "grid" },
  { icon: Shuffle, label: "Random", mode: "random" },
];

const staggerOrderOptions: Array<{ label: string; order: ClonerStaggerOrder }> = [
  { label: "Forward", order: "forward" },
  { label: "Reverse", order: "reverse" },
  { label: "Center", order: "center" },
  { label: "Random", order: "random" },
];

const axes = ["X", "Y", "Z"] as const;

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value: string, fallback: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(toNumber(value, fallback))));
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function updateVec3(vector: Vec3, index: number, value: number): Vec3 {
  return vector.map((entry, entryIndex) => (entryIndex === index ? value : entry)) as Vec3;
}

function VectorControl({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  label: string;
  max?: number;
  min?: number;
  onChange: (value: Vec3) => void;
  step: number;
  value: Vec3;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        {axes.map((axis, index) => (
          <div key={`${label}-${axis}`} className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{axis}</Label>
            <Input
              inputMode="decimal"
              max={max}
              min={min}
              step={step}
              type="number"
              value={Number(value[index].toFixed(2))}
              onChange={(event) => onChange(updateVec3(value, index, clampNumber(toNumber(event.target.value, value[index]), min ?? -Infinity, max ?? Infinity)))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClonerPanel({
  object,
  updateObject,
}: {
  object: SceneObject;
  updateObject: (id: string, updater: (object: SceneObject) => SceneObject) => void;
}) {
  if (!canHaveCloner(object.kind)) {
    return null;
  }

  const cloner = resolveClonerSettings(object);

  function updateCloner(settings: Partial<ClonerSettings>) {
    updateObject(object.id, (entry) => ({
      ...entry,
      cloner: {
        ...resolveClonerSettings(entry),
        ...settings,
      },
    }));
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Cloner</div>
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox checked={cloner.enabled} onCheckedChange={(checked) => updateCloner({ enabled: checked === true })} />
        Enable clones
      </Label>

      {cloner.enabled ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            {modeOptions.map((option) => {
              const Icon = option.icon;

              return (
                <Button key={option.mode} className="justify-start gap-2" size="sm" variant={cloner.mode === option.mode ? "default" : "secondary"} onClick={() => updateCloner({ mode: option.mode })}>
                  <Icon className="size-3.5" />
                  {option.label}
                </Button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`cloner-${object.id}-count`}>Count</Label>
              <Input
                id={`cloner-${object.id}-count`}
                inputMode="numeric"
                max={200}
                min={1}
                step={1}
                type="number"
                value={cloner.count}
                onChange={(event) => updateCloner({ count: toInteger(event.target.value, cloner.count, 1, 200) })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`cloner-${object.id}-scale`}>Scale step</Label>
              <Input
                id={`cloner-${object.id}-scale`}
                inputMode="decimal"
                max={4}
                min={-0.95}
                step={0.01}
                type="number"
                value={Number(cloner.scaleStep.toFixed(2))}
                onChange={(event) => updateCloner({ scaleStep: clampNumber(toNumber(event.target.value, cloner.scaleStep), -0.95, 4) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`cloner-${object.id}-animation-delay`}>Delay</Label>
              <Input
                id={`cloner-${object.id}-animation-delay`}
                inputMode="decimal"
                max={10}
                min={0}
                step={0.01}
                type="number"
                value={Number(cloner.animationDelay.toFixed(2))}
                onChange={(event) => updateCloner({ animationDelay: clampNumber(toNumber(event.target.value, cloner.animationDelay), 0, 10) })}
              />
            </div>
            <div className="space-y-1">
              <Label>Order</Label>
              <div className="grid grid-cols-2 gap-1">
                {staggerOrderOptions.map((option) => (
                  <Button key={option.order} size="sm" variant={cloner.staggerOrder === option.order ? "default" : "secondary"} onClick={() => updateCloner({ staggerOrder: option.order })}>
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {cloner.mode === "linear" ? <VectorControl label="Offset" step={0.1} value={cloner.offset} onChange={(offset) => updateCloner({ offset })} /> : null}

          {cloner.mode === "radial" ? (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor={`cloner-${object.id}-radius`}>Radius</Label>
                <Input
                  id={`cloner-${object.id}-radius`}
                  inputMode="decimal"
                  min={0}
                  step={0.1}
                  type="number"
                  value={Number(cloner.radialRadius.toFixed(2))}
                  onChange={(event) => updateCloner({ radialRadius: clampNumber(toNumber(event.target.value, cloner.radialRadius), 0, 48) })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`cloner-${object.id}-angle`}>Angle</Label>
                <Input
                  id={`cloner-${object.id}-angle`}
                  inputMode="decimal"
                  max={360}
                  min={-360}
                  step={1}
                  type="number"
                  value={Number(cloner.radialAngle.toFixed(0))}
                  onChange={(event) => updateCloner({ radialAngle: clampNumber(toNumber(event.target.value, cloner.radialAngle), -360, 360) })}
                />
              </div>
            </div>
          ) : null}

          {cloner.mode === "grid" ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {(["gridColumns", "gridRows", "gridLayers"] as const).map((key) => (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={`cloner-${object.id}-${key}`}>{key === "gridColumns" ? "Columns" : key === "gridRows" ? "Rows" : "Layers"}</Label>
                    <Input
                      id={`cloner-${object.id}-${key}`}
                      inputMode="numeric"
                      max={key === "gridLayers" ? 16 : 32}
                      min={1}
                      step={1}
                      type="number"
                      value={cloner[key]}
                      onChange={(event) => updateCloner({ [key]: toInteger(event.target.value, cloner[key], 1, key === "gridLayers" ? 16 : 32) })}
                    />
                  </div>
                ))}
              </div>
              <VectorControl label="Grid gap" min={0} step={0.1} value={cloner.gridGap} onChange={(gridGap) => updateCloner({ gridGap })} />
            </>
          ) : null}

          {cloner.mode === "random" ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`cloner-${object.id}-seed`}>Seed</Label>
                  <Input
                    id={`cloner-${object.id}-seed`}
                    inputMode="numeric"
                    max={999999}
                    min={1}
                    step={1}
                    type="number"
                    value={cloner.randomSeed}
                    onChange={(event) => updateCloner({ randomSeed: toInteger(event.target.value, cloner.randomSeed, 1, 999999) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`cloner-${object.id}-random-scale`}>Random scale</Label>
                  <Input
                    id={`cloner-${object.id}-random-scale`}
                    inputMode="decimal"
                    max={2}
                    min={0}
                    step={0.01}
                    type="number"
                    value={Number(cloner.randomScale.toFixed(2))}
                    onChange={(event) => updateCloner({ randomScale: clampNumber(toNumber(event.target.value, cloner.randomScale), 0, 2) })}
                  />
                </div>
              </div>
              <VectorControl label="Random position" min={0} step={0.1} value={cloner.randomPosition} onChange={(randomPosition) => updateCloner({ randomPosition })} />
              <VectorControl label="Random rotation" min={0} step={0.05} value={cloner.randomRotation} onChange={(randomRotation) => updateCloner({ randomRotation })} />
            </>
          ) : null}

          {cloner.mode !== "random" ? <VectorControl label="Rotation offset" step={0.05} value={cloner.rotationOffset} onChange={(rotationOffset) => updateCloner({ rotationOffset })} /> : null}
        </>
      ) : null}
    </div>
  );
}
