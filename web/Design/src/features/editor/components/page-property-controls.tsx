"use client";

import { Input } from "@/components/ui/input";
import { BrandColorControls } from "@/features/editor/components/brand-color-controls";
import { ColorPalettePicker } from "@/features/editor/components/color-palette-picker";
import { Field } from "@/features/editor/components/property-fields";
import {
  type EditorColorPalette,
  editorColorPalettes,
} from "@/features/editor/color-palettes";
import type { BrandColorSummary, DesignElement } from "@/features/editor/types";

export function PagePropertyControls({
  selectedElement,
  pageBackground,
  palettes,
  onBackgroundChange,
  onCreateBrandColor,
}: {
  selectedElement: DesignElement | null;
  pageBackground: string;
  palettes: readonly EditorColorPalette[];
  onBackgroundChange: (color: string) => void;
  onCreateBrandColor: (color: string) => void;
}) {
  const currentColor = getSelectedColor(selectedElement, pageBackground);

  return (
    <>
      <Field label="Page background">
        <div className="flex min-w-0 items-start gap-2">
          <Input
            type="color"
            value={pageBackground}
            className="h-7 w-7 shrink-0 rounded-md border-border p-0"
            onChange={(event) => onBackgroundChange(event.target.value)}
          />
          <ColorPalettePicker
            className="min-w-0 flex-1"
            selectedColor={pageBackground}
            palettes={palettes}
            onSelectColor={onBackgroundChange}
          />
        </div>
      </Field>
      <BrandColorControls
        key={currentColor}
        currentColor={currentColor}
        onCreateBrandColor={onCreateBrandColor}
      />
    </>
  );
}

export function getPalettesWithBrandColors(
  brandColors: BrandColorSummary[],
): readonly EditorColorPalette[] {
  if (brandColors.length === 0) {
    return editorColorPalettes;
  }

  return [
    {
      name: "Brand",
      colors: brandColors.map((item) => item.color),
    },
    ...editorColorPalettes,
  ];
}

function getSelectedColor(
  selectedElement: DesignElement | null,
  pageBackground: string,
) {
  if (selectedElement?.type === "text") {
    return selectedElement.color;
  }

  if (selectedElement?.type === "shape") {
    return selectedElement.fill;
  }

  if (selectedElement?.type === "sticky-note") {
    return selectedElement.fill;
  }

  if (selectedElement?.type === "connector") {
    return selectedElement.stroke;
  }

  if (selectedElement?.type === "qr") {
    return selectedElement.qrForeground;
  }

  if (selectedElement?.type === "svg") {
    return selectedElement.fillColor;
  }

  if (selectedElement?.type === "lottie") {
    return selectedElement.backgroundColor;
  }

  if (selectedElement?.type === "table") {
    return selectedElement.textColor;
  }

  if (selectedElement?.type === "chart") {
    return selectedElement.textColor;
  }

  if (selectedElement?.type === "form") {
    return selectedElement.accentColor;
  }

  if (selectedElement?.type === "embed") {
    return selectedElement.accentColor;
  }

  if (selectedElement?.type === "timer") {
    return selectedElement.accentColor;
  }

  if (selectedElement?.type === "audio") {
    return selectedElement.accentColor;
  }

  if (selectedElement?.type === "pdf") {
    return selectedElement.accentColor;
  }

  return pageBackground;
}
