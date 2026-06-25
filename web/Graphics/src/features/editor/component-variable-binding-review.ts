import { variableBindableProperties } from "@/features/editor/variable-bindings";
import type {
  DesignComponent,
  DesignDocument,
  DesignLayer,
  DesignVariableBindableProperty,
  DesignVariableType,
} from "@/features/editor/types";

export type ComponentVariableBindingIssueType =
  | "missing-variable"
  | "type-mismatch";

export type ComponentVariableBindingIssue = {
  id: string;
  type: ComponentVariableBindingIssueType;
  componentId: string;
  componentName: string;
  layerId: string;
  layerName: string;
  property: DesignVariableBindableProperty;
  propertyLabel: string;
  variableId: string;
  detail: string;
};

export type ComponentVariableBindingReview = {
  bindingCount: number;
  readyBindingCount: number;
  issueCount: number;
  missingVariableCount: number;
  typeMismatchCount: number;
  issues: ComponentVariableBindingIssue[];
};

const propertyTypeByName = new Map(
  variableBindableProperties.map((item) => [item.property, item.type]),
);
const propertyLabelByName = new Map(
  variableBindableProperties.map((item) => [item.property, item.label]),
);

export function getComponentVariableBindingReview(
  document: DesignDocument,
  components: DesignComponent[],
): ComponentVariableBindingReview {
  let bindingCount = 0;
  const issues: ComponentVariableBindingIssue[] = [];

  components.forEach((component) => {
    component.layers.forEach((layer) => {
      Object.entries(layer.variableBindings ?? {}).forEach(
        ([property, variableId]) => {
          bindingCount += 1;
          const issue = getBindingIssue(
            document,
            component,
            layer,
            property as DesignVariableBindableProperty,
            variableId,
          );

          if (issue) {
            issues.push(issue);
          }
        },
      );
    });
  });

  return {
    bindingCount,
    readyBindingCount: bindingCount - issues.length,
    issueCount: issues.length,
    missingVariableCount: issues.filter((issue) => issue.type === "missing-variable")
      .length,
    typeMismatchCount: issues.filter((issue) => issue.type === "type-mismatch")
      .length,
    issues: issues.sort(sortBindingIssues),
  };
}

export function removeStaleComponentVariableBindingsInDocument(
  document: DesignDocument,
): DesignDocument {
  if (!document.components) {
    return document;
  }

  const now = new Date().toISOString();
  let changed = false;
  const components = Object.fromEntries(
    Object.entries(document.components).map(([componentId, component]) => {
      const result = removeStaleBindingsFromLayers(document, component.layers);

      if (!result.changed) {
        return [componentId, component];
      }

      changed = true;

      return [
        componentId,
        {
          ...component,
          layers: result.layers,
          updatedAt: now,
        },
      ];
    }),
  );

  return changed
    ? {
        ...document,
        components,
        updatedAt: now,
      }
    : document;
}

function getBindingIssue(
  document: DesignDocument,
  component: DesignComponent,
  layer: DesignLayer,
  property: DesignVariableBindableProperty,
  variableId: string,
): ComponentVariableBindingIssue | null {
  const variable = document.variableDefinitions?.[variableId];
  const expectedType = propertyTypeByName.get(property);
  const propertyLabel = propertyLabelByName.get(property) ?? property;

  if (!variable) {
    return {
      id: `${component.id}:${layer.id}:${property}:missing`,
      type: "missing-variable",
      componentId: component.id,
      componentName: component.name,
      layerId: layer.id,
      layerName: layer.name,
      property,
      propertyLabel,
      variableId,
      detail: "Binding points to a deleted or unavailable variable.",
    };
  }

  if (expectedType && variable.type !== expectedType) {
    return {
      id: `${component.id}:${layer.id}:${property}:type`,
      type: "type-mismatch",
      componentId: component.id,
      componentName: component.name,
      layerId: layer.id,
      layerName: layer.name,
      property,
      propertyLabel,
      variableId,
      detail: `Binding expects a ${expectedType} variable but points to ${variable.type}.`,
    };
  }

  return null;
}

function removeStaleBindingsFromLayers(
  document: DesignDocument,
  layers: DesignLayer[],
) {
  let changed = false;
  const nextLayers = layers.map((layer) => {
    const bindings = layer.variableBindings;

    if (!bindings) {
      return layer;
    }

    const nextBindings = Object.fromEntries(
      Object.entries(bindings).filter(([property, variableId]) => {
        const expectedType = propertyTypeByName.get(
          property as DesignVariableBindableProperty,
        );
        const variable = document.variableDefinitions?.[variableId];

        return Boolean(variable && (!expectedType || variable.type === expectedType));
      }),
    );

    if (Object.keys(nextBindings).length === Object.keys(bindings).length) {
      return layer;
    }

    changed = true;

    return {
      ...layer,
      variableBindings:
        Object.keys(nextBindings).length > 0 ? nextBindings : undefined,
    };
  });

  return {
    changed,
    layers: nextLayers,
  };
}

function sortBindingIssues(
  first: ComponentVariableBindingIssue,
  second: ComponentVariableBindingIssue,
) {
  const typeDifference =
    getIssuePriority(first.type) - getIssuePriority(second.type);

  if (typeDifference !== 0) {
    return typeDifference;
  }

  return `${first.componentName} ${first.layerName}`.localeCompare(
    `${second.componentName} ${second.layerName}`,
  );
}

function getIssuePriority(type: ComponentVariableBindingIssueType) {
  return type === "missing-variable" ? 0 : 1;
}
