import { mediaDrawPlan } from "@/lib/editor/framing";
import { drawObjectMasks, hasActiveObjectMasks } from "@/lib/editor/object-masks";
import type { LayerBackgroundReplacement, LayerChromaKey, TimelineLayer } from "@/lib/editor/types";

export function normalizeLayerChromaKey(chromaKey: LayerChromaKey | undefined): LayerChromaKey {
  return {
    enabled: Boolean(chromaKey?.enabled),
    color: normalizeHexColor(chromaKey?.color, "#00ff00"),
    similarity: clampNumber(chromaKey?.similarity, 0.22, 0, 1),
    smoothness: clampNumber(chromaKey?.smoothness, 0.08, 0, 0.5),
    spill: clampNumber(chromaKey?.spill, 0.35, 0, 1),
  };
}

export function hasActiveChromaKey(chromaKey: LayerChromaKey | undefined) {
  return normalizeLayerChromaKey(chromaKey).enabled;
}

export function normalizeLayerBackgroundReplacement(replacement: LayerBackgroundReplacement | undefined): LayerBackgroundReplacement {
  return {
    enabled: Boolean(replacement?.enabled),
    mode: replacement?.mode === "color" ? "color" : "transparent",
    color: normalizeHexColor(replacement?.color, "#0a0a0a"),
    opacity: clampNumber(replacement?.opacity, 1, 0, 1),
  };
}

export function hasActiveBackgroundReplacement(replacement: LayerBackgroundReplacement | undefined) {
  const normalized = normalizeLayerBackgroundReplacement(replacement);
  return normalized.enabled && normalized.mode === "color" && normalized.opacity > 0;
}

export function hasCanvasMediaEffects(layer: Pick<TimelineLayer, "style">) {
  return hasActiveChromaKey(layer.style.chromaKey) || hasActiveObjectMasks(layer.style.objectMasks);
}

export function drawChromaKeyedMedia(
  context: CanvasRenderingContext2D,
  media: CanvasImageSource,
  layer: Pick<TimelineLayer, "transform" | "style">,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const box = mediaDrawPlan(media, x, y, width, height, layer.transform.framing, layer.transform.crop);
  const chromaKey = normalizeLayerChromaKey(layer.style.chromaKey);
  if (box.sourceWidth <= 0 || box.sourceHeight <= 0 || box.width <= 0 || box.height <= 0) return;

  const hasMasks = hasActiveObjectMasks(layer.style.objectMasks);

  if (!chromaKey.enabled && !hasMasks) {
    context.drawImage(media, box.sourceX, box.sourceY, box.sourceWidth, box.sourceHeight, box.x, box.y, box.width, box.height);
    return;
  }

  const canvas = context.canvas.ownerDocument.createElement("canvas");
  canvas.width = Math.max(1, Math.round(box.width));
  canvas.height = Math.max(1, Math.round(box.height));
  const offscreenContext = canvas.getContext("2d", { willReadFrequently: true });
  if (!offscreenContext) {
    context.drawImage(media, box.sourceX, box.sourceY, box.sourceWidth, box.sourceHeight, box.x, box.y, box.width, box.height);
    return;
  }

  offscreenContext.drawImage(media, box.sourceX, box.sourceY, box.sourceWidth, box.sourceHeight, 0, 0, canvas.width, canvas.height);
  if (chromaKey.enabled) {
    const imageData = offscreenContext.getImageData(0, 0, canvas.width, canvas.height);
    applyChromaKeyToPixels(imageData.data, chromaKey);
    offscreenContext.putImageData(imageData, 0, 0);
    drawBackgroundReplacement(context, layer.style.backgroundReplacement, box.x, box.y, box.width, box.height);
  }

  drawObjectMasks(offscreenContext, layer.style.objectMasks, canvas.width, canvas.height);
  context.drawImage(canvas, box.x, box.y, box.width, box.height);
}

export function applyChromaKeyToPixels(pixels: Uint8ClampedArray, chromaKey: LayerChromaKey) {
  const normalized = normalizeLayerChromaKey(chromaKey);
  if (!normalized.enabled) return pixels;

  const key = hexToRgb(normalized.color);
  const rangeEnd = Math.min(1, normalized.similarity + normalized.smoothness);
  const dominantChannel = dominantRgbChannel(key);

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index] ?? 0;
    const green = pixels[index + 1] ?? 0;
    const blue = pixels[index + 2] ?? 0;
    const distance = rgbDistance({ red, green, blue }, key);
    const keepAlpha = smoothStep(normalized.similarity, rangeEnd, distance);
    const spill = (1 - keepAlpha) * normalized.spill;

    if (dominantChannel === "red") {
      pixels[index] = reduceSpill(red, Math.max(green, blue), spill);
    } else if (dominantChannel === "green") {
      pixels[index + 1] = reduceSpill(green, Math.max(red, blue), spill);
    } else {
      pixels[index + 2] = reduceSpill(blue, Math.max(red, green), spill);
    }

    pixels[index + 3] = Math.round((pixels[index + 3] ?? 255) * keepAlpha);
  }

  return pixels;
}

export function drawBackgroundReplacement(
  context: CanvasRenderingContext2D,
  replacement: LayerBackgroundReplacement | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const normalized = normalizeLayerBackgroundReplacement(replacement);
  if (!hasActiveBackgroundReplacement(normalized)) return;

  context.save();
  context.globalAlpha *= normalized.opacity;
  context.fillStyle = normalized.color;
  context.fillRect(x, y, width, height);
  context.restore();
}

function normalizeHexColor(value: string | undefined, fallback: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function hexToRgb(value: string) {
  return {
    red: parseInt(value.slice(1, 3), 16),
    green: parseInt(value.slice(3, 5), 16),
    blue: parseInt(value.slice(5, 7), 16),
  };
}

function rgbDistance(color: { red: number; green: number; blue: number }, key: { red: number; green: number; blue: number }) {
  const red = color.red - key.red;
  const green = color.green - key.green;
  const blue = color.blue - key.blue;
  return Math.sqrt(red * red + green * green + blue * blue) / 441.6729559300637;
}

function dominantRgbChannel(color: { red: number; green: number; blue: number }) {
  if (color.red >= color.green && color.red >= color.blue) return "red";
  if (color.green >= color.red && color.green >= color.blue) return "green";
  return "blue";
}

function reduceSpill(value: number, neutral: number, amount: number) {
  return Math.round(value - Math.max(0, value - neutral) * amount);
}

function smoothStep(edge0: number, edge1: number, value: number) {
  if (edge1 <= edge0) return value <= edge0 ? 0 : 1;
  const progress = clampNumber((value - edge0) / (edge1 - edge0), 0, 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function clampNumber(value: number | undefined, fallback: number, min: number, max: number) {
  return Math.min(max, Math.max(min, typeof value === "number" && Number.isFinite(value) ? value : fallback));
}
