"use client";

import { Button } from "@/components/ui/button";
import {
  type EditorColorPalette,
  editorColorPalettes,
} from "@/features/editor/color-palettes";
import { cn } from "@/lib/utils";

type ColorPalettePickerProps = {
  selectedColor?: string;
  palettes?: readonly EditorColorPalette[];
  onSelectColor: (color: string) => void;
  className?: string;
};

export function ColorPalettePicker({
  selectedColor,
  palettes = editorColorPalettes,
  onSelectColor,
  className,
}: ColorPalettePickerProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {palettes.map((palette) => (
        <div
          key={palette.name}
          className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2"
        >
          <div className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {palette.name}
          </div>
          <div className="flex min-w-0 flex-wrap gap-1">
            {palette.colors.map((color) => {
              const isSelected = sameColor(selectedColor, color);

              return (
                <Button
                  key={`${palette.name}-${color}`}
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className={cn(
                    "h-5 w-5 rounded-sm border-border p-0 shadow-none",
                    isSelected && "ring-2 ring-ring ring-offset-1",
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Use ${color} from ${palette.name} palette`}
                  aria-pressed={isSelected}
                  onClick={() => onSelectColor(color)}
                >
                  <span className="sr-only">{color}</span>
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function sameColor(left?: string, right?: string) {
  return left?.toLowerCase() === right?.toLowerCase();
}
