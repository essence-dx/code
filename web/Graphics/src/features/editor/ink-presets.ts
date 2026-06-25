import { nanoid } from "nanoid";
import { createLayerPaint } from "@/features/editor/paint-stack";
import type {
  DesignInkPresetKind,
  DesignLayer,
} from "@/features/editor/types";

export const inkPresetOptions = [
  {
    value: "marker",
    label: "Marker",
    color: "#fb7185",
    width: 7,
    opacity: 0.92,
    blendMode: "normal",
    pathData: "M 6 76 C 38 18 84 20 112 56 C 139 91 177 89 214 18",
  },
  {
    value: "highlighter",
    label: "Highlighter",
    color: "#fde047",
    width: 18,
    opacity: 0.5,
    blendMode: "multiply",
    pathData: "M 8 54 C 48 48 84 52 118 46 C 150 40 184 44 216 38",
  },
] satisfies Array<{
  value: DesignInkPresetKind;
  label: string;
  color: string;
  width: number;
  opacity: number;
  blendMode: string;
  pathData: string;
}>;

export function createInkPresetLayer(
  kind: DesignInkPresetKind,
  selectedLayers: DesignLayer[],
  pageLayers: DesignLayer[],
): DesignLayer {
  const option = getInkPresetOption(kind);
  const point = getInkPresetPoint(selectedLayers, pageLayers);

  return {
    id: nanoid(),
    type: "path",
    name: `${option.label} annotation`,
    x: point.x,
    y: point.y,
    width: 224,
    height: 96,
    rotation: 0,
    opacity: option.opacity,
    visible: true,
    locked: false,
    fill: "transparent",
    fillPaints: [createLayerPaint("transparent")],
    stroke: option.color,
    strokeWidth: option.width,
    strokeLineCap: "round",
    strokeLineJoin: "round",
    cornerRadius: 0,
    blendMode: option.blendMode,
    pathData: option.pathData,
    pathViewBox: {
      x: 0,
      y: 0,
      width: 224,
      height: 96,
    },
    fillRule: "nonzero",
    inkPreset: {
      kind,
      color: option.color,
      width: option.width,
      opacity: option.opacity,
    },
  };
}

export function getInkPresetLayerPatch(
  kind: DesignInkPresetKind,
): Partial<DesignLayer> {
  const option = getInkPresetOption(kind);

  return {
    fill: "transparent",
    fillPaints: [createLayerPaint("transparent")],
    stroke: option.color,
    strokeWidth: option.width,
    strokeLineCap: "round",
    strokeLineJoin: "round",
    opacity: option.opacity,
    blendMode: option.blendMode,
    inkPreset: {
      kind,
      color: option.color,
      width: option.width,
      opacity: option.opacity,
    },
  };
}

function getInkPresetOption(kind: DesignInkPresetKind) {
  return inkPresetOptions.find((item) => item.value === kind) ?? inkPresetOptions[0];
}

function getInkPresetPoint(
  selectedLayers: DesignLayer[],
  pageLayers: DesignLayer[],
) {
  if (selectedLayers.length > 0) {
    const left = Math.min(...selectedLayers.map((layer) => layer.x));
    const bottom = Math.max(...selectedLayers.map((layer) => layer.y + layer.height));

    return {
      x: Math.round(left),
      y: Math.round(bottom + 20),
    };
  }

  if (pageLayers.length === 0) {
    return { x: 120, y: 120 };
  }

  return {
    x: 120,
    y: Math.round(Math.max(...pageLayers.map((layer) => layer.y + layer.height)) + 96),
  };
}
