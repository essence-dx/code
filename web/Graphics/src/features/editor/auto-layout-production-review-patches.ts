import { nanoid } from "nanoid";
import {
  createAutoLayoutLayerPatches,
  createAutoLayoutParentPatches,
  defaultAutoLayout,
} from "@/features/editor/auto-layout";
import type { LayerPatch } from "@/features/editor/document-utils";
import type { AutoLayoutProductionReviewRow } from "@/features/editor/auto-layout-production-review-types";
import { getManualFrameLayoutMigrationPatches } from "@/features/editor/frame-layout-review";
import { layoutGridPresetOptions } from "@/features/editor/layout-grids";
import type {
  DesignLayer,
  DesignLayoutGrid,
  DesignPage,
} from "@/features/editor/types";

export function getAutoLayoutProductionReviewPatches(
  page: DesignPage,
  rows: AutoLayoutProductionReviewRow[],
): LayerPatch[] {
  const layerById = new Map(page.layers.map((layer) => [layer.id, layer]));
  const patches = rows
    .filter((row) => row.pageId === page.id)
    .flatMap((row): LayerPatch[] => {
      const frame = layerById.get(row.frameId);

      if (!frame || frame.type !== "frame") {
        return [];
      }

      if (row.action === "adopt") {
        return createAutoLayoutParentPatches(frame, page.layers);
      }

      if (row.action === "migrate") {
        return getManualFrameLayoutMigrationPatches(page).filter(
          (patch) => patch.layerId === frame.id,
        );
      }

      if (row.action === "enable-wrap") {
        return [
          {
            layerId: frame.id,
            patch: {
              autoLayout: {
                ...defaultAutoLayout,
                ...frame.autoLayout,
                wrap: "wrap",
              },
            },
          },
        ];
      }

      if (row.action === "add-grid") {
        return [
          {
            layerId: frame.id,
            patch: {
              layoutGrids: [...(frame.layoutGrids ?? []), createGridForFrame(frame)],
            },
          },
        ];
      }

      if (row.action === "show-grid") {
        return [
          {
            layerId: frame.id,
            patch: {
              layoutGrids: (frame.layoutGrids ?? []).map((grid) => ({
                ...grid,
                visible: true,
              })),
            },
          },
        ];
      }

      if (row.action === "apply-layout") {
        return getChangedLayerPatches(
          createAutoLayoutLayerPatches(frame, page.layers),
          layerById,
        );
      }

      return [];
    });

  return mergeLayerPatches(patches);
}

function getChangedLayerPatches(
  patches: LayerPatch[],
  layerById: Map<string, DesignLayer>,
): LayerPatch[] {
  return patches.filter(({ layerId, patch }) => {
    const layer = layerById.get(layerId);

    if (!layer) {
      return false;
    }

    return Object.entries(patch).some(([key, value]) => {
      const currentValue = layer[key as keyof DesignLayer];

      return currentValue !== value;
    });
  });
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

function createGridForFrame(frame: DesignLayer): DesignLayoutGrid {
  const preset = layoutGridPresetOptions.find((item) =>
    frame.width >= 768 ? item.id === "desktop-columns" : item.id === "mobile-columns",
  );
  const grid = preset?.grid ?? layoutGridPresetOptions[0].grid;

  return {
    ...grid,
    id: nanoid(),
    visible: true,
  };
}
