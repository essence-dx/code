"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function Field({ label, children }: { label: string; children: ReactNode }) {
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
  step = 0.1,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const valueRef = useRef(value);
  const normalizedStep = step || 1;

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const commitValue = useCallback(
    (nextValue: number) => {
      const committedValue = clampInspectorNumber(roundInspectorNumber(nextValue, normalizedStep), min, max);
      valueRef.current = committedValue;
      onChange(committedValue);
    },
    [max, min, normalizedStep, onChange],
  );

  const stepValue = useCallback(
    (direction: -1 | 1) => {
      commitValue(valueRef.current + normalizedStep * direction);
    },
    [commitValue, normalizedStep],
  );

  function handleChange(rawValue: string) {
    if (rawValue.trim() === "") return;

    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;

    commitValue(parsed);
  }

  return (
    <Field label={label}>
      <div className="flex overflow-hidden rounded-md border border-input bg-background">
        <StepButton label={`Decrease ${label}`} direction={-1} onStep={stepValue} />
        <Input
          className="h-8 min-w-0 flex-1 rounded-none border-0 text-center font-mono text-xs shadow-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          type="number"
          value={value}
          step={normalizedStep}
          min={min}
          max={max}
          onChange={(event) => handleChange(event.target.value)}
        />
        <StepButton label={`Increase ${label}`} direction={1} onStep={stepValue} />
      </div>
    </Field>
  );
}

export function Toggle({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border p-2">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        {label}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function clampInspectorNumber(value: number, min?: number, max?: number) {
  const lowerBounded = min === undefined ? value : Math.max(min, value);
  return max === undefined ? lowerBounded : Math.min(max, lowerBounded);
}

function StepButton({
  label,
  direction,
  onStep,
}: {
  label: string;
  direction: -1 | 1;
  onStep: (direction: -1 | 1) => void;
}) {
  const timeoutRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    onStep(direction);
    timeoutRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(() => onStep(direction), 70);
    }, 320);
  }, [direction, onStep, stop]);

  useEffect(() => stop, [stop]);

  return (
    <Button
      type="button"
      size="icon-sm"
      variant="ghost"
      className="h-8 w-7 rounded-none border-0"
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault();
        start();
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onStep(direction);
        }
      }}
    >
      {direction < 0 ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
    </Button>
  );
}

function roundInspectorNumber(value: number, step: number) {
  if (step >= 1) return Math.round(value);
  const decimals = Math.min(4, Math.max(1, Math.ceil(Math.abs(Math.log10(step)))));
  return Number(value.toFixed(decimals));
}
