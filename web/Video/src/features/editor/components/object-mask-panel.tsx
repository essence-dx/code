"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, NumberField } from "@/features/editor/components/inspector-fields";
import { createObjectMask, normalizeLayerObjectMasks } from "@/lib/editor/object-masks";
import type { LayerObjectMask, LayerObjectMaskMode } from "@/lib/editor/types";

type ObjectMaskPanelProps = {
  masks: LayerObjectMask[] | undefined;
  onChange: (masks: LayerObjectMask[]) => void;
};

export function ObjectMaskPanel({ masks, onChange }: ObjectMaskPanelProps) {
  const normalizedMasks = normalizeLayerObjectMasks(masks);

  function addMask(mode: LayerObjectMaskMode) {
    onChange([...normalizedMasks, createObjectMask(mode)]);
  }

  function updateMask(maskId: string, patch: Partial<LayerObjectMask>) {
    onChange(normalizedMasks.map((mask) => (mask.id === maskId ? { ...mask, ...patch } : mask)));
  }

  function removeMask(maskId: string) {
    onChange(normalizedMasks.filter((mask) => mask.id !== maskId));
  }

  return (
    <Field label="Object masks">
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => addMask("blur")}>
            <Plus className="size-4" />
            Blur
          </Button>
          <Button variant="outline" onClick={() => addMask("solid")}>
            <Plus className="size-4" />
            Censor
          </Button>
        </div>
        {normalizedMasks.map((mask, index) => (
          <div key={mask.id} className="space-y-2 rounded-md border border-border p-2">
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>Mask {index + 1}</span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant={mask.enabled ? "secondary" : "outline"} onClick={() => updateMask(mask.id, { enabled: !mask.enabled })}>
                  {mask.enabled ? "On" : "Off"}
                </Button>
                <Button size="icon" variant="outline" title="Remove mask" onClick={() => removeMask(mask.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Button size="sm" variant={mask.mode === "blur" ? "secondary" : "outline"} onClick={() => updateMask(mask.id, { mode: "blur" })}>
                Blur
              </Button>
              <Button size="sm" variant={mask.mode === "solid" ? "secondary" : "outline"} onClick={() => updateMask(mask.id, { mode: "solid" })}>
                Solid
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <PercentField label="X" value={mask.x} onChange={(x) => updateMask(mask.id, { x })} />
              <PercentField label="Y" value={mask.y} onChange={(y) => updateMask(mask.id, { y })} />
              <PercentField label="W" value={mask.width} onChange={(width) => updateMask(mask.id, { width })} min={1} />
              <PercentField label="H" value={mask.height} onChange={(height) => updateMask(mask.id, { height })} min={1} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <NumberField
                label={mask.mode === "blur" ? "Blur" : "Strength"}
                value={mask.intensity}
                min={1}
                max={48}
                step={1}
                onChange={(intensity) => updateMask(mask.id, { intensity })}
              />
              <NumberField
                label="Opacity"
                value={Math.round(mask.opacity * 100)}
                min={0}
                max={100}
                step={1}
                onChange={(opacity) => updateMask(mask.id, { opacity: opacity / 100 })}
              />
              <label className="space-y-1 text-[11px] text-muted-foreground">
                <span>Color</span>
                <Input className="h-8 p-1" type="color" value={mask.color} onChange={(event) => updateMask(mask.id, { color: event.target.value })} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Button size="sm" variant={mask.tracking === "none" ? "secondary" : "outline"} onClick={() => updateMask(mask.id, { tracking: "none" })}>
                Manual
              </Button>
              <Button size="sm" variant={mask.tracking === "center" ? "secondary" : "outline"} onClick={() => updateMask(mask.id, { tracking: "center" })}>
                Center track
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Field>
  );
}

function PercentField({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return <NumberField label={`${label} %`} value={Math.round(value * 100)} min={min} max={100} step={1} onChange={(next) => onChange(next / 100)} />;
}
