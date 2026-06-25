"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getActiveVariableModeId,
  getVariableBindingLayerPatch,
  resolveVariableValue,
  variableBindableProperties,
} from "@/features/editor/variable-bindings";
import type {
  DesignLayer,
  DesignVariableDefinition,
  DesignVariableMode,
} from "@/features/editor/types";

type VariableBindingsSectionProps = {
  layer: DesignLayer;
  variableDefinitions: Record<string, DesignVariableDefinition>;
  variableModes: DesignVariableMode[];
  activeVariableModeId?: string;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
};

export function VariableBindingsSection({
  layer,
  variableDefinitions,
  variableModes,
  activeVariableModeId,
  onUpdateLayer,
}: VariableBindingsSectionProps) {
  const documentContext = {
    variableDefinitions,
    variableModes,
    activeVariableModeId,
  };
  const modeId = getActiveVariableModeId(documentContext);
  const variables = Object.values(variableDefinitions);

  if (variables.length === 0) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Variable bindings
        </div>
        <div className="rounded-md border border-dashed border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground">
          Add document variables on the page panel to bind layer properties.
        </div>
      </div>
    );
  }

  function updateBinding(property: (typeof variableBindableProperties)[number]["property"], variableId: string) {
    const nextBindings = { ...(layer.variableBindings ?? {}) };

    if (variableId === "__none__") {
      delete nextBindings[property];
      onUpdateLayer(layer.id, {
        variableBindings: Object.keys(nextBindings).length > 0 ? nextBindings : undefined,
      });
      return;
    }

    const value = resolveVariableValue(variableId, documentContext);
    const variable = variableDefinitions[variableId];

    if (!variable || value === null) {
      return;
    }

    nextBindings[property] = variableId;

    onUpdateLayer(layer.id, {
      variableBindings: nextBindings,
      ...getVariableBindingLayerPatch(
        layer,
        property,
        variable.type === "number" ? Number(value) : value,
      ),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Variable bindings
        </div>
        <div className="text-xs text-muted-foreground">{modeId}</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {variableBindableProperties.map(({ property, label, type }) => (
          <div key={property} className="space-y-1.5">
            <div className="text-xs text-muted-foreground">{label}</div>
            <Select
              value={layer.variableBindings?.[property] ?? "__none__"}
              onValueChange={(variableId) => updateBinding(property, variableId)}
            >
              <SelectTrigger className="h-8 min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {variables
                  .filter((variable) => variable.type === type)
                  .map((variable) => (
                    <SelectItem key={variable.id} value={variable.id}>
                      {variable.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
