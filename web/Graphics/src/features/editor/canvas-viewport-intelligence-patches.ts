import type { LayerPatch } from "@/features/editor/document-utils";
import type {
  CanvasViewportIntelligenceRow,
} from "@/features/editor/canvas-viewport-intelligence-types";
import type { DesignLayer, DesignPage } from "@/features/editor/types";

export function getCanvasViewportIntelligencePatches(
  activePage: DesignPage,
  rows: CanvasViewportIntelligenceRow[],
): LayerPatch[] {
  const patchByLayerId = new Map<string, Partial<DesignLayer>>();
  const activeLayerById = new Map(activePage.layers.map((layer) => [layer.id, layer]));

  for (const row of rows) {
    if (row.pageId !== activePage.id || row.status === "ready") {
      continue;
    }

    for (const layerId of row.layerIds) {
      const layer = activeLayerById.get(layerId);

      if (!layer) {
        continue;
      }

      const patch = getPatchForRowAction(row, layer);

      if (!patch) {
        continue;
      }

      patchByLayerId.set(layerId, {
        ...patchByLayerId.get(layerId),
        ...patch,
      });
    }
  }

  return [...patchByLayerId.entries()].map(([layerId, patch]) => ({
    layerId,
    patch,
  }));
}

function getPatchForRowAction(
  row: CanvasViewportIntelligenceRow,
  layer: DesignLayer,
): Partial<DesignLayer> | null {
  if (row.action === "disable-effects" && hasExpensiveEffect(layer)) {
    return { effectsVisible: false };
  }

  if (row.action === "lock-layers" && !layer.locked) {
    return { locked: true };
  }

  return null;
}

function hasExpensiveEffect(layer: DesignLayer) {
  return Boolean(
    layer.effectsVisible !== false &&
      ((layer.shadowEnabled && (layer.shadowBlur ?? 0) > 0) ||
        (layer.layerBlur ?? 0) > 0 ||
        (layer.backgroundBlur ?? 0) > 0),
  );
}
