"use client";

import { nanoid } from "nanoid";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createLayoutPresetStyleFromFrame,
  getLayoutPresetLayerPatch,
  getLayoutPresetSummary,
} from "@/features/editor/layout-preset-styles";
import { getLayerSizing } from "@/features/editor/auto-layout";
import type {
  DesignLayer,
  DesignLayoutPresetStyle,
} from "@/features/editor/types";

type LayoutPresetStylesSectionProps = {
  frame: DesignLayer;
  layoutPresetStyles: Record<string, DesignLayoutPresetStyle>;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
  onUpdateLayoutPresetStyles: (
    styles: Record<string, DesignLayoutPresetStyle>,
  ) => void;
};

export function LayoutPresetStylesSection({
  frame,
  layoutPresetStyles,
  onUpdateLayer,
  onUpdateLayoutPresetStyles,
}: LayoutPresetStylesSectionProps) {
  const savedStyles = Object.values(layoutPresetStyles).sort((first, second) =>
    first.name.localeCompare(second.name),
  );
  const sizing = getLayerSizing(frame);
  const currentSummary = frame.autoLayout
    ? `${frame.autoLayout.mode} / ${frame.autoLayout.wrap ?? "nowrap"} / ${
        sizing.horizontal
      } x ${sizing.vertical}`
    : `No auto layout / ${sizing.horizontal} x ${sizing.vertical}`;

  function applyStyle(styleId: string) {
    const style = layoutPresetStyles[styleId];

    if (!style) {
      return;
    }

    onUpdateLayer(frame.id, getLayoutPresetLayerPatch(style));
  }

  function saveStyle() {
    const styleId = nanoid();

    onUpdateLayoutPresetStyles({
      ...layoutPresetStyles,
      [styleId]: createLayoutPresetStyleFromFrame(
        styleId,
        `${frame.name || "Frame"} layout ${savedStyles.length + 1}`,
        frame,
      ),
    });
  }

  function removeStyle(styleId: string) {
    const remainingStyles = { ...layoutPresetStyles };
    delete remainingStyles[styleId];
    onUpdateLayoutPresetStyles(remainingStyles);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Layout presets
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">
          {savedStyles.length}
        </span>
      </div>
      <div className="rounded-md border border-border bg-background/40 px-2 py-1.5 text-[11px] text-muted-foreground">
        {currentSummary}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Select value="" onValueChange={applyStyle}>
          <SelectTrigger className="h-8 min-w-0">
            <SelectValue placeholder="Apply layout preset" />
          </SelectTrigger>
          <SelectContent>
            {savedStyles.length > 0 ? (
              savedStyles.map((style) => (
                <SelectItem key={style.id} value={style.id}>
                  {style.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="__empty" disabled>
                No saved layout presets
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          className="h-8 px-2 text-xs"
          onClick={saveStyle}
        >
          Save
        </Button>
      </div>
      {savedStyles.length > 0 ? (
        <div className="space-y-1">
          {savedStyles.slice(0, 6).map((style) => (
            <div
              key={style.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-md border border-border bg-background text-[11px]"
            >
              <button
                type="button"
                className="min-w-0 px-2 py-1.5 text-left hover:bg-muted"
                onClick={() => applyStyle(style.id)}
              >
                <span className="block truncate text-foreground">
                  {style.name}
                </span>
                <span className="block truncate text-muted-foreground">
                  {getLayoutPresetSummary(style)}
                </span>
              </button>
              <button
                type="button"
                className="grid w-7 place-items-center text-muted-foreground/70 hover:text-destructive"
                aria-label={`Remove ${style.name} layout preset`}
                onClick={() => removeStyle(style.id)}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
