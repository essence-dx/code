import type { ComponentUsageAnalytics } from "@/features/editor/component-analytics";
import { getComponentPropertyDefinitions } from "@/features/editor/component-properties";
import {
  getLayerCodeConnectReport,
  getLayerDevLinkReport,
} from "@/features/editor/layer-codegen";
import type { DesignComponent } from "@/features/editor/types";

export type ComponentDocumentationStatus = "ready" | "review" | "missing";

export type ComponentDocumentationItem = {
  id: string;
  label: string;
  detail: string;
  status: ComponentDocumentationStatus;
};

export type ComponentDocumentationReadiness = {
  items: ComponentDocumentationItem[];
  readyCount: number;
  reviewCount: number;
  missingCount: number;
  score: number;
  label: string;
};

export type ComponentDocumentationSummary = {
  readyComponents: number;
  reviewComponents: number;
  missingComponents: number;
  averageScore: number;
};

export type ComponentDocumentationAuditRow = {
  componentName: string;
  status: string;
  score: number;
  readyCount: number;
  reviewCount: number;
  missingCount: number;
  instanceCount: number;
  variantCount: number;
  propertyCount: number;
  slotCount: number;
  codeConnectCount: number;
  devLinkCount: number;
  reviewItems: string;
  missingItems: string;
};

export function getComponentDocumentationReadiness(
  component: DesignComponent,
  analytics?: ComponentUsageAnalytics,
): ComponentDocumentationReadiness {
  const variantCount = component.variants?.length ?? 0;
  const propertyCount = Object.keys(
    getComponentPropertyDefinitions(component),
  ).length;
  const explicitSlotCount = component.layers.filter((layer) =>
    Boolean(layer.componentSlotName?.trim()),
  ).length;
  const codeConnectCount = component.layers.filter((layer) =>
    Boolean(getLayerCodeConnectReport(layer)),
  ).length;
  const devLinkCount = component.layers.reduce(
    (total, layer) => total + getLayerDevLinkReport(layer).length,
    0,
  );
  const instanceCount = analytics?.instanceCount ?? 0;

  const items: ComponentDocumentationItem[] = [
    {
      id: "examples",
      label: "Examples",
      detail:
        instanceCount > 0
          ? `${instanceCount} placed example${instanceCount === 1 ? "" : "s"} in files`
          : "Insert the component in a file to create a usage example",
      status: instanceCount > 0 ? "ready" : "review",
    },
    {
      id: "variants",
      label: "Variants",
      detail:
        variantCount > 0
          ? `${variantCount} variant${variantCount === 1 ? "" : "s"} defined`
          : "Create variants when the component has meaningful states",
      status: variantCount > 0 ? "ready" : "review",
    },
    {
      id: "props",
      label: "Properties",
      detail:
        propertyCount > 0
          ? `${propertyCount} editable propert${propertyCount === 1 ? "y" : "ies"}`
          : "Add properties for text, boolean, swap, or variant control",
      status: propertyCount > 0 ? "ready" : "review",
    },
    {
      id: "slots",
      label: "Slots",
      detail:
        explicitSlotCount === component.layers.length
          ? `${explicitSlotCount} named slot${explicitSlotCount === 1 ? "" : "s"}`
          : `${component.layers.length - explicitSlotCount} layer${component.layers.length - explicitSlotCount === 1 ? "" : "s"} need slot metadata`,
      status:
        component.layers.length > 0 && explicitSlotCount === component.layers.length
          ? "ready"
          : "missing",
    },
    {
      id: "code-connect",
      label: "Code Connect",
      detail:
        codeConnectCount > 0
          ? `${codeConnectCount} source layer${codeConnectCount === 1 ? "" : "s"} mapped`
          : "Map at least one source layer to implementation code",
      status: codeConnectCount > 0 ? "ready" : "review",
    },
    {
      id: "dev-links",
      label: "Dev links",
      detail:
        devLinkCount > 0
          ? `${devLinkCount} repo, Storybook, issue, or docs link${devLinkCount === 1 ? "" : "s"}`
          : "Attach repo, Storybook, issue, or docs links for handoff",
      status: devLinkCount > 0 ? "ready" : "review",
    },
  ];
  const readyCount = items.filter((item) => item.status === "ready").length;
  const reviewCount = items.filter((item) => item.status === "review").length;
  const missingCount = items.filter((item) => item.status === "missing").length;
  const score = Math.round(
    ((readyCount + reviewCount * 0.5) / items.length) * 100,
  );

  return {
    items,
    readyCount,
    reviewCount,
    missingCount,
    score,
    label: getReadinessLabel(missingCount, reviewCount),
  };
}

export function needsComponentDocumentationReview(
  component: DesignComponent,
  analytics?: ComponentUsageAnalytics,
) {
  const readiness = getComponentDocumentationReadiness(component, analytics);

  return readiness.missingCount > 0 || readiness.reviewCount > 0;
}

export function getComponentDocumentationSummary(
  components: DesignComponent[],
  analyticsByComponentId: Record<string, ComponentUsageAnalytics>,
): ComponentDocumentationSummary {
  if (components.length === 0) {
    return {
      readyComponents: 0,
      reviewComponents: 0,
      missingComponents: 0,
      averageScore: 0,
    };
  }

  const readiness = components.map((component) =>
    getComponentDocumentationReadiness(
      component,
      analyticsByComponentId[component.id],
    ),
  );

  return {
    readyComponents: readiness.filter(
      (item) => item.missingCount === 0 && item.reviewCount === 0,
    ).length,
    reviewComponents: readiness.filter(
      (item) => item.missingCount === 0 && item.reviewCount > 0,
    ).length,
    missingComponents: readiness.filter((item) => item.missingCount > 0).length,
    averageScore: Math.round(
      readiness.reduce((total, item) => total + item.score, 0) /
        readiness.length,
    ),
  };
}

export function getComponentDocumentationAuditRows(
  components: DesignComponent[],
  analyticsByComponentId: Record<string, ComponentUsageAnalytics>,
): ComponentDocumentationAuditRow[] {
  return components.map((component) => {
    const analytics = analyticsByComponentId[component.id];
    const readiness = getComponentDocumentationReadiness(component, analytics);
    const stats = getComponentDocumentationStats(component);

    return {
      componentName: component.name,
      status: readiness.label,
      score: readiness.score,
      readyCount: readiness.readyCount,
      reviewCount: readiness.reviewCount,
      missingCount: readiness.missingCount,
      instanceCount: analytics?.instanceCount ?? 0,
      variantCount: stats.variantCount,
      propertyCount: stats.propertyCount,
      slotCount: stats.explicitSlotCount,
      codeConnectCount: stats.codeConnectCount,
      devLinkCount: stats.devLinkCount,
      reviewItems: readiness.items
        .filter((item) => item.status === "review")
        .map((item) => item.label)
        .join("; "),
      missingItems: readiness.items
        .filter((item) => item.status === "missing")
        .map((item) => item.label)
        .join("; "),
    };
  });
}

export function getComponentDocumentationCsv(
  components: DesignComponent[],
  analyticsByComponentId: Record<string, ComponentUsageAnalytics>,
) {
  const rows = getComponentDocumentationAuditRows(
    components,
    analyticsByComponentId,
  );
  const header: Array<keyof ComponentDocumentationAuditRow> = [
    "componentName",
    "status",
    "score",
    "readyCount",
    "reviewCount",
    "missingCount",
    "instanceCount",
    "variantCount",
    "propertyCount",
    "slotCount",
    "codeConnectCount",
    "devLinkCount",
    "reviewItems",
    "missingItems",
  ];

  return [
    header.join(","),
    ...rows.map((row) =>
      header.map((key) => escapeCsvCell(row[key])).join(","),
    ),
  ].join("\n");
}

function getComponentDocumentationStats(component: DesignComponent) {
  return {
    variantCount: component.variants?.length ?? 0,
    propertyCount: Object.keys(getComponentPropertyDefinitions(component))
      .length,
    explicitSlotCount: component.layers.filter((layer) =>
      Boolean(layer.componentSlotName?.trim()),
    ).length,
    codeConnectCount: component.layers.filter((layer) =>
      Boolean(getLayerCodeConnectReport(layer)),
    ).length,
    devLinkCount: component.layers.reduce(
      (total, layer) => total + getLayerDevLinkReport(layer).length,
      0,
    ),
  };
}

function escapeCsvCell(value: string | number) {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function getReadinessLabel(missingCount: number, reviewCount: number) {
  if (missingCount > 0) {
    return "Missing docs";
  }

  if (reviewCount > 0) {
    return "Needs review";
  }

  return "Ready";
}
