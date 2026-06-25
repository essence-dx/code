import type { ComponentUsageAnalytics } from "@/features/editor/component-analytics";
import type { LayerPatch } from "@/features/editor/document-utils";
import type {
  DesignComponent,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

export type ComponentIntegrityIssueType =
  | "unused-component"
  | "empty-source"
  | "missing-component"
  | "missing-variant";

export type ComponentIntegrityIssue = {
  id: string;
  type: ComponentIntegrityIssueType;
  severity: "review" | "warning";
  componentId?: string;
  componentName: string;
  pageName?: string;
  layerName?: string;
  detail: string;
};

export type ComponentIntegrityReview = {
  issueCount: number;
  unusedComponentCount: number;
  emptySourceCount: number;
  missingComponentReferenceCount: number;
  missingVariantReferenceCount: number;
  issues: ComponentIntegrityIssue[];
};

export function getComponentIntegrityReview(
  components: DesignComponent[],
  pages: DesignPage[],
  analyticsByComponentId: Record<string, ComponentUsageAnalytics>,
): ComponentIntegrityReview {
  const componentById = new Map(
    components.map((component) => [component.id, component]),
  );
  const issues = [
    ...getComponentSourceIssues(components, analyticsByComponentId),
    ...getLayerReferenceIssues(pages, componentById),
  ].sort(sortIntegrityIssues);

  return {
    issueCount: issues.length,
    unusedComponentCount: issues.filter(
      (issue) => issue.type === "unused-component",
    ).length,
    emptySourceCount: issues.filter((issue) => issue.type === "empty-source")
      .length,
    missingComponentReferenceCount: issues.filter(
      (issue) => issue.type === "missing-component",
    ).length,
    missingVariantReferenceCount: issues.filter(
      (issue) => issue.type === "missing-variant",
    ).length,
    issues,
  };
}

export function getComponentIntegrityCsv(review: ComponentIntegrityReview) {
  return [
    [
      "type",
      "severity",
      "componentId",
      "component",
      "page",
      "layer",
      "detail",
    ],
    ...review.issues.map((issue) => [
      issue.type,
      issue.severity,
      issue.componentId ?? "",
      issue.componentName,
      issue.pageName ?? "",
      issue.layerName ?? "",
      issue.detail,
    ]),
  ]
    .map((row) => row.map(formatCsvCell).join(","))
    .join("\n");
}

export function getComponentReferenceRepairPatches(
  page: DesignPage,
  components: DesignComponent[],
): LayerPatch[] {
  const componentById = new Map(
    components.map((component) => [component.id, component]),
  );

  return page.layers.flatMap((layer): LayerPatch[] => {
    if (!layer.componentId) {
      return [];
    }

    const component = componentById.get(layer.componentId);

    if (!component) {
      return [
        {
          layerId: layer.id,
          patch: {
            componentId: undefined,
            componentVariantId: undefined,
            componentLayerId: undefined,
            componentProperties: undefined,
            componentSlotName: undefined,
            componentSlotType: undefined,
            name: `${layer.name} (detached)`,
          },
        },
      ];
    }

    if (
      layer.componentVariantId &&
      !(component.variants ?? []).some(
        (variant) => variant.id === layer.componentVariantId,
      )
    ) {
      return [
        {
          layerId: layer.id,
          patch: {
            componentVariantId: undefined,
          },
        },
      ];
    }

    return [];
  });
}

function getComponentSourceIssues(
  components: DesignComponent[],
  analyticsByComponentId: Record<string, ComponentUsageAnalytics>,
) {
  return components.flatMap((component): ComponentIntegrityIssue[] => {
    const issues: ComponentIntegrityIssue[] = [];
    const analytics = analyticsByComponentId[component.id];

    if ((analytics?.instanceCount ?? 0) === 0) {
      issues.push({
        id: `unused:${component.id}`,
        type: "unused-component",
        severity: "warning",
        componentId: component.id,
        componentName: component.name,
        detail: "Component has no instances in the current file.",
      });
    }

    if (component.layers.length === 0) {
      issues.push({
        id: `empty:${component.id}`,
        type: "empty-source",
        severity: "review",
        componentId: component.id,
        componentName: component.name,
        detail: "Component source has no layers to instantiate.",
      });
    }

    return issues;
  });
}

function getLayerReferenceIssues(
  pages: DesignPage[],
  componentById: Map<string, DesignComponent>,
) {
  return pages.flatMap((page) =>
    page.layers.flatMap((layer): ComponentIntegrityIssue[] =>
      getLayerReferenceIssue(page.name, layer, componentById),
    ),
  );
}

function getLayerReferenceIssue(
  pageName: string,
  layer: DesignLayer,
  componentById: Map<string, DesignComponent>,
): ComponentIntegrityIssue[] {
  if (!layer.componentId) {
    return [];
  }

  const component = componentById.get(layer.componentId);

  if (!component) {
    return [
      {
        id: `missing-component:${pageName}:${layer.id}`,
        type: "missing-component",
        severity: "review",
        componentId: layer.componentId,
        componentName: "Missing component",
        pageName,
        layerName: layer.name,
        detail: "Layer references a component id that is not in this file.",
      },
    ];
  }

  if (
    layer.componentVariantId &&
    !(component.variants ?? []).some(
      (variant) => variant.id === layer.componentVariantId,
    )
  ) {
    return [
      {
        id: `missing-variant:${pageName}:${layer.id}`,
        type: "missing-variant",
        severity: "review",
        componentId: component.id,
        componentName: component.name,
        pageName,
        layerName: layer.name,
        detail: "Layer references a variant id that no longer exists.",
      },
    ];
  }

  return [];
}

function sortIntegrityIssues(
  first: ComponentIntegrityIssue,
  second: ComponentIntegrityIssue,
) {
  const severityDifference =
    getSeverityPriority(first.severity) - getSeverityPriority(second.severity);

  if (severityDifference !== 0) {
    return severityDifference;
  }

  return `${first.componentName} ${first.layerName ?? ""}`.localeCompare(
    `${second.componentName} ${second.layerName ?? ""}`,
  );
}

function getSeverityPriority(severity: ComponentIntegrityIssue["severity"]) {
  return severity === "review" ? 0 : 1;
}

function formatCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
