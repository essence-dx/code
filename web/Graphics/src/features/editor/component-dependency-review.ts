import type {
  DesignComponent,
  DesignComponentVariant,
  DesignLayer,
} from "@/features/editor/types";

export type ComponentDependencyStatus =
  | "ready"
  | "missing-slot"
  | "unknown-component"
  | "self-reference"
  | "cycle";

export type ComponentDependencyReviewRow = {
  id: string;
  componentId: string;
  componentName: string;
  dependencyId: string;
  dependencyName: string;
  sourceNames: string[];
  layerNames: string[];
  slotNames: string[];
  nestedLayerCount: number;
  slottedLayerCount: number;
  status: ComponentDependencyStatus;
  detail: string;
};

export type ComponentDependencyImpactSummary = {
  componentId: string;
  componentName: string;
  dependsOnCount: number;
  usedByCount: number;
  nestedLayerCount: number;
  issueCount: number;
  riskScore: number;
};

export type ComponentDependencyReviewReport = {
  componentCount: number;
  dependencyCount: number;
  nestedLayerCount: number;
  slottedLayerCount: number;
  issueCount: number;
  impactSummaries: ComponentDependencyImpactSummary[];
  rows: ComponentDependencyReviewRow[];
  byComponentId: Record<string, ComponentDependencyReviewRow[]>;
};

type DependencyBucket = {
  component: DesignComponent;
  dependencyId: string;
  dependencyName: string;
  sourceNames: Set<string>;
  layers: DesignLayer[];
};

export function getComponentDependencyReview(
  components: DesignComponent[],
): ComponentDependencyReviewReport {
  const componentsById = new Map(
    components.map((component) => [component.id, component]),
  );
  const buckets = new Map<string, DependencyBucket>();

  components.forEach((component) => {
    getComponentSources(component).forEach((source) => {
      source.layers.forEach((layer) => {
        if (!layer.componentId) {
          return;
        }

        const dependencyName =
          componentsById.get(layer.componentId)?.name ?? layer.componentId;
        const key = `${component.id}:${layer.componentId}`;
        const bucket = buckets.get(key);

        if (bucket) {
          bucket.sourceNames.add(source.name);
          bucket.layers.push(layer);
          return;
        }

        buckets.set(key, {
          component,
          dependencyId: layer.componentId,
          dependencyName,
          sourceNames: new Set([source.name]),
          layers: [layer],
        });
      });
    });
  });

  const adjacency = getDependencyAdjacency(buckets, componentsById);
  const rows = Array.from(buckets.values())
    .map((bucket) => buildDependencyRow(bucket, adjacency, componentsById))
    .sort(sortDependencyRows);
  const byComponentId = rows.reduce<
    Record<string, ComponentDependencyReviewRow[]>
  >((accumulator, row) => {
    accumulator[row.componentId] ??= [];
    accumulator[row.componentId].push(row);
    return accumulator;
  }, {});

  return {
    componentCount: components.length,
    dependencyCount: rows.length,
    nestedLayerCount: rows.reduce(
      (total, row) => total + row.nestedLayerCount,
      0,
    ),
    slottedLayerCount: rows.reduce(
      (total, row) => total + row.slottedLayerCount,
      0,
    ),
    issueCount: rows.filter((row) => row.status !== "ready").length,
    impactSummaries: getImpactSummaries(components, rows),
    rows,
    byComponentId,
  };
}

export function getComponentDependencyGraphMermaid(
  report: ComponentDependencyReviewReport,
) {
  if (report.rows.length === 0) {
    return [
      "flowchart LR",
      '  empty["No nested component dependencies"]',
    ].join("\n");
  }

  const nodeIds = new Map<string, string>();
  const nodes: string[] = [];
  const edges: string[] = [];

  report.rows.forEach((row) => {
    const sourceId = getNodeId(row.componentId, nodeIds);
    const targetId = getNodeId(row.dependencyId, nodeIds);

    nodes.push(`  ${sourceId}["${escapeMermaidLabel(row.componentName)}"]`);
    nodes.push(`  ${targetId}["${escapeMermaidLabel(row.dependencyName)}"]`);
    edges.push(
      `  ${sourceId} -->|"${escapeMermaidLabel(
        `${row.nestedLayerCount} nested / ${row.status}`,
      )}"| ${targetId}`,
    );
  });

  return [
    "flowchart LR",
    ...Array.from(new Set(nodes)).sort(),
    ...edges.sort(),
  ].join("\n");
}

function buildDependencyRow(
  bucket: DependencyBucket,
  adjacency: Record<string, Set<string>>,
  componentsById: Map<string, DesignComponent>,
): ComponentDependencyReviewRow {
  const slottedLayers = bucket.layers.filter((layer) =>
    Boolean(layer.componentSlotName?.trim()),
  );
  const slotNames = Array.from(
    new Set(
      bucket.layers
        .map((layer) => layer.componentSlotName?.trim())
        .filter((slotName): slotName is string => Boolean(slotName)),
    ),
  );
  const status = getDependencyStatus(bucket, adjacency, componentsById);

  return {
    id: `${bucket.component.id}:${bucket.dependencyId}`,
    componentId: bucket.component.id,
    componentName: bucket.component.name,
    dependencyId: bucket.dependencyId,
    dependencyName: bucket.dependencyName,
    sourceNames: Array.from(bucket.sourceNames).sort(),
    layerNames: bucket.layers.map((layer) => layer.name),
    slotNames,
    nestedLayerCount: bucket.layers.length,
    slottedLayerCount: slottedLayers.length,
    status,
    detail: getDependencyDetail(status, bucket.layers.length, slottedLayers.length),
  };
}

function getDependencyStatus(
  bucket: DependencyBucket,
  adjacency: Record<string, Set<string>>,
  componentsById: Map<string, DesignComponent>,
): ComponentDependencyStatus {
  if (bucket.component.id === bucket.dependencyId) {
    return "self-reference";
  }

  if (!componentsById.has(bucket.dependencyId)) {
    return "unknown-component";
  }

  if (hasPath(bucket.dependencyId, bucket.component.id, adjacency)) {
    return "cycle";
  }

  if (
    bucket.layers.some((layer) => !layer.componentSlotName?.trim())
  ) {
    return "missing-slot";
  }

  return "ready";
}

function getDependencyDetail(
  status: ComponentDependencyStatus,
  nestedLayerCount: number,
  slottedLayerCount: number,
) {
  if (status === "ready") {
    return `${nestedLayerCount} nested layer${nestedLayerCount === 1 ? "" : "s"} with slot metadata.`;
  }

  if (status === "missing-slot") {
    return `${nestedLayerCount - slottedLayerCount} nested layer${
      nestedLayerCount - slottedLayerCount === 1 ? "" : "s"
    } need slot metadata.`;
  }

  if (status === "unknown-component") {
    return "Nested instance points to a missing component definition.";
  }

  if (status === "self-reference") {
    return "Component contains an instance of itself.";
  }

  return "Dependency cycle detected between components.";
}

function getComponentSources(component: DesignComponent) {
  return [
    { id: component.id, name: "Main", layers: component.layers },
    ...(component.variants ?? []).map((variant) => ({
      id: variant.id,
      name: getVariantSourceName(variant),
      layers: variant.layers,
    })),
  ];
}

function getVariantSourceName(variant: DesignComponentVariant) {
  return variant.name ? `Variant: ${variant.name}` : "Variant";
}

function getDependencyAdjacency(
  buckets: Map<string, DependencyBucket>,
  componentsById: Map<string, DesignComponent>,
) {
  const adjacency: Record<string, Set<string>> = {};

  buckets.forEach((bucket) => {
    if (
      bucket.component.id === bucket.dependencyId ||
      !componentsById.has(bucket.dependencyId)
    ) {
      return;
    }

    adjacency[bucket.component.id] ??= new Set();
    adjacency[bucket.component.id].add(bucket.dependencyId);
  });

  return adjacency;
}

function hasPath(
  startId: string,
  targetId: string,
  adjacency: Record<string, Set<string>>,
  visited = new Set<string>(),
): boolean {
  if (startId === targetId) {
    return true;
  }

  if (visited.has(startId)) {
    return false;
  }

  visited.add(startId);

  return Array.from(adjacency[startId] ?? []).some((nextId) =>
    hasPath(nextId, targetId, adjacency, visited),
  );
}

function sortDependencyRows(
  first: ComponentDependencyReviewRow,
  second: ComponentDependencyReviewRow,
) {
  const priorityDifference =
    getStatusPriority(first.status) - getStatusPriority(second.status);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return `${first.componentName} ${first.dependencyName}`.localeCompare(
    `${second.componentName} ${second.dependencyName}`,
  );
}

function getImpactSummaries(
  components: DesignComponent[],
  rows: ComponentDependencyReviewRow[],
): ComponentDependencyImpactSummary[] {
  return components
    .map((component) => {
      const outgoingRows = rows.filter((row) => row.componentId === component.id);
      const incomingRows = rows.filter((row) => row.dependencyId === component.id);
      const issueRows = [...outgoingRows, ...incomingRows].filter(
        (row) => row.status !== "ready",
      );
      const nestedLayerCount = outgoingRows.reduce(
        (total, row) => total + row.nestedLayerCount,
        0,
      );
      const riskScore =
        issueRows.length * 3 + incomingRows.length * 2 + outgoingRows.length;

      return {
        componentId: component.id,
        componentName: component.name,
        dependsOnCount: outgoingRows.length,
        usedByCount: incomingRows.length,
        nestedLayerCount,
        issueCount: issueRows.length,
        riskScore,
      };
    })
    .filter(
      (summary) =>
        summary.dependsOnCount > 0 ||
        summary.usedByCount > 0 ||
        summary.issueCount > 0,
    )
    .sort(
      (first, second) =>
        second.riskScore - first.riskScore ||
        second.usedByCount - first.usedByCount ||
        first.componentName.localeCompare(second.componentName),
    );
}

function getStatusPriority(status: ComponentDependencyStatus) {
  if (status === "self-reference" || status === "cycle") {
    return 0;
  }

  if (status === "unknown-component") {
    return 1;
  }

  if (status === "missing-slot") {
    return 2;
  }

  return 3;
}

function getNodeId(componentId: string, nodeIds: Map<string, string>) {
  const existingId = nodeIds.get(componentId);

  if (existingId) {
    return existingId;
  }

  const nextId = `component_${nodeIds.size + 1}`;
  nodeIds.set(componentId, nextId);
  return nextId;
}

function escapeMermaidLabel(value: string) {
  return value.replace(/"/g, '\\"');
}
