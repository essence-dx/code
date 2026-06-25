import type {
  LayerIndexBounds,
  LayerIndexEntry,
} from "@/features/editor/layer-index";
import type { DesignLayer } from "@/features/editor/types";

export function getTopCostEntries(entries: LayerIndexEntry[], count: number) {
  return [...entries]
    .sort(
      (left, right) =>
        getLayerRenderCost(right.layer, right.bounds) -
        getLayerRenderCost(left.layer, left.bounds),
    )
    .slice(0, count);
}

export function getLayerRenderCost(
  layer: DesignLayer,
  bounds: LayerIndexBounds,
) {
  const pathCommandCount = getPathCommandCount(layer);
  const fillCount =
    layer.fillPaints?.filter((paint) => paint.visible && paint.opacity > 0)
      .length ?? 0;

  return (
    1 +
    Math.min(18, bounds.area / 300_000) +
    (layer.type === "image" ? 5 : 0) +
    (layer.type === "path" ? Math.min(18, pathCommandCount / 18) : 0) +
    (layer.type === "text" && (layer.text?.length ?? 0) > 240 ? 2 : 0) +
    (hasExpensiveEffect(layer) ? 8 : 0) +
    (hasCompositingCost(layer) ? 4 : 0) +
    (layer.mask ? 4 : 0) +
    (layer.clipContent ? 1 : 0) +
    (fillCount > 1 ? fillCount - 1 : 0)
  );
}

export function getLayerInteractionCost(
  layer: DesignLayer,
  bounds: LayerIndexBounds,
) {
  return (
    getLayerRenderCost(layer, bounds) +
    (layer.prototype ? 3 : 0) +
    (layer.connector ? 2 : 0) +
    (layer.opacity < 0.2 ? 2 : 0) +
    (bounds.area > 1_200_000 ? 4 : 0)
  );
}

export function hasExpensiveEffect(layer: DesignLayer) {
  return Boolean(
    layer.effectsVisible !== false &&
      ((layer.shadowEnabled && (layer.shadowBlur ?? 0) > 0) ||
        (layer.layerBlur ?? 0) > 0 ||
        (layer.backgroundBlur ?? 0) > 0),
  );
}

export function intersectsBounds(
  first: LayerIndexBounds,
  second: LayerIndexBounds,
) {
  return !(
    second.x > first.right ||
    second.right < first.x ||
    second.y > first.bottom ||
    second.bottom < first.y
  );
}

function hasCompositingCost(layer: DesignLayer) {
  return Boolean(
    (layer.blendMode && layer.blendMode !== "normal") ||
      (layer.fillPaints ?? []).some(
        (paint) =>
          paint.visible &&
          paint.opacity > 0 &&
          paint.blendMode &&
          paint.blendMode !== "normal",
      ),
  );
}

function getPathCommandCount(layer: DesignLayer) {
  return layer.pathData?.match(/[a-z]/gi)?.length ?? 0;
}
