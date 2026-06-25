import type { LayerCrop } from "@/lib/editor/types";
import { normalizeLayerCrop } from "@/lib/editor/framing";

export type CropAspectPresetId = "full" | "square" | "portrait" | "vertical" | "wide" | "classic";
export type CropFocusPresetId = "center" | "left" | "right" | "top" | "bottom";
export type LayerMaskShapePresetId = "square" | "rounded" | "pill" | "circle";

export const cropAspectPresets: Array<{ id: CropAspectPresetId; label: string; aspectRatio: number | null }> = [
  { id: "full", label: "Full", aspectRatio: null },
  { id: "square", label: "1:1", aspectRatio: 1 },
  { id: "portrait", label: "4:5", aspectRatio: 4 / 5 },
  { id: "vertical", label: "9:16", aspectRatio: 9 / 16 },
  { id: "wide", label: "16:9", aspectRatio: 16 / 9 },
  { id: "classic", label: "4:3", aspectRatio: 4 / 3 },
];

export const cropFocusPresets: Array<{ id: CropFocusPresetId; label: string }> = [
  { id: "center", label: "Center" },
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
];

export const layerMaskShapePresets: Array<{ id: LayerMaskShapePresetId; label: string; radius: number }> = [
  { id: "square", label: "Square", radius: 0 },
  { id: "rounded", label: "Rounded", radius: 24 },
  { id: "pill", label: "Pill", radius: 999 },
  { id: "circle", label: "Circle", radius: 999 },
];

export function cropForAspectPreset(
  presetId: CropAspectPresetId,
  source: { width?: number; height?: number },
): LayerCrop {
  const preset = cropAspectPresets.find((item) => item.id === presetId);
  if (!preset?.aspectRatio) return { x: 0, y: 0, width: 1, height: 1 };

  return centeredCropForAspect(preset.aspectRatio, source);
}

export function alignCrop(crop: LayerCrop | undefined, focus: CropFocusPresetId): LayerCrop {
  const normalized = normalizeLayerCrop(crop);
  if (focus === "left") return normalizeLayerCrop({ ...normalized, x: 0 });
  if (focus === "right") return normalizeLayerCrop({ ...normalized, x: 1 - normalized.width });
  if (focus === "top") return normalizeLayerCrop({ ...normalized, y: 0 });
  if (focus === "bottom") return normalizeLayerCrop({ ...normalized, y: 1 - normalized.height });

  return normalizeLayerCrop({
    ...normalized,
    x: (1 - normalized.width) / 2,
    y: (1 - normalized.height) / 2,
  });
}

export function maskShapeRadius(presetId: LayerMaskShapePresetId, box: { width: number; height: number }) {
  const preset = layerMaskShapePresets.find((item) => item.id === presetId);
  if (!preset) return 0;
  if (preset.id === "circle") return Math.min(1000, Math.max(0, Math.min(box.width, box.height) / 2));
  return preset.radius;
}

function centeredCropForAspect(targetAspectRatio: number, source: { width?: number; height?: number }) {
  const sourceWidth = finitePositive(source.width) ?? 16;
  const sourceHeight = finitePositive(source.height) ?? 9;
  const sourceAspectRatio = sourceWidth / sourceHeight;

  if (sourceAspectRatio > targetAspectRatio) {
    const width = targetAspectRatio / sourceAspectRatio;
    return normalizeLayerCrop({ x: (1 - width) / 2, y: 0, width, height: 1 });
  }

  const height = sourceAspectRatio / targetAspectRatio;
  return normalizeLayerCrop({ x: 0, y: (1 - height) / 2, width: 1, height });
}

function finitePositive(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}
