"use client";

import {
  Clock3,
  Dices,
  Hash,
  Palette,
  Plus,
  RotateCcw,
  Timer,
  ToggleLeft,
  Trash2,
  Type as TypeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  isDynamicVariable,
  variableSourceOptions,
} from "../../scene/dynamic-variables";
import { useEditorStore } from "../../store/editor-store";
import type {
  SceneVariable,
  SceneVariableSource,
  SceneVariableType,
} from "../../types";

const variableTypes: Array<{
  type: SceneVariableType;
  label: string;
  icon: typeof Hash;
}> = [
  { type: "number", label: "Number", icon: Hash },
  { type: "boolean", label: "Boolean", icon: ToggleLeft },
  { type: "text", label: "Text", icon: TypeIcon },
  { type: "color", label: "Color", icon: Palette },
];

const variableSourceIcons: Record<SceneVariableSource, typeof Hash> = {
  clock: Clock3,
  counter: Hash,
  manual: RotateCcw,
  random: Dices,
  stopwatch: Timer,
  time: Clock3,
  timer: Timer,
};
const emptyVariables: SceneVariable[] = [];

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function getVariableValueLabel(variable: SceneVariable) {
  if (variable.type === "boolean") {
    return variable.value === true ? "True" : "False";
  }

  return String(variable.value);
}

function VariableValueControl({ variable }: { variable: SceneVariable }) {
  const updateVariable = useEditorStore((state) => state.updateVariable);
  const dynamic = isDynamicVariable(variable);

  if (dynamic) {
    return (
      <div className="space-y-1">
        <Label htmlFor={`variable-${variable.id}-value`}>Runtime value</Label>
        <Input
          id={`variable-${variable.id}-value`}
          disabled
          value={getVariableValueLabel(variable)}
        />
      </div>
    );
  }

  if (variable.type === "boolean") {
    return (
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={variable.value === true}
          onCheckedChange={(checked) =>
            updateVariable(variable.id, { value: checked === true })
          }
        />
        {getVariableValueLabel(variable)}
      </Label>
    );
  }

  if (variable.type === "color") {
    return (
      <div className="grid grid-cols-[1fr_44px] items-center gap-3">
        <Label htmlFor={`variable-${variable.id}-color`}>Value</Label>
        <Input
          id={`variable-${variable.id}-color`}
          className="h-9 p-1"
          type="color"
          value={
            typeof variable.value === "string" ? variable.value : "#51e0c3"
          }
          onChange={(event) =>
            updateVariable(variable.id, { value: event.target.value })
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={`variable-${variable.id}-value`}>Value</Label>
      <Input
        id={`variable-${variable.id}-value`}
        inputMode={variable.type === "number" ? "decimal" : undefined}
        type={variable.type === "number" ? "number" : "text"}
        value={
          variable.type === "number"
            ? Number(variable.value)
            : String(variable.value)
        }
        onChange={(event) =>
          updateVariable(variable.id, {
            value:
              variable.type === "number"
                ? toNumber(event.target.value, Number(variable.value) || 0)
                : event.target.value,
          })
        }
      />
    </div>
  );
}

export function SceneVariablesPanel() {
  const variables = useEditorStore(
    (state) => state.document.variables ?? emptyVariables,
  );
  const addVariable = useEditorStore((state) => state.addVariable);
  const updateVariable = useEditorStore((state) => state.updateVariable);
  const deleteVariable = useEditorStore((state) => state.deleteVariable);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Variables
          </div>
          <span className="font-mono text-[11px] text-muted-foreground">
            {variables.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {variableTypes.map((variableType) => {
            const Icon = variableType.icon;

            return (
              <Button
                key={variableType.type}
                className="justify-start gap-2"
                size="sm"
                variant="secondary"
                onClick={() => addVariable(variableType.type)}
              >
                <Plus className="size-3.5" />
                <Icon className="size-3.5" />
                {variableType.label}
              </Button>
            );
          })}
        </div>
      </div>

      {variables.length ? <Separator /> : null}

      <div className="space-y-3">
        {variables.map((variable) => (
          <div
            key={variable.id}
            className="space-y-3 rounded-md border border-border p-3"
          >
            <div className="grid grid-cols-[1fr_36px] gap-2">
              <div className="space-y-1">
                <Label htmlFor={`variable-${variable.id}-name`}>Name</Label>
                <Input
                  id={`variable-${variable.id}-name`}
                  value={variable.name}
                  onChange={(event) =>
                    updateVariable(variable.id, { name: event.target.value })
                  }
                />
              </div>
              <Button
                aria-label={`Delete ${variable.name}`}
                className="mt-6 size-9"
                size="icon"
                variant="ghost"
                onClick={() => deleteVariable(variable.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Source
            </div>
            <div className="grid grid-cols-2 gap-2">
              {variableSourceOptions.map((sourceOption) => {
                const Icon = variableSourceIcons[sourceOption.source];
                const source = variable.source ?? "manual";

                return (
                  <Button
                    key={`${variable.id}-${sourceOption.source}`}
                    className="justify-start gap-2"
                    size="sm"
                    variant={
                      source === sourceOption.source ? "default" : "outline"
                    }
                    onClick={() =>
                      updateVariable(variable.id, {
                        source: sourceOption.source,
                      })
                    }
                  >
                    <Icon className="size-3.5" />
                    {sourceOption.label}
                  </Button>
                );
              })}
            </div>

            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Type
            </div>
            <div className="grid grid-cols-2 gap-2">
              {variableTypes.map((variableType) => {
                const Icon = variableType.icon;
                const dynamic = isDynamicVariable(variable);

                return (
                  <Button
                    key={`${variable.id}-${variableType.type}`}
                    className="justify-start gap-2"
                    disabled={dynamic}
                    size="sm"
                    variant={
                      variable.type === variableType.type
                        ? "default"
                        : "outline"
                    }
                    onClick={() =>
                      updateVariable(variable.id, { type: variableType.type })
                    }
                  >
                    <Icon className="size-3.5" />
                    {variableType.label}
                  </Button>
                );
              })}
            </div>

            <VariableValueControl variable={variable} />

            <Label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={
                  !isDynamicVariable(variable) && variable.scope === "local"
                }
                disabled={isDynamicVariable(variable)}
                onCheckedChange={(checked) =>
                  updateVariable(variable.id, {
                    scope: checked === true ? "local" : "scene",
                  })
                }
              />
              Store in local browser
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}
