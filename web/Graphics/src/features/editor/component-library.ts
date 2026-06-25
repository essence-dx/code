import { nanoid } from "nanoid";
import {
  createComponentPropertyDefinitionsForLayers,
  defaultVariantPropertyName,
  getComponentInstancePropertyValues,
} from "@/features/editor/component-properties";
import {
  getComponentSlotMetadata,
  withUniqueComponentSlotNames,
} from "@/features/editor/component-slots";
import type {
  DesignComponent,
  DesignComponentVariant,
  DesignGroup,
  DesignLayer,
} from "@/features/editor/types";

export function createDesignComponent(
  layers: DesignLayer[],
  name: string,
): DesignComponent | null {
  if (layers.length === 0) {
    return null;
  }

  const bounds = getLayerBounds(layers);
  const now = new Date().toISOString();
  const componentLayers = withUniqueComponentSlotNames(
    layers.map((layer) => normalizeComponentLayer(layer, bounds)),
  );

  return {
    id: nanoid(),
    name,
    width: bounds.width,
    height: bounds.height,
    layers: componentLayers,
    propertyDefinitions: createComponentPropertyDefinitionsForLayers(
      componentLayers,
      now,
    ),
    createdAt: now,
    updatedAt: now,
  };
}

export function createDesignComponentVariant(
  layers: DesignLayer[],
  name: string,
): DesignComponentVariant | null {
  if (layers.length === 0) {
    return null;
  }

  const bounds = getLayerBounds(layers);
  const now = new Date().toISOString();

  return {
    id: nanoid(),
    name,
    properties: {
      [defaultVariantPropertyName]: name,
    },
    width: bounds.width,
    height: bounds.height,
    layers: withUniqueComponentSlotNames(
      layers.map((layer) => normalizeComponentLayer(layer, bounds)),
    ),
    createdAt: now,
    updatedAt: now,
  };
}

export function createComponentInstance(
  component: DesignComponent,
  point: { x: number; y: number },
  variantId?: string,
): { layers: DesignLayer[]; group: DesignGroup | null } {
  const variant = component.variants?.find((item) => item.id === variantId);
  const source = variant ?? component;
  const componentProperties = getComponentInstancePropertyValues(
    component,
    variant,
  );
  const groupId = source.layers.length > 1 ? nanoid() : undefined;
  const now = new Date().toISOString();
  const layers = source.layers.map((layer) => ({
    ...layer,
    id: nanoid(),
    name: layer.name.endsWith(" Instance")
      ? layer.name
      : `${layer.name} Instance`,
    groupId,
    componentId: component.id,
    componentVariantId: variant?.id,
    componentLayerId: layer.id,
    componentProperties,
    x: Math.round(point.x + layer.x),
    y: Math.round(point.y + layer.y),
  }));

  return {
    layers,
    group: groupId
      ? {
          id: groupId,
          name: variant
            ? `${component.name} / ${variant.name} Instance`
            : `${component.name} Instance`,
          layerIds: layers.map((layer) => layer.id),
          createdAt: now,
          updatedAt: now,
        }
      : null,
  };
}

function normalizeComponentLayer(
  layer: DesignLayer,
  bounds: ReturnType<typeof getLayerBounds>,
): DesignLayer {
  const {
    componentId: _componentId,
    componentVariantId: _componentVariantId,
    componentLayerId: _componentLayerId,
    componentProperties: _componentProperties,
    groupId: _groupId,
    ...layerWithoutRuntimeRefs
  } = layer;

  return {
    ...layerWithoutRuntimeRefs,
    ...getComponentSlotMetadata(layerWithoutRuntimeRefs),
    id: nanoid(),
    x: Math.round(layer.x - bounds.left),
    y: Math.round(layer.y - bounds.top),
  };
}

function getLayerBounds(layers: DesignLayer[]) {
  const left = Math.min(...layers.map((layer) => layer.x));
  const top = Math.min(...layers.map((layer) => layer.y));
  const right = Math.max(...layers.map((layer) => layer.x + layer.width));
  const bottom = Math.max(...layers.map((layer) => layer.y + layer.height));

  return {
    left,
    top,
    width: Math.max(1, Math.round(right - left)),
    height: Math.max(1, Math.round(bottom - top)),
  };
}
