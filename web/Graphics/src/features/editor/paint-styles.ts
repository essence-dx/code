import type { DesignPaintStyle } from "@/features/editor/types";

export function getPaintStyleSignature(
  styles?: Record<string, DesignPaintStyle>,
) {
  return Object.values(styles ?? {})
    .map((style) =>
      [style.name, style.value, style.blendMode ?? "normal"].join(":"),
    )
    .sort()
    .join("|");
}

export function createPaintStyleValue({
  id,
  name,
  value,
  blendMode,
}: {
  id: string;
  name: string;
  value: string;
  blendMode?: string;
}): DesignPaintStyle {
  const now = new Date().toISOString();

  return {
    id,
    name,
    value,
    blendMode: blendMode && blendMode !== "normal" ? blendMode : undefined,
    createdAt: now,
    updatedAt: now,
  };
}
