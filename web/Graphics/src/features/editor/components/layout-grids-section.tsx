"use client";

import { nanoid } from "nanoid";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  defaultLayoutGrid,
  gridToStyleValue,
  layoutGridAlignmentOptions,
  layoutGridKindOptions,
  layoutGridPresetOptions,
  normalizeLayoutGrid,
  styleToGrid,
} from "@/features/editor/layout-grids";
import type {
  DesignLayer,
  DesignLayoutGrid,
  DesignLayoutGridAlignment,
  DesignLayoutGridKind,
  DesignLayoutGridStyle,
} from "@/features/editor/types";

type LayoutGridsSectionProps = {
  layer: DesignLayer;
  gridStyles: Record<string, DesignLayoutGridStyle>;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
  onUpdateLayoutGridStyles: (
    styles: Record<string, DesignLayoutGridStyle>,
  ) => void;
};

export function LayoutGridsSection({
  layer,
  gridStyles,
  onUpdateLayer,
  onUpdateLayoutGridStyles,
}: LayoutGridsSectionProps) {
  const grids = (layer.layoutGrids ?? []).map(normalizeLayoutGrid);
  const savedStyles = Object.values(gridStyles).sort((first, second) =>
    first.name.localeCompare(second.name),
  );

  function commit(nextGrids: DesignLayoutGrid[]) {
    onUpdateLayer(layer.id, {
      layoutGrids: nextGrids.length > 0 ? nextGrids : undefined,
    });
  }

  function addGrid(
    preset: DesignLayoutGrid | Omit<DesignLayoutGrid, "id" | "visible"> =
      defaultLayoutGrid,
  ) {
    commit([
      ...grids,
      normalizeLayoutGrid({
        ...preset,
        id: nanoid(),
        visible: true,
      }),
    ]);
  }

  function updateGrid(gridId: string, patch: Partial<DesignLayoutGrid>) {
    commit(
      grids.map((grid) =>
        grid.id === gridId ? normalizeLayoutGrid({ ...grid, ...patch }) : grid,
      ),
    );
  }

  function applyStyle(style: DesignLayoutGridStyle) {
    addGrid({
      ...styleToGrid(style),
      id: nanoid(),
      name: style.name,
    });
  }

  function saveStyle(grid: DesignLayoutGrid) {
    const now = new Date().toISOString();
    const styleId = nanoid();

    onUpdateLayoutGridStyles({
      ...gridStyles,
      [styleId]: {
        id: styleId,
        name: grid.name.trim() || "Layout grid style",
        grid: gridToStyleValue(grid),
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  function removeStyle(styleId: string) {
    const remainingStyles = { ...gridStyles };
    delete remainingStyles[styleId];
    onUpdateLayoutGridStyles(remainingStyles);
  }

  function removeGrid(gridId: string) {
    commit(grids.filter((grid) => grid.id !== gridId));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Layout grids
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 gap-1 px-2 text-xs"
          onClick={() => addGrid()}
        >
          <Plus className="size-3" />
          Add
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {layoutGridPresetOptions.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant="secondary"
            className="h-7 px-2 text-xs"
            onClick={() => addGrid(preset.grid)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {savedStyles.length > 0 ? (
        <div className="space-y-2 rounded-md border border-border bg-background/40 p-2">
          <div className="text-xs font-medium text-muted-foreground">
            Saved grid styles
          </div>
          <div className="space-y-1">
            {savedStyles.map((style) => (
              <div key={style.id} className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-7 min-w-0 flex-1 justify-start px-2 text-xs"
                  onClick={() => applyStyle(style)}
                >
                  <span className="truncate">{style.name}</span>
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${style.name} grid style`}
                  onClick={() => removeStyle(style.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {grids.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground">
          Add columns, rows, or a square grid to this frame.
        </div>
      ) : null}

      <div className="space-y-3">
        {grids.map((grid) => (
          <div
            key={grid.id}
            className="space-y-3 rounded-md border border-border bg-background/40 p-2"
          >
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                aria-label={grid.visible ? "Hide layout grid" : "Show layout grid"}
                onClick={() => updateGrid(grid.id, { visible: !grid.visible })}
              >
                {grid.visible ? (
                  <Eye className="size-3.5" />
                ) : (
                  <EyeOff className="size-3.5" />
                )}
              </Button>
              <Input
                value={grid.name}
                className="h-8"
                onChange={(event) =>
                  updateGrid(grid.id, { name: event.target.value })
                }
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Remove layout grid"
                onClick={() => removeGrid(grid.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-7 w-full text-xs"
              onClick={() => saveStyle(grid)}
            >
              Save as reusable grid style
            </Button>

            <div className="grid grid-cols-2 gap-2">
              <SelectField<DesignLayoutGridKind>
                label="Type"
                value={grid.kind}
                options={layoutGridKindOptions}
                onChange={(kind) => updateGrid(grid.id, { kind })}
              />
              <SelectField<DesignLayoutGridAlignment>
                label="Align"
                value={grid.alignment}
                options={layoutGridAlignmentOptions}
                onChange={(alignment) => updateGrid(grid.id, { alignment })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {grid.kind === "grid" ? (
                <NumberField
                  label="Size"
                  value={grid.size}
                  min={1}
                  onChange={(size) => updateGrid(grid.id, { size })}
                />
              ) : (
                <NumberField
                  label="Count"
                  value={grid.count}
                  min={1}
                  onChange={(count) => updateGrid(grid.id, { count })}
                />
              )}
              <NumberField
                label="Gutter"
                value={grid.gutter}
                min={0}
                onChange={(gutter) => updateGrid(grid.id, { gutter })}
              />
              <NumberField
                label="Margin"
                value={grid.margin}
                min={0}
                onChange={(margin) => updateGrid(grid.id, { margin })}
              />
              <NumberField
                label="Opacity"
                value={Math.round(grid.opacity * 100)}
                min={2}
                max={100}
                onChange={(opacity) => updateGrid(grid.id, { opacity: opacity / 100 })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Color</Label>
              <ColorPicker
                value={grid.color}
                onChange={(color) => updateGrid(grid.id, { color })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SelectField<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: TValue;
  options: ReadonlyArray<{ value: TValue; label: string }>;
  onChange: (value: TValue) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        value={value}
        onValueChange={(nextValue) => onChange(nextValue as TValue)}
      >
        <SelectTrigger className="h-8 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <NumberInput value={value} min={min} max={max} onChange={onChange} />
    </div>
  );
}
