"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  componentPropertyTypes,
  getComponentPropertyDefinitions,
} from "@/features/editor/component-properties";
import {
  componentSlotTypeLabels,
  componentSlotTypes,
  getComponentSlotName,
  getComponentSlotType,
} from "@/features/editor/component-slots";
import type {
  ComponentPropertyDefinitionPatch,
  ComponentSlotPatch,
} from "@/features/editor/component-definition-document";
import type {
  DesignComponent,
  DesignComponentPropertyDefinition,
  DesignComponentPropertyType,
} from "@/features/editor/types";

type ComponentPropertyManagementProps = {
  component: DesignComponent;
  onAddPropertyDefinition: (
    componentId: string,
    type: DesignComponentPropertyType,
  ) => void;
  onUpdatePropertyDefinition: (
    componentId: string,
    definitionId: string,
    patch: ComponentPropertyDefinitionPatch,
  ) => void;
  onDeletePropertyDefinition: (
    componentId: string,
    definitionId: string,
  ) => void;
  onUpdateSlot: (
    componentId: string,
    sourceLayerId: string,
    patch: ComponentSlotPatch,
  ) => void;
};

export function ComponentPropertyManagement({
  component,
  onAddPropertyDefinition,
  onUpdatePropertyDefinition,
  onDeletePropertyDefinition,
  onUpdateSlot,
}: ComponentPropertyManagementProps) {
  const definitions = Object.values(getComponentPropertyDefinitions(component));

  return (
    <div className="mt-2 space-y-2 border-t border-border pt-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Properties
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="h-7">
              <Plus className="size-3" />
              Add prop
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {componentPropertyTypes.map((type) => (
              <DropdownMenuItem
                key={type}
                onClick={() => onAddPropertyDefinition(component.id, type)}
              >
                {formatPropertyType(type)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="space-y-1.5">
        {definitions.map((definition) => (
          <ComponentPropertyRow
            key={definition.id}
            definition={definition}
            canDelete={definition.id !== "variant"}
            onUpdate={(patch) =>
              onUpdatePropertyDefinition(component.id, definition.id, patch)
            }
            onDelete={() =>
              onDeletePropertyDefinition(component.id, definition.id)
            }
          />
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Slots
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {component.layers.length}
        </span>
      </div>
      <div className="space-y-1.5">
        {component.layers.map((layer) => (
          <div
            key={layer.id}
            className="grid grid-cols-[minmax(0,1fr)_112px] gap-1.5"
          >
            <Input
              defaultValue={getComponentSlotName(layer)}
              className="h-7 px-2 text-[11px]"
              aria-label={`${component.name} slot name`}
              onBlur={(event) =>
                onUpdateSlot(component.id, layer.id, {
                  componentSlotName: event.target.value,
                })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
              }}
            />
            <Select
              value={getComponentSlotType(layer)}
              onValueChange={(value) =>
                onUpdateSlot(component.id, layer.id, {
                  componentSlotType: value as ComponentSlotPatch["componentSlotType"],
                })
              }
            >
              <SelectTrigger className="h-7 text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {componentSlotTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {componentSlotTypeLabels[type]}
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

function ComponentPropertyRow({
  definition,
  canDelete,
  onUpdate,
  onDelete,
}: {
  definition: DesignComponentPropertyDefinition;
  canDelete: boolean;
  onUpdate: (patch: ComponentPropertyDefinitionPatch) => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-1 rounded-sm border border-border/70 bg-muted/20 p-1.5">
      <div className="grid grid-cols-[minmax(0,1fr)_104px_28px] gap-1.5">
        <Input
          defaultValue={definition.name}
          className="h-7 px-2 text-[11px]"
          aria-label={`${definition.name} property name`}
          onBlur={(event) => onUpdate({ name: event.target.value })}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
        <Select
          value={definition.type}
          onValueChange={(value) =>
            onUpdate({ type: value as DesignComponentPropertyType })
          }
        >
          <SelectTrigger className="h-7 text-[11px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {componentPropertyTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {formatPropertyType(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 text-muted-foreground hover:text-destructive"
          disabled={!canDelete}
          aria-label={`Delete ${definition.name} property`}
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <Input
        defaultValue={definition.defaultValue}
        className="h-7 px-2 text-[11px]"
        aria-label={`${definition.name} default value`}
        onBlur={(event) => onUpdate({ defaultValue: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
      />
      {definition.type === "variant" || definition.type === "boolean" ? (
        <Input
          defaultValue={(definition.options ?? []).join(", ")}
          className="h-7 px-2 font-mono text-[11px]"
          aria-label={`${definition.name} options`}
          onBlur={(event) =>
            onUpdate({
              options: event.target.value
                .split(",")
                .map((option) => option.trim())
                .filter(Boolean),
            })
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
      ) : null}
    </div>
  );
}

function formatPropertyType(type: DesignComponentPropertyType) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
