"use client";

import { Layers3, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  componentSlotTypeLabels,
  getComponentInstanceSlotRows,
} from "@/features/editor/component-slots";
import { getComponentLayerOverrideReport } from "@/features/editor/component-overrides";
import type { DesignComponent, DesignLayer } from "@/features/editor/types";

type ComponentInstanceLayersSectionProps = {
  layer: DesignLayer;
  layers: DesignLayer[];
  component: DesignComponent;
  onSelectLayer: (layerId: string) => void;
};

export function ComponentInstanceLayersSection({
  layer,
  layers,
  component,
  onSelectLayer,
}: ComponentInstanceLayersSectionProps) {
  const rows = getComponentInstanceSlotRows(layers, layer, component);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 rounded-sm border border-border/80 bg-muted/20 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Layers3 className="size-3.5" />
          <span>Nested layers</span>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {rows.length}
        </span>
      </div>
      <div className="mt-2 space-y-1">
        {rows.map((row) => {
          const isSelected = row.layer.id === layer.id;
          const overrideCount = getComponentLayerOverrideReport(
            row.layer,
            component,
          ).overrides.length;

          return (
            <Button
              key={row.layer.id}
              type="button"
              variant={isSelected ? "secondary" : "ghost"}
              className="h-auto w-full justify-start px-2 py-1.5 text-left"
              onClick={() => onSelectLayer(row.layer.id)}
            >
              <MousePointer2 className="mr-2 size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">
                  {row.slotName}
                </span>
                <span className="block truncate font-mono text-[10px] text-muted-foreground">
                  {componentSlotTypeLabels[row.slotType]} slot /{" "}
                  {overrideCount} overrides
                </span>
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
