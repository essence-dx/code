"use client";

import {
  Hash,
  Palette,
  Plus,
  SlidersHorizontal,
  ToggleLeft,
  Trash2,
  Type as TypeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDynamicVariable } from "../../scene/dynamic-variables";
import {
  resolveInputControlRange,
  resolveInputControlType,
} from "../../scene/input-controls";
import { useEditorStore } from "../../store/editor-store";
import type {
  InputControlType,
  SceneInputControl,
  SceneVariable,
} from "../../types";

const inputControlIcons: Record<InputControlType, typeof SlidersHorizontal> = {
  color: Palette,
  slider: SlidersHorizontal,
  text: TypeIcon,
  toggle: ToggleLeft,
};
const emptyInputControls: SceneInputControl[] = [];
const emptyVariables: SceneVariable[] = [];

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function VariableIcon({ variable }: { variable: SceneVariable }) {
  const Icon =
    variable.type === "number"
      ? Hash
      : variable.type === "boolean"
        ? ToggleLeft
        : variable.type === "color"
          ? Palette
          : TypeIcon;

  return <Icon className="size-3.5 shrink-0" />;
}

function NumberControlSettings({ control }: { control: SceneInputControl }) {
  const updateInputControl = useEditorStore(
    (state) => state.updateInputControl,
  );
  const range = resolveInputControlRange(control);

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="space-y-1">
        <Label
          htmlFor={`input-control-${control.id}-min`}
          className="text-[11px] text-muted-foreground"
        >
          Min
        </Label>
        <Input
          id={`input-control-${control.id}-min`}
          inputMode="decimal"
          type="number"
          value={range.min}
          onChange={(event) =>
            updateInputControl(control.id, {
              min: toNumber(event.target.value, range.min),
            })
          }
        />
      </div>
      <div className="space-y-1">
        <Label
          htmlFor={`input-control-${control.id}-max`}
          className="text-[11px] text-muted-foreground"
        >
          Max
        </Label>
        <Input
          id={`input-control-${control.id}-max`}
          inputMode="decimal"
          type="number"
          value={range.max}
          onChange={(event) =>
            updateInputControl(control.id, {
              max: toNumber(event.target.value, range.max),
            })
          }
        />
      </div>
      <div className="space-y-1">
        <Label
          htmlFor={`input-control-${control.id}-step`}
          className="text-[11px] text-muted-foreground"
        >
          Step
        </Label>
        <Input
          id={`input-control-${control.id}-step`}
          inputMode="decimal"
          min={0.0001}
          type="number"
          value={range.step}
          onChange={(event) =>
            updateInputControl(control.id, {
              step: Math.max(0.0001, toNumber(event.target.value, range.step)),
            })
          }
        />
      </div>
    </div>
  );
}

export function InputControlsPanel() {
  const variables = useEditorStore(
    (state) => state.document.variables ?? emptyVariables,
  );
  const inputControls = useEditorStore(
    (state) => state.document.inputControls ?? emptyInputControls,
  );
  const addInputControl = useEditorStore((state) => state.addInputControl);
  const updateInputControl = useEditorStore(
    (state) => state.updateInputControl,
  );
  const deleteInputControl = useEditorStore(
    (state) => state.deleteInputControl,
  );
  const exposedVariableIds = new Set(
    inputControls
      .map((inputControl) => inputControl.variableId)
      .filter(Boolean),
  );
  const manualVariables = variables.filter(
    (variable) => !isDynamicVariable(variable),
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Input controls
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            {inputControls.length}
          </span>
        </div>
        {manualVariables.length ? (
          <div className="grid grid-cols-2 gap-2">
            {manualVariables.map((variable) => (
              <Button
                key={variable.id}
                className="min-w-0 justify-start gap-2"
                disabled={exposedVariableIds.has(variable.id)}
                size="sm"
                variant="secondary"
                onClick={() => addInputControl(variable.id)}
              >
                <Plus className="size-3.5 shrink-0" />
                <VariableIcon variable={variable} />
                <span className="truncate">{variable.name}</span>
              </Button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
            Create a manual variable before exposing an input control.
          </div>
        )}
      </div>

      {inputControls.length ? (
        <div className="space-y-3">
          {inputControls.map((control) => {
            const variable = variables.find(
              (entry) => entry.id === control.variableId,
            );
            const type = resolveInputControlType(control, variable);
            const Icon = inputControlIcons[type];

            return (
              <div
                key={control.id}
                className="space-y-3 rounded-md border border-border p-3"
              >
                <div className="grid grid-cols-[1fr_36px] gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`input-control-${control.id}-label`}>
                      Label
                    </Label>
                    <Input
                      id={`input-control-${control.id}-label`}
                      value={control.label}
                      onChange={(event) =>
                        updateInputControl(control.id, {
                          label: event.target.value,
                        })
                      }
                    />
                  </div>
                  <Button
                    aria-label={`Delete ${control.label}`}
                    className="mt-6 size-9"
                    size="icon"
                    variant="ghost"
                    onClick={() => deleteInputControl(control.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                  <Icon className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {variable?.name ?? "Missing variable"}
                  </span>
                </div>

                {type === "slider" ? (
                  <NumberControlSettings control={control} />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
