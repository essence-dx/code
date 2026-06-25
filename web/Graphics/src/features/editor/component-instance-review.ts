import type {
  DesignComponent,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

export type ComponentInstanceReviewStatus =
  | "pending-update"
  | "update-available"
  | "detached";

export type ComponentInstanceReviewRow = {
  id: string;
  componentId: string;
  componentName: string;
  pageId: string;
  pageName: string;
  status: ComponentInstanceReviewStatus;
  sourceVersion?: number;
  availableVersion?: number;
  variantName?: string;
  layerIds: string[];
  layerNames: string[];
  instanceLayerCount: number;
  canAcceptUpdate: boolean;
  detail: string;
};

export type ComponentInstanceReviewReport = {
  affectedComponentCount: number;
  affectedInstanceCount: number;
  staleInstanceCount: number;
  pendingUpdateInstanceCount: number;
  detachedInstanceCount: number;
  rows: ComponentInstanceReviewRow[];
  byComponentId: Record<string, ComponentInstanceReviewRow[]>;
};

type ComponentInstanceBucket = {
  instanceKey: string;
  component: DesignComponent;
  pageId: string;
  pageName: string;
  variantId?: string;
  layers: DesignLayer[];
};

export function getComponentInstanceReview(
  components: DesignComponent[],
  pages: DesignPage[],
  pendingUpdates: Record<string, DesignComponent>,
): ComponentInstanceReviewReport {
  const componentsById = new Map(
    components.map((component) => [component.id, component]),
  );
  const buckets = new Map<string, ComponentInstanceBucket>();

  pages.forEach((page) => {
    page.layers.forEach((layer) => {
      if (!layer.componentId) {
        return;
      }

      const component = componentsById.get(layer.componentId);

      if (!component) {
        return;
      }

      const instanceKey = getInstanceKey(page.id, layer);
      const bucket = buckets.get(instanceKey);

      if (bucket) {
        bucket.layers.push(layer);
        return;
      }

      buckets.set(instanceKey, {
        instanceKey,
        component,
        pageId: page.id,
        pageName: page.name,
        variantId: layer.componentVariantId,
        layers: [layer],
      });
    });
  });

  const rows = Array.from(buckets.values())
    .map((bucket) => buildReviewRow(bucket, pendingUpdates))
    .filter((row): row is ComponentInstanceReviewRow => Boolean(row))
    .sort(sortReviewRows);
  const byComponentId = rows.reduce<Record<string, ComponentInstanceReviewRow[]>>(
    (accumulator, row) => {
      accumulator[row.componentId] ??= [];
      accumulator[row.componentId].push(row);
      return accumulator;
    },
    {},
  );

  return {
    affectedComponentCount: Object.keys(byComponentId).length,
    affectedInstanceCount: rows.length,
    staleInstanceCount: rows.filter((row) => row.status !== "detached").length,
    pendingUpdateInstanceCount: rows.filter(
      (row) => row.status === "pending-update",
    ).length,
    detachedInstanceCount: rows.filter((row) => row.status === "detached")
      .length,
    rows,
    byComponentId,
  };
}

function buildReviewRow(
  bucket: ComponentInstanceBucket,
  pendingUpdates: Record<string, DesignComponent>,
): ComponentInstanceReviewRow | undefined {
  const { component } = bucket;
  const source = component.librarySource;

  if (!source) {
    return undefined;
  }

  const pendingUpdate = pendingUpdates[component.id];
  const status = getReviewStatus(component, Boolean(pendingUpdate));

  if (!status) {
    return undefined;
  }

  const availableVersion =
    pendingUpdate?.librarySource?.version ?? source.availableVersion;
  const variantName = bucket.variantId
    ? component.variants?.find((variant) => variant.id === bucket.variantId)
        ?.name
    : undefined;
  const layerNames = bucket.layers.map((layer) => layer.name);

  return {
    id: bucket.instanceKey,
    componentId: component.id,
    componentName: component.name,
    pageId: bucket.pageId,
    pageName: bucket.pageName,
    status,
    sourceVersion: source.version,
    availableVersion,
    variantName,
    layerIds: bucket.layers.map((layer) => layer.id),
    layerNames,
    instanceLayerCount: bucket.layers.length,
    canAcceptUpdate: Boolean(pendingUpdate),
    detail: getReviewDetail(status, source.version, availableVersion),
  };
}

function getReviewStatus(
  component: DesignComponent,
  hasPendingUpdate: boolean,
): ComponentInstanceReviewStatus | undefined {
  if (hasPendingUpdate) {
    return "pending-update";
  }

  if (component.librarySource?.status === "update-available") {
    return "update-available";
  }

  if (component.librarySource?.status === "detached") {
    return "detached";
  }

  return undefined;
}

function getReviewDetail(
  status: ComponentInstanceReviewStatus,
  sourceVersion?: number,
  availableVersion?: number,
) {
  if (status === "pending-update") {
    return `Imported update ready${formatVersionRange(
      sourceVersion,
      availableVersion,
    )}.`;
  }

  if (status === "update-available") {
    return `Library source reports a newer version${formatVersionRange(
      sourceVersion,
      availableVersion,
    )}.`;
  }

  return "Detached from future library updates.";
}

function formatVersionRange(currentVersion?: number, availableVersion?: number) {
  if (!currentVersion && !availableVersion) {
    return "";
  }

  if (currentVersion && availableVersion) {
    return ` from v${currentVersion} to v${availableVersion}`;
  }

  if (availableVersion) {
    return ` to v${availableVersion}`;
  }

  return ` from v${currentVersion}`;
}

function getInstanceKey(pageId: string, layer: DesignLayer) {
  return `${pageId}:${layer.componentId}:${layer.componentVariantId ?? "main"}:${
    layer.groupId ?? layer.id
  }`;
}

function sortReviewRows(
  first: ComponentInstanceReviewRow,
  second: ComponentInstanceReviewRow,
) {
  const priorityDifference =
    getStatusPriority(first.status) - getStatusPriority(second.status);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  return `${first.componentName} ${first.pageName}`.localeCompare(
    `${second.componentName} ${second.pageName}`,
  );
}

function getStatusPriority(status: ComponentInstanceReviewStatus) {
  if (status === "pending-update") {
    return 0;
  }

  if (status === "update-available") {
    return 1;
  }

  return 2;
}
