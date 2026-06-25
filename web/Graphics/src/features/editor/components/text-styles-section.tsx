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
  createTextStyleFromLayer,
  getTextStyleLayerPatch,
} from "@/features/editor/text-styles";
import type {
  DesignLayer,
  DesignTextStyle,
} from "@/features/editor/types";

type TextStylesSectionProps = {
  layer: DesignLayer;
  textStyles: Record<string, DesignTextStyle>;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
  onUpdateTextStyles: (styles: Record<string, DesignTextStyle>) => void;
};

export function TextStylesSection({
  layer,
  textStyles,
  onUpdateLayer,
  onUpdateTextStyles,
}: TextStylesSectionProps) {
  const savedStyles = Object.values(textStyles).sort((first, second) =>
    first.name.localeCompare(second.name),
  );

  function applyStyle(styleId: string) {
    const style = textStyles[styleId];

    if (!style) {
      return;
    }

    onUpdateLayer(layer.id, getTextStyleLayerPatch(style));
  }

  function saveStyle() {
    const styleId = nanoid();

    onUpdateTextStyles({
      ...textStyles,
      [styleId]: createTextStyleFromLayer(
        styleId,
        `${layer.name || "Text"} ${savedStyles.length + 1}`,
        layer,
      ),
    });
  }

  function removeStyle(styleId: string) {
    const remainingStyles = { ...textStyles };
    delete remainingStyles[styleId];
    onUpdateTextStyles(remainingStyles);
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Select value="" onValueChange={applyStyle}>
          <SelectTrigger className="h-8 min-w-0">
            <SelectValue placeholder="Apply text style" />
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
                No saved text styles
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
        <div className="flex flex-wrap gap-1">
          {savedStyles.slice(0, 6).map((style) => (
            <div
              key={style.id}
              className="flex h-6 max-w-full items-center overflow-hidden rounded-md border border-border bg-background text-[11px]"
            >
              <button
                type="button"
                className="min-w-0 px-1.5 text-left text-muted-foreground hover:text-foreground"
                onClick={() => applyStyle(style.id)}
              >
                <span className="block max-w-28 truncate">{style.name}</span>
              </button>
              <button
                type="button"
                className="grid h-full w-5 place-items-center text-muted-foreground/70 hover:text-destructive"
                aria-label={`Remove ${style.name} text style`}
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
