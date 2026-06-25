import {
  customDesignDimensionLimits,
  getDesignPreset,
} from "@/features/editor/presets";
import type { DesignDocument, DesignPage } from "@/features/editor/types";

export type PageDimensions = {
  width: number;
  height: number;
};

export function getPageDimensions(
  document: DesignDocument,
  page: DesignPage,
): PageDimensions {
  const formatPreset =
    page.format && page.format !== "custom" ? getDesignPreset(page.format) : null;

  return {
    width: normalizePageDimension(
      page.width ?? formatPreset?.width ?? document.width,
    ),
    height: normalizePageDimension(
      page.height ?? formatPreset?.height ?? document.height,
    ),
  };
}

export function normalizePageDimension(value: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return customDesignDimensionLimits.min;

  return Math.round(
    Math.min(
      customDesignDimensionLimits.max,
      Math.max(customDesignDimensionLimits.min, parsed),
    ),
  );
}
