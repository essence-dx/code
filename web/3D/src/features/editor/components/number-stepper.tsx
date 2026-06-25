"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type NumberStepperProps = {
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  precision?: number;
  step?: number;
  value: number;
};

function clampNumber(value: number, min?: number, max?: number) {
  if (typeof min === "number" && value < min) {
    return min;
  }

  if (typeof max === "number" && value > max) {
    return max;
  }

  return value;
}

function roundNumber(value: number, precision: number) {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function formatNumber(value: number, precision: number) {
  return String(roundNumber(value, precision));
}

export function NumberStepper({
  ariaLabel,
  className,
  disabled,
  id,
  max,
  min,
  onChange,
  precision = 2,
  step = 1,
  value,
}: NumberStepperProps) {
  const [draftValue, setDraftValue] = useState<string | null>(null);
  const holdDelayRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);
  const stopSteppingRef = useRef<() => void>(() => {});
  const valueRef = useRef(value);
  const displayedValue = draftValue ?? formatNumber(value, precision);

  const commitValue = useCallback(
    (nextValue: number) => {
      const resolved = roundNumber(clampNumber(nextValue, min, max), precision);
      valueRef.current = resolved;
      setDraftValue(formatNumber(resolved, precision));
      onChange(resolved);
    },
    [max, min, onChange, precision],
  );

  const stopStepping = useCallback(() => {
    if (holdDelayRef.current !== null) {
      window.clearTimeout(holdDelayRef.current);
      holdDelayRef.current = null;
    }

    if (holdIntervalRef.current !== null) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }

    window.removeEventListener("pointerup", stopSteppingRef.current);
    window.removeEventListener("pointercancel", stopSteppingRef.current);
  }, []);

  const stepValue = useCallback(
    (direction: -1 | 1) => {
      commitValue(valueRef.current + direction * step);
    },
    [commitValue, step],
  );

  const startStepping = useCallback(
    (direction: -1 | 1) => {
      if (disabled) {
        return;
      }

      stopStepping();
      stepValue(direction);
      holdDelayRef.current = window.setTimeout(() => {
        holdIntervalRef.current = window.setInterval(
          () => stepValue(direction),
          55,
        );
      }, 260);
      window.addEventListener("pointerup", stopSteppingRef.current);
      window.addEventListener("pointercancel", stopSteppingRef.current);
    },
    [disabled, stepValue, stopStepping],
  );

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    stopSteppingRef.current = stopStepping;
  }, [stopStepping]);

  useEffect(() => stopStepping, [stopStepping]);

  return (
    <div
      className={cn(
        "grid h-8 min-w-0 grid-cols-[24px_minmax(0,1fr)_24px] overflow-hidden rounded-lg border border-input bg-background",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <button
        aria-label={ariaLabel ? `Decrease ${ariaLabel}` : "Decrease value"}
        className="flex h-full items-center justify-center border-r border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        disabled={disabled}
        type="button"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            stepValue(-1);
          }
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          startStepping(-1);
        }}
      >
        <Minus className="size-3" />
      </button>
      <Input
        aria-label={ariaLabel}
        className="h-full rounded-none border-0 bg-transparent px-1 text-center font-mono text-xs shadow-none focus-visible:ring-0"
        disabled={disabled}
        id={id}
        inputMode="decimal"
        value={displayedValue}
        onBlur={() => {
          const parsed = Number(displayedValue);
          commitValue(Number.isFinite(parsed) ? parsed : value);
          setDraftValue(null);
        }}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraftValue(nextDraft);

          if (nextDraft === "" || nextDraft === "-" || nextDraft === ".") {
            return;
          }

          const parsed = Number(nextDraft);

          if (Number.isFinite(parsed)) {
            onChange(roundNumber(clampNumber(parsed, min, max), precision));
          }
        }}
      />
      <button
        aria-label={ariaLabel ? `Increase ${ariaLabel}` : "Increase value"}
        className="flex h-full items-center justify-center border-l border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        disabled={disabled}
        type="button"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            stepValue(1);
          }
        }}
        onPointerDown={(event) => {
          event.preventDefault();
          startStepping(1);
        }}
      >
        <Plus className="size-3" />
      </button>
    </div>
  );
}
