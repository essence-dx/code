import type { LayerPatch } from "@/features/editor/document-utils";
import type { PrototypeInteractionInspectorRow } from "@/features/editor/prototype-interaction-inspector-types";
import type { DesignLayer, DesignPage } from "@/features/editor/types";

export function getPrototypeInteractionInspectorLayerPatches(
  page: DesignPage,
  rows: PrototypeInteractionInspectorRow[],
): LayerPatch[] {
  const layerById = new Map(page.layers.map((layer) => [layer.id, layer]));
  const patches = rows
    .filter((row) => row.pageId === page.id)
    .flatMap((row): LayerPatch[] => {
      const layer = row.layerId ? layerById.get(row.layerId) : undefined;

      if (!layer?.prototype) {
        return [];
      }

      if (row.action === "clear-prototype") {
        return [{ layerId: layer.id, patch: { prototype: undefined } }];
      }

      if (row.action === "set-click-trigger") {
        return [
          {
            layerId: layer.id,
            patch: {
              prototype: { ...layer.prototype, trigger: "click" },
            },
          },
        ];
      }

      if (row.action === "set-duration") {
        return [
          {
            layerId: layer.id,
            patch: {
              prototype: {
                ...layer.prototype,
                durationMs: layer.prototype.transition === "instant" ? 0 : 300,
              },
            },
          },
        ];
      }

      if (row.action === "set-scroll-reset") {
        return [
          {
            layerId: layer.id,
            patch: {
              prototype: {
                ...layer.prototype,
                scrollBehavior: "reset",
                preserveScroll: false,
              },
            },
          },
        ];
      }

      return [];
    });

  return mergeLayerPatches(patches);
}

function mergeLayerPatches(patches: LayerPatch[]) {
  const patchByLayerId = new Map<string, Partial<DesignLayer>>();

  for (const { layerId, patch } of patches) {
    patchByLayerId.set(layerId, {
      ...patchByLayerId.get(layerId),
      ...patch,
    });
  }

  return Array.from(patchByLayerId.entries()).map(([layerId, patch]) => ({
    layerId,
    patch,
  }));
}
