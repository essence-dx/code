import type { CSSProperties } from "react";

import type { ImageElement } from "@/features/editor/types";

const defaultDuotoneShadow = "#172554";
const defaultDuotoneHighlight = "#f8fafc";

export function hasImageSvgFilter(element: ImageElement) {
  return (element.filterSharpen ?? 0) > 0 || (element.duotoneEnabled ?? false);
}

export function getImageSvgFilterId(element: ImageElement, scopeId: string) {
  return `image-filter-${sanitizeId(scopeId)}-${sanitizeId(element.id)}`;
}

export function getImageCssFilterStyle(
  element: ImageElement,
  svgFilterId?: string,
): CSSProperties {
  return {
    filter: [
      svgFilterId ? `url(#${svgFilterId})` : null,
      `brightness(${element.filterBrightness ?? 100}%)`,
      `contrast(${element.filterContrast ?? 100}%)`,
      `saturate(${element.filterSaturation ?? 100}%)`,
      `grayscale(${element.filterGrayscale ?? 0}%)`,
      `blur(${element.filterBlur ?? 0}px)`,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export function getSharpenKernelMatrix(sharpen: number) {
  const amount = clamp(sharpen, 0, 100) / 100;
  const side = -amount;
  const center = 1 + amount * 4;

  return `0 ${side} 0 ${side} ${center} ${side} 0 ${side} 0`;
}

export function getDuotoneTables(element: ImageElement) {
  const shadow = hexToRgb(element.duotoneShadow ?? defaultDuotoneShadow);
  const highlight = hexToRgb(
    element.duotoneHighlight ?? defaultDuotoneHighlight,
  );

  return {
    r: `${toUnit(shadow.r)} ${toUnit(highlight.r)}`,
    g: `${toUnit(shadow.g)} ${toUnit(highlight.g)}`,
    b: `${toUnit(shadow.b)} ${toUnit(highlight.b)}`,
    opacity: clamp(element.duotoneIntensity ?? 100, 0, 100) / 100,
  };
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((character) => character + character)
          .join("")
      : normalized;
  const value = Number.parseInt(expanded, 16);

  if (!Number.isFinite(value)) {
    return { r: 23, g: 37, b: 84 };
  }

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function toUnit(value: number) {
  return (clamp(value, 0, 255) / 255).toFixed(4);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}
