"use client";

import { Input } from "@/components/ui/input";
import { FillStyleControls } from "@/features/editor/components/fill-style-controls";
import {
  Field,
  NumberField,
} from "@/features/editor/components/property-fields";
import type { EditorColorPalette } from "@/features/editor/color-palettes";
import type { DesignElement, ShapeElement } from "@/features/editor/types";

export function ShapeControls({
  element,
  palettes,
  onUpdateElement,
}: {
  element: ShapeElement;
  palettes: readonly EditorColorPalette[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  return (
    <div className="space-y-4">
      <FillStyleControls
        element={element}
        palettes={palettes}
        disabled={element.shape === "line"}
        onUpdateElement={onUpdateElement}
      />
      <Field label="Stroke">
        <Input
          type="color"
          value={element.stroke === "transparent" ? "#000000" : element.stroke}
          onChange={(event) =>
            onUpdateElement({
              stroke: event.target.value,
            } as Partial<DesignElement>)
          }
        />
      </Field>
      <NumberField
        label="Stroke width"
        value={element.strokeWidth}
        min={0}
        onChange={(strokeWidth) =>
          onUpdateElement({ strokeWidth } as Partial<DesignElement>)
        }
      />
      <NumberField
        label="Radius"
        value={element.radius}
        min={0}
        onChange={(radius) =>
          onUpdateElement({ radius } as Partial<DesignElement>)
        }
      />
    </div>
  );
}
