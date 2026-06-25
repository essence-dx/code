import type { LayerStyle } from "@/lib/editor/types";
import { normalizeLayerBackgroundReplacement, normalizeLayerChromaKey } from "@/lib/editor/chroma-key";
import { normalizeLayerObjectMasks } from "@/lib/editor/object-masks";

export function normalizeLayerVisualStyle(style: LayerStyle): LayerStyle {
  return {
    ...style,
    brightness: clampVisualNumber(style.brightness, 1, 0, 2),
    contrast: clampVisualNumber(style.contrast, 1, 0, 2),
    saturation: clampVisualNumber(style.saturation, 1, 0, 2),
    exposure: clampVisualNumber(style.exposure, 0, -1, 1),
    temperature: clampVisualNumber(style.temperature, 0, -1, 1),
    tint: clampVisualNumber(style.tint, 0, -1, 1),
    vignette: clampVisualNumber(style.vignette, 0, 0, 1),
    lookPreset: normalizeLookPreset(style.lookPreset),
    borderWidth: clampVisualNumber(style.borderWidth, 0, 0, 80),
    shadowBlur: clampVisualNumber(style.shadowBlur, 0, 0, 120),
    shadowColor: normalizeShadowColor(style.shadowColor),
    chromaKey: normalizeLayerChromaKey(style.chromaKey),
    backgroundReplacement: normalizeLayerBackgroundReplacement(style.backgroundReplacement),
    objectMasks: normalizeLayerObjectMasks(style.objectMasks),
  };
}

export function visualEffectsFilter(style: LayerStyle) {
  const visualStyle = normalizeLayerVisualStyle(style);
  const brightness = visualStyle.brightness ?? 1;
  const exposure = visualStyle.exposure ?? 0;
  const temperature = visualStyle.temperature ?? 0;
  const tint = visualStyle.tint ?? 0;
  const colorRotation = tint * 18 - temperature * 10;
  const filters = [
    visualStyle.blur > 0 ? `blur(${visualStyle.blur}px)` : null,
    brightness !== 1 || exposure !== 0 ? `brightness(${roundFilterNumber(brightness * (1 + exposure * 0.45))})` : null,
    visualStyle.contrast !== 1 ? `contrast(${visualStyle.contrast})` : null,
    visualStyle.saturation !== 1 ? `saturate(${visualStyle.saturation})` : null,
    temperature > 0 ? `sepia(${roundFilterNumber(temperature * 0.22)})` : null,
    colorRotation !== 0 ? `hue-rotate(${roundFilterNumber(colorRotation)}deg)` : null,
  ].filter((filter): filter is string => Boolean(filter));

  return filters.length ? filters.join(" ") : "none";
}

export function visualEffectsBoxShadow(style: LayerStyle) {
  const visualStyle = normalizeLayerVisualStyle(style);
  const shadowBlur = visualStyle.shadowBlur ?? 0;
  const vignette = visualEffectsVignette(style);
  const shadows = [
    shadowBlur > 0 ? `0 10px ${shadowBlur}px ${visualStyle.shadowColor ?? "#000000"}` : null,
    vignette.alpha > 0 ? `inset 0 0 ${vignette.blur}px rgba(0,0,0,${vignette.alpha})` : null,
  ].filter((shadow): shadow is string => Boolean(shadow));

  return shadows.length ? shadows.join(", ") : undefined;
}

export function visualEffectsVignette(style: LayerStyle) {
  const amount = normalizeLayerVisualStyle(style).vignette ?? 0;
  return {
    alpha: roundFilterNumber(Math.min(0.72, amount * 0.72)),
    blur: Math.round(24 + amount * 96),
  };
}

function clampVisualNumber(value: number | undefined, fallback: number, min: number, max: number) {
  return Math.min(max, Math.max(min, typeof value === "number" && Number.isFinite(value) ? value : fallback));
}

function normalizeShadowColor(value: string | undefined) {
  return value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
}

function normalizeLookPreset(value: string | undefined) {
  return value && /^[a-z0-9-]{1,80}$/i.test(value) ? value : undefined;
}

function roundFilterNumber(value: number) {
  return Math.round(value * 1000) / 1000;
}
