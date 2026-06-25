import type { ImageElement } from "@/features/editor/types";

const maxColorDistance = Math.sqrt(255 * 255 * 3);

export const defaultBackgroundCutoutColor = "#ffffff";
export const defaultBackgroundCutoutTolerance = 24;
export const defaultBackgroundCutoutFeather = 4;

export type RgbColor = {
  r: number;
  g: number;
  b: number;
};

export type BackgroundCutoutSettings = {
  color: string;
  tolerance: number;
  feather: number;
  invert: boolean;
};

export type PixelCutoutOptions = BackgroundCutoutSettings & {
  pixels: Uint8ClampedArray;
};

export type BrowserCutoutOptions = Partial<BackgroundCutoutSettings> & {
  src: string;
};

export function getImageBackgroundCutoutSettings(
  element: ImageElement,
): BackgroundCutoutSettings {
  return {
    color: normalizeHexColor(element.backgroundCutoutColor),
    tolerance: normalizeCutoutTolerance(element.backgroundCutoutTolerance),
    feather: normalizeCutoutFeather(element.backgroundCutoutFeather),
    invert: element.backgroundCutoutInvert ?? false,
  };
}

export function normalizeHexColor(value?: string | null) {
  if (!value) return defaultBackgroundCutoutColor;

  const trimmed = value.trim().toLowerCase();
  const shortMatch = /^#([0-9a-f]{3})$/.exec(trimmed);
  if (shortMatch) {
    return `#${shortMatch[1]
      .split("")
      .map((part) => `${part}${part}`)
      .join("")}`;
  }

  if (/^#[0-9a-f]{6}$/.test(trimmed)) {
    return trimmed;
  }

  return defaultBackgroundCutoutColor;
}

export function normalizeCutoutTolerance(value?: number | null) {
  return clampInteger(value, 0, 100, defaultBackgroundCutoutTolerance);
}

export function normalizeCutoutFeather(value?: number | null) {
  return clampInteger(value, 0, 40, defaultBackgroundCutoutFeather);
}

export function parseHexColor(value?: string | null): RgbColor {
  const normalized = normalizeHexColor(value).slice(1);

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

export function applyBackgroundCutoutToPixels({
  pixels,
  color,
  tolerance,
  feather,
  invert,
}: PixelCutoutOptions) {
  const target = parseHexColor(color);
  const threshold = (normalizeCutoutTolerance(tolerance) / 100) * maxColorDistance;
  const featherDistance = (normalizeCutoutFeather(feather) / 100) * maxColorDistance;

  for (let index = 0; index < pixels.length; index += 4) {
    const distance = getColorDistance(
      {
        r: pixels[index] ?? 0,
        g: pixels[index + 1] ?? 0,
        b: pixels[index + 2] ?? 0,
      },
      target,
    );
    const alpha = pixels[index + 3] ?? 255;
    const opacity = getCutoutOpacity({
      distance,
      threshold,
      featherDistance,
      invert,
    });

    pixels[index + 3] = Math.round(alpha * opacity);
  }

  return pixels;
}

export function applyBackgroundCutoutToImageData(
  imageData: ImageData,
  settings: BackgroundCutoutSettings,
) {
  applyBackgroundCutoutToPixels({
    pixels: imageData.data,
    ...settings,
  });

  return imageData;
}

export async function createBackgroundCutoutDataUrl({
  src,
  color,
  tolerance,
  feather,
  invert,
}: BrowserCutoutOptions) {
  if (typeof document === "undefined") {
    throw new Error("Background cutout requires a browser canvas.");
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
  applyBackgroundCutoutToImageData(imageData, {
    color: normalizeHexColor(color),
    tolerance: normalizeCutoutTolerance(tolerance),
    feather: normalizeCutoutFeather(feather),
    invert: invert ?? false,
  });
  context.putImageData(imageData, 0, 0);

  return canvas.toDataURL("image/png");
}

function getColorDistance(first: RgbColor, second: RgbColor) {
  const red = first.r - second.r;
  const green = first.g - second.g;
  const blue = first.b - second.b;

  return Math.sqrt(red * red + green * green + blue * blue);
}

function getCutoutOpacity({
  distance,
  threshold,
  featherDistance,
  invert,
}: {
  distance: number;
  threshold: number;
  featherDistance: number;
  invert: boolean;
}) {
  if (invert) {
    if (distance >= threshold) return 0;
    if (featherDistance <= 0) return 1;

    const softStart = Math.max(0, threshold - featherDistance);
    if (distance <= softStart) return 1;

    return (threshold - distance) / featherDistance;
  }

  if (distance <= threshold) return 0;
  if (featherDistance <= 0) return 1;

  const softEnd = threshold + featherDistance;
  if (distance >= softEnd) return 1;

  return (distance - threshold) / featherDistance;
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
      reject(new Error("The image could not be loaded for cutout editing."));
    image.src = src;
  });
}
