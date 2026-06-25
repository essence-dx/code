"use client";

import { ChartControls } from "@/features/editor/components/chart-controls";
import { EmbedControls } from "@/features/editor/components/embed-controls";
import { FormControls } from "@/features/editor/components/form-controls";
import { QrCodeControls } from "@/features/editor/components/qr-code-controls";
import { TableControls } from "@/features/editor/components/table-controls";
import { TimerControls } from "@/features/editor/components/timer-controls";
import type { EditorColorPalette } from "@/features/editor/color-palettes";
import type { DesignElement } from "@/features/editor/types";

export function DataInteractiveControls({
  element,
  pageElements,
  palettes,
  onUpdateElement,
}: {
  element: DesignElement;
  pageElements?: readonly DesignElement[];
  palettes: readonly EditorColorPalette[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  if (element.type === "qr") {
    return (
      <QrCodeControls
        element={element}
        palettes={palettes}
        onUpdateElement={onUpdateElement}
      />
    );
  }

  if (element.type === "table") {
    return (
      <TableControls
        element={element}
        palettes={palettes}
        onUpdateElement={onUpdateElement}
      />
    );
  }

  if (element.type === "chart") {
    return (
      <ChartControls
        element={element}
        pageElements={pageElements}
        palettes={palettes}
        onUpdateElement={onUpdateElement}
      />
    );
  }

  if (element.type === "form") {
    return (
      <FormControls
        element={element}
        palettes={palettes}
        onUpdateElement={onUpdateElement}
      />
    );
  }

  if (element.type === "embed") {
    return (
      <EmbedControls
        element={element}
        palettes={palettes}
        onUpdateElement={onUpdateElement}
      />
    );
  }

  if (element.type === "timer") {
    return (
      <TimerControls
        element={element}
        palettes={palettes}
        onUpdateElement={onUpdateElement}
      />
    );
  }

  return null;
}
