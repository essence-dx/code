import {
  getFlatVariableMap,
  variableBindableProperties,
} from "@/features/editor/variable-bindings";
import type {
  DesignDocument,
  DesignLayer,
  DesignVariableBindableProperty,
} from "@/features/editor/types";

export type VariableUsageAuditRow = {
  id: string;
  pageId: string;
  pageName: string;
  layerId: string;
  layerName: string;
  rawProperties: string[];
  matchingProperties: string[];
};

export type VariableUsageAuditReport = {
  totalLayers: number;
  boundLayerCount: number;
  rawLayerCount: number;
  rawPropertyCount: number;
  matchingPropertyCount: number;
  rows: VariableUsageAuditRow[];
};

export function getVariableUsageAudit(
  document: DesignDocument,
): VariableUsageAuditReport {
  const tokenValues = new Set(
    Object.values(getFlatVariableMap(document)).map(normalizeVariableValue),
  );
  const rows: VariableUsageAuditRow[] = [];
  let totalLayers = 0;
  let boundLayerCount = 0;
  let rawPropertyCount = 0;
  let matchingPropertyCount = 0;

  for (const page of document.pages) {
    for (const layer of page.layers) {
      totalLayers += 1;

      if (Object.keys(layer.variableBindings ?? {}).length > 0) {
        boundLayerCount += 1;
      }

      const rawProperties = getRawVariableProperties(layer);
      const matchingProperties = rawProperties.filter((property) => {
        const value = getLayerVariablePropertyValue(layer, property);

        return value !== null && tokenValues.has(normalizeVariableValue(value));
      });

      if (rawProperties.length === 0) {
        continue;
      }

      rawPropertyCount += rawProperties.length;
      matchingPropertyCount += matchingProperties.length;
      rows.push({
        id: `${page.id}:${layer.id}`,
        pageId: page.id,
        pageName: page.name,
        layerId: layer.id,
        layerName: layer.name,
        rawProperties: rawProperties.map(getVariablePropertyLabel),
        matchingProperties: matchingProperties.map(getVariablePropertyLabel),
      });
    }
  }

  return {
    totalLayers,
    boundLayerCount,
    rawLayerCount: rows.length,
    rawPropertyCount,
    matchingPropertyCount,
    rows,
  };
}

function getRawVariableProperties(layer: DesignLayer) {
  return variableBindableProperties
    .map((item) => item.property)
    .filter((property) => {
      if (layer.variableBindings?.[property]) {
        return false;
      }

      return getLayerVariablePropertyValue(layer, property) !== null;
    });
}

export function getLayerVariablePropertyValue(
  layer: DesignLayer,
  property: DesignVariableBindableProperty,
) {
  if (property === "fill") {
    return isUsablePaint(layer.fill) ? layer.fill : null;
  }

  if (property === "stroke") {
    return layer.strokeWidth > 0 && isUsablePaint(layer.stroke)
      ? layer.stroke
      : null;
  }

  if (property === "textColor") {
    return layer.text !== undefined && layer.textColor
      ? layer.textColor
      : null;
  }

  if (property === "text") {
    return layer.text?.trim() ? layer.text : null;
  }

  if (property === "cornerRadius") {
    return layer.cornerRadius > 0 ? layer.cornerRadius : null;
  }

  if (property === "strokeWidth") {
    return layer.strokeWidth > 0 ? layer.strokeWidth : null;
  }

  if (property === "opacity") {
    return layer.opacity < 1 ? layer.opacity : null;
  }

  if (property === "fontSize") {
    return layer.text !== undefined && layer.fontSize ? layer.fontSize : null;
  }

  if (property === "lineHeight") {
    return layer.text !== undefined && layer.lineHeight
      ? layer.lineHeight
      : null;
  }

  if (property === "letterSpacing") {
    return layer.text !== undefined && layer.letterSpacing
      ? layer.letterSpacing
      : null;
  }

  if (property === "shadowColor") {
    return layer.shadowEnabled && layer.shadowColor ? layer.shadowColor : null;
  }

  if (property === "shadowX") {
    return layer.shadowEnabled && layer.shadowX ? layer.shadowX : null;
  }

  if (property === "shadowY") {
    return layer.shadowEnabled && layer.shadowY ? layer.shadowY : null;
  }

  if (property === "shadowBlur") {
    return layer.shadowEnabled && layer.shadowBlur ? layer.shadowBlur : null;
  }

  if (property === "shadowSpread") {
    return layer.shadowEnabled && layer.shadowSpread
      ? layer.shadowSpread
      : null;
  }

  if (property === "layerBlur") {
    return layer.layerBlur ? layer.layerBlur : null;
  }

  if (property === "backgroundBlur") {
    return layer.backgroundBlur ? layer.backgroundBlur : null;
  }

  if (property === "autoLayoutGap") {
    return layer.autoLayout?.gap ?? null;
  }

  if (property === "autoLayoutPaddingX") {
    return layer.autoLayout?.paddingX ?? null;
  }

  if (property === "autoLayoutPaddingY") {
    return layer.autoLayout?.paddingY ?? null;
  }

  return null;
}

export function getVariablePropertyLabel(
  property: DesignVariableBindableProperty,
) {
  return (
    variableBindableProperties.find((item) => item.property === property)
      ?.label ?? property
  );
}

function isUsablePaint(value: string) {
  return value.trim() !== "" && value !== "transparent";
}

export function normalizeVariableValue(value: string | number) {
  return String(value).trim().toLowerCase();
}
