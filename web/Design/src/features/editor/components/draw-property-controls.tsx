"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorPalettePicker } from "@/features/editor/components/color-palette-picker";
import {
  AdjustmentSlider,
  Field,
} from "@/features/editor/components/property-fields";
import type { EditorColorPalette } from "@/features/editor/color-palettes";
import { drawToolLabels } from "@/features/editor/draw-strokes";
import type {
  DesignElement,
  DrawElement,
  DrawTool,
} from "@/features/editor/types";

const drawTools = ["pen", "highlighter", "eraser"] satisfies DrawTool[];

export function DrawControls({
  element,
  palettes,
  onUpdateElement,
}: {
  element: DrawElement;
  palettes: readonly EditorColorPalette[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  return (
    <Field label="Stroke">
      <div className="space-y-4">
        <Field label="Tool">
          <Select
            value={element.tool}
            onValueChange={(tool) =>
              onUpdateElement({ tool: tool as DrawTool } as Partial<DesignElement>)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {drawTools.map((tool) => (
                <SelectItem key={tool} value={tool}>
                  {drawToolLabels[tool]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Color">
          <Input
            type="color"
            value={element.stroke}
            onChange={(event) =>
              onUpdateElement({
                stroke: event.target.value,
              } as Partial<DesignElement>)
            }
          />
          <ColorPalettePicker
            selectedColor={element.stroke}
            palettes={palettes}
            onSelectColor={(stroke) =>
              onUpdateElement({ stroke } as Partial<DesignElement>)
            }
          />
        </Field>

        <AdjustmentSlider
          label="Width"
          value={element.strokeWidth}
          min={1}
          max={96}
          suffix="px"
          onChange={(strokeWidth) =>
            onUpdateElement({ strokeWidth } as Partial<DesignElement>)
          }
        />
        <AdjustmentSlider
          label="Stroke opacity"
          value={Math.round(element.strokeOpacity * 100)}
          min={0}
          max={100}
          suffix="%"
          onChange={(strokeOpacity) =>
            onUpdateElement({
              strokeOpacity: strokeOpacity / 100,
            } as Partial<DesignElement>)
          }
        />
      </div>
    </Field>
  );
}
