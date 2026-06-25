import {
  defaultLayoutSizing,
  getLayerSizing,
} from "@/features/editor/auto-layout";
import type {
  DesignLayoutPresetStyle,
  DesignLayer,
} from "@/features/editor/types";

export function getLayoutPresetStyleSignature(
  styles?: Record<string, DesignLayoutPresetStyle>,
) {
  return Object.values(styles ?? {})
    .map((style) =>
      [
        style.name,
        style.autoLayout?.mode ?? "none",
        style.autoLayout?.gap ?? 0,
        style.autoLayout?.paddingX ?? 0,
        style.autoLayout?.paddingY ?? 0,
        style.autoLayout?.align ?? "start",
        style.autoLayout?.wrap ?? "nowrap",
        style.layoutSizing.horizontal,
        style.layoutSizing.vertical,
      ].join(":"),
    )
    .sort()
    .join("|");
}

export function createLayoutPresetStyleFromFrame(
  id: string,
  name: string,
  frame: DesignLayer,
): DesignLayoutPresetStyle {
  const now = new Date().toISOString();

  return {
    id,
    name,
    autoLayout: frame.autoLayout ? { ...frame.autoLayout } : undefined,
    layoutSizing: getLayerSizing(frame),
    createdAt: now,
    updatedAt: now,
  };
}

export function getLayoutPresetLayerPatch(style: DesignLayoutPresetStyle) {
  return {
    autoLayout: style.autoLayout ? { ...style.autoLayout } : undefined,
    layoutSizing: {
      ...defaultLayoutSizing,
      ...style.layoutSizing,
    },
  } satisfies Partial<DesignLayer>;
}

export function getLayoutPresetSummary(style: DesignLayoutPresetStyle) {
  const layout = style.autoLayout
    ? `${style.autoLayout.mode} / ${style.autoLayout.wrap ?? "nowrap"} / ${
        style.autoLayout.gap
      }px`
    : "No auto layout";

  return `${layout} / ${style.layoutSizing.horizontal} x ${style.layoutSizing.vertical}`;
}
