import type {
  DesignComponent,
  DesignComponentVariant,
  DesignLayer,
} from "@/features/editor/types";
import {
  getAutoLayoutSignature,
  getLayoutSizingSignature,
} from "@/features/editor/auto-layout";
import { getComponentSlotSignature } from "@/features/editor/component-slots";
import { getConstraintsSignature } from "@/features/editor/constraints";
import { getLayoutGridSignature } from "@/features/editor/layout-grids";
import { getPaintStackSignature } from "@/features/editor/paint-stack";
import { getLayerVariableBindingSignature } from "@/features/editor/variable-bindings";

export type ComponentLayerOverride = {
  id: string;
  label: string;
  current: string;
  source: string;
};

type OverrideField = {
  id: string;
  label: string;
  getValue: (layer: DesignLayer) => string | number | boolean | undefined;
  getSourceValue?: (
    sourceLayer: DesignLayer,
  ) => string | number | boolean | undefined;
  formatValue?: (value: string | number | boolean | undefined) => string;
};

const overrideFields: OverrideField[] = [
  {
    id: "name",
    label: "Name",
    getValue: (layer) => layer.name,
    getSourceValue: (layer) =>
      layer.name.endsWith(" Instance") ? layer.name : `${layer.name} Instance`,
  },
  {
    id: "parentId",
    label: "Parent frame",
    getValue: (layer) => layer.parentId,
  },
  {
    id: "absolutePositioned",
    label: "Absolute in frame",
    getValue: (layer) => layer.absolutePositioned,
    formatValue: (value) => (value ? "On" : "Off"),
  },
  {
    id: "width",
    label: "Width",
    getValue: (layer) => layer.width,
  },
  {
    id: "height",
    label: "Height",
    getValue: (layer) => layer.height,
  },
  {
    id: "rotation",
    label: "Rotation",
    getValue: (layer) => layer.rotation,
    formatValue: (value) => `${formatNumber(value)}deg`,
  },
  {
    id: "opacity",
    label: "Opacity",
    getValue: (layer) => layer.opacity,
    formatValue: (value) => `${Math.round(Number(value ?? 0) * 100)}%`,
  },
  {
    id: "clipContent",
    label: "Clip content",
    getValue: (layer) => layer.clipContent,
    formatValue: (value) => (value ? "On" : "Off"),
  },
  {
    id: "mask",
    label: "Mask",
    getValue: getLayerMaskSignature,
  },
  {
    id: "autoLayout",
    label: "Auto layout",
    getValue: getAutoLayoutSignature,
  },
  {
    id: "layoutSizing",
    label: "Layout sizing",
    getValue: getLayoutSizingSignature,
  },
  {
    id: "constraints",
    label: "Constraints",
    getValue: getConstraintsSignature,
  },
  {
    id: "variableBindings",
    label: "Variable bindings",
    getValue: getLayerVariableBindingSignature,
  },
  {
    id: "componentProperties",
    label: "Component properties",
    getValue: getComponentPropertyValueSignature,
  },
  {
    id: "componentSlot",
    label: "Component slot",
    getValue: getComponentSlotSignature,
  },
  {
    id: "layoutGrids",
    label: "Layout grids",
    getValue: (layer) => getLayoutGridSignature(layer.layoutGrids),
  },
  {
    id: "fill",
    label: "Fill",
    getValue: (layer) => layer.fill,
  },
  {
    id: "fillPaints",
    label: "Paint stack",
    getValue: (layer) => getPaintStackSignature(layer.fillPaints),
  },
  {
    id: "stroke",
    label: "Stroke",
    getValue: (layer) => layer.stroke,
  },
  {
    id: "strokePaints",
    label: "Stroke paint stack",
    getValue: (layer) => getPaintStackSignature(layer.strokePaints),
  },
  {
    id: "strokeWidth",
    label: "Stroke width",
    getValue: (layer) => layer.strokeWidth,
  },
  {
    id: "strokeDash",
    label: "Stroke dash",
    getValue: (layer) => layer.strokeDash,
  },
  {
    id: "strokeLineCap",
    label: "Stroke cap",
    getValue: (layer) => layer.strokeLineCap,
  },
  {
    id: "strokeLineJoin",
    label: "Stroke join",
    getValue: (layer) => layer.strokeLineJoin,
  },
  {
    id: "cornerRadius",
    label: "Radius",
    getValue: (layer) => layer.cornerRadius,
  },
  {
    id: "shadowEnabled",
    label: "Shadow",
    getValue: (layer) => layer.shadowEnabled,
    formatValue: (value) => (value ? "On" : "Off"),
  },
  {
    id: "shadowColor",
    label: "Shadow color",
    getValue: (layer) => layer.shadowColor,
  },
  {
    id: "shadowX",
    label: "Shadow X",
    getValue: (layer) => layer.shadowX,
  },
  {
    id: "shadowY",
    label: "Shadow Y",
    getValue: (layer) => layer.shadowY,
  },
  {
    id: "shadowBlur",
    label: "Shadow blur",
    getValue: (layer) => layer.shadowBlur,
  },
  {
    id: "shadowSpread",
    label: "Shadow spread",
    getValue: (layer) => layer.shadowSpread,
  },
  {
    id: "layerBlur",
    label: "Layer blur",
    getValue: (layer) => layer.layerBlur,
  },
  {
    id: "backgroundBlur",
    label: "Background blur",
    getValue: (layer) => layer.backgroundBlur,
  },
  {
    id: "effectsVisible",
    label: "Effects visible",
    getValue: (layer) => layer.effectsVisible,
    formatValue: (value) => (value === false ? "Hidden" : "Visible"),
  },
  {
    id: "text",
    label: "Text",
    getValue: (layer) => layer.text,
  },
  {
    id: "fontSize",
    label: "Text size",
    getValue: (layer) => layer.fontSize,
  },
  {
    id: "fontFamily",
    label: "Text font",
    getValue: (layer) => layer.fontFamily,
  },
  {
    id: "fontWeight",
    label: "Text weight",
    getValue: (layer) => layer.fontWeight,
  },
  {
    id: "lineHeight",
    label: "Line height",
    getValue: (layer) => layer.lineHeight,
  },
  {
    id: "letterSpacing",
    label: "Text tracking",
    getValue: (layer) => layer.letterSpacing,
  },
  {
    id: "textAlign",
    label: "Text align",
    getValue: (layer) => layer.textAlign,
  },
  {
    id: "textColor",
    label: "Text color",
    getValue: (layer) => layer.textColor,
  },
  {
    id: "textResizeMode",
    label: "Text resize",
    getValue: (layer) => layer.textResizeMode,
  },
  {
    id: "imageFit",
    label: "Image fit",
    getValue: (layer) => layer.imageFit,
  },
];

export function getComponentLayerOverrideReport(
  layer: DesignLayer,
  component: DesignComponent,
) {
  const sourceLayer = getComponentSourceLayer(layer, component);

  if (!sourceLayer) {
    return {
      sourceLayer: null,
      overrides: [],
    };
  }

  return {
    sourceLayer,
    overrides: overrideFields.flatMap((field) => {
      const currentValue = field.getValue(layer);
      const sourceValue = field.getSourceValue
        ? field.getSourceValue(sourceLayer)
        : field.getValue(sourceLayer);

      if (normalizeValue(currentValue) === normalizeValue(sourceValue)) {
        return [];
      }

      return {
        id: field.id,
        label: field.label,
        current: formatOverrideValue(field, currentValue),
        source: formatOverrideValue(field, sourceValue),
      };
    }),
  };
}

function getComponentSourceLayer(
  layer: DesignLayer,
  component: DesignComponent,
) {
  const source = getComponentSource(component, layer.componentVariantId);

  return (
    source.layers.find((item) => item.id === layer.componentLayerId) ??
    (source.layers.length === 1 ? source.layers[0] : null)
  );
}

function getComponentSource(
  component: DesignComponent,
  variantId?: string,
): DesignComponent | DesignComponentVariant {
  return (
    component.variants?.find((variant) => variant.id === variantId) ??
    component
  );
}

function getComponentPropertyValueSignature(layer: DesignLayer) {
  return Object.entries(layer.componentProperties ?? {})
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([property, value]) => `${property}:${value}`)
    .join("|");
}

function getLayerMaskSignature(layer: DesignLayer) {
  const mask = layer.mask;

  if (!mask) {
    return layer.maskSource ? "mask-source" : "";
  }

  return [
    mask.kind,
    mask.sourceName ?? "",
    mask.x,
    mask.y,
    mask.width,
    mask.height,
    mask.cornerRadius ?? 0,
  ].join(":");
}

function normalizeValue(value: string | number | boolean | undefined) {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value.toString() : value.toFixed(4);
  }

  return value?.toString().trim() ?? "";
}

function formatOverrideValue(
  field: OverrideField,
  value: string | number | boolean | undefined,
) {
  if (field.formatValue) {
    return field.formatValue(value);
  }

  if (typeof value === "number") {
    return formatNumber(value);
  }

  return value?.toString() || "Empty";
}

function formatNumber(value: string | number | boolean | undefined) {
  const number = Number(value ?? 0);

  return Number.isInteger(number) ? number.toString() : number.toFixed(2);
}
