"use client";

import { Palette, SlidersHorizontal, ToggleLeft, Type as TypeIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { isDynamicVariable } from "../../scene/dynamic-variables";
import { resolveInputControlRange, resolveInputControlType } from "../../scene/input-controls";
import type { InputControlType, SceneInputControl, SceneVariable, SceneVariableValue } from "../../types";

const inputControlIcons: Record<InputControlType, typeof SlidersHorizontal> = {
  color: Palette,
  slider: SlidersHorizontal,
  text: TypeIcon,
  toggle: ToggleLeft,
};

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstSliderValue(value: number | readonly number[]) {
  return Array.isArray(value) ? value[0] : value;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getControlValue(variable: SceneVariable) {
  if (variable.type === "number") {
    return typeof variable.value === "number" ? variable.value : Number(variable.value) || 0;
  }

  if (variable.type === "boolean") {
    return variable.value === true;
  }

  return String(variable.value);
}

function RuntimeInputControl({
  control,
  onVariableChange,
  variable,
}: {
  control: SceneInputControl;
  onVariableChange: (variableId: string, value: SceneVariableValue) => void;
  variable: SceneVariable;
}) {
  const type = resolveInputControlType(control, variable);
  const Icon = inputControlIcons[type];
  const value = getControlValue(variable);

  if (type === "slider") {
    const range = resolveInputControlRange(control);
    const numberValue = clampNumber(typeof value === "number" ? value : 0, range.min, range.max);

    return (
      <div className="space-y-2">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <Label className="flex min-w-0 items-center gap-2 text-xs">
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{control.label}</span>
          </Label>
          <span className="font-mono text-[11px] text-muted-foreground">{Number(numberValue.toFixed(2))}</span>
        </div>
        <Slider
          max={range.max}
          min={range.min}
          step={range.step}
          value={[numberValue]}
          onValueChange={(nextValue) => onVariableChange(variable.id, firstSliderValue(nextValue))}
        />
      </div>
    );
  }

  if (type === "toggle") {
    return (
      <Label className="flex min-w-0 items-center gap-2 text-xs">
        <Checkbox checked={value === true} onCheckedChange={(checked) => onVariableChange(variable.id, checked === true)} />
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{control.label}</span>
      </Label>
    );
  }

  if (type === "color") {
    const colorValue = typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : "#51e0c3";

    return (
      <div className="grid grid-cols-[1fr_44px] items-center gap-3">
        <Label className="flex min-w-0 items-center gap-2 text-xs" htmlFor={`runtime-input-${control.id}`}>
          <Icon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{control.label}</span>
        </Label>
        <Input
          id={`runtime-input-${control.id}`}
          className="h-8 p-1"
          type="color"
          value={colorValue}
          onChange={(event) => onVariableChange(variable.id, event.target.value)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label className="flex min-w-0 items-center gap-2 text-xs" htmlFor={`runtime-input-${control.id}`}>
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{control.label}</span>
      </Label>
      <Input
        id={`runtime-input-${control.id}`}
        className="h-8"
        value={String(value)}
        onChange={(event) => onVariableChange(variable.id, variable.type === "number" ? toNumber(event.target.value, Number(value) || 0) : event.target.value)}
      />
    </div>
  );
}

function isManualInputControlEntry(entry: {
  control: SceneInputControl;
  variable: SceneVariable | undefined;
}): entry is { control: SceneInputControl; variable: SceneVariable } {
  if (!entry.variable) {
    return false;
  }

  return !isDynamicVariable(entry.variable);
}

export function InputControlsOverlay({
  className,
  inputControls,
  onVariableChange,
  variables,
}: {
  className?: string;
  inputControls: SceneInputControl[];
  onVariableChange: (variableId: string, value: SceneVariableValue) => void;
  variables: SceneVariable[];
}) {
  const variableById = new Map(variables.map((variable) => [variable.id, variable]));
  const controls = inputControls
    .map((control) => ({
      control,
      variable: control.variableId ? variableById.get(control.variableId) : undefined,
    }))
    .filter(isManualInputControlEntry);

  if (!controls.length) {
    return null;
  }

  return (
    <div className={cn("pointer-events-auto absolute right-4 top-4 z-10 w-72 space-y-3 rounded-md border border-border bg-background/90 p-3 shadow-lg backdrop-blur", className)}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Controls</div>
      {controls.map(({ control, variable }) => (
        <RuntimeInputControl key={control.id} control={control} variable={variable} onVariableChange={onVariableChange} />
      ))}
    </div>
  );
}
