import { updateActivePage } from "@/features/editor/editor-operations";
import type { StylePreset } from "@/features/editor/style-presets";
import type {
  ChartDataPoint,
  DesignDocument,
  DesignElement,
} from "@/features/editor/types";

export function applyStylePresetToActivePage(
  document: DesignDocument,
  preset: StylePreset,
): DesignDocument {
  return updateActivePage(document, (page) => ({
    ...page,
    background: preset.background,
    elements: page.elements.map((element, index) =>
      element.locked ? element : applyElementStyle(element, preset, index),
    ),
  }));
}

function applyElementStyle(
  element: DesignElement,
  preset: StylePreset,
  index: number,
): DesignElement {
  if (element.type === "text") {
    const isHeading = element.fontSize >= 32 || element.fontWeight >= 700;

    return {
      ...element,
      fontFamily: preset.fontFamily,
      fontWeight: isHeading ? preset.headingWeight : preset.bodyWeight,
      color: isHeading ? preset.primary : preset.text,
      textGradientEnabled: false,
      textEffectColor: preset.accent,
    };
  }

  if (element.type === "document") {
    return {
      ...element,
      fontFamily: preset.fontFamily,
      textColor: preset.text,
      headingColor: preset.primary,
      surfaceColor: preset.surface,
      borderColor: preset.border,
    };
  }

  if (element.type === "shape") {
    if (element.shape === "line") {
      return {
        ...element,
        stroke: preset.primary,
      };
    }

    return {
      ...element,
      fill: getCycleColor(preset, index),
      stroke: preset.border,
      strokeWidth: element.strokeWidth > 0 ? element.strokeWidth : 1,
    };
  }

  if (element.type === "sticky-note") {
    return {
      ...element,
      fill: preset.surface,
      textColor: preset.text,
      accentColor: getCycleColor(preset, index),
      fontFamily: preset.fontFamily,
      fontWeight: preset.headingWeight,
    };
  }

  if (element.type === "connector") {
    return {
      ...element,
      stroke: getCycleColor(preset, index),
      labelColor: preset.text,
    };
  }

  if (element.type === "svg") {
    return {
      ...element,
      preserveColors: false,
      fillColor: getCycleColor(preset, index),
      strokeColor: preset.text,
    };
  }

  if (element.type === "qr") {
    return {
      ...element,
      qrForeground: preset.text,
      qrBackground: preset.surface,
    };
  }

  if (element.type === "table") {
    return {
      ...element,
      fontFamily: preset.fontFamily,
      fontWeight: preset.bodyWeight,
      textColor: preset.text,
      headerFill: preset.primary,
      bodyFill: preset.surface,
      borderColor: preset.border,
    };
  }

  if (element.type === "chart") {
    return {
      ...element,
      backgroundColor: preset.surface,
      textColor: preset.text,
      axisColor: preset.border,
      data: element.data.map((point, pointIndex) =>
        restyleChartPoint(point, preset, pointIndex),
      ),
    };
  }

  if (element.type === "form") {
    return {
      ...element,
      fontFamily: preset.fontFamily,
      fontWeight: preset.bodyWeight,
      textColor: element.fieldKind === "button" ? preset.surface : preset.text,
      surfaceColor: preset.surface,
      fieldColor: preset.background,
      borderColor: preset.border,
      accentColor: preset.primary,
    };
  }

  if (element.type === "embed") {
    return {
      ...element,
      fontFamily: preset.fontFamily,
      fontWeight: preset.headingWeight,
      textColor: preset.text,
      surfaceColor: preset.surface,
      borderColor: preset.border,
      accentColor: preset.primary,
    };
  }

  if (element.type === "timer") {
    return {
      ...element,
      fontFamily: preset.fontFamily,
      fontWeight: preset.headingWeight,
      textColor: preset.text,
      surfaceColor: preset.surface,
      borderColor: preset.border,
      accentColor: preset.primary,
    };
  }

  if (element.type === "audio") {
    return {
      ...element,
      textColor: preset.text,
      surfaceColor: preset.surface,
      borderColor: preset.border,
      accentColor: preset.primary,
    };
  }

  if (element.type === "pdf") {
    return {
      ...element,
      textColor: preset.text,
      surfaceColor: preset.surface,
      borderColor: preset.border,
      accentColor: preset.primary,
    };
  }

  return element;
}

function restyleChartPoint(
  point: ChartDataPoint,
  preset: StylePreset,
  index: number,
) {
  return {
    ...point,
    color: preset.chartColors[index % preset.chartColors.length],
  };
}

function getCycleColor(preset: StylePreset, index: number) {
  const colors = [preset.primary, preset.secondary, preset.accent];

  return colors[index % colors.length];
}
