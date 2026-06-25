import {
  getFlatVariableMap,
  resolveVariableValue,
  variableBindableProperties,
} from "@/features/editor/variable-bindings";
import {
  getLayerVariablePropertyValue,
  getVariablePropertyLabel,
  normalizeVariableValue,
} from "@/features/editor/variable-usage-audit";
import type {
  DesignComponent,
  DesignDocument,
  DesignLayer,
  DesignVariableBindableProperty,
  DesignVariableType,
} from "@/features/editor/types";

export type ComponentVariableCoverageStatus = "ready" | "review" | "missing";

export type ComponentVariableCoverageRow = {
  componentId: string;
  componentName: string;
  sourceLayerCount: number;
  bindablePropertyCount: number;
  boundPropertyCount: number;
  matchingRawPropertyCount: number;
  coveragePercent: number;
  status: ComponentVariableCoverageStatus;
  missingProperties: string[];
  matchingProperties: string[];
  detail: string;
};

export type ComponentVariableCoverageReport = {
  componentCount: number;
  sourceLayerCount: number;
  bindablePropertyCount: number;
  boundPropertyCount: number;
  matchingRawPropertyCount: number;
  coveragePercent: number;
  readyComponentCount: number;
  reviewComponentCount: number;
  missingComponentCount: number;
  rows: ComponentVariableCoverageRow[];
};

export function getComponentVariableCoverageReport(
  document: DesignDocument,
  components: DesignComponent[],
): ComponentVariableCoverageReport {
  const tokenValues = new Set(
    Object.values(getFlatVariableMap(document)).map(normalizeVariableValue),
  );
  const rows = components.map((component) =>
    getComponentVariableCoverageRow(component, tokenValues),
  );
  const bindablePropertyCount = rows.reduce(
    (count, row) => count + row.bindablePropertyCount,
    0,
  );
  const boundPropertyCount = rows.reduce(
    (count, row) => count + row.boundPropertyCount,
    0,
  );
  const matchingRawPropertyCount = rows.reduce(
    (count, row) => count + row.matchingRawPropertyCount,
    0,
  );

  return {
    componentCount: components.length,
    sourceLayerCount: rows.reduce((count, row) => count + row.sourceLayerCount, 0),
    bindablePropertyCount,
    boundPropertyCount,
    matchingRawPropertyCount,
    coveragePercent: getCoveragePercent(boundPropertyCount, bindablePropertyCount),
    readyComponentCount: rows.filter((row) => row.status === "ready").length,
    reviewComponentCount: rows.filter((row) => row.status === "review").length,
    missingComponentCount: rows.filter((row) => row.status === "missing").length,
    rows: rows.sort(sortCoverageRows),
  };
}

export function getComponentVariableCoverageCsv(
  report: ComponentVariableCoverageReport,
) {
  return [
    [
      "status",
      "component",
      "sourceLayerCount",
      "bindablePropertyCount",
      "boundPropertyCount",
      "matchingRawPropertyCount",
      "coveragePercent",
      "missingProperties",
      "matchingProperties",
      "detail",
    ],
    ...report.rows.map((row) => [
      row.status,
      row.componentName,
      row.sourceLayerCount,
      row.bindablePropertyCount,
      row.boundPropertyCount,
      row.matchingRawPropertyCount,
      row.coveragePercent,
      row.missingProperties.join("; "),
      row.matchingProperties.join("; "),
      row.detail,
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function bindMatchingComponentVariablesInDocument(
  document: DesignDocument,
): DesignDocument {
  const candidates = getVariableCandidates(document);

  if (candidates.length === 0 || !document.components) {
    return document;
  }

  const now = new Date().toISOString();
  let changed = false;
  const components = Object.fromEntries(
    Object.entries(document.components).map(([componentId, component]) => {
      const result = bindMatchingLayerVariables(component.layers, candidates);

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

function getComponentVariableCoverageRow(
  component: DesignComponent,
  tokenValues: Set<string>,
): ComponentVariableCoverageRow {
  const layerProperties = component.layers.flatMap((layer) =>
    variableBindableProperties.flatMap(({ property }) => {
      const value = getLayerVariablePropertyValue(layer, property);

      if (value === null) {
        return [];
      }

      return [
        {
          property,
          label: getVariablePropertyLabel(property),
          bound: Boolean(layer.variableBindings?.[property]),
          matchesToken: tokenValues.has(normalizeVariableValue(value)),
        },
      ];
    }),
  );
  const bindablePropertyCount = layerProperties.length;
  const boundProperties = layerProperties.filter((item) => item.bound);
  const missingProperties = layerProperties.filter((item) => !item.bound);
  const matchingProperties = missingProperties.filter((item) => item.matchesToken);
  const coveragePercent = getCoveragePercent(
    boundProperties.length,
    bindablePropertyCount,
  );
  const status = getCoverageStatus(bindablePropertyCount, coveragePercent);

  return {
    componentId: component.id,
    componentName: component.name,
    sourceLayerCount: component.layers.length,
    bindablePropertyCount,
    boundPropertyCount: boundProperties.length,
    matchingRawPropertyCount: matchingProperties.length,
    coveragePercent,
    status,
    missingProperties: getUniqueLabels(missingProperties),
    matchingProperties: getUniqueLabels(matchingProperties),
    detail: getCoverageDetail(status, coveragePercent, matchingProperties.length),
  };
}

function bindMatchingLayerVariables(
  layers: DesignLayer[],
  candidates: VariableCandidate[],
) {
  let changed = false;
  const nextLayers = layers.map((layer) => {
    const bindings = { ...(layer.variableBindings ?? {}) };

    variableBindableProperties.forEach(({ property, type }) => {
      if (bindings[property]) {
        return;
      }

      const value = getLayerVariablePropertyValue(layer, property);
      const candidate = value
        ? findVariableCandidate(candidates, type, value)
        : undefined;

      if (candidate) {
        bindings[property] = candidate.id;
      }
    });

    if (Object.keys(bindings).length === Object.keys(layer.variableBindings ?? {}).length) {
      return layer;
    }

    changed = true;

    return {
      ...layer,
      variableBindings: bindings,
    };
  });

  return {
    changed,
    layers: nextLayers,
  };
}

type VariableCandidate = {
  id: string;
  type: DesignVariableType;
  normalizedValue: string;
};

function getVariableCandidates(document: DesignDocument): VariableCandidate[] {
  return Object.values(document.variableDefinitions ?? {}).flatMap((variable) => {
    const value = resolveVariableValue(variable.id, document);

    if (value === null) {
      return [];
    }

    return [
      {
        id: variable.id,
        type: variable.type,
        normalizedValue: normalizeVariableValue(value),
      },
    ];
  });
}

function findVariableCandidate(
  candidates: VariableCandidate[],
  type: DesignVariableType,
  value: string | number,
) {
  const normalizedValue = normalizeVariableValue(value);

  return candidates.find(
    (candidate) =>
      candidate.type === type && candidate.normalizedValue === normalizedValue,
  );
}

function getCoverageStatus(
  bindablePropertyCount: number,
  coveragePercent: number,
): ComponentVariableCoverageStatus {
  if (bindablePropertyCount === 0 || coveragePercent >= 80) {
    return "ready";
  }

  if (coveragePercent > 0) {
    return "review";
  }

  return "missing";
}

function getCoverageDetail(
  status: ComponentVariableCoverageStatus,
  coveragePercent: number,
  matchingRawPropertyCount: number,
) {
  if (status === "ready") {
    return `Variable coverage is ${coveragePercent}%.`;
  }

  if (matchingRawPropertyCount > 0) {
    return `${matchingRawPropertyCount} raw properties already match existing variable values.`;
  }

  return "Bind reusable visual properties to document variables before publishing.";
}

function getCoveragePercent(boundCount: number, totalCount: number) {
  if (totalCount === 0) {
    return 100;
  }

  return Math.round((boundCount / totalCount) * 100);
}

function getUniqueLabels(items: Array<{ property: DesignVariableBindableProperty; label: string }>) {
  return Array.from(new Set(items.map((item) => item.label))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function sortCoverageRows(
  first: ComponentVariableCoverageRow,
  second: ComponentVariableCoverageRow,
) {
  const statusDifference =
    getStatusPriority(first.status) - getStatusPriority(second.status);

  if (statusDifference !== 0) {
    return statusDifference;
  }

  return first.coveragePercent - second.coveragePercent ||
    first.componentName.localeCompare(second.componentName);
}

function getStatusPriority(status: ComponentVariableCoverageStatus) {
  if (status === "missing") {
    return 0;
  }

  if (status === "review") {
    return 1;
  }

  return 2;
}

function formatCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
