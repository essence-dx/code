"use client";

import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import {
  createLayerPaint,
  getFillPaintLayerPatch,
  getLayerFillPaints,
  getLayerStrokePaints,
  getStrokePaintLayerPatch,
  parseLinearGradient,
  setLinearGradientStop,
} from "@/features/editor/paint-stack";
import type { DesignLayer, DesignPaint } from "@/features/editor/types";

type FillPaintStackSectionProps = {
  layer: DesignLayer;
  kind?: "fill" | "stroke";
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
};

export function FillPaintStackSection({
  kind = "fill",
  layer,
  onUpdateLayer,
}: FillPaintStackSectionProps) {
  const isStroke = kind === "stroke";
  const paints = isStroke ? getLayerStrokePaints(layer) : getLayerFillPaints(layer);
  const label = isStroke ? "Stroke paint stack" : "Fill paint stack";
  const itemLabel = isStroke ? "Stroke" : "Fill";

  function commit(nextPaints: DesignPaint[]) {
    onUpdateLayer(layer.id, {
      ...(isStroke
        ? getStrokePaintLayerPatch(nextPaints)
        : getFillPaintLayerPatch(nextPaints)),
      ...(isStroke && layer.strokeWidth <= 0 ? { strokeWidth: 1 } : {}),
    });
  }

  function updatePaint(paintId: string, patch: Partial<DesignPaint>) {
    commit(
      paints.map((paint) =>
        paint.id === paintId
          ? {
              ...paint,
              ...patch,
            }
          : paint,
      ),
    );
  }

  function movePaint(index: number, offset: -1 | 1) {
    const nextPaints = [...paints];
    const nextIndex = index + offset;

    if (!nextPaints[index] || nextIndex < 0 || nextIndex >= nextPaints.length) {
      return;
    }

    const [paint] = nextPaints.splice(index, 1);
    nextPaints.splice(nextIndex, 0, paint);
    commit(nextPaints);
  }

  function duplicatePaint(paint: DesignPaint, index: number) {
    const nextPaints = [...paints];
    nextPaints.splice(
      index,
      0,
      createLayerPaint(paint.value, {
        name: paint.name ? `${paint.name} copy` : "Paint copy",
        visible: paint.visible,
        opacity: paint.opacity,
        blendMode: paint.blendMode,
      }),
    );
    commit(nextPaints);
  }

  function removePaint(index: number) {
    const nextPaints = paints.filter((_, paintIndex) => paintIndex !== index);

    commit(nextPaints.length > 0 ? nextPaints : [createLayerPaint("transparent")]);
  }

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Button
          type="button"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() =>
            commit([
              createLayerPaint(isStroke ? layer.stroke : layer.fill, {
                name: `${itemLabel} ${paints.length + 1}`,
                blendMode: isStroke ? "normal" : layer.blendMode,
              }),
              ...paints,
            ])
          }
        >
          <Plus className="size-3.5" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {paints.map((paint, index) => (
          <div
            key={paint.id}
            className="space-y-2 rounded-md border border-border bg-background/40 p-2"
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="grid size-7 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"
                aria-label={paint.visible ? "Hide paint" : "Show paint"}
                onClick={() => updatePaint(paint.id, { visible: !paint.visible })}
              >
                {paint.visible ? (
                  <Eye className="size-3.5" />
                ) : (
                  <EyeOff className="size-3.5" />
                )}
              </button>
              <Input
                value={paint.name ?? `${itemLabel} ${index + 1}`}
                className="h-7 min-w-0 text-xs"
                aria-label={`${itemLabel} paint ${index + 1} name`}
                onChange={(event) =>
                  updatePaint(paint.id, { name: event.target.value })
                }
              />
              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  label="Move paint up"
                  disabled={index === 0}
                  onClick={() => movePaint(index, -1)}
                >
                  <ArrowUp className="size-3.5" />
                </IconButton>
                <IconButton
                  label="Move paint down"
                  disabled={index === paints.length - 1}
                  onClick={() => movePaint(index, 1)}
                >
                  <ArrowDown className="size-3.5" />
                </IconButton>
              </div>
            </div>

            <ColorPicker
              value={paint.value}
              blendMode={paint.blendMode ?? "normal"}
              onChange={(value) => updatePaint(paint.id, { value })}
              onBlendModeChange={(blendMode) =>
                updatePaint(paint.id, { blendMode })
              }
              aria-label={`Paint ${index + 1}`}
            />

            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                  Opacity
                </Label>
                <NumberInput
                  value={Math.round(paint.opacity * 100)}
                  min={0}
                  max={100}
                  onChange={(opacity) =>
                    updatePaint(paint.id, {
                      opacity: Math.min(1, Math.max(0, opacity / 100)),
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-1 pb-px">
                <IconButton
                  label="Duplicate paint"
                  onClick={() => duplicatePaint(paint, index)}
                >
                  <Copy className="size-3.5" />
                </IconButton>
                <IconButton
                  label="Remove paint"
                  onClick={() => removePaint(index)}
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
            </div>

            <GradientStopsEditor
              paint={paint}
              onChange={(value) => updatePaint(paint.id, { value })}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function GradientStopsEditor({
  paint,
  onChange,
}: {
  paint: DesignPaint;
  onChange: (value: string) => void;
}) {
  const gradient = parseLinearGradient(paint.value);

  if (!gradient) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-md border border-border/70 bg-card/50 p-2">
      <div className="text-[11px] font-medium text-muted-foreground">
        Gradient stops
      </div>
      {gradient.stops.map((stop, index) => (
        <div
          key={`${stop.color}-${index}`}
          className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-end gap-2"
        >
          <ColorPicker
            value={stop.color}
            onChange={(color) =>
              onChange(
                setLinearGradientStop(
                  paint.value,
                  index,
                  color,
                  stop.position,
                ),
              )
            }
            aria-label={`Gradient stop ${index + 1}`}
          />
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Stop</Label>
            <NumberInput
              value={stop.position}
              min={0}
              max={100}
              onChange={(position) =>
                onChange(
                  setLinearGradientStop(
                    paint.value,
                    index,
                    stop.color,
                    position,
                  ),
                )
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7"
      disabled={disabled}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
