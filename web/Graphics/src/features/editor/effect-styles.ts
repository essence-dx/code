import type { DesignEffectStyle, DesignLayer } from "@/features/editor/types";

export function getEffectStyleSignature(
  styles?: Record<string, DesignEffectStyle>,
) {
  return Object.values(styles ?? {})
    .map((style) =>
      [
        style.name,
        style.shadowEnabled,
        style.shadowColor ?? "",
        style.shadowX ?? 0,
        style.shadowY ?? 0,
        style.shadowBlur ?? 0,
        style.shadowSpread ?? 0,
        style.layerBlur ?? 0,
        style.backgroundBlur ?? 0,
        style.effectsVisible,
      ].join(":"),
    )
    .sort()
    .join("|");
}

export function createEffectStyleFromLayer(
  id: string,
  name: string,
  layer: DesignLayer,
): DesignEffectStyle {
  const now = new Date().toISOString();

  return {
    id,
    name,
    shadowEnabled: layer.shadowEnabled ?? false,
    shadowColor: layer.shadowColor,
    shadowX: layer.shadowX,
    shadowY: layer.shadowY,
    shadowBlur: layer.shadowBlur,
    shadowSpread: layer.shadowSpread,
    layerBlur: layer.layerBlur,
    backgroundBlur: layer.backgroundBlur,
    effectsVisible: layer.effectsVisible ?? true,
    createdAt: now,
    updatedAt: now,
  };
}

export function getEffectStyleLayerPatch(style: DesignEffectStyle) {
  return {
    shadowEnabled: style.shadowEnabled,
    shadowColor: style.shadowColor,
    shadowX: style.shadowX,
    shadowY: style.shadowY,
    shadowBlur: style.shadowBlur,
    shadowSpread: style.shadowSpread,
    layerBlur: style.layerBlur,
    backgroundBlur: style.backgroundBlur,
    effectsVisible: style.effectsVisible,
  } satisfies Partial<DesignLayer>;
}
