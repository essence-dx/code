"use client";

import { RotateCcw, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ComponentInstanceLayersSection } from "@/features/editor/components/component-instance-layers-section";
import { ComponentInstancePropertiesSection } from "@/features/editor/components/component-instance-properties-section";
import { getComponentLayerOverrideReport } from "@/features/editor/component-overrides";
import {
  getComponentInstancePropertyValues,
} from "@/features/editor/component-properties";
import type { DesignComponent, DesignLayer } from "@/features/editor/types";

type ComponentInstanceSectionProps = {
  layer: DesignLayer;
  layers: DesignLayer[];
  component: DesignComponent;
  variantName?: string;
  onSelectLayer: (layerId: string) => void;
  onResetComponentInstance: (layerId: string) => void;
  onDetachComponentInstance: (layerId: string) => void;
  onUpdateComponentInstanceProperties: (
    layerId: string,
    properties: Record<string, string>,
  ) => void;
  onSwitchComponentInstanceVariant: (layerId: string, variantId?: string) => void;
};

export function ComponentInstanceSection({
  layer,
  layers,
  component,
  variantName,
  onSelectLayer,
  onResetComponentInstance,
  onDetachComponentInstance,
  onUpdateComponentInstanceProperties,
  onSwitchComponentInstanceVariant,
}: ComponentInstanceSectionProps) {
  const overrideReport = getComponentLayerOverrideReport(layer, component);
  const variant = component.variants?.find(
    (item) => item.id === layer.componentVariantId,
  );
  const propertyValues =
    layer.componentProperties ??
    getComponentInstancePropertyValues(component, variant);

  return (
    <>
      <Separator />
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Instance</Label>
        <div className="rounded-md border border-border bg-background p-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{component.name}</div>
            <div className="truncate font-mono text-[11px] text-muted-foreground">
              {variantName ?? "Main component"}
            </div>
          </div>
          <OverrideSummary
            hasSource={Boolean(overrideReport.sourceLayer)}
            overrides={overrideReport.overrides}
          />
          <ComponentInstancePropertiesSection
            layer={layer}
            component={component}
            propertyValues={propertyValues}
            onUpdateComponentInstanceProperties={
              onUpdateComponentInstanceProperties
            }
            onSwitchComponentInstanceVariant={onSwitchComponentInstanceVariant}
          />
          <ComponentInstanceLayersSection
            layer={layer}
            layers={layers}
            component={component}
            onSelectLayer={onSelectLayer}
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-8 gap-1.5"
              onClick={() => onResetComponentInstance(layer.id)}
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5"
              onClick={() => onDetachComponentInstance(layer.id)}
            >
              <Unlink className="size-3.5" />
              Detach
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function OverrideSummary({
  hasSource,
  overrides,
}: {
  hasSource: boolean;
  overrides: ReturnType<
    typeof getComponentLayerOverrideReport
  >["overrides"];
}) {
  return (
    <div className="mt-2 rounded-sm border border-border/80 bg-muted/20 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Overrides
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {overrides.length}
        </span>
      </div>
      {!hasSource ? (
        <div className="mt-1 text-[11px] text-muted-foreground">
          Source layer unavailable.
        </div>
      ) : overrides.length > 0 ? (
        <div className="mt-2 space-y-1.5">
          {overrides.slice(0, 4).map((override) => (
            <div
              key={override.id}
              className="rounded-sm border border-border/60 bg-background/60 p-1.5 text-[11px]"
            >
              <div className="text-muted-foreground">{override.label}</div>
              <div className="mt-1 grid grid-cols-2 gap-2 font-mono">
                <span className="truncate text-foreground">
                  {override.current}
                </span>
                <span className="truncate text-muted-foreground">
                  {override.source}
                </span>
              </div>
            </div>
          ))}
          {overrides.length > 4 ? (
            <div className="text-[11px] text-muted-foreground">
              +{overrides.length - 4} more
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-1 text-[11px] text-muted-foreground">
          Matches source.
        </div>
      )}
    </div>
  );
}
