import type { LayerCrop, LayerFramingMode, LayerTransform } from "@/lib/editor/types";

export function normalizeLayerFramingMode(value: LayerFramingMode | undefined): LayerFramingMode {
  return value === "fit" || value === "stretch" ? value : "fill";
}

export function mediaObjectFit(transform: Pick<LayerTransform, "framing">) {
  const framing = normalizeLayerFramingMode(transform.framing);
  if (framing === "fit") return "contain";
  if (framing === "stretch") return "fill";
  return "cover";
}

export function normalizeLayerCrop(crop: LayerCrop | undefined): LayerCrop {
  const width = clampCropNumber(crop?.width, 1, 0.01, 1);
  const height = clampCropNumber(crop?.height, 1, 0.01, 1);
  const x = Math.min(1 - width, clampCropNumber(crop?.x, 0, 0, 1));
  const y = Math.min(1 - height, clampCropNumber(crop?.y, 0, 0, 1));

  return { x, y, width, height };
}

export function hasActiveCrop(crop: LayerCrop | undefined) {
  const normalized = normalizeLayerCrop(crop);
  return normalized.x > 0 || normalized.y > 0 || normalized.width < 1 || normalized.height < 1;
}

export function mediaDrawPlan(
  media: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
  framing: LayerFramingMode | undefined,
  crop: LayerCrop | undefined,
) {
  const mode = normalizeLayerFramingMode(framing);
  const sourceWidth = mediaSourceWidth(media);
  const sourceHeight = mediaSourceHeight(media);
  const source = mediaSourceCrop(sourceWidth, sourceHeight, crop);

  if (mode === "stretch" || sourceWidth <= 0 || sourceHeight <= 0) {
    return { ...source, x, y, width, height };
  }

  const scale = mode === "fit" ? Math.min(width / source.width, height / source.height) : Math.max(width / source.width, height / source.height);
  const drawWidth = source.width * scale;
  const drawHeight = source.height * scale;

  return {
    ...source,
    x: x + (width - drawWidth) / 2,
    y: y + (height - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  };
}

function mediaSourceCrop(sourceWidth: number, sourceHeight: number, crop: LayerCrop | undefined) {
  const normalized = normalizeLayerCrop(crop);
  return {
    sourceX: sourceWidth * normalized.x,
    sourceY: sourceHeight * normalized.y,
    sourceWidth: sourceWidth * normalized.width,
    sourceHeight: sourceHeight * normalized.height,
    width: sourceWidth * normalized.width,
    height: sourceHeight * normalized.height,
  };
}

function mediaSourceWidth(media: CanvasImageSource) {
  if (media instanceof HTMLVideoElement) return media.videoWidth;
  if (media instanceof HTMLImageElement) return media.naturalWidth;
  if (media instanceof HTMLCanvasElement) return media.width;
  if (typeof OffscreenCanvas !== "undefined" && media instanceof OffscreenCanvas) return media.width;
  if (typeof ImageBitmap !== "undefined" && media instanceof ImageBitmap) return media.width;
  return 0;
}

function mediaSourceHeight(media: CanvasImageSource) {
  if (media instanceof HTMLVideoElement) return media.videoHeight;
  if (media instanceof HTMLImageElement) return media.naturalHeight;
  if (media instanceof HTMLCanvasElement) return media.height;
  if (typeof OffscreenCanvas !== "undefined" && media instanceof OffscreenCanvas) return media.height;
  if (typeof ImageBitmap !== "undefined" && media instanceof ImageBitmap) return media.height;
  return 0;
}

function clampCropNumber(value: number | undefined, fallback: number, min: number, max: number) {
  return Math.min(max, Math.max(min, typeof value === "number" && Number.isFinite(value) ? value : fallback));
}
