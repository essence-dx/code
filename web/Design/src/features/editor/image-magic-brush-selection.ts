import { type RgbColor } from "@/features/editor/image-background-cutout";

const maxColorDistance = Math.sqrt(255 * 255 * 3);
const defaultBrushSize = 28;
const defaultBrushRefine = 34;

export type MagicBrushPixelOptions = {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
  brushX: number;
  brushY: number;
  brushSize: number;
  refine: number;
  invert?: boolean;
};

export type BrowserMagicBrushOptions = Omit<
  MagicBrushPixelOptions,
  "pixels" | "width" | "height"
> & { src: string };

export function applyMagicBrushSelectionToPixels({
  pixels,
  width,
  height,
  brushX,
  brushY,
  brushSize,
  refine,
  invert = false,
}: MagicBrushPixelOptions) {
  if (width <= 0 || height <= 0 || pixels.length < width * height * 4) {
    return pixels;
  }

  const center = getPercentPoint(width, height, brushX, brushY);
  const centerIndex = getPixelIndex(center.x, center.y, width);
  const target = {
    r: pixels[centerIndex] ?? 0,
    g: pixels[centerIndex + 1] ?? 0,
    b: pixels[centerIndex + 2] ?? 0,
  };
  const radius =
    (Math.min(width, height) *
      normalizeSelectionPercent(brushSize, defaultBrushSize, 1)) /
    200;
  const threshold =
    (normalizeSelectionPercent(refine, defaultBrushRefine, 1) / 100) *
    maxColorDistance;
  const minX = Math.max(0, Math.floor(center.x - radius));
  const maxX = Math.min(width - 1, Math.ceil(center.x + radius));
  const minY = Math.max(0, Math.floor(center.y - radius));
  const maxY = Math.min(height - 1, Math.ceil(center.y + radius));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const distanceToCenter = Math.hypot(x - center.x, y - center.y);
      if (distanceToCenter > radius) continue;

      const index = getPixelIndex(x, y, width);
      const current = {
        r: pixels[index] ?? 0,
        g: pixels[index + 1] ?? 0,
        b: pixels[index + 2] ?? 0,
      };
      const colorDistance = getColorDistance(current, target);
      const colorStrength = Math.max(0, 1 - colorDistance / threshold);
      if (colorStrength <= 0) continue;

      const brushStrength = getBrushStrength(distanceToCenter, radius);
      const strength = colorStrength * brushStrength;
      const alpha = pixels[index + 3] ?? 255;

      pixels[index + 3] = Math.round(alpha * (invert ? strength : 1 - strength));
    }
  }

  return pixels;
}

export function applyMagicBrushSelectionToImageData(
  imageData: ImageData,
  options: Omit<MagicBrushPixelOptions, "pixels" | "width" | "height">,
) {
  applyMagicBrushSelectionToPixels({
    pixels: imageData.data,
    width: imageData.width,
    height: imageData.height,
    ...options,
  });

  return imageData;
}

export async function createMagicBrushSelectionDataUrl({
  src,
  brushX,
  brushY,
  brushSize,
  refine,
  invert,
}: BrowserMagicBrushOptions) {
  if (typeof document === "undefined") {
    throw new Error("Magic brush selection requires a browser canvas.");
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
  applyMagicBrushSelectionToImageData(imageData, {
    brushX,
    brushY,
    brushSize,
    refine,
    invert,
  });
  context.putImageData(imageData, 0, 0);

  return canvas.toDataURL("image/png");
}

function getBrushStrength(distance: number, radius: number) {
  if (radius <= 0 || distance > radius) return 0;

  const softStart = radius * 0.72;
  if (distance <= softStart) return 1;

  return (radius - distance) / Math.max(1, radius - softStart);
}

function getPercentPoint(width: number, height: number, x: number, y: number) {
  return {
    x: Math.min(
      width - 1,
      Math.max(
        0,
        Math.round(((width - 1) * normalizeSelectionPercent(x, 50)) / 100),
      ),
    ),
    y: Math.min(
      height - 1,
      Math.max(
        0,
        Math.round(((height - 1) * normalizeSelectionPercent(y, 50)) / 100),
      ),
    ),
  };
}

function getPixelIndex(x: number, y: number, width: number) {
  return (y * width + x) * 4;
}

function normalizeSelectionPercent(
  value: number | null | undefined,
  fallback: number,
  min = 0,
  max = 100,
) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;

  return Math.min(max, Math.max(min, Math.round(value)));
}

function getColorDistance(first: RgbColor, second: RgbColor) {
  const red = first.r - second.r;
  const green = first.g - second.g;
  const blue = first.b - second.b;

  return Math.sqrt(red * red + green * green + blue * blue);
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    if (!src.startsWith("data:") && !src.startsWith("blob:")) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("The image could not be loaded for selection editing."));
    image.src = src;
  });
}
