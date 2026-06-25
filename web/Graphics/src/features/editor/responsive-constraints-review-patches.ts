import { nanoid } from "nanoid";
import {
  getLayerConstraints,
} from "@/features/editor/constraints";
import type { LayerPatch } from "@/features/editor/document-utils";
import { layoutGridPresetOptions } from "@/features/editor/layout-grids";
import {
  getResponsiveConstraints,
} from "@/features/editor/responsive-constraints-review-utils";
import type {
  ResponsiveConstraintsReviewRow,
} from "@/features/editor/responsive-constraints-review-types";
import type {
  DesignLayer,
  DesignLayoutGrid,
  DesignPage,
} from "@/features/editor/types";

export function getResponsiveConstraintsReviewPatches(
  page: DesignPage,
  rows: ResponsiveConstraintsReviewRow[],
): LayerPatch[] {
  const layerById = new Map(page.layers.map((layer) => [layer.id, layer]));
  const patchByLayerId = new Map<string, Partial<DesignLayer>>();

  for (const row of rows) {
    if (row.pageId !== page.id || row.status === "ready") {
      continue;
    }

    for (const patch of getRowPatches(page, layerById, row)) {
      patchByLayerId.set(patch.layerId, {
        ...patchByLayerId.get(patch.layerId),
        ...patch.patch,
      });
    }
  }

  return [...patchByLayerId.entries()].map(([layerId, patch]) => ({
    layerId,
    patch,
  }));
}

function getRowPatches(
  page: DesignPage,
  layerById: Map<string, DesignLayer>,
  row: ResponsiveConstraintsReviewRow,
): LayerPatch[] {
  if (row.action === "set-stretch") {
    return row.layerIds.flatMap((layerId) => {
      const layer = layerById.get(layerId);
      const frame = layer?.parentId ? layerById.get(layer.parentId) : undefined;

      if (!layer || !frame || frame.type !== "frame" || layer.id === frame.id) {
        return [];
      }

      return {
        layerId: layer.id,
        patch: {
          constraints: {
            ...getLayerConstraints(layer),
            ...getResponsiveConstraints(frame, layer),
          },
        },
      };
    });
  }

  if (row.action === "set-scale") {
    return row.layerIds.flatMap((layerId) => {
      const layer = layerById.get(layerId);

      if (!layer || layer.type === "frame") {
        return [];
      }

      return {
        layerId,
        patch: {
          constraints: {
            horizontal: "scale",
            vertical: "scale",
          },
        },
      };
    });
  }

  if (row.action === "show-grid") {
    return row.layerIds.flatMap((layerId) => {
      const layer = layerById.get(layerId);

      if (!layer || layer.type !== "frame") {
        return [];
      }

      return {
        layerId,
        patch: {
          layoutGrids: getVisibleLayoutGrids(layer),
        },
      };
    });
  }

  if (row.action === "clip-frame") {
    return row.layerIds.flatMap((layerId) => {
      const layer = layerById.get(layerId);

      if (!layer || layer.type !== "frame") {
        return [];
      }

      return {
        layerId,
        patch: { clipContent: true },
      };
    });
  }

  return [];
}

function getVisibleLayoutGrids(layer: DesignLayer): DesignLayoutGrid[] {
  const grids = layer.layoutGrids ?? [];

  if (grids.length > 0) {
    return grids.map((grid) => ({ ...grid, visible: true }));
  }

  const preset = layoutGridPresetOptions.find((item) =>
    layer.width >= 768 ? item.id === "desktop-columns" : item.id === "mobile-columns",
  );
  const grid = preset?.grid ?? layoutGridPresetOptions[0].grid;

  return [
    {
      ...grid,
      id: nanoid(),
      visible: true,
    },
  ];
}
