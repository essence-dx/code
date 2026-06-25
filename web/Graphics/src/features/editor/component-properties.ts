import type {
  DesignComponent,
  DesignComponentPropertyDefinition,
  DesignComponentVariant,
  DesignLayer,
} from "@/features/editor/types";
import { getComponentSlotName } from "@/features/editor/component-slots";

export const defaultVariantPropertyId = "variant";
export const defaultVariantPropertyName = "Variant";
export const defaultVariantPropertyValue = "Default";
export const textComponentPropertyIdPrefix = "text:";
export const componentPropertyTypes = [
  "variant",
  "text",
  "boolean",
  "number",
] as const;

export function createDefaultComponentPropertyDefinitions(
  now = new Date().toISOString(),
) {
  return {
    [defaultVariantPropertyId]: {
      id: defaultVariantPropertyId,
      name: defaultVariantPropertyName,
      type: "variant",
      defaultValue: defaultVariantPropertyValue,
      options: [defaultVariantPropertyValue],
      createdAt: now,
      updatedAt: now,
    },
  } satisfies Record<string, DesignComponentPropertyDefinition>;
}

export function createComponentPropertyDefinitionsForLayers(
  layers: DesignLayer[],
  now = new Date().toISOString(),
) {
  const definitions: Record<string, DesignComponentPropertyDefinition> =
    createDefaultComponentPropertyDefinitions(now);
  const usedNames = new Set(
    Object.values(definitions).map((definition) => definition.name),
  );

  layers.forEach((layer) => {
    if (layer.text === undefined) {
      return;
    }

    const name = getUniqueComponentPropertyName(
      getComponentSlotName(layer),
      usedNames,
    );

    definitions[getComponentTextPropertyId(layer.id)] = {
      id: getComponentTextPropertyId(layer.id),
      name,
      type: "text",
      defaultValue: layer.text,
      createdAt: now,
      updatedAt: now,
    };
    usedNames.add(name);
  });

  return definitions;
}

export function getComponentPropertyDefinitions(component: DesignComponent) {
  return Object.keys(component.propertyDefinitions ?? {}).length
    ? component.propertyDefinitions ?? {}
    : createDefaultComponentPropertyDefinitions(component.createdAt);
}

export function getComponentInstancePropertyValues(
  component: DesignComponent,
  variant?: DesignComponentVariant,
) {
  const definitions = getComponentPropertyDefinitions(component);

  return {
    ...Object.fromEntries(
      Object.values(definitions).map((definition) => [
        definition.name,
        definition.defaultValue,
      ]),
    ),
    ...(variant?.properties ?? {}),
  };
}

export function getVariantForComponentProperties(
  component: DesignComponent,
  values: Record<string, string>,
) {
  return (component.variants ?? []).find((variant) =>
    Object.entries(variant.properties).every(
      ([propertyName, value]) => values[propertyName] === value,
    ),
  );
}

export function getComponentTextPropertyId(sourceLayerId: string) {
  return `${textComponentPropertyIdPrefix}${sourceLayerId}`;
}

export function getComponentTextPropertyNameForLayer(
  component: DesignComponent,
  sourceLayerId?: string,
  slotName?: string,
) {
  const definitions = Object.values(getComponentPropertyDefinitions(component));
  const exactMatch = sourceLayerId
    ? definitions.find(
        (definition) =>
          definition.type === "text" &&
          definition.id === getComponentTextPropertyId(sourceLayerId),
      )
    : null;

  if (exactMatch) {
    return exactMatch.name;
  }

  return (
    definitions.find(
      (definition) =>
        definition.type === "text" &&
        Boolean(slotName) &&
        definition.name === slotName,
    )?.name ?? null
  );
}

export function getComponentVariantPropertyNames(component: DesignComponent) {
  return Object.values(getComponentPropertyDefinitions(component))
    .filter((definition) => definition.type === "variant")
    .map((definition) => definition.name);
}

export function withVariantPropertyOption(
  component: DesignComponent,
  option: string,
) {
  const now = new Date().toISOString();
  const definitions = getComponentPropertyDefinitions(component);
  const variantDefinition =
    definitions[defaultVariantPropertyId] ??
    createDefaultComponentPropertyDefinitions(now)[defaultVariantPropertyId];
  const options = Array.from(
    new Set([...(variantDefinition.options ?? []), option]),
  );

  return {
    ...definitions,
    [defaultVariantPropertyId]: {
      ...variantDefinition,
      options,
      updatedAt: now,
    },
  };
}

export function getComponentPropertyDefinitionSignature(
  component: DesignComponent,
) {
  return Object.values(getComponentPropertyDefinitions(component))
    .map((definition) =>
      [
        definition.name,
        definition.type,
        definition.defaultValue,
        ...(definition.options ?? []),
      ].join(":"),
    )
    .sort()
    .join("|");
}

function getUniqueComponentPropertyName(
  baseName: string,
  usedNames: Set<string>,
) {
  const fallbackName = baseName.trim() || "Content";
  let name = fallbackName;
  let index = 2;

  while (usedNames.has(name)) {
    name = `${fallbackName} ${index}`;
    index += 1;
  }

  return name;
}
