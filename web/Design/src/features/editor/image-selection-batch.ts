import {
  applyBackgroundCutoutToPixels,
  defaultBackgroundCutoutColor,
  defaultBackgroundCutoutFeather,
  defaultBackgroundCutoutTolerance,
  normalizeCutoutFeather,
  normalizeCutoutTolerance,
  normalizeHexColor,
} from "@/features/editor/image-background-cutout";
import type {
  DesignElement,
  ImageElement,
  PhotoSelectionMode,
  PhotoSelectionPresetId,
} from "@/features/editor/types";

export {
  applyMagicBrushSelectionToImageData,
  applyMagicBrushSelectionToPixels,
  createMagicBrushSelectionDataUrl,
} from "@/features/editor/image-magic-brush-selection";
export type {
  BrowserMagicBrushOptions,
  MagicBrushPixelOptions,
} from "@/features/editor/image-magic-brush-selection";

export const defaultPhotoSelectionMode: PhotoSelectionMode = "color-range";
export const defaultPhotoSelectionPresetId: PhotoSelectionPresetId =
  "product-cutout";
export const defaultPhotoSelectionBrushX = 50;
export const defaultPhotoSelectionBrushY = 50;
export const defaultPhotoSelectionBrushSize = 28;
export const defaultPhotoSelectionBrushRefine = 34;
export const defaultPhotoSelectionRegionX = 10;
export const defaultPhotoSelectionRegionY = 10;
export const defaultPhotoSelectionRegionWidth = 80;
export const defaultPhotoSelectionRegionHeight = 80;

export type PhotoSelectionRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PhotoSelectionSettings = {
  mode: PhotoSelectionMode;
  presetId: PhotoSelectionPresetId;
  brushX: number;
  brushY: number;
  brushSize: number;
  brushRefine: number;
  region: PhotoSelectionRegion;
};

export type PhotoBatchPreset = {
  id: PhotoSelectionPresetId;
  name: string;
  description: string;
  mode: PhotoSelectionMode;
  updates: Partial<ImageElement>;
};

export type PhotoBatchPresetUpdate = {
  elementId: string;
  updates: Partial<DesignElement>;
};

export type PhotoSelectionReadinessReport = {
  imageLayers: number;
  layersWithSelections: number;
  layersWithOriginals: number;
  layersWithRegions: number;
  score: number;
  issues: string[];
};

export const photoBatchPresets = [
  {
    id: "product-cutout",
    name: "Product cutout",
    description: "Clean white-background removal with crisp product edges.",
    mode: "color-range",
    updates: {
      backgroundCutoutEnabled: true,
      backgroundCutoutColor: "#ffffff",
      backgroundCutoutTolerance: 18,
      backgroundCutoutFeather: 3,
      backgroundCutoutInvert: false,
      filterBrightness: 104,
      filterContrast: 106,
      filterSaturation: 102,
      filterSharpen: 16,
    },
  },
  {
    id: "portrait-soft-mask",
    name: "Portrait soft mask",
    description: "Softer brush refinement for people, hair, and fabric edges.",
    mode: "magic-brush",
    updates: {
      photoSelectionBrushX: 50,
      photoSelectionBrushY: 42,
      photoSelectionBrushSize: 36,
      photoSelectionBrushRefine: 24,
      backgroundCutoutEnabled: true,
      backgroundCutoutTolerance: 14,
      backgroundCutoutFeather: 12,
      backgroundCutoutInvert: false,
      filterBrightness: 102,
      filterContrast: 102,
      filterSaturation: 104,
      filterSharpen: 8,
    },
  },
  {
    id: "bright-subject",
    name: "Bright subject",
    description: "Lift exposure and color while preserving a selected region.",
    mode: "object-region",
    updates: {
      photoSelectionRegionX: 12,
      photoSelectionRegionY: 12,
      photoSelectionRegionWidth: 76,
      photoSelectionRegionHeight: 76,
      filterBrightness: 112,
      filterContrast: 108,
      filterSaturation: 112,
      filterSharpen: 12,
    },
  },
  {
    id: "shadow-cleanup",
    name: "Shadow cleanup",
    description: "Low-tolerance color range cleanup for flat-lay shadows.",
    mode: "color-range",
    updates: {
      backgroundCutoutEnabled: true,
      backgroundCutoutColor: "#f3f4f6",
      backgroundCutoutTolerance: 12,
      backgroundCutoutFeather: 10,
      backgroundCutoutInvert: false,
      filterBrightness: 108,
      filterContrast: 98,
      filterSaturation: 100,
      filterSharpen: 6,
    },
  },
  {
    id: "web-ready",
    name: "Web ready",
    description: "Balanced contrast, saturation, and sharpening for exports.",
    mode: "object-region",
    updates: {
      photoSelectionRegionX: 5,
      photoSelectionRegionY: 5,
      photoSelectionRegionWidth: 90,
      photoSelectionRegionHeight: 90,
      filterBrightness: 104,
      filterContrast: 110,
      filterSaturation: 106,
      filterSharpen: 20,
      filterBlur: 0,
      filterGrayscale: 0,
    },
  },
] satisfies PhotoBatchPreset[];

export function getPhotoSelectionSettings(
  element: ImageElement,
): PhotoSelectionSettings {
  return {
    mode: normalizePhotoSelectionMode(element.photoSelectionMode),
    presetId: normalizePhotoSelectionPresetId(element.photoSelectionPresetId),
    brushX: normalizeSelectionPercent(
      element.photoSelectionBrushX,
      defaultPhotoSelectionBrushX,
    ),
    brushY: normalizeSelectionPercent(
      element.photoSelectionBrushY,
      defaultPhotoSelectionBrushY,
    ),
    brushSize: normalizeSelectionPercent(
      element.photoSelectionBrushSize,
      defaultPhotoSelectionBrushSize,
      1,
    ),
    brushRefine: normalizeSelectionPercent(
      element.photoSelectionBrushRefine,
      defaultPhotoSelectionBrushRefine,
      1,
    ),
    region: normalizePhotoSelectionRegion({
      x: element.photoSelectionRegionX,
      y: element.photoSelectionRegionY,
      width: element.photoSelectionRegionWidth,
      height: element.photoSelectionRegionHeight,
    }),
  };
}

export function getPhotoBatchPreset(id: PhotoSelectionPresetId) {
  return (
    photoBatchPresets.find((preset) => preset.id === id) ??
    (photoBatchPresets[0] as PhotoBatchPreset)
  );
}

export function normalizePhotoSelectionMode(
  value?: string | null,
): PhotoSelectionMode {
  if (
    value === "color-range" ||
    value === "magic-brush" ||
    value === "object-region"
  ) {
    return value;
  }

  return defaultPhotoSelectionMode;
}

export function normalizePhotoSelectionPresetId(
  value?: string | null,
): PhotoSelectionPresetId {
  if (
    value === "product-cutout" ||
    value === "portrait-soft-mask" ||
    value === "bright-subject" ||
    value === "shadow-cleanup" ||
    value === "web-ready"
  ) {
    return value;
  }

  return defaultPhotoSelectionPresetId;
}

export function normalizeSelectionPercent(
  value: number | null | undefined,
  fallback: number,
  min = 0,
  max = 100,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;

  return Math.min(max, Math.max(min, Math.round(value)));
}

export function normalizePhotoSelectionRegion({
  x,
  y,
  width,
  height,
}: Partial<PhotoSelectionRegion>): PhotoSelectionRegion {
  const nextX = normalizeSelectionPercent(x, defaultPhotoSelectionRegionX);
  const nextY = normalizeSelectionPercent(y, defaultPhotoSelectionRegionY);
  const maxWidth = Math.max(1, 100 - nextX);
  const maxHeight = Math.max(1, 100 - nextY);

  return {
    x: nextX,
    y: nextY,
    width: normalizeSelectionPercent(
      width,
      defaultPhotoSelectionRegionWidth,
      1,
      maxWidth,
    ),
    height: normalizeSelectionPercent(
      height,
      defaultPhotoSelectionRegionHeight,
      1,
      maxHeight,
    ),
  };
}

export function createPhotoSelectionPresetUpdates(
  element: ImageElement,
  presetId: PhotoSelectionPresetId,
): Partial<DesignElement> {
  const preset = getPhotoBatchPreset(presetId);

  return {
    ...preset.updates,
    photoSelectionMode: preset.mode,
    photoSelectionPresetId: preset.id,
    backgroundCutoutOriginalSrc:
      element.backgroundCutoutOriginalSrc ?? element.src,
  } as Partial<DesignElement>;
}

export function createPhotoBatchPresetUpdates(
  elements: DesignElement[],
  presetId: PhotoSelectionPresetId,
): PhotoBatchPresetUpdate[] {
  return elements
    .filter((element): element is ImageElement => element.type === "image")
    .map((element) => ({
      elementId: element.id,
      updates: createPhotoSelectionPresetUpdates(element, presetId),
    }));
}

export function createObjectRegionFrameUpdates(
  element: ImageElement,
): Partial<DesignElement> {
  const { region } = getPhotoSelectionSettings(element);
  const regionCenterX = region.x + region.width / 2;
  const regionCenterY = region.y + region.height / 2;
  const regionScale = Math.max(region.width, region.height);

  return {
    objectFit: "cover",
    cropEnabled: true,
    cropScale: normalizeSelectionPercent(10000 / regionScale, 100, 100, 300),
    cropX: normalizePanOffset(50 - regionCenterX),
    cropY: normalizePanOffset(50 - regionCenterY),
  } as Partial<DesignElement>;
}

export function createColorRangeSelectionUpdates(
  element: ImageElement,
): Partial<DesignElement> {
  return {
    photoSelectionMode: "color-range",
    backgroundCutoutOriginalSrc:
      element.backgroundCutoutOriginalSrc ?? element.src,
    backgroundCutoutEnabled: true,
    backgroundCutoutColor: normalizeHexColor(element.backgroundCutoutColor),
    backgroundCutoutTolerance: normalizeCutoutTolerance(
      element.backgroundCutoutTolerance,
    ),
    backgroundCutoutFeather: normalizeCutoutFeather(
      element.backgroundCutoutFeather,
    ),
    backgroundCutoutInvert: element.backgroundCutoutInvert ?? false,
  } as Partial<DesignElement>;
}

export function applyColorRangeSelectionToPixels({
  pixels,
  color,
  tolerance,
  feather,
  invert,
}: {
  pixels: Uint8ClampedArray;
  color?: string;
  tolerance?: number;
  feather?: number;
  invert?: boolean;
}) {
  return applyBackgroundCutoutToPixels({
    pixels,
    color: normalizeHexColor(color ?? defaultBackgroundCutoutColor),
    tolerance: normalizeCutoutTolerance(
      tolerance ?? defaultBackgroundCutoutTolerance,
    ),
    feather: normalizeCutoutFeather(feather ?? defaultBackgroundCutoutFeather),
    invert: invert ?? false,
  });
}

export function createPhotoSelectionReadinessReport(
  elements: DesignElement[],
): PhotoSelectionReadinessReport {
  const imageLayers = elements.filter(
    (element): element is ImageElement => element.type === "image",
  );
  const layersWithSelections = imageLayers.filter(
    (element) =>
      Boolean(element.photoSelectionPresetId) ||
      Boolean(element.photoSelectionMode) ||
      Boolean(element.backgroundCutoutEnabled) ||
      Boolean(element.objectRetouchApplied),
  ).length;
  const layersWithOriginals = imageLayers.filter(
    (element) =>
      Boolean(element.backgroundCutoutOriginalSrc) ||
      Boolean(element.objectRetouchOriginalSrc),
  ).length;
  const layersWithRegions = imageLayers.filter(
    (element) =>
      typeof element.photoSelectionRegionWidth === "number" &&
      typeof element.photoSelectionRegionHeight === "number",
  ).length;
  const issues: string[] = [];

  if (imageLayers.length === 0) {
    issues.push("No image layers are available for batch photo editing.");
  }

  if (imageLayers.length > 0 && layersWithSelections === 0) {
    issues.push("No image layers have selection or preset metadata yet.");
  }

  if (layersWithSelections > 0 && layersWithOriginals === 0) {
    issues.push("Selected image layers do not have reversible originals stored.");
  }

  const selectionCoverage =
    imageLayers.length === 0 ? 0 : layersWithSelections / imageLayers.length;
  const originalCoverage =
    layersWithSelections === 0 ? 0 : layersWithOriginals / layersWithSelections;
  const regionCoverage =
    imageLayers.length === 0 ? 0 : layersWithRegions / imageLayers.length;

  return {
    imageLayers: imageLayers.length,
    layersWithSelections,
    layersWithOriginals,
    layersWithRegions,
    score: Math.round(
      selectionCoverage * 50 + originalCoverage * 35 + regionCoverage * 15,
    ),
    issues,
  };
}

function normalizePanOffset(value: number) {
  return Math.min(100, Math.max(-100, Math.round(value)));
}
