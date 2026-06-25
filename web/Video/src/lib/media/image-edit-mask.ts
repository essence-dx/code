import { normalizeLayerObjectMasks } from "@/lib/editor/object-masks";
import type { MediaAsset, TimelineLayer } from "@/lib/editor/types";

export function activeImageObjectMaskCount(layer: TimelineLayer | null | undefined) {
  return normalizeLayerObjectMasks(layer?.style.objectMasks).filter((mask) => mask.enabled).length;
}

export async function renderImageObjectMaskBlob(layer: TimelineLayer, asset: MediaAsset) {
  const masks = normalizeLayerObjectMasks(layer.style.objectMasks).filter((mask) => mask.enabled);
  if (!masks.length) return null;

  const width = Math.max(1, Math.round(asset.width || layer.transform.width));
  const height = Math.max(1, Math.round(asset.height || layer.transform.height));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.fillStyle = "#000000";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#ffffff";
  for (const mask of masks) {
    context.fillRect(mask.x * width, mask.y * height, mask.width * width, mask.height * height);
  }

  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
