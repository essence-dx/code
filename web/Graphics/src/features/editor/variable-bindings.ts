import type {
  DesignDocument,
  DesignLayer,
  DesignVariableBindableProperty,
  DesignVariableCollection,
  DesignVariableDefinition,
  DesignVariableMode,
  DesignVariableScope,
  DesignVariableType,
} from "@/features/editor/types";
import { defaultAutoLayout } from "@/features/editor/auto-layout";

export const defaultVariableMode: DesignVariableMode = {
  id: "default",
  name: "Default",
};

export const variableScopeOptions = [
  { value: "paint", label: "Paint" },
  { value: "text", label: "Text" },
  { value: "layout", label: "Layout" },
  { value: "effect", label: "Effects" },
  { value: "component", label: "Components" },
  { value: "prototype", label: "Prototype" },
  { value: "dev", label: "Dev Mode" },
] as const satisfies ReadonlyArray<{
  value: DesignVariableScope;
  label: string;
}>;

export const defaultVariableCollections: Record<
  string,
  DesignVariableCollection
> = {
  paint: {
    id: "paint",
    name: "Paint",
    scope: "paint",
    createdAt: "2026-05-14T00:00:00.000Z",
    updatedAt: "2026-05-14T00:00:00.000Z",
  },
  text: {
    id: "text",
    name: "Text",
    scope: "text",
    createdAt: "2026-05-14T00:00:00.000Z",
    updatedAt: "2026-05-14T00:00:00.000Z",
  },
  layout: {
    id: "layout",
    name: "Layout",
    scope: "layout",
    createdAt: "2026-05-14T00:00:00.000Z",
    updatedAt: "2026-05-14T00:00:00.000Z",
  },
  effects: {
    id: "effects",
    name: "Effects",
    scope: "effect",
    createdAt: "2026-05-14T00:00:00.000Z",
    updatedAt: "2026-05-14T00:00:00.000Z",
  },
};

export const variableBindableProperties = [
  { property: "fill", label: "Fill", type: "color" },
  { property: "stroke", label: "Stroke", type: "color" },
  { property: "shadowColor", label: "Shadow", type: "color" },
  { property: "textColor", label: "Text color", type: "color" },
  { property: "text", label: "Text content", type: "text" },
  { property: "cornerRadius", label: "Radius", type: "number" },
  { property: "strokeWidth", label: "Stroke width", type: "number" },
  { property: "opacity", label: "Opacity", type: "number" },
  { property: "fontSize", label: "Font size", type: "number" },
  { property: "lineHeight", label: "Line height", type: "number" },
  { property: "letterSpacing", label: "Tracking", type: "number" },
  { property: "shadowX", label: "Shadow X", type: "number" },
  { property: "shadowY", label: "Shadow Y", type: "number" },
  { property: "shadowBlur", label: "Shadow blur", type: "number" },
  { property: "shadowSpread", label: "Shadow spread", type: "number" },
  { property: "layerBlur", label: "Layer blur", type: "number" },
  { property: "backgroundBlur", label: "Background blur", type: "number" },
  { property: "autoLayoutGap", label: "Layout gap", type: "number" },
  { property: "autoLayoutPaddingX", label: "Padding X", type: "number" },
  { property: "autoLayoutPaddingY", label: "Padding Y", type: "number" },
] as const satisfies ReadonlyArray<{
  property: DesignVariableBindableProperty;
  label: string;
  type: DesignVariableType;
}>;

export function getVariableModes(document: Pick<DesignDocument, "variableModes">) {
  return document.variableModes?.length ? document.variableModes : [defaultVariableMode];
}

export function getVariableCollections(
  document: Pick<DesignDocument, "variableCollections">,
) {
  return Object.keys(document.variableCollections ?? {}).length
    ? document.variableCollections ?? {}
    : defaultVariableCollections;
}

export function getActiveVariableModeId(
  document: Pick<DesignDocument, "activeVariableModeId" | "variableModes">,
) {
  const modes = getVariableModes(document);

  return (
    document.activeVariableModeId && modes.some((mode) => mode.id === document.activeVariableModeId)
      ? document.activeVariableModeId
      : modes[0].id
  );
}

export function resolveVariableValue(
  variableId: string,
  document: Pick<
    DesignDocument,
    "activeVariableModeId" | "variableDefinitions" | "variableModes"
  >,
  visited = new Set<string>(),
): string | null {
  const variable = document.variableDefinitions?.[variableId];

  if (!variable || visited.has(variableId)) {
    return null;
  }

  if (variable.aliasOf) {
    visited.add(variableId);
    return resolveVariableValue(variable.aliasOf, document, visited);
  }

  const modeId = getActiveVariableModeId(document);

  return variable.values[modeId] ?? variable.values[defaultVariableMode.id] ?? null;
}

export function getVariableDefinitionSignature(
  definitions?: Record<string, DesignVariableDefinition>,
) {
  return Object.values(definitions ?? {})
    .map((variable) =>
      [
        variable.name,
        variable.type,
        variable.collectionId ?? "",
        variable.aliasOf ?? "",
        Object.entries(variable.values)
          .sort(([first], [second]) => first.localeCompare(second))
          .map(([modeId, value]) => `${modeId}:${value}`)
          .join(","),
      ].join(":"),
    )
    .sort()
    .join("|");
}

export function getVariableCollectionSignature(
  collections?: Record<string, DesignVariableCollection>,
) {
  return Object.values(collections ?? {})
    .map((collection) =>
      [
        collection.id,
        collection.name,
        collection.scope,
        collection.updatedAt,
      ].join(":"),
    )
    .sort()
    .join("|");
}

export function getLayerVariableBindingSignature(layer: DesignLayer) {
  return Object.entries(layer.variableBindings ?? {})
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([property, variableId]) => `${property}:${variableId}`)
    .join("|");
}

export function getFlatVariableMap(
  document: Pick<
    DesignDocument,
    "activeVariableModeId" | "variableDefinitions" | "variableModes"
  >,
) {
  return Object.fromEntries(
    Object.values(document.variableDefinitions ?? {})
      .map((variable) => [variable.name, resolveVariableValue(variable.id, document)])
      .filter((entry): entry is [string, string] => entry[1] !== null),
  );
}

export function applyVariableBindingsToLayer(
  layer: DesignLayer,
  document: Pick<
    DesignDocument,
    "activeVariableModeId" | "variableDefinitions" | "variableModes"
  >,
) {
  const bindings = layer.variableBindings;

  if (!bindings) {
    return layer;
  }

  const patch: Partial<DesignLayer> = {};

  variableBindableProperties.forEach(({ property, type }) => {
    const variableId = bindings[property];
    const variable = variableId ? document.variableDefinitions?.[variableId] : null;
    const value = variableId ? resolveVariableValue(variableId, document) : null;

    if (!variable || value === null || variable.type !== type) {
      return;
    }

    if (type === "number") {
      const numericValue = Number(value);

      if (Number.isFinite(numericValue)) {
        Object.assign(
          patch,
          getVariableBindingLayerPatch(layer, property, numericValue),
        );
      }
      return;
    }

    Object.assign(patch, getVariableBindingLayerPatch(layer, property, value));
  });

  return Object.keys(patch).length > 0 ? { ...layer, ...patch } : layer;
}

export function getVariableBindingLayerPatch(
  layer: DesignLayer,
  property: DesignVariableBindableProperty,
  value: number | string,
) {
  if (
    property === "autoLayoutGap" ||
    property === "autoLayoutPaddingX" ||
    property === "autoLayoutPaddingY"
  ) {
    const numericValue = Number(value);
    const autoLayout = {
      ...defaultAutoLayout,
      ...layer.autoLayout,
    };

    if (property === "autoLayoutGap") {
      autoLayout.gap = Math.max(0, Math.round(numericValue));
    }

    if (property === "autoLayoutPaddingX") {
      autoLayout.paddingX = Math.max(0, Math.round(numericValue));
    }

    if (property === "autoLayoutPaddingY") {
      autoLayout.paddingY = Math.max(0, Math.round(numericValue));
    }

    return { autoLayout } satisfies Partial<DesignLayer>;
  }

  return { [property]: value } as Partial<DesignLayer>;
}

export function applyVariableBindingsToDocument(document: DesignDocument) {
  return {
    ...document,
    pages: document.pages.map((page) => ({
      ...page,
      layers: page.layers.map((layer) =>
        applyVariableBindingsToLayer(layer, document),
      ),
    })),
    updatedAt: new Date().toISOString(),
  };
}
