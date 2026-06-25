import { nanoid } from "nanoid";
import { createLayerPaint } from "@/features/editor/paint-stack";
import type { DesignLayer } from "@/features/editor/types";

const connectorPadding = 24;
const arrowSize = 12;

export function canCreateConnector(layers: DesignLayer[]) {
  return layers.length === 2;
}

export function createConnectorLayer(layers: DesignLayer[]): DesignLayer | null {
  if (!canCreateConnector(layers)) {
    return null;
  }

  const [source, target] = layers;

  if (!source || !target || source.id === target.id) {
    return null;
  }

  const sourceCenter = getLayerCenter(source);
  const targetCenter = getLayerCenter(target);
  const bounds = {
    x: Math.min(sourceCenter.x, targetCenter.x) - connectorPadding,
    y: Math.min(sourceCenter.y, targetCenter.y) - connectorPadding,
    width: Math.abs(targetCenter.x - sourceCenter.x) + connectorPadding * 2,
    height: Math.abs(targetCenter.y - sourceCenter.y) + connectorPadding * 2,
  };
  const start = {
    x: sourceCenter.x - bounds.x,
    y: sourceCenter.y - bounds.y,
  };
  const end = {
    x: targetCenter.x - bounds.x,
    y: targetCenter.y - bounds.y,
  };

  return {
    id: nanoid(),
    type: "path",
    name: `${source.name} to ${target.name} connector`,
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.max(1, Math.round(bounds.width)),
    height: Math.max(1, Math.round(bounds.height)),
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: "transparent",
    fillPaints: [createLayerPaint("transparent")],
    stroke: "#38bdf8",
    strokeWidth: 2,
    strokeLineCap: "round",
    strokeLineJoin: "round",
    cornerRadius: 0,
    pathData: getConnectorPathData(start, end),
    pathViewBox: {
      x: 0,
      y: 0,
      width: Math.max(1, Math.round(bounds.width)),
      height: Math.max(1, Math.round(bounds.height)),
    },
    fillRule: "nonzero",
    connector: {
      sourceLayerId: source.id,
      targetLayerId: target.id,
      kind: "straight",
      arrow: "end",
    },
  };
}

function getLayerCenter(layer: DesignLayer) {
  return {
    x: layer.x + layer.width / 2,
    y: layer.y + layer.height / 2,
  };
}

function getConnectorPathData(
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const left = {
    x: end.x - arrowSize * Math.cos(angle - Math.PI / 6),
    y: end.y - arrowSize * Math.sin(angle - Math.PI / 6),
  };
  const right = {
    x: end.x - arrowSize * Math.cos(angle + Math.PI / 6),
    y: end.y - arrowSize * Math.sin(angle + Math.PI / 6),
  };

  return [
    `M ${round(start.x)} ${round(start.y)} L ${round(end.x)} ${round(end.y)}`,
    `M ${round(left.x)} ${round(left.y)} L ${round(end.x)} ${round(end.y)} L ${round(right.x)} ${round(right.y)}`,
  ].join(" ");
}

function round(value: number) {
  return Number(value.toFixed(2));
}
