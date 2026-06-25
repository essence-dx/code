"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { resolveSculptSettings } from "../../scene/sculpting";
import type { SceneObject, SculptBrushMode, SculptSettings, Vec3 } from "../../types";

type UpdateObject = (id: string, updater: (object: SceneObject) => SceneObject) => void;

const brushModes: Array<{ label: string; value: SculptBrushMode }> = [
  { label: "Inflate", value: "inflate" },
  { label: "Smooth", value: "smooth" },
  { label: "Flatten", value: "flatten" },
  { label: "Grab", value: "grab" },
];

const axes = ["X", "Y", "Z"] as const;

function firstSliderValue(value: number | readonly number[]) {
  return Array.isArray(value) ? value[0] : value;
}

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function updateVec3(value: Vec3, index: number, nextValue: number): Vec3 {
  const next: Vec3 = [...value];
  next[index] = nextValue;
  return next;
}

export function SculptingPanel({ object, updateObject }: { object: SceneObject; updateObject: UpdateObject }) {
  const settings = resolveSculptSettings(object);

  function updateSculpt(updates: Partial<SculptSettings>) {
    updateObject(object.id, (entry) => ({
      ...entry,
      sculpt: {
        ...settings,
        ...entry.sculpt,
        ...updates,
      },
    }));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sculpt</div>
        <Label className="flex items-center gap-2 text-sm">
          <Checkbox checked={settings.enabled} onCheckedChange={(checked) => updateSculpt({ enabled: checked === true })} />
          Enabled
        </Label>
      </div>

      <div className="grid grid-cols-2 gap-1">
        {brushModes.map((mode) => (
          <Button key={mode.value} className="h-8 justify-start px-2 text-xs" size="sm" type="button" variant={settings.brushMode === mode.value ? "default" : "outline"} onClick={() => updateSculpt({ brushMode: mode.value, enabled: true })}>
            {mode.label}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Radius</Label>
          <span className="font-mono text-[11px] text-muted-foreground">{Number(settings.radius.toFixed(2))}</span>
        </div>
        <Slider max={12} min={0.05} step={0.01} value={[settings.radius]} onValueChange={(value) => updateSculpt({ enabled: true, radius: firstSliderValue(value) })} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Strength</Label>
          <span className="font-mono text-[11px] text-muted-foreground">{Number(settings.strength.toFixed(2))}</span>
        </div>
        <Slider max={2} min={-2} step={0.01} value={[settings.strength]} onValueChange={(value) => updateSculpt({ enabled: true, strength: firstSliderValue(value) })} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Falloff</Label>
          <span className="font-mono text-[11px] text-muted-foreground">{Number(settings.falloff.toFixed(2))}</span>
        </div>
        <Slider max={4} min={0.25} step={0.05} value={[settings.falloff]} onValueChange={(value) => updateSculpt({ enabled: true, falloff: firstSliderValue(value) })} />
      </div>

      <div className="space-y-2">
        <Label>Brush center</Label>
        <div className="grid grid-cols-3 gap-2">
          {axes.map((axis, index) => (
            <Input
              key={axis}
              aria-label={`Brush center ${axis}`}
              inputMode="decimal"
              step={0.05}
              type="number"
              value={Number(settings.center[index].toFixed(2))}
              onChange={(event) => updateSculpt({ center: updateVec3(settings.center, index, clamp(toNumber(event.target.value, settings.center[index]), -24, 24)), enabled: true })}
            />
          ))}
        </div>
      </div>

      {settings.brushMode === "grab" ? (
        <div className="space-y-2">
          <Label>Grab offset</Label>
          <div className="grid grid-cols-3 gap-2">
            {axes.map((axis, index) => (
              <Input
                key={axis}
                aria-label={`Grab offset ${axis}`}
                inputMode="decimal"
                step={0.05}
                type="number"
                value={Number(settings.grabOffset[index].toFixed(2))}
                onChange={(event) => updateSculpt({ enabled: true, grabOffset: updateVec3(settings.grabOffset, index, clamp(toNumber(event.target.value, settings.grabOffset[index]), -8, 8)) })}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label className="flex items-center gap-2 text-sm">
          <Checkbox checked={settings.symmetryX} onCheckedChange={(checked) => updateSculpt({ enabled: true, symmetryX: checked === true })} />
          Mirror X
        </Label>
        <Label className="flex items-center gap-2 text-sm">
          <Checkbox checked={settings.showBrush} onCheckedChange={(checked) => updateSculpt({ showBrush: checked === true })} />
          Show brush
        </Label>
      </div>
    </div>
  );
}
