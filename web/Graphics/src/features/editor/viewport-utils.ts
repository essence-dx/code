import type { CanvasView, DesignLayer } from "@/features/editor/types";

export type ViewportSize = {
  width: number;
  height: number;
};

export type ViewportInsets = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

export type ViewportFitOptions = {
  insets?: ViewportInsets;
  preferPrimaryFrame?: boolean;
};

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const FIT_PADDING = 72;

export function zoomView(view: CanvasView, delta: number) {
  return {
    ...view,
    zoom: clampZoom(Math.round((view.zoom + delta) * 10) / 10),
  };
}

export function fitLayersToViewport(
  layers: DesignLayer[],
  viewport: ViewportSize,
  options: ViewportFitOptions = {},
) {
  const bounds =
    options.preferPrimaryFrame
      ? getPrimaryFrameBounds(layers) ??
        getLayerBounds(layers, { visibleOnly: true })
      : getLayerBounds(layers, { visibleOnly: true });

  return fitBoundsToViewport(bounds, viewport, options.insets);
}

export function fitBoundsToViewport(
  bounds: Bounds | null,
  viewport: ViewportSize,
  insets: ViewportInsets = {},
): CanvasView | null {
  if (!bounds || viewport.width <= 0 || viewport.height <= 0) {
    return null;
  }

  const safeLeft = insets.left ?? 0;
  const safeTop = insets.top ?? 0;
  const safeRight = insets.right ?? 0;
  const safeBottom = insets.bottom ?? 0;
  const safeWidth = Math.max(1, viewport.width - safeLeft - safeRight);
  const safeHeight = Math.max(1, viewport.height - safeTop - safeBottom);
  const usableWidth = Math.max(1, safeWidth - FIT_PADDING * 2);
  const usableHeight = Math.max(1, safeHeight - FIT_PADDING * 2);
  const zoom = clampZoom(
    Math.min(usableWidth / bounds.width, usableHeight / bounds.height),
  );
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  return {
    x: Math.round(safeLeft + safeWidth / 2 - centerX * zoom),
    y: Math.round(safeTop + safeHeight / 2 - centerY * zoom),
    zoom,
  };
}

export function getLayerBounds(
  layers: DesignLayer[],
  options: { visibleOnly?: boolean } = {},
) {
  const boundedLayers = options.visibleOnly
    ? layers.filter((layer) => layer.visible)
    : layers;

  if (boundedLayers.length === 0) {
    return null;
  }

  const minX = Math.min(...boundedLayers.map((layer) => layer.x));
  const minY = Math.min(...boundedLayers.map((layer) => layer.y));
  const maxX = Math.max(...boundedLayers.map((layer) => layer.x + layer.width));
  const maxY = Math.max(...boundedLayers.map((layer) => layer.y + layer.height));

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function getPrimaryFrameBounds(layers: DesignLayer[]) {
  const frames = layers.filter(
    (layer) => layer.visible && layer.type === "frame",
  );

  if (frames.length === 0) {
    return null;
  }

  const primaryFrame = frames.reduce((largest, layer) =>
    layer.width * layer.height > largest.width * largest.height
      ? layer
      : largest,
  );

  return {
    x: primaryFrame.x,
    y: primaryFrame.y,
    width: Math.max(1, primaryFrame.width),
    height: Math.max(1, primaryFrame.height),
  };
}

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}
