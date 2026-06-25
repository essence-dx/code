import type {
  ComponentUsageAnalytics,
} from "@/features/editor/component-analytics";
import { getComponentPropertyDefinitions } from "@/features/editor/component-properties";
import type {
  DesignActivityEvent,
  DesignComponent,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

export type ComponentUsageIntelligenceStatus = "ready" | "review" | "blocked";

export type ComponentUsageIntelligenceCategory =
  | "adoption"
  | "variant"
  | "library"
  | "property"
  | "orphan"
  | "trend"
  | "ready";

export type ComponentUsageIntelligenceRow = {
  id: string;
  status: ComponentUsageIntelligenceStatus;
  category: ComponentUsageIntelligenceCategory;
  componentId?: string;
  componentName: string;
  label: string;
  detail: string;
  recommendation: string;
  layerIds: string[];
  pageNames: string[];
  metric: number;
};

export type ComponentUsageIntelligenceReport = {
  score: number;
  status: ComponentUsageIntelligenceStatus;
  componentCount: number;
  instanceCount: number;
  usedComponentCount: number;
  unusedComponentCount: number;
  detachedLibraryCount: number;
  updateAvailableCount: number;
  orphanInstanceCount: number;
  variantDriftCount: number;
  propertyDriftCount: number;
  adoptionTrendEventCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  rows: ComponentUsageIntelligenceRow[];
};

export function getComponentUsageIntelligenceReport({
  activityEvents = [],
  analyticsByComponentId,
  components,
  pages,
  pendingUpdates = {},
}: {
  activityEvents?: DesignActivityEvent[];
  analyticsByComponentId: Record<string, ComponentUsageAnalytics>;
  components: DesignComponent[];
  pages: DesignPage[];
  pendingUpdates?: Record<string, DesignComponent>;
}): ComponentUsageIntelligenceReport {
  const rows = [
    ...getAdoptionRows(components, analyticsByComponentId),
    ...getLibraryRows(components, pendingUpdates),
    ...getVariantRows(components, pages, analyticsByComponentId),
    ...getPropertyRows(components, pages),
    ...getOrphanInstanceRows(components, pages),
    ...getTrendRows(components, activityEvents),
  ].sort(sortRows);
  const finalRows = rows.length > 0 ? rows : [getReadyRow(components.length)];
  const blockedCount = finalRows.filter((row) => row.status === "blocked").length;
  const reviewCount = finalRows.filter((row) => row.status === "review").length;
  const readyCount = finalRows.filter((row) => row.status === "ready").length;
  const instanceCount = Object.values(analyticsByComponentId).reduce(
    (total, item) => total + item.instanceCount,
    0,
  );

  return {
    score: Math.max(0, 100 - blockedCount * 18 - reviewCount * 6),
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    componentCount: components.length,
    instanceCount,
    usedComponentCount: components.filter(
      (component) => (analyticsByComponentId[component.id]?.instanceCount ?? 0) > 0,
    ).length,
    unusedComponentCount: components.filter(
      (component) => (analyticsByComponentId[component.id]?.instanceCount ?? 0) === 0,
    ).length,
    detachedLibraryCount: components.filter(
      (component) => component.librarySource?.status === "detached",
    ).length,
    updateAvailableCount: components.filter(
      (component) =>
        component.librarySource?.status === "update-available" ||
        Boolean(pendingUpdates[component.id]),
    ).length,
    orphanInstanceCount: finalRows
      .filter((row) => row.category === "orphan")
      .reduce((total, row) => total + row.layerIds.length, 0),
    variantDriftCount: finalRows.filter((row) => row.category === "variant")
      .length,
    propertyDriftCount: finalRows
      .filter((row) => row.category === "property")
      .reduce((total, row) => total + row.metric, 0),
    adoptionTrendEventCount: getComponentTrendEvents(activityEvents).length,
    readyCount,
    reviewCount,
    blockedCount,
    rows: finalRows,
  };
}

export function getComponentUsageIntelligenceCsv(
  report: ComponentUsageIntelligenceReport,
  rows = report.rows,
) {
  const headers: Array<keyof ComponentUsageIntelligenceRow> = [
    "status",
    "category",
    "componentName",
    "label",
    "detail",
    "pageNames",
    "layerIds",
    "metric",
    "recommendation",
  ];

  return [
    ["score", report.score].map(escapeCsvCell).join(","),
    ["status", report.status].map(escapeCsvCell).join(","),
    ["components", report.componentCount].map(escapeCsvCell).join(","),
    ["instances", report.instanceCount].map(escapeCsvCell).join(","),
    ["orphans", report.orphanInstanceCount].map(escapeCsvCell).join(","),
    "",
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvCell(row[header])).join(","),
    ),
  ].join("\n");
}

export function getComponentUsageIntelligenceMarkdown(
  report: ComponentUsageIntelligenceReport,
  rows = report.rows,
) {
  return [
    "# Component Usage Intelligence",
    "",
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Components: ${report.componentCount}`,
    `Instances: ${report.instanceCount}`,
    `Used components: ${report.usedComponentCount}`,
    `Unused components: ${report.unusedComponentCount}`,
    `Detached libraries: ${report.detachedLibraryCount}`,
    `Update available: ${report.updateAvailableCount}`,
    `Variant drift rows: ${report.variantDriftCount}`,
    `Property drift fields: ${report.propertyDriftCount}`,
    `Trend events: ${report.adoptionTrendEventCount}`,
    "",
    "## Review Rows",
    ...(rows.length
      ? rows.map(
          (row) =>
            `- [${row.status}] ${row.componentName} / ${row.label}: ${row.detail} Recommendation: ${row.recommendation}`,
        )
      : ["- No component usage rows."]),
  ].join("\n");
}

export function getComponentUsageIntelligenceBundleJson(
  report: ComponentUsageIntelligenceReport,
  rows = report.rows,
) {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      summary: {
        status: report.status,
        score: report.score,
        componentCount: report.componentCount,
        instanceCount: report.instanceCount,
        usedComponentCount: report.usedComponentCount,
        unusedComponentCount: report.unusedComponentCount,
        detachedLibraryCount: report.detachedLibraryCount,
        updateAvailableCount: report.updateAvailableCount,
        orphanInstanceCount: report.orphanInstanceCount,
        variantDriftCount: report.variantDriftCount,
        propertyDriftCount: report.propertyDriftCount,
      },
      rows,
    },
    null,
    2,
  );
}

function getAdoptionRows(
  components: DesignComponent[],
  analyticsByComponentId: Record<string, ComponentUsageAnalytics>,
) {
  const unused = components.filter(
    (component) => (analyticsByComponentId[component.id]?.instanceCount ?? 0) === 0,
  );

  if (unused.length === 0) {
    return [];
  }

  return [
    createRow({
      status: unused.length > 8 ? "blocked" : "review",
      category: "adoption",
      componentName: "Library",
      label: "Unused components",
      detail: `${unused.length} components are published in the file but have no instances.`,
      recommendation:
        "Remove draft components or place proof instances before publishing usage analytics.",
      componentId: unused[0]?.id,
      metric: unused.length,
    }),
  ];
}

function getLibraryRows(
  components: DesignComponent[],
  pendingUpdates: Record<string, DesignComponent>,
) {
  return components.flatMap((component) => {
    if (component.librarySource?.status === "detached") {
      return [
        createRow({
          status: "blocked",
          category: "library",
          componentId: component.id,
          componentName: component.name,
          label: "Detached library source",
          detail: "This component is detached from its source library.",
          recommendation:
            "Review whether to relink, replace, or intentionally own this detached component before release.",
          metric: 1,
        }),
      ];
    }

    if (
      component.librarySource?.status === "update-available" ||
      pendingUpdates[component.id]
    ) {
      return [
        createRow({
          status: "review",
          category: "library",
          componentId: component.id,
          componentName: component.name,
          label: "Library update available",
          detail: "A newer source component is available for review.",
          recommendation:
            "Accept or defer the library update with evidence before publishing dependent files.",
          metric: 1,
        }),
      ];
    }

    return [];
  });
}

function getVariantRows(
  components: DesignComponent[],
  pages: DesignPage[],
  analyticsByComponentId: Record<string, ComponentUsageAnalytics>,
) {
  return components.flatMap((component) => {
    const analytics = analyticsByComponentId[component.id];
    const variants = component.variants ?? [];

    if (!analytics || variants.length === 0) {
      return [];
    }

    const unusedVariants = variants.filter(
      (variant) => (analytics.variantUsage[variant.id] ?? 0) === 0,
    );
    const missingVariantLayers = getComponentInstanceLayers(pages, component.id)
      .filter(
        (layer) =>
          layer.componentVariantId &&
          !variants.some((variant) => variant.id === layer.componentVariantId),
      );

    if (unusedVariants.length === 0 && missingVariantLayers.length === 0) {
      return [];
    }

    return [
      createRow({
        status: missingVariantLayers.length > 0 ? "blocked" : "review",
        category: "variant",
        componentId: component.id,
        componentName: component.name,
        label:
          missingVariantLayers.length > 0
            ? "Missing variant references"
            : "Variant coverage drift",
        detail:
          missingVariantLayers.length > 0
            ? `${missingVariantLayers.length} instance layers point to missing variant ids.`
            : `${unusedVariants.length} variants have no adopted instances.`,
        recommendation:
          "Repair missing variant references and keep published variant sets backed by real adoption evidence.",
        layerIds: missingVariantLayers.map((layer) => layer.id),
        pageNames: getPageNamesForLayers(pages, missingVariantLayers),
        metric: missingVariantLayers.length || unusedVariants.length,
      }),
    ];
  });
}

function getPropertyRows(components: DesignComponent[], pages: DesignPage[]) {
  return components.flatMap((component) => {
    const definitions = Object.values(getComponentPropertyDefinitions(component));

    if (definitions.length === 0) {
      return [];
    }

    const instanceLayers = getComponentInstanceLayers(pages, component.id);
    const driftingLayers = instanceLayers.filter((layer) =>
      definitions.some((definition) => {
        const value = layer.componentProperties?.[definition.name];

        return value === undefined || value === "";
      }),
    );

    if (driftingLayers.length === 0) {
      return [];
    }

    return [
      createRow({
        status: driftingLayers.length > 12 ? "blocked" : "review",
        category: "property",
        componentId: component.id,
        componentName: component.name,
        label: "Property coverage drift",
        detail: `${driftingLayers.length} instance layers do not carry all declared component properties.`,
        recommendation:
          "Reset instances or backfill property values so analytics and variant controls remain reliable.",
        layerIds: driftingLayers.map((layer) => layer.id),
        pageNames: getPageNamesForLayers(pages, driftingLayers),
        metric: driftingLayers.length,
      }),
    ];
  });
}

function getOrphanInstanceRows(
  components: DesignComponent[],
  pages: DesignPage[],
) {
  const componentIds = new Set(components.map((component) => component.id));
  const orphanLayers = pages
    .flatMap((page) => page.layers)
    .filter((layer) => layer.componentId && !componentIds.has(layer.componentId));

  if (orphanLayers.length === 0) {
    return [];
  }

  return [
    createRow({
      status: "blocked",
      category: "orphan",
      componentName: "Missing component",
      label: "Orphaned component instances",
      detail: `${orphanLayers.length} instance layers point to components that no longer exist.`,
      recommendation:
        "Repair component references or detach these instances before release handoff.",
      layerIds: orphanLayers.map((layer) => layer.id),
      pageNames: getPageNamesForLayers(pages, orphanLayers),
      metric: orphanLayers.length,
    }),
  ];
}

function getTrendRows(
  components: DesignComponent[],
  activityEvents: DesignActivityEvent[],
) {
  const trendEvents = getComponentTrendEvents(activityEvents);

  if (components.length === 0 || trendEvents.length > 0) {
    return [];
  }

  return [
    createRow({
      status: "review",
      category: "trend",
      componentName: "Library",
      label: "No adoption trend events",
      detail:
        "The activity stream has no component insert, variant, update, or detach events to support adoption trend review.",
      recommendation:
        "Capture component operations before relying on trend evidence in a library release.",
      metric: 0,
    }),
  ];
}

function getComponentTrendEvents(events: DesignActivityEvent[]) {
  return events.filter(
    (event) =>
      event.kind === "component" ||
      /component|variant|library update|detached/i.test(event.label),
  );
}

function getComponentInstanceLayers(pages: DesignPage[], componentId: string) {
  return pages
    .flatMap((page) => page.layers)
    .filter((layer) => layer.componentId === componentId);
}

function getPageNamesForLayers(pages: DesignPage[], layers: DesignLayer[]) {
  const layerIds = new Set(layers.map((layer) => layer.id));

  return pages
    .filter((page) => page.layers.some((layer) => layerIds.has(layer.id)))
    .map((page) => page.name);
}

function createRow(
  input: Omit<ComponentUsageIntelligenceRow, "id" | "layerIds" | "pageNames"> &
    Partial<Pick<ComponentUsageIntelligenceRow, "layerIds" | "pageNames">>,
): ComponentUsageIntelligenceRow {
  return {
    id: `${input.category}:${input.componentId ?? "library"}:${input.label}`,
    layerIds: input.layerIds ?? [],
    pageNames: input.pageNames ?? [],
    ...input,
  };
}

function getReadyRow(componentCount: number): ComponentUsageIntelligenceRow {
  return {
    id: "component-usage-ready",
    status: "ready",
    category: "ready",
    componentName: "Library",
    label: "Component usage ready",
    detail:
      "Component adoption, variants, library links, properties, and release evidence are ready.",
    recommendation:
      "Attach component usage intelligence to library release handoffs.",
    layerIds: [],
    pageNames: [],
    metric: componentCount,
  };
}

function sortRows(
  first: ComponentUsageIntelligenceRow,
  second: ComponentUsageIntelligenceRow,
) {
  const statusOrder = { blocked: 0, review: 1, ready: 2 };

  if (first.status !== second.status) {
    return statusOrder[first.status] - statusOrder[second.status];
  }

  return first.category.localeCompare(second.category);
}

function escapeCsvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join(" / ") : String(value ?? "");

  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}
