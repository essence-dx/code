import type { ImageElement, ObjectRetouchTool } from "@/features/editor/types";

export const defaultObjectRetouchTool: ObjectRetouchTool = "erase";
export const defaultObjectRetouchTargetX = 50;
export const defaultObjectRetouchTargetY = 50;
export const defaultObjectRetouchSourceX = 25;
export const defaultObjectRetouchSourceY = 50;
export const defaultObjectRetouchBrushSize = 18;
export const defaultObjectRetouchSoftness = 25;

export type ObjectRetouchSettings = {
  tool: ObjectRetouchTool;
  targetX: number;
  targetY: number;
  sourceX: number;
  sourceY: number;
  brushSize: number;
  softness: number;
};

export type PixelObjectRetouchOptions = ObjectRetouchSettings & {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
};

export type BrowserObjectRetouchOptions = Partial<ObjectRetouchSettings> & {
  src: string;
};

type Point = {
  x: number;
  y: number;
};

type AverageColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export function getImageObjectRetouchSettings(
  element: ImageElement,
): ObjectRetouchSettings {
  return {
    tool: normalizeObjectRetouchTool(element.objectRetouchTool),
    targetX: normalizeRetouchCoordinate(element.objectRetouchTargetX),
    targetY: normalizeRetouchCoordinate(element.objectRetouchTargetY),
    sourceX: normalizeRetouchCoordinate(element.objectRetouchSourceX),
    sourceY: normalizeRetouchCoordinate(element.objectRetouchSourceY),
    brushSize: normalizeRetouchBrushSize(element.objectRetouchBrushSize),
    softness: normalizeRetouchSoftness(element.objectRetouchSoftness),
  };
}

export function normalizeObjectRetouchTool(
  value?: string | null,
): ObjectRetouchTool {
  if (value === "clone" || value === "heal" || value === "erase") return value;

  return defaultObjectRetouchTool;
}

export function normalizeRetouchCoordinate(value?: number | null) {
  return clampInteger(value, 0, 100, defaultObjectRetouchTargetX);
}

export function normalizeRetouchBrushSize(value?: number | null) {
  return clampInteger(value, 1, 100, defaultObjectRetouchBrushSize);
}

export function normalizeRetouchSoftness(value?: number | null) {
  return clampInteger(value, 0, 100, defaultObjectRetouchSoftness);
}

export function applyObjectRetouchToPixels({
  pixels,
  width,
  height,
  tool,
  targetX,
  targetY,
  sourceX,
  sourceY,
  brushSize,
  softness,
}: PixelObjectRetouchOptions) {
  if (width <= 0 || height <= 0 || pixels.length < width * height * 4) {
    return pixels;
  }

  const normalizedTool = normalizeObjectRetouchTool(tool);
  const sourcePixels = new Uint8ClampedArray(pixels);
  const radius = getBrushRadius(width, height, brushSize);
  const targetCenter = getPercentPoint(width, height, targetX, targetY);
  const sourceCenter = getPercentPoint(width, height, sourceX, sourceY);
  const sourceAverage =
    normalizedTool === "heal"
      ? getAverageColor(sourcePixels, width, height, sourceCenter, radius)
      : null;
  const targetAverage =
    normalizedTool === "heal"
      ? getAverageColor(sourcePixels, width, height, targetCenter, radius * 1.2)
      : null;
  const minX = Math.max(0, Math.floor(targetCenter.x - radius));
  const maxX = Math.min(width - 1, Math.ceil(targetCenter.x + radius));
  const minY = Math.max(0, Math.floor(targetCenter.y - radius));
  const maxY = Math.min(height - 1, Math.ceil(targetCenter.y + radius));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distance = Math.hypot(x - targetCenter.x, y - targetCenter.y);
      const strength = getBrushStrength(distance, radius, softness);

      if (strength <= 0) continue;

      const targetIndex = getPixelIndex(x, y, width);

      if (normalizedTool === "erase") {
        pixels[targetIndex + 3] = Math.round(
          (pixels[targetIndex + 3] ?? 255) * (1 - strength),
        );
        continue;
      }

      const sourcePoint = {
        x: Math.round(sourceCenter.x + (x - targetCenter.x)),
        y: Math.round(sourceCenter.y + (y - targetCenter.y)),
      };
      const sourceIndex = getPixelIndex(
        clampInteger(sourcePoint.x, 0, width - 1, 0),
        clampInteger(sourcePoint.y, 0, height - 1, 0),
        width,
      );
      const sourcePixel = getSourcePixel({
        sourcePixels,
        sourceIndex,
        tool: normalizedTool,
        sourceAverage,
        targetAverage,
      });

      blendPixel(pixels, targetIndex, sourcePixel, strength);
    }
  }

  return pixels;
}

export function applyObjectRetouchToImageData(
  imageData: ImageData,
  settings: ObjectRetouchSettings,
) {
  applyObjectRetouchToPixels({
    pixels: imageData.data,
    width: imageData.width,
    height: imageData.height,
    ...settings,
  });

  return imageData;
}

export async function createObjectRetouchDataUrl({
  src,
  tool,
  targetX,
  targetY,
  sourceX,
  sourceY,
  brushSize,
  softness,
}: BrowserObjectRetouchOptions) {
  if (typeof document === "undefined") {
    throw new Error("Object retouch requires a browser canvas.");
  }

  const image = await loadImage(src);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    throw new Error("The selected image has no readable dimensions.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("The browser could not prepare an image canvas.");
  }

  context.drawImage(image, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);
  applyObjectRetouchToImageData(imageData, {
    tool: normalizeObjectRetouchTool(tool),
    targetX: normalizeRetouchCoordinate(targetX),
    targetY: normalizeRetouchCoordinate(targetY),
    sourceX: normalizeRetouchCoordinate(sourceX),
    sourceY: normalizeRetouchCoordinate(sourceY),
    brushSize: normalizeRetouchBrushSize(brushSize),
    softness: normalizeRetouchSoftness(softness),
  });
  context.putImageData(imageData, 0, 0);

  return canvas.toDataURL("image/png");
}

function getSourcePixel({
  sourcePixels,
  sourceIndex,
  tool,
  sourceAverage,
  targetAverage,
}: {
  sourcePixels: Uint8ClampedArray;
  sourceIndex: number;
  tool: ObjectRetouchTool;
  sourceAverage: AverageColor | null;
  targetAverage: AverageColor | null;
}) {
  const pixel = {
    r: sourcePixels[sourceIndex] ?? 0,
    g: sourcePixels[sourceIndex + 1] ?? 0,
    b: sourcePixels[sourceIndex + 2] ?? 0,
    a: sourcePixels[sourceIndex + 3] ?? 255,
  };

  if (tool !== "heal" || !sourceAverage || !targetAverage) return pixel;

  return {
    r: clampColor(pixel.r + (targetAverage.r - sourceAverage.r) * 0.72),
    g: clampColor(pixel.g + (targetAverage.g - sourceAverage.g) * 0.72),
    b: clampColor(pixel.b + (targetAverage.b - sourceAverage.b) * 0.72),
    a: pixel.a,
  };
}

function blendPixel(
  pixels: Uint8ClampedArray,
  targetIndex: number,
  source: AverageColor,
  strength: number,
) {
  pixels[targetIndex] = blendChannel(pixels[targetIndex] ?? 0, source.r, strength);
  pixels[targetIndex + 1] = blendChannel(
    pixels[targetIndex + 1] ?? 0,
    source.g,
    strength,
  );
  pixels[targetIndex + 2] = blendChannel(
    pixels[targetIndex + 2] ?? 0,
    source.b,
    strength,
  );
  pixels[targetIndex + 3] = blendChannel(
    pixels[targetIndex + 3] ?? 255,
    source.a,
    strength,
  );
}

function blendChannel(current: number, next: number, strength: number) {
  return clampColor(current * (1 - strength) + next * strength);
}

function getBrushRadius(width: number, height: number, brushSize: number) {
  const diameter = (Math.min(width, height) * normalizeRetouchBrushSize(brushSize)) / 100;

  return Math.max(1, diameter / 2);
}

function getBrushStrength(distance: number, radius: number, softness: number) {
  if (distance > radius) return 0;

  const normalizedSoftness = normalizeRetouchSoftness(softness) / 100;
  if (normalizedSoftness <= 0) return 1;

  const solidRadius = radius * (1 - normalizedSoftness);
  if (distance <= solidRadius) return 1;

  return (radius - distance) / Math.max(1, radius - solidRadius);
}

function getAverageColor(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  center: Point,
  radius: number,
): AverageColor {
  let red = 0;
  let green = 0;
  let blue = 0;
  let alpha = 0;
  let count = 0;
  const minX = Math.max(0, Math.floor(center.x - radius));
  const maxX = Math.min(width - 1, Math.ceil(center.x + radius));
  const minY = Math.max(0, Math.floor(center.y - radius));
  const maxY = Math.min(height - 1, Math.ceil(center.y + radius));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (Math.hypot(x - center.x, y - center.y) > radius) continue;

      const index = getPixelIndex(x, y, width);
      red += pixels[index] ?? 0;
      green += pixels[index + 1] ?? 0;
      blue += pixels[index + 2] ?? 0;
      alpha += pixels[index + 3] ?? 255;
      count += 1;
    }
  }

  if (count === 0) return { r: 0, g: 0, b: 0, a: 255 };

  return {
    r: red / count,
    g: green / count,
    b: blue / count,
    a: alpha / count,
  };
}

function getPercentPoint(
  width: number,
  height: number,
  percentX: number,
  percentY: number,
): Point {
  return {
    x: ((width - 1) * normalizeRetouchCoordinate(percentX)) / 100,
    y: ((height - 1) * normalizeRetouchCoordinate(percentY)) / 100,
  };
}

function getPixelIndex(x: number, y: number, width: number) {
  return (y * width + x) * 4;
}

function clampColor(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function clampInteger(
  value: number | null | undefined,
  min: number,
  max: number,
  fallback: number,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;

  return Math.min(max, Math.max(min, Math.round(value)));
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    if (!src.startsWith("data:") && !src.startsWith("blob:")) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("The image could not be loaded for retouch editing."));
    image.src = src;
  });
}
