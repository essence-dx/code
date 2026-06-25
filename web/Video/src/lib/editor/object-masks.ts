import type { LayerObjectMask, LayerObjectMaskMode } from "@/lib/editor/types";

const defaultObjectMask = {
  enabled: true,
  x: 0.35,
  y: 0.35,
  width: 0.3,
  height: 0.22,
  intensity: 12,
  color: "#111111",
  opacity: 0.92,
  tracking: "none" as const,
};

export function createObjectMask(mode: LayerObjectMaskMode): LayerObjectMask {
  return {
    ...defaultObjectMask,
    id: `mask_${crypto.randomUUID()}`,
    mode,
  };
}

export function normalizeLayerObjectMasks(masks: LayerObjectMask[] | undefined): LayerObjectMask[] {
  const seen = new Set<string>();

  return (masks ?? [])
    .map(normalizeLayerObjectMask)
    .filter((mask) => {
      if (seen.has(mask.id)) return false;
      seen.add(mask.id);
      return true;
    })
    .slice(0, 20);
}

export function hasActiveObjectMasks(masks: LayerObjectMask[] | undefined) {
  return normalizeLayerObjectMasks(masks).some((mask) => mask.enabled);
}

export function drawObjectMasks(context: CanvasRenderingContext2D, masks: LayerObjectMask[] | undefined, width: number, height: number) {
  for (const mask of normalizeLayerObjectMasks(masks).filter((item) => item.enabled)) {
    const rect = maskRect(mask, width, height);
    if (rect.width <= 0 || rect.height <= 0) continue;

    if (mask.mode === "solid") {
      drawSolidMask(context, mask, rect);
    } else {
      drawBlurMask(context, mask, rect);
    }
  }
}

function normalizeLayerObjectMask(mask: LayerObjectMask): LayerObjectMask {
  return {
    id: mask.id?.trim() || `mask_${crypto.randomUUID()}`,
    enabled: mask.enabled !== false,
    mode: mask.mode === "solid" ? "solid" : "blur",
    x: clamp(mask.x, defaultObjectMask.x, 0, 1),
    y: clamp(mask.y, defaultObjectMask.y, 0, 1),
    width: clamp(mask.width, defaultObjectMask.width, 0.01, 1),
    height: clamp(mask.height, defaultObjectMask.height, 0.01, 1),
    intensity: clamp(mask.intensity, defaultObjectMask.intensity, 1, 48),
    color: normalizeHexColor(mask.color, defaultObjectMask.color),
    opacity: clamp(mask.opacity, defaultObjectMask.opacity, 0, 1),
    tracking: mask.tracking === "center" ? "center" : "none",
  };
}

function maskRect(mask: LayerObjectMask, width: number, height: number) {
  const rectWidth = Math.min(1 - mask.x, mask.width) * width;
  const rectHeight = Math.min(1 - mask.y, mask.height) * height;
  return {
    x: mask.x * width,
    y: mask.y * height,
    width: rectWidth,
    height: rectHeight,
  };
}

function drawSolidMask(
  context: CanvasRenderingContext2D,
  mask: LayerObjectMask,
  rect: { x: number; y: number; width: number; height: number },
) {
  context.save();
  context.globalAlpha *= mask.opacity;
  context.fillStyle = mask.color;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

function drawBlurMask(context: CanvasRenderingContext2D, mask: LayerObjectMask, rect: { x: number; y: number; width: number; height: number }) {
  const canvas = context.canvas.ownerDocument.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.width));
  canvas.height = Math.max(1, Math.round(rect.height));
  const target = canvas.getContext("2d");
  if (!target) return;

  target.drawImage(context.canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);

  context.save();
  context.filter = `blur(${mask.intensity}px)`;
  context.drawImage(canvas, rect.x, rect.y, rect.width, rect.height);
  context.filter = "none";
  context.globalAlpha *= Math.min(0.22, mask.opacity * 0.22);
  context.fillStyle = mask.color;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

function normalizeHexColor(value: string | undefined, fallback: string) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

function clamp(value: number | undefined, fallback: number, min: number, max: number) {
  return Math.min(max, Math.max(min, typeof value === "number" && Number.isFinite(value) ? value : fallback));
}
