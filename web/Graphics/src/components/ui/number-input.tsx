"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type NumberInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "value" | "onChange" | "min" | "max" | "step"
> & {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  inputClassName?: string;
};

function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  className,
  inputClassName,
  onBlur,
  onKeyDown,
  ...props
}: NumberInputProps) {
  const [draft, setDraft] = React.useState(formatNumber(value));

  React.useEffect(() => {
    setDraft(formatNumber(value));
  }, [value]);

  function commit(nextDraft = draft) {
    const nextValue = parseNumber(nextDraft);

    if (nextValue === null) {
      setDraft(formatNumber(value));
      return;
    }

    update(clampNumber(nextValue, min, max));
  }

  function update(nextValue: number) {
    const roundedValue = roundToStep(nextValue, step);

    setDraft(formatNumber(roundedValue));
    onChange(roundedValue);
  }

  function nudge(direction: 1 | -1) {
    const currentValue = parseNumber(draft) ?? value;
    update(clampNumber(currentValue + step * direction, min, max));
  }

  return (
    <div
      className={cn(
        "flex h-8 w-full min-w-0 items-center overflow-hidden rounded-lg border border-input bg-transparent text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        tabIndex={-1}
        className="h-full w-7 shrink-0 rounded-none text-muted-foreground hover:text-foreground"
        onClick={() => nudge(-1)}
        disabled={min !== undefined && value <= min}
        aria-label="Decrease value"
      >
        <Minus className="size-3" />
      </Button>
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        value={draft}
        className={cn(
          "h-full min-w-0 border-0 bg-transparent px-1 text-center font-mono text-xs shadow-none focus-visible:ring-0",
          inputClassName,
        )}
        onChange={(event) => {
          const nextDraft = event.target.value;
          const nextValue = parseNumber(nextDraft);

          setDraft(nextDraft);

          if (nextValue !== null) {
            onChange(clampNumber(nextValue, min, max));
          }
        }}
        onBlur={(event) => {
          commit(event.target.value);
          onBlur?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp") {
            event.preventDefault();
            nudge(1);
          }

          if (event.key === "ArrowDown") {
            event.preventDefault();
            nudge(-1);
          }

          if (event.key === "Enter") {
            event.currentTarget.blur();
          }

          if (event.key === "Escape") {
            setDraft(formatNumber(value));
            event.currentTarget.blur();
          }

          onKeyDown?.(event);
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        tabIndex={-1}
        className="h-full w-7 shrink-0 rounded-none text-muted-foreground hover:text-foreground"
        onClick={() => nudge(1)}
        disabled={max !== undefined && value >= max}
        aria-label="Increase value"
      >
        <Plus className="size-3" />
      </Button>
    </div>
  );
}

function parseNumber(value: string) {
  if (!value.trim() || value === "-" || value === ".") {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function clampNumber(value: number, min?: number, max?: number) {
  if (min !== undefined && value < min) {
    return min;
  }

  if (max !== undefined && value > max) {
    return max;
  }

  return value;
}

function roundToStep(value: number, step: number) {
  if (!Number.isFinite(step) || step <= 0) {
    return value;
  }

  const decimals = Math.max(0, `${step}`.split(".")[1]?.length ?? 0);

  return Number(value.toFixed(decimals));
}

function formatNumber(value: number) {
  return Number.isFinite(value) ? String(value) : "0";
}

export { NumberInput };
