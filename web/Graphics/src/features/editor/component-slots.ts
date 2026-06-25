import type {
  DesignComponent,
  DesignComponentSlotType,
  DesignComponentVariant,
  DesignLayer,
} from "@/features/editor/types";

export const componentSlotTypeLabels: Record<DesignComponentSlotType, string> =
  {
    content: "Content",
    media: "Media",
    container: "Container",
    shape: "Shape",
  };

export const componentSlotTypes = [
  "content",
  "media",
  "container",
  "shape",
] as const satisfies DesignComponentSlotType[];

export type ComponentInstanceSlotRow = {
  layer: DesignLayer;
  sourceLayer: DesignLayer | null;
  slotName: string;
  slotType: DesignComponentSlotType;
};

export function getComponentSlotMetadata(layer: DesignLayer) {
  return {
    componentSlotName: getComponentSlotName(layer),
    componentSlotType: getComponentSlotType(layer),
  } satisfies Pick<DesignLayer, "componentSlotName" | "componentSlotType">;
}

export function withUniqueComponentSlotNames(layers: DesignLayer[]) {
  const usedNames = new Set<string>();

  return layers.map((layer) => {
    const slotName = getUniqueComponentSlotName(
      getComponentSlotName(layer),
      usedNames,
    );

    usedNames.add(slotName);

    return {
      ...layer,
      componentSlotName: slotName,
      componentSlotType: getComponentSlotType(layer),
    };
  });
}

export function getComponentSlotName(layer: DesignLayer) {
  const explicitName = layer.componentSlotName?.trim();

  if (explicitName) {
    return explicitName;
  }

  return layer.name.replace(/\s+Instance$/i, "").trim() || "Layer";
}

export function getComponentSlotType(
  layer: DesignLayer,
): DesignComponentSlotType {
  if (layer.componentSlotType) {
    return layer.componentSlotType;
  }

  if (layer.type === "text" || layer.type === "sticky") {
    return "content";
  }

  if (layer.type === "image") {
    return "media";
  }

  if (layer.type === "frame") {
    return "container";
  }

  return "shape";
}

export function getComponentSlotCount(layers: DesignLayer[]) {
  return layers.filter((layer) => Boolean(getComponentSlotName(layer))).length;
}

export function getComponentInstanceSlotRows(
  layers: DesignLayer[],
  targetLayer: DesignLayer,
  component: DesignComponent,
): ComponentInstanceSlotRow[] {
  const sourceLayers = getComponentSourceLayers(
    component,
    targetLayer.componentVariantId,
  );
  const sourceById = new Map(sourceLayers.map((layer) => [layer.id, layer]));

  return getComponentInstanceScope(layers, targetLayer).map((layer, index) => {
    const sourceLayer =
      sourceById.get(layer.componentLayerId ?? "") ??
      sourceLayers[index] ??
      null;
    const slotSource = sourceLayer ?? layer;

    return {
      layer,
      sourceLayer,
      slotName: getComponentSlotName(slotSource),
      slotType: getComponentSlotType(slotSource),
    };
  });
}

export function getComponentInstanceScope(
  layers: DesignLayer[],
  targetLayer: DesignLayer,
) {
  if (!targetLayer.componentId) {
    return [];
  }

  if (!targetLayer.groupId) {
    return [targetLayer];
  }

  const scopedLayers = layers.filter(
    (layer) =>
      layer.groupId === targetLayer.groupId &&
      layer.componentId === targetLayer.componentId &&
      layer.componentVariantId === targetLayer.componentVariantId,
  );

  return scopedLayers.length > 0 ? scopedLayers : [targetLayer];
}

export function getComponentSourceLayers(
  component: DesignComponent,
  variantId?: string,
): DesignLayer[] {
  return getComponentSource(component, variantId).layers;
}

export function getComponentSource(
  component: DesignComponent,
  variantId?: string,
): DesignComponent | DesignComponentVariant {
  return (
    component.variants?.find((variant) => variant.id === variantId) ??
    component
  );
}

export function getComponentSlotSignature(layer: DesignLayer) {
  return [layer.componentSlotName ?? "", layer.componentSlotType ?? ""].join(
    ":",
  );
}

function getUniqueComponentSlotName(baseName: string, usedNames: Set<string>) {
  const fallbackName = baseName.trim() || "Layer";
  let name = fallbackName;
  let index = 2;

  while (usedNames.has(name)) {
    name = `${fallbackName} ${index}`;
    index += 1;
  }

  return name;
}
