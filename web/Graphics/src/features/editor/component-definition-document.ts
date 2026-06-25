import { nanoid } from "nanoid";
import { defaultVariantPropertyId } from "@/features/editor/component-properties";
import type {
  DesignComponent,
  DesignComponentPropertyDefinition,
  DesignComponentPropertyType,
  DesignDocument,
  DesignLayer,
} from "@/features/editor/types";

export type ComponentPropertyDefinitionPatch = Partial<
  Pick<
    DesignComponentPropertyDefinition,
    "name" | "type" | "defaultValue" | "options"
  >
>;

export type ComponentSlotPatch = Partial<
  Pick<DesignLayer, "componentSlotName" | "componentSlotType">
>;

export function addComponentPropertyDefinitionInDocument(
  document: DesignDocument,
  componentId: string,
  type: DesignComponentPropertyType,
): DesignDocument {
  const component = document.components?.[componentId];

  if (!component) {
    return document;
  }

  const now = new Date().toISOString();
  const definitions = {
    ...(component.propertyDefinitions ?? {}),
  };
  const name = getUniqueComponentDefinitionName(
    getDefaultComponentPropertyName(type),
    new Set(Object.values(definitions).map((definition) => definition.name)),
  );
  const definition: DesignComponentPropertyDefinition = {
    id: nanoid(),
    name,
    type,
    defaultValue: getDefaultComponentPropertyValue(type),
    options:
      type === "variant"
        ? ["Default"]
        : type === "boolean"
          ? ["true", "false"]
          : undefined,
    createdAt: now,
    updatedAt: now,
  };

  return updateComponentInDocument(document, componentId, {
    ...component,
    propertyDefinitions: {
      ...definitions,
      [definition.id]: definition,
    },
    updatedAt: now,
  });
}

export function updateComponentPropertyDefinitionInDocument(
  document: DesignDocument,
  componentId: string,
  definitionId: string,
  patch: ComponentPropertyDefinitionPatch,
): DesignDocument {
  const component = document.components?.[componentId];
  const definition = component?.propertyDefinitions?.[definitionId];

  if (!component || !definition) {
    return document;
  }

  const now = new Date().toISOString();
  const nextName = patch.name?.trim() || definition.name;
  const nextDefinition: DesignComponentPropertyDefinition = {
    ...definition,
    ...patch,
    name: nextName,
    defaultValue: patch.defaultValue ?? definition.defaultValue,
    options:
      patch.options !== undefined
        ? normalizePropertyOptions(
            patch.options,
            patch.defaultValue ?? definition.defaultValue,
          )
        : definition.options,
    updatedAt: now,
  };
  const nextDefinitions = {
    ...component.propertyDefinitions,
    [definitionId]: nextDefinition,
  };
  const renamedDocument =
    nextName === definition.name
      ? document
      : renameComponentPropertyUsages(
          document,
          componentId,
          definition.name,
          nextName,
        );
  const nextComponent = renamedDocument.components?.[componentId] ?? component;

  return updateComponentInDocument(renamedDocument, componentId, {
    ...nextComponent,
    propertyDefinitions: nextDefinitions,
    variants: (nextComponent.variants ?? []).map((variant) => ({
      ...variant,
      properties: normalizeComponentPropertyValues(
        variant.properties,
        nextDefinition,
      ),
    })),
    updatedAt: now,
  });
}

export function deleteComponentPropertyDefinitionInDocument(
  document: DesignDocument,
  componentId: string,
  definitionId: string,
): DesignDocument {
  const component = document.components?.[componentId];
  const definition = component?.propertyDefinitions?.[definitionId];

  if (!component || !definition || definitionId === defaultVariantPropertyId) {
    return document;
  }

  const { [definitionId]: _removedDefinition, ...definitions } =
    component.propertyDefinitions ?? {};

  return {
    ...updateComponentInDocument(document, componentId, {
      ...component,
      propertyDefinitions: definitions,
      variants: (component.variants ?? []).map((variant) => ({
        ...variant,
        properties: omitPropertyValue(variant.properties, definition.name),
      })),
      updatedAt: new Date().toISOString(),
    }),
    pages: document.pages.map((page) => ({
      ...page,
      layers: page.layers.map((layer) =>
        layer.componentId === componentId
          ? {
              ...layer,
              componentProperties: omitPropertyValue(
                layer.componentProperties ?? {},
                definition.name,
              ),
            }
          : layer,
      ),
    })),
  };
}

export function updateComponentSlotInDocument(
  document: DesignDocument,
  componentId: string,
  sourceLayerId: string,
  patch: ComponentSlotPatch,
): DesignDocument {
  const component = document.components?.[componentId];

  if (!component) {
    return document;
  }

  const now = new Date().toISOString();
  const patchSourceLayers = (layers: DesignLayer[]) =>
    layers.map((layer) =>
      layer.id === sourceLayerId
        ? {
            ...layer,
            ...patch,
            componentSlotName:
              patch.componentSlotName?.trim() || layer.componentSlotName,
          }
        : layer,
    );

  return updateComponentInDocument(document, componentId, {
    ...component,
    layers: patchSourceLayers(component.layers),
    variants: (component.variants ?? []).map((variant) => ({
      ...variant,
      layers: patchSourceLayers(variant.layers),
      updatedAt: now,
    })),
    updatedAt: now,
  });
}

function updateComponentInDocument(
  document: DesignDocument,
  componentId: string,
  component: DesignComponent,
): DesignDocument {
  return {
    ...document,
    components: {
      ...(document.components ?? {}),
      [componentId]: component,
    },
    updatedAt: new Date().toISOString(),
  };
}

function renameComponentPropertyUsages(
  document: DesignDocument,
  componentId: string,
  previousName: string,
  nextName: string,
): DesignDocument {
  const component = document.components?.[componentId];

  if (!component) {
    return document;
  }

  return {
    ...document,
    components: {
      ...(document.components ?? {}),
      [componentId]: {
        ...component,
        variants: (component.variants ?? []).map((variant) => ({
          ...variant,
          properties: renamePropertyValueKey(
            variant.properties,
            previousName,
            nextName,
          ),
        })),
      },
    },
    pages: document.pages.map((page) => ({
      ...page,
      layers: page.layers.map((layer) =>
        layer.componentId === componentId
          ? {
              ...layer,
              componentProperties: renamePropertyValueKey(
                layer.componentProperties ?? {},
                previousName,
                nextName,
              ),
            }
          : layer,
      ),
    })),
  };
}

function renamePropertyValueKey(
  values: Record<string, string>,
  previousName: string,
  nextName: string,
) {
  if (!(previousName in values)) {
    return values;
  }

  const { [previousName]: previousValue, ...rest } = values;

  return {
    ...rest,
    [nextName]: previousValue,
  };
}

function omitPropertyValue(values: Record<string, string>, name: string) {
  const { [name]: _removed, ...rest } = values;

  return rest;
}

function normalizeComponentPropertyValues(
  values: Record<string, string>,
  definition: DesignComponentPropertyDefinition,
) {
  const current = values[definition.name];

  if (current === undefined) {
    return values;
  }

  if (definition.options?.length && !definition.options.includes(current)) {
    return {
      ...values,
      [definition.name]: definition.defaultValue,
    };
  }

  return values;
}

function normalizePropertyOptions(
  options: string[],
  defaultValue: string | undefined,
) {
  const normalized = Array.from(
    new Set(options.map((option) => option.trim()).filter(Boolean)),
  );

  if (defaultValue?.trim() && !normalized.includes(defaultValue.trim())) {
    normalized.unshift(defaultValue.trim());
  }

  return normalized.length > 0 ? normalized : undefined;
}

function getDefaultComponentPropertyName(type: DesignComponentPropertyType) {
  if (type === "variant") {
    return "Variant";
  }

  if (type === "boolean") {
    return "Enabled";
  }

  if (type === "number") {
    return "Value";
  }

  return "Content";
}

function getDefaultComponentPropertyValue(type: DesignComponentPropertyType) {
  if (type === "boolean") {
    return "true";
  }

  if (type === "number") {
    return "0";
  }

  return "Default";
}

function getUniqueComponentDefinitionName(
  baseName: string,
  usedNames: Set<string>,
) {
  const fallbackName = baseName.trim() || "Property";
  let name = fallbackName;
  let index = 2;

  while (usedNames.has(name)) {
    name = `${fallbackName} ${index}`;
    index += 1;
  }

  return name;
}
