"use client";

import { Component, PackagePlus, Plus, Trash2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ComponentPropertyManagement } from "@/features/editor/components/component-property-management";
import { ComponentDocumentationReadinessSection } from "@/features/editor/components/component-documentation-readiness-section";
import type {
  ComponentPropertyDefinitionPatch,
  ComponentSlotPatch,
} from "@/features/editor/component-definition-document";
import { getComponentPropertyDefinitions } from "@/features/editor/component-properties";
import { getComponentSlotCount } from "@/features/editor/component-slots";
import type { ComponentUsageAnalytics } from "@/features/editor/component-analytics";
import type {
  DesignComponent,
  DesignComponentPropertyType,
  DesignComponentVariant,
} from "@/features/editor/types";

type ComponentCardProps = {
  component: DesignComponent;
  analytics?: ComponentUsageAnalytics;
  canCreateVariant: boolean;
  onInsertComponent: (componentId: string, variantId?: string) => void;
  onCreateVariant: (componentId: string) => void;
  onRenameComponent: (componentId: string, name: string) => void;
  onRenameVariant: (
    componentId: string,
    variantId: string,
    name: string,
  ) => void;
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
  onDeleteComponent: (componentId: string) => void;
  onDeleteVariant: (componentId: string, variantId: string) => void;
  onDetachLibraryComponent: (componentId: string) => void;
};

export function ComponentCard({
  component,
  analytics,
  canCreateVariant,
  onInsertComponent,
  onCreateVariant,
  onRenameComponent,
  onRenameVariant,
  onAddPropertyDefinition,
  onUpdatePropertyDefinition,
  onDeletePropertyDefinition,
  onUpdateSlot,
  onDeleteComponent,
  onDeleteVariant,
  onDetachLibraryComponent,
}: ComponentCardProps) {
  const variantCount = component.variants?.length ?? 0;
  const propertyCount = Object.keys(
    getComponentPropertyDefinitions(component),
  ).length;
  const slotCount = getComponentSlotCount(component.layers);

  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="flex items-start gap-2">
        <div className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Component className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <Input
            defaultValue={component.name}
            className="h-8 px-2 text-sm font-medium"
            aria-label="Component name"
            onBlur={(event) =>
              onRenameComponent(component.id, event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }

              if (event.key === "Escape") {
                event.currentTarget.value = component.name;
                event.currentTarget.blur();
              }
            }}
          />
          <div className="font-mono text-[11px] text-muted-foreground">
            {component.layers.length} layers / {component.width} x{" "}
            {component.height}
            {variantCount > 0 ? ` / ${variantCount} variants` : ""}
            {propertyCount > 0 ? ` / ${propertyCount} props` : ""}
            {slotCount > 0 ? ` / ${slotCount} slots` : ""}
            {analytics ? ` / ${analytics.instanceCount} used` : ""}
          </div>
          {analytics ? (
            <div className="mt-1 grid grid-cols-2 gap-1.5 font-mono text-[10px] text-muted-foreground">
              <span className="rounded-sm bg-muted/30 px-1.5 py-1">
                {analytics.instanceLayerCount} instance layers
              </span>
              <span className="rounded-sm bg-muted/30 px-1.5 py-1">
                {Object.keys(analytics.variantUsage).length} variants used
              </span>
            </div>
          ) : null}
          {component.librarySource ? (
            <div className="mt-1 flex items-center justify-between gap-2 rounded-sm bg-muted/30 px-2 py-1 font-mono text-[10px] text-muted-foreground">
              <span className="min-w-0 truncate">
                {component.librarySource.libraryName} v
                {component.librarySource.version} /{" "}
                {component.librarySource.status}
              </span>
              {component.librarySource.status !== "detached" ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-5 shrink-0"
                  aria-label={`Detach ${component.name} from library`}
                  onClick={() => onDetachLibraryComponent(component.id)}
                >
                  <Unlink className="size-3" />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          disabled={!canCreateVariant}
          aria-label={`Create variant for ${component.name}`}
          onClick={() => onCreateVariant(component.id)}
        >
          <Plus className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="size-8"
          aria-label={`Insert ${component.name}`}
          onClick={() => onInsertComponent(component.id)}
        >
          <PackagePlus className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${component.name}`}
          onClick={() => onDeleteComponent(component.id)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <ComponentDocumentationReadinessSection
        component={component}
        analytics={analytics}
      />
      {variantCount > 0 ? (
        <div className="mt-2 space-y-1 border-l border-border pl-2">
          {(component.variants ?? []).map((variant) => (
            <ComponentVariantRow
              key={variant.id}
              component={component}
              variant={variant}
              usageCount={analytics?.variantUsage[variant.id] ?? 0}
              onInsertComponent={onInsertComponent}
              onRenameVariant={onRenameVariant}
              onDeleteVariant={onDeleteVariant}
            />
          ))}
        </div>
      ) : null}
      <ComponentPropertyManagement
        component={component}
        onAddPropertyDefinition={onAddPropertyDefinition}
        onUpdatePropertyDefinition={onUpdatePropertyDefinition}
        onDeletePropertyDefinition={onDeletePropertyDefinition}
        onUpdateSlot={onUpdateSlot}
      />
    </div>
  );
}

function ComponentVariantRow({
  component,
  variant,
  usageCount,
  onInsertComponent,
  onRenameVariant,
  onDeleteVariant,
}: {
  component: DesignComponent;
  variant: DesignComponentVariant;
  usageCount: number;
  onInsertComponent: (componentId: string, variantId?: string) => void;
  onRenameVariant: (
    componentId: string,
    variantId: string,
    name: string,
  ) => void;
  onDeleteVariant: (componentId: string, variantId: string) => void;
}) {
  return (
    <div className="rounded-sm border border-border/70 bg-muted/20 p-2">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Input
            defaultValue={variant.name}
            className="h-7 px-2 text-xs font-medium"
            aria-label={`${component.name} variant name`}
            onBlur={(event) =>
              onRenameVariant(component.id, variant.id, event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }

              if (event.key === "Escape") {
                event.currentTarget.value = variant.name;
                event.currentTarget.blur();
              }
            }}
          />
          <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
            {formatVariantProperties(variant)} / {variant.layers.length} layers
            {usageCount > 0 ? ` / ${usageCount} used` : ""}
          </div>
        </div>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          className="size-7"
          aria-label={`Insert ${component.name} ${variant.name}`}
          onClick={() => onInsertComponent(component.id, variant.id)}
        >
          <PackagePlus className="size-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${component.name} ${variant.name}`}
          onClick={() => onDeleteVariant(component.id, variant.id)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

function formatVariantProperties(variant: DesignComponentVariant) {
  const properties = Object.entries(variant.properties);

  if (properties.length === 0) {
    return variant.name;
  }

  return properties.map(([key, value]) => `${key}=${value}`).join(" / ");
}
