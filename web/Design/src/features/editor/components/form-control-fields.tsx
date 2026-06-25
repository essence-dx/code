"use client";

import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPalettePicker } from "@/features/editor/components/color-palette-picker";
import type { EditorColorPalette } from "@/features/editor/color-palettes";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}

export function ColorField({
  label,
  value,
  palettes,
  onChange,
}: {
  label: string;
  value: string;
  palettes: readonly EditorColorPalette[];
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="space-y-2">
        <Input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <ColorPalettePicker
          selectedColor={value}
          palettes={palettes}
          onSelectColor={onChange}
        />
      </div>
    </Field>
  );
}
