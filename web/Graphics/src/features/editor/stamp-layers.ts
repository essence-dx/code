import { nanoid } from "nanoid";
import type {
  DesignLayer,
  DesignStampKind,
} from "@/features/editor/types";

export const stampOptions = [
  { value: "approved", label: "Approved", fill: "#dcfce7", textColor: "#14532d" },
  { value: "question", label: "Question", fill: "#dbeafe", textColor: "#1e3a8a" },
  { value: "risk", label: "Risk", fill: "#fee2e2", textColor: "#7f1d1d" },
  { value: "decision", label: "Decision", fill: "#fef3c7", textColor: "#78350f" },
] satisfies Array<{
  value: DesignStampKind;
  label: string;
  fill: string;
  textColor: string;
}>;

export function createStampLayer(
  kind: DesignStampKind,
  selectedLayers: DesignLayer[],
  pageLayers: DesignLayer[],
): DesignLayer {
  const option = stampOptions.find((item) => item.value === kind) ?? stampOptions[0];
  const point = getStampPoint(selectedLayers, pageLayers);

  return {
    id: nanoid(),
    type: "sticky",
    name: `${option.label} stamp`,
    x: point.x,
    y: point.y,
    width: 132,
    height: 68,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: option.fill,
    stroke: "transparent",
    strokeWidth: 0,
    cornerRadius: 999,
    text: option.label,
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: 15,
    fontWeight: 800,
    lineHeight: 1.15,
    letterSpacing: 0.6,
    textAlign: "center",
    textColor: option.textColor,
    textResizeMode: "fixed",
    stamp: { kind },
  };
}

function getStampPoint(
  selectedLayers: DesignLayer[],
  pageLayers: DesignLayer[],
) {
  if (selectedLayers.length > 0) {
    const right = Math.max(...selectedLayers.map((layer) => layer.x + layer.width));
    const top = Math.min(...selectedLayers.map((layer) => layer.y));

    return {
      x: Math.round(right + 24),
      y: Math.round(top),
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
