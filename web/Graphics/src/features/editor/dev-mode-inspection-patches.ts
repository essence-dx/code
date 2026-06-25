import type { LayerPatch } from "@/features/editor/document-utils";
import type { DevModeInspectionRow } from "@/features/editor/dev-mode-inspection-types";
import type { DesignLayer, DesignPage } from "@/features/editor/types";

export function getDevModeInspectionReadyPatches(
  page: DesignPage,
  rows: DevModeInspectionRow[],
): LayerPatch[] {
  return rows
    .filter(
      (row) =>
        row.pageId === page.id && row.status !== "blocked" && !row.readyForDev,
    )
    .map((row) => ({
      layerId: row.layerId,
      patch: { readyForDev: true } satisfies Partial<DesignLayer>,
    }));
}
