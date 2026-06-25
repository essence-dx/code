import type { DesignLayer, DesignTextStyle } from "@/features/editor/types";

export function getTextStyleSignature(
  styles?: Record<string, DesignTextStyle>,
) {
  return Object.values(styles ?? {})
    .map((style) =>
      [
        style.name,
        style.fontFamily,
        style.fontSize,
        style.fontWeight,
        style.lineHeight,
        style.letterSpacing,
        style.textAlign,
        style.textColor,
      ].join(":"),
    )
    .sort()
    .join("|");
}

export function createTextStyleFromLayer(
  id: string,
  name: string,
  layer: DesignLayer,
): DesignTextStyle {
  const now = new Date().toISOString();

  return {
    id,
    name,
    fontFamily: layer.fontFamily ?? "Inter, Arial, sans-serif",
    fontSize: layer.fontSize ?? 16,
    fontWeight: layer.fontWeight ?? 400,
    lineHeight: layer.lineHeight ?? 1.25,
    letterSpacing: layer.letterSpacing ?? 0,
    textAlign: layer.textAlign ?? "left",
    textColor: layer.textColor ?? "#ffffff",
    createdAt: now,
    updatedAt: now,
  };
}

export function getTextStyleLayerPatch(style: DesignTextStyle) {
  return {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    textAlign: style.textAlign,
    textColor: style.textColor,
  } satisfies Partial<DesignLayer>;
}
