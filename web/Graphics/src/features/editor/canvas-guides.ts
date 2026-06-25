import type { LayerPatch } from "@/features/editor/document-utils";
import type { DesignLayer } from "@/features/editor/types";

type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

type AxisSnap = {
  adjustment: number;
  distance: number;
  position: number;
  referenceBounds: Bounds;
};

export type LayerDragOrigin = Pick<DesignLayer, "width" | "height"> & {
  layerId: string;
  x: number;
  y: number;
};

export type SnapGuide = {
  orientation: "vertical" | "horizontal";
  position: number;
  start: number;
  end: number;
};

const SNAP_DISTANCE = 6;
const GUIDE_BLEED = 24;

export function getSnappedLayerPatches({
  origins,
  layers,
  deltaX,
  deltaY,
}: {
  origins: LayerDragOrigin[];
  layers: DesignLayer[];
  deltaX: number;
  deltaY: number;
}): { patches: LayerPatch[]; guides: SnapGuide[] } {
  const movingIds = new Set(origins.map((origin) => origin.layerId));
  const references = layers.filter(
    (layer) => layer.visible && !movingIds.has(layer.id),
  );

  if (origins.length === 0 || references.length === 0) {
    return {
      patches: toLayerPatches(origins, deltaX, deltaY),
      guides: [],
    };
  }

  const movingBounds = getBounds(
    origins.map((origin) => ({
      left: origin.x + deltaX,
      top: origin.y + deltaY,
      right: origin.x + deltaX + origin.width,
      bottom: origin.y + deltaY + origin.height,
    })),
  );
  const xSnap = getBestSnap(movingBounds, references, "x");
  const ySnap = getBestSnap(movingBounds, references, "y");
  const snapX = xSnap?.adjustment ?? 0;
  const snapY = ySnap?.adjustment ?? 0;
  const adjustedBounds = offsetBounds(movingBounds, snapX, snapY);

  return {
    patches: toLayerPatches(origins, deltaX + snapX, deltaY + snapY),
    guides: [
      ...(xSnap ? [toVerticalGuide(xSnap, adjustedBounds)] : []),
      ...(ySnap ? [toHorizontalGuide(ySnap, adjustedBounds)] : []),
    ],
  };
}

export function toLayerPatches(
  origins: LayerDragOrigin[],
  deltaX: number,
  deltaY: number,
): LayerPatch[] {
  return origins.map((origin) => ({
    layerId: origin.layerId,
    patch: {
      x: Math.round(origin.x + deltaX),
      y: Math.round(origin.y + deltaY),
    },
  }));
}

function getBestSnap(
  movingBounds: Bounds,
  references: DesignLayer[],
  axis: "x" | "y",
): AxisSnap | null {
  let bestSnap: AxisSnap | null = null;
  const movingAnchors =
    axis === "x"
      ? [movingBounds.left, movingBounds.centerX, movingBounds.right]
      : [movingBounds.top, movingBounds.centerY, movingBounds.bottom];

  for (const layer of references) {
    const referenceBounds = getLayerBounds(layer);
    const referenceAnchors =
      axis === "x"
        ? [referenceBounds.left, referenceBounds.centerX, referenceBounds.right]
        : [referenceBounds.top, referenceBounds.centerY, referenceBounds.bottom];

    for (const movingAnchor of movingAnchors) {
      for (const referenceAnchor of referenceAnchors) {
        const adjustment = referenceAnchor - movingAnchor;
        const distance = Math.abs(adjustment);

        if (distance > SNAP_DISTANCE || distance >= (bestSnap?.distance ?? 999)) {
          continue;
        }

        bestSnap = {
          adjustment,
          distance,
          position: referenceAnchor,
          referenceBounds,
        };
      }
    }
  }

  return bestSnap;
}

function getLayerBounds(layer: DesignLayer): Bounds {
  return toBounds({
    left: layer.x,
    top: layer.y,
    right: layer.x + layer.width,
    bottom: layer.y + layer.height,
  });
}

function getBounds(
  rects: Array<Pick<Bounds, "left" | "top" | "right" | "bottom">>,
): Bounds {
  return toBounds({
    left: Math.min(...rects.map((rect) => rect.left)),
    top: Math.min(...rects.map((rect) => rect.top)),
    right: Math.max(...rects.map((rect) => rect.right)),
    bottom: Math.max(...rects.map((rect) => rect.bottom)),
  });
}

function toBounds({
  left,
  top,
  right,
  bottom,
}: Pick<Bounds, "left" | "top" | "right" | "bottom">): Bounds {
  return {
    left,
    top,
    right,
    bottom,
    centerX: left + (right - left) / 2,
    centerY: top + (bottom - top) / 2,
  };
}

function offsetBounds(bounds: Bounds, x: number, y: number): Bounds {
  return toBounds({
    left: bounds.left + x,
    top: bounds.top + y,
    right: bounds.right + x,
    bottom: bounds.bottom + y,
  });
}

function toVerticalGuide(snap: AxisSnap, movingBounds: Bounds): SnapGuide {
  return {
    orientation: "vertical",
    position: snap.position,
    start:
      Math.min(movingBounds.top, snap.referenceBounds.top) - GUIDE_BLEED,
    end:
      Math.max(movingBounds.bottom, snap.referenceBounds.bottom) + GUIDE_BLEED,
  };
}

function toHorizontalGuide(snap: AxisSnap, movingBounds: Bounds): SnapGuide {
  return {
    orientation: "horizontal",
    position: snap.position,
    start:
      Math.min(movingBounds.left, snap.referenceBounds.left) - GUIDE_BLEED,
    end:
      Math.max(movingBounds.right, snap.referenceBounds.right) + GUIDE_BLEED,
  };
}
