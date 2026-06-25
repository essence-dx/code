import {
  defaultConstraints,
  getLayerConstraints,
} from "@/features/editor/constraints";
import type {
  DesignConstraints,
  DesignHorizontalConstraint,
  DesignLayer,
  DesignVerticalConstraint,
} from "@/features/editor/types";

export type ResizePreviewScenario = {
  id: string;
  label: string;
  widthFactor: number;
  heightFactor: number;
};

export type Rect = Pick<DesignLayer, "x" | "y" | "width" | "height">;

export const resizePreviewScenarios = [
  { id: "compact", label: "Compact width", widthFactor: 0.74, heightFactor: 1 },
  { id: "wide", label: "Wide width", widthFactor: 1.24, heightFactor: 1 },
  { id: "tall", label: "Tall frame", widthFactor: 1, heightFactor: 1.18 },
] satisfies ResizePreviewScenario[];

export function getResponsiveConstraints(
  frame: Rect,
  layer: DesignLayer,
): DesignConstraints {
  return {
    horizontal: getResponsiveHorizontalConstraint(frame, layer),
    vertical: getResponsiveVerticalConstraint(frame, layer),
  };
}

export function isDefaultConstraintPair(layer: DesignLayer) {
  const constraints = getLayerConstraints(layer);

  return (
    constraints.horizontal === defaultConstraints.horizontal &&
    constraints.vertical === defaultConstraints.vertical
  );
}

export function getNextFrameRect(
  frame: DesignLayer,
  scenario: ResizePreviewScenario,
): Rect {
  return {
    x: frame.x,
    y: frame.y,
    width: Math.max(80, Math.round(frame.width * scenario.widthFactor)),
    height: Math.max(80, Math.round(frame.height * scenario.heightFactor)),
  };
}

export function applyRectPatch(layer: DesignLayer, patch: Partial<DesignLayer>) {
  return {
    x: patch.x ?? layer.x,
    y: patch.y ?? layer.y,
    width: patch.width ?? layer.width,
    height: patch.height ?? layer.height,
  };
}

export function isInsideRect(frame: Rect, layer: Rect) {
  return (
    layer.x >= frame.x &&
    layer.y >= frame.y &&
    layer.x + layer.width <= frame.x + frame.width &&
    layer.y + layer.height <= frame.y + frame.height
  );
}

export function intersectsRect(first: Rect, second: Rect) {
  return !(
    second.x > first.x + first.width ||
    second.x + second.width < first.x ||
    second.y > first.y + first.height ||
    second.y + second.height < first.y
  );
}

export function getMargins(frame: Rect, layer: Rect) {
  return {
    left: layer.x - frame.x,
    right: frame.x + frame.width - layer.x - layer.width,
    top: layer.y - frame.y,
    bottom: frame.y + frame.height - layer.y - layer.height,
  };
}

export function getLayerBounds(layers: DesignLayer[]): Rect | null {
  if (layers.length === 0) {
    return null;
  }

  const x = Math.min(...layers.map((layer) => layer.x));
  const y = Math.min(...layers.map((layer) => layer.y));
  const right = Math.max(...layers.map((layer) => layer.x + layer.width));
  const bottom = Math.max(...layers.map((layer) => layer.y + layer.height));

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  };
}

export function getConstraintLabel(layer: DesignLayer) {
  const constraints = getLayerConstraints(layer);

  return `${constraints.horizontal}/${constraints.vertical}`;
}

function getResponsiveHorizontalConstraint(
  frame: Rect,
  layer: DesignLayer,
): DesignHorizontalConstraint {
  const margins = getMargins(frame, layer);
  const widthRatio = layer.width / Math.max(1, frame.width);
  const nearLeft = margins.left <= 24;
  const nearRight = margins.right <= 24;
  const centered =
    Math.abs(
      layer.x + layer.width / 2 - (frame.x + frame.width / 2),
    ) <= 8;

  if (isScalableLayer(layer) && widthRatio >= 0.35) {
    return "scale";
  }

  if (widthRatio >= 0.55 || (nearLeft && nearRight)) {
    return "left-right";
  }

  if (nearRight && !nearLeft) {
    return "right";
  }

  if (centered) {
    return "center";
  }

  return "left";
}

function getResponsiveVerticalConstraint(
  frame: Rect,
  layer: DesignLayer,
): DesignVerticalConstraint {
  const margins = getMargins(frame, layer);
  const heightRatio = layer.height / Math.max(1, frame.height);
  const nearTop = margins.top <= 24;
  const nearBottom = margins.bottom <= 24;
  const centered =
    Math.abs(
      layer.y + layer.height / 2 - (frame.y + frame.height / 2),
    ) <= 8;

  if (isScalableLayer(layer) && heightRatio >= 0.35) {
    return "scale";
  }

  if (heightRatio >= 0.55 || (nearTop && nearBottom)) {
    return "top-bottom";
  }

  if (nearBottom && !nearTop) {
    return "bottom";
  }

  if (centered) {
    return "center";
  }

  return "top";
}

function isScalableLayer(layer: DesignLayer) {
  return Boolean(
    layer.type === "image" ||
      layer.type === "path" ||
      layer.mask ||
      layer.maskSource,
  );
}
