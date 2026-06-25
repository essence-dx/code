"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  ColorField,
  Field,
  NumberField,
} from "@/features/editor/components/form-control-fields";
import type { EditorColorPalette } from "@/features/editor/color-palettes";
import {
  clampTimerDuration,
  formatTimerSeconds,
  getPausedTimerUpdates,
  getResetTimerUpdates,
  getStartedTimerUpdates,
  getTimerDisplaySeconds,
  maxTimerDurationSeconds,
  minTimerDurationSeconds,
} from "@/features/editor/timer";
import type {
  DesignElement,
  TimerElement,
  TimerMode,
} from "@/features/editor/types";

type TimerControlsProps = {
  element: TimerElement;
  palettes: readonly EditorColorPalette[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
};

const timerModes = [
  { value: "countdown", label: "Countdown" },
  { value: "stopwatch", label: "Stopwatch" },
] satisfies Array<{ value: TimerMode; label: string }>;

export function TimerControls({
  element,
  palettes,
  onUpdateElement,
}: TimerControlsProps) {
  const [now, setNow] = useState(() => Date.now());
  const displayValue = formatTimerSeconds(
    getTimerDisplaySeconds(element, now),
    element.showHours,
  );

  useEffect(() => {
    if (!element.running) return undefined;

    const interval = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(interval);
  }, [element.running, element.startedAt]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant={element.running ? "secondary" : "outline"}
          onClick={() =>
            onUpdateElement(
              element.running
                ? getPausedTimerUpdates(element)
                : getStartedTimerUpdates(element),
            )
          }
        >
          {element.running ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {element.running ? "Pause" : "Start"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onUpdateElement(getResetTimerUpdates())}
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        <div className="flex items-center justify-center rounded-md border border-border text-xs font-semibold tabular-nums text-muted-foreground">
          {displayValue}
        </div>
      </div>

      <Field label="Mode">
        <Select
          value={element.timerMode}
          onValueChange={(timerMode) =>
            onUpdateElement({
              ...getResetTimerUpdates(),
              timerMode: timerMode as TimerMode,
            } as Partial<DesignElement>)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timerModes.map((mode) => (
              <SelectItem key={mode.value} value={mode.value}>
                {mode.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Label">
        <Input
          value={element.label}
          onChange={(event) =>
            onUpdateElement({
              label: event.target.value,
            } as Partial<DesignElement>)
          }
        />
      </Field>

      <NumberField
        label={
          element.timerMode === "countdown"
            ? "Duration seconds"
            : "Goal seconds"
        }
        value={element.durationSeconds}
        min={minTimerDurationSeconds}
        max={maxTimerDurationSeconds}
        onChange={(durationSeconds) =>
          onUpdateElement({
            durationSeconds: clampTimerDuration(durationSeconds),
          } as Partial<DesignElement>)
        }
      />

      <div className="grid gap-2">
        <ToggleRow
          label="Show label"
          checked={element.showLabel}
          onCheckedChange={(showLabel) =>
            onUpdateElement({ showLabel } as Partial<DesignElement>)
          }
        />
        <ToggleRow
          label="Show hours"
          checked={element.showHours}
          onCheckedChange={(showHours) =>
            onUpdateElement({ showHours } as Partial<DesignElement>)
          }
        />
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Size"
          value={element.fontSize}
          min={16}
          max={140}
          onChange={(fontSize) =>
            onUpdateElement({ fontSize } as Partial<DesignElement>)
          }
        />
        <NumberField
          label="Weight"
          value={element.fontWeight}
          min={100}
          max={900}
          step={100}
          onChange={(fontWeight) =>
            onUpdateElement({ fontWeight } as Partial<DesignElement>)
          }
        />
        <NumberField
          label="Radius"
          value={element.radius}
          min={0}
          max={80}
          onChange={(radius) =>
            onUpdateElement({ radius } as Partial<DesignElement>)
          }
        />
        <NumberField
          label="Padding"
          value={element.padding}
          min={0}
          max={60}
          onChange={(padding) =>
            onUpdateElement({ padding } as Partial<DesignElement>)
          }
        />
      </div>

      <NumberField
        label="Border width"
        value={element.borderWidth}
        min={0}
        max={16}
        onChange={(borderWidth) =>
          onUpdateElement({ borderWidth } as Partial<DesignElement>)
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <ColorField
          label="Text"
          value={element.textColor}
          palettes={palettes}
          onChange={(textColor) =>
            onUpdateElement({ textColor } as Partial<DesignElement>)
          }
        />
        <ColorField
          label="Accent"
          value={element.accentColor}
          palettes={palettes}
          onChange={(accentColor) =>
            onUpdateElement({ accentColor } as Partial<DesignElement>)
          }
        />
        <ColorField
          label="Surface"
          value={element.surfaceColor}
          palettes={palettes}
          onChange={(surfaceColor) =>
            onUpdateElement({ surfaceColor } as Partial<DesignElement>)
          }
        />
        <ColorField
          label="Border"
          value={element.borderColor}
          palettes={palettes}
          onChange={(borderColor) =>
            onUpdateElement({ borderColor } as Partial<DesignElement>)
          }
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
