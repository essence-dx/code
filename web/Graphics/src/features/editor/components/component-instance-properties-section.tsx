"use client";

import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getComponentPropertyDefinitions,
  getVariantForComponentProperties,
} from "@/features/editor/component-properties";
import type { DesignComponent, DesignLayer } from "@/features/editor/types";

type ComponentInstancePropertiesSectionProps = {
  layer: DesignLayer;
  component: DesignComponent;
  propertyValues: Record<string, string>;
  onUpdateComponentInstanceProperties: (
    layerId: string,
    properties: Record<string, string>,
  ) => void;
  onSwitchComponentInstanceVariant: (layerId: string, variantId?: string) => void;
};

export function ComponentInstancePropertiesSection({
  layer,
  component,
  propertyValues,
  onUpdateComponentInstanceProperties,
  onSwitchComponentInstanceVariant,
}: ComponentInstancePropertiesSectionProps) {
  const definitions = Object.values(getComponentPropertyDefinitions(component));

  if (definitions.length === 0) {
    return null;
  }

  function updateProperty(propertyName: string, value: string) {
    const nextValues = {
      ...propertyValues,
      [propertyName]: value,
    };
    const definition = definitions.find((item) => item.name === propertyName);

    if (definition?.type === "variant") {
      const nextVariant = getVariantForComponentProperties(
        component,
        nextValues,
      );

      if (nextVariant || value === definition.defaultValue) {
        onSwitchComponentInstanceVariant(layer.id, nextVariant?.id);
        return;
      }

      onUpdateComponentInstanceProperties(layer.id, nextValues);
      return;
    }

    onUpdateComponentInstanceProperties(layer.id, nextValues);
  }

  return (
    <div className="mt-2 space-y-2 rounded-sm border border-border/80 bg-muted/20 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Properties
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {definitions.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {definitions.map((definition) => (
          <div
            key={definition.id}
            className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] items-center gap-2"
          >
            <div className="truncate text-[11px] text-muted-foreground">
              {definition.name}
            </div>
            {definition.options?.length ? (
              <Select
                value={
                  propertyValues[definition.name] ?? definition.defaultValue
                }
                onValueChange={(value) => updateProperty(definition.name, value)}
              >
                <SelectTrigger className="h-7 min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {definition.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : definition.type === "text" ? (
              <Input
                value={propertyValues[definition.name] ?? definition.defaultValue}
                className="h-7 px-2 text-[11px]"
                onChange={(event) =>
                  updateProperty(definition.name, event.target.value)
                }
              />
            ) : definition.type === "number" ? (
              <NumberInput
                value={Number(
                  propertyValues[definition.name] ?? definition.defaultValue,
                )}
                className="h-7 rounded-sm"
                inputClassName="text-[11px]"
                onChange={(value) =>
                  updateProperty(definition.name, value.toString())
                }
              />
            ) : (
              <button
                type="button"
                className="h-7 truncate rounded-sm border border-border bg-background px-2 text-left text-[11px] text-muted-foreground"
                onClick={() =>
                  updateProperty(
                    definition.name,
                    propertyValues[definition.name] ?? definition.defaultValue,
                  )
                }
              >
                {propertyValues[definition.name] ?? definition.defaultValue}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
