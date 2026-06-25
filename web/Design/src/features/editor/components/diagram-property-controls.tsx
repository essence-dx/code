"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ColorPalettePicker } from "@/features/editor/components/color-palette-picker";
import {
  Field,
  NumberField,
} from "@/features/editor/components/property-fields";
import type { EditorColorPalette } from "@/features/editor/color-palettes";
import type { DesignElement } from "@/features/editor/types";

type ControlsProps<T extends DesignElement> = {
  element: T;
  palettes: readonly EditorColorPalette[];
  pageElements?: readonly DesignElement[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
};

export function StickyNoteControls({
  element,
  palettes,
  onUpdateElement,
}: ControlsProps<Extract<DesignElement, { type: "sticky-note" }>>) {
  return (
    <div className="space-y-4">
      <Field label="Note">
        <Textarea
          value={element.content}
          onChange={(event) =>
            onUpdateElement({
              content: event.target.value,
            } as Partial<DesignElement>)
          }
        />
      </Field>
      <ColorField
        label="Fill"
        value={element.fill}
        palettes={palettes}
        onChange={(fill) =>
          onUpdateElement({ fill } as Partial<DesignElement>)
        }
      />
      <ColorField
        label="Text"
        value={element.textColor}
        palettes={palettes}
        onChange={(textColor) =>
          onUpdateElement({ textColor } as Partial<DesignElement>)
        }
      />
      <ColorField
        label="Accent"
        value={element.accentColor}
        palettes={palettes}
        onChange={(accentColor) =>
          onUpdateElement({ accentColor } as Partial<DesignElement>)
        }
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Text size"
          value={element.fontSize}
          min={8}
          max={96}
          onChange={(fontSize) =>
            onUpdateElement({ fontSize } as Partial<DesignElement>)
          }
        />
        <NumberField
          label="Radius"
          value={element.radius}
          min={0}
          max={48}
          onChange={(radius) =>
            onUpdateElement({ radius } as Partial<DesignElement>)
          }
        />
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  palettes,
  onChange,
}: {
  label: string;
  value: string;
  palettes: readonly EditorColorPalette[];
  onChange: (color: string) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <ColorPalettePicker
        selectedColor={value}
        palettes={palettes}
        onSelectColor={onChange}
      />
    </Field>
  );
}
