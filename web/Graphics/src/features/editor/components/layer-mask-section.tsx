"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import {
  centerLayerMask,
  fitLayerMaskToLayer,
} from "@/features/editor/vector-operations";
import type { DesignLayer, DesignLayerMask } from "@/features/editor/types";

type LayerMaskSectionProps = {
  layer: DesignLayer;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
};

export function LayerMaskSection({
  layer,
  onUpdateLayer,
}: LayerMaskSectionProps) {
  if (!layer.mask && !layer.maskSource) {
    return null;
  }

  if (layer.maskSource) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() =>
          onUpdateLayer(layer.id, {
            maskSource: false,
            visible: true,
          })
        }
      >
        Show mask source
      </Button>
    );
  }

  const mask = layer.mask;

  if (!mask) {
    return null;
  }

  function updateMask(patch: Partial<DesignLayerMask>) {
    if (!mask) {
      return;
    }

    onUpdateLayer(layer.id, {
      mask: {
        ...mask,
        ...patch,
      },
    });
  }

  function fitMask() {
    const nextMask = fitLayerMaskToLayer(layer);

    if (nextMask) {
      onUpdateLayer(layer.id, { mask: nextMask });
    }
  }

  function centerMask() {
    const nextMask = centerLayerMask(layer);

    if (nextMask) {
      onUpdateLayer(layer.id, { mask: nextMask });
    }
  }

  const canEditBounds = mask.kind !== "path";

  return (
    <section className="space-y-3 rounded-md border border-border bg-background/60 p-3">
      <div className="space-y-1">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Mask
        </div>
        <div className="text-xs text-muted-foreground">
          {mask.sourceName ?? "Selection mask"} / {mask.kind}
        </div>
      </div>

      {canEditBounds ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <MaskNumberField
              label="X"
              value={mask.x}
              onChange={(x) => updateMask({ x })}
            />
            <MaskNumberField
              label="Y"
              value={mask.y}
              onChange={(y) => updateMask({ y })}
            />
            <MaskNumberField
              label="W"
              value={mask.width}
              min={1}
              onChange={(width) => updateMask({ width })}
            />
            <MaskNumberField
              label="H"
              value={mask.height}
              min={1}
              onChange={(height) => updateMask({ height })}
            />
          </div>

          {mask.kind === "rectangle" ? (
            <MaskNumberField
              label="Radius"
              value={mask.cornerRadius ?? 0}
              min={0}
              onChange={(cornerRadius) => updateMask({ cornerRadius })}
            />
          ) : null}

          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" onClick={fitMask}>
              Fit
            </Button>
            <Button type="button" variant="secondary" onClick={centerMask}>
              Center
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-md border border-border bg-card p-2 text-xs text-muted-foreground">
          Path masks keep their original vector outline.
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => onUpdateLayer(layer.id, { mask: undefined })}
      >
        Release mask
      </Button>
    </section>
  );
}

function MaskNumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <NumberInput
        value={Number.isFinite(value) ? value : 0}
        min={min}
        onChange={onChange}
      />
    </div>
  );
}
