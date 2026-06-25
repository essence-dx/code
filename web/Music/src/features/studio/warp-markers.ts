import type { WarpMarkerJobMarker } from "@/lib/ai/schemas";
import { createStudioMarker } from "./local-studio-projects";
import type { LocalStudioMarker } from "./types";

export function mergeWarpMarkersIntoStudioMarkers(
  existingMarkers: LocalStudioMarker[],
  warpMarkers: WarpMarkerJobMarker[],
) {
  const existingKeys = new Set(
    existingMarkers.map((marker) => markerKey(marker.startMs, marker.label)),
  );
  const markersToAdd = warpMarkers
    .map((marker) => {
      const studioMarker = createStudioMarker(marker.startMs, "note");

      return {
        ...studioMarker,
        label: marker.label || `Warp ${capitalize(marker.kind)}`,
      };
    })
    .filter((marker) => {
      const key = markerKey(marker.startMs, marker.label);

      if (existingKeys.has(key)) {
        return false;
      }

      existingKeys.add(key);
      return true;
    });

  return {
    addedCount: markersToAdd.length,
    markers: [...existingMarkers, ...markersToAdd],
  };
}

function markerKey(startMs: number, label: string) {
  return `${startMs}:${label}`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
