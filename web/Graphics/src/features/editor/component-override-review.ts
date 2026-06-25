import { getComponentUsageAnalytics, type ComponentUsageAnalytics } from "@/features/editor/component-analytics";
import { getComponentLayerOverrideReport } from "@/features/editor/component-overrides";
import {
  getComponentInstancePropertyValues,
  getComponentPropertyDefinitions,
} from "@/features/editor/component-properties";
import {
  getComponentSlotName,
  getComponentSlotType,
  getComponentSource,
} from "@/features/editor/component-slots";
import type {
  ComponentOverrideReviewReport,
  ComponentOverrideReviewRow,
  ComponentOverrideReviewStatus,
  ComponentOverrideResetPreview,
  ComponentPropertyDiff,
  ComponentSlotIssue,
} from "@/features/editor/component-override-review-types";
import type {
  DesignComponent,
  DesignComponentVariant,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

export {
  getComponentOverrideReviewCsv,
  getComponentOverrideReviewMarkdown,
} from "@/features/editor/component-override-review-export";
export type {
  ComponentOverrideReviewReport,
  ComponentOverrideReviewRow,
  ComponentOverrideReviewStatus,
  ComponentOverrideResetPreview,
  ComponentPropertyDiff,
  ComponentSlotIssue,
} from "@/features/editor/component-override-review-types";

type ComponentInstanceBucket = {
  id: string;
  page: DesignPage;
  component: DesignComponent;
  variant?: DesignComponentVariant;
  variantId?: string;
  layers: DesignLayer[];
};

export function getComponentOverrideReview({
  activePageId,
  analyticsByComponentId,
  components,
  pages,
}: {
  activePageId: string;
  analyticsByComponentId?: Record<string, ComponentUsageAnalytics>;
  components: DesignComponent[];
  pages: DesignPage[];
}): ComponentOverrideReviewReport {
  const analytics =
    analyticsByComponentId ?? getComponentUsageAnalytics(components, pages);
  const buckets = getComponentInstanceBuckets(components, pages);
  const rows = buckets
    .map((bucket) => buildReviewRow(bucket, analytics, activePageId))
    .sort(sortRows);
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const variantStats = getVariantStats(components, analytics);

  return {
    score:
      rows.length === 0
        ? 100
        : Math.max(0, 100 - blockedCount * 18 - reviewCount * 5),
    instanceCount: rows.length,
    readyCount,
    reviewCount,
    blockedCount,
    resettableCount: rows.filter((row) => row.canReset).length,
    overrideCount: rows.reduce((total, row) => total + row.overrideCount, 0),
    propertyDiffCount: rows.reduce(
      (total, row) => total + row.propertyDiffCount,
      0,
    ),
    slotIssueCount: rows.reduce(
      (total, row) => total + row.slotIssueCount,
      0,
    ),
    componentAdoptionCount: components.filter(
      (component) => (analytics[component.id]?.instanceCount ?? 0) > 0,
    ).length,
    unusedComponentCount: components.filter(
      (component) => (analytics[component.id]?.instanceCount ?? 0) === 0,
    ).length,
    ...variantStats,
    rows,
  };
}

function getComponentInstanceBuckets(
  components: DesignComponent[],
  pages: DesignPage[],
) {
  const componentsById = new Map(
    components.map((component) => [component.id, component]),
  );
  const buckets = new Map<string, ComponentInstanceBucket>();

  for (const page of pages) {
    for (const layer of page.layers) {
      if (!layer.componentId) {
        continue;
      }

      const component = componentsById.get(layer.componentId);

      if (!component) {
        continue;
      }

      const bucketId = getInstanceKey(page.id, layer);
      const existingBucket = buckets.get(bucketId);

      if (existingBucket) {
        existingBucket.layers.push(layer);
        continue;
      }

      const variant = component.variants?.find(
        (item) => item.id === layer.componentVariantId,
      );

      buckets.set(bucketId, {
        id: bucketId,
        page,
        component,
        variant,
        variantId: layer.componentVariantId,
        layers: [layer],
      });
    }
  }

  return Array.from(buckets.values());
}

function buildReviewRow(
  bucket: ComponentInstanceBucket,
  analyticsByComponentId: Record<string, ComponentUsageAnalytics>,
  activePageId: string,
): ComponentOverrideReviewRow {
  const source = getComponentSource(bucket.component, bucket.variantId);
  const analytics = analyticsByComponentId[bucket.component.id];
  const resetPreview = getResetPreview(bucket);
  const propertyDiffs = getPropertyDiffs(bucket);
  const slotIssues = getSlotIssues(bucket, source);
  const overrideCount = bucket.layers.reduce(
    (total, layer) =>
      total +
      getComponentLayerOverrideReport(layer, bucket.component).overrides.length,
    0,
  );
  const variantInstanceCount = bucket.variantId
    ? analytics?.variantUsage[bucket.variantId] ?? 0
    : Math.max(0, (analytics?.instanceCount ?? 0) - getVariantUsageTotal(analytics));
  const variantAdoptionPercent =
    analytics?.instanceCount && analytics.instanceCount > 0
      ? Math.round((variantInstanceCount / analytics.instanceCount) * 100)
      : 0;
  const status = getRowStatus(bucket, propertyDiffs, slotIssues, overrideCount);
  const canReset =
    bucket.page.id === activePageId &&
    (overrideCount > 0 || propertyDiffs.length > 0 || slotIssues.length > 0);

  return {
    id: bucket.id,
    pageId: bucket.page.id,
    pageName: bucket.page.name,
    componentId: bucket.component.id,
    componentName: bucket.component.name,
    variantId: bucket.variantId,
    variantName: bucket.variant?.name ?? (bucket.variantId ? "Missing variant" : "Main"),
    status,
    label: getRowLabel(status, overrideCount, propertyDiffs.length, slotIssues.length),
    detail: getRowDetail(
      overrideCount,
      propertyDiffs.length,
      slotIssues.length,
      variantAdoptionPercent,
    ),
    resetLayerId: bucket.layers[0]?.id,
    canReset,
    layerIds: bucket.layers.map((layer) => layer.id),
    layerNames: bucket.layers.map((layer) => layer.name),
    instanceLayerCount: bucket.layers.length,
    overrideCount,
    propertyDiffCount: propertyDiffs.length,
    slotIssueCount: slotIssues.length,
    instanceCount: analytics?.instanceCount ?? 0,
    variantInstanceCount,
    variantAdoptionPercent,
    resetPreview,
    propertyDiffs,
    slotIssues,
  };
}

function getResetPreview(bucket: ComponentInstanceBucket) {
  return bucket.layers.flatMap((layer) =>
    getComponentLayerOverrideReport(layer, bucket.component).overrides.map(
      (override): ComponentOverrideResetPreview => ({
        id: `${layer.id}:${override.id}`,
        layerName: layer.name,
        label: override.label,
        current: override.current,
        source: override.source,
      }),
    ),
  );
}

function getPropertyDiffs(bucket: ComponentInstanceBucket) {
  const currentValues = bucket.layers[0]?.componentProperties;

  if (!currentValues) {
    return [];
  }

  const expectedValues = getComponentInstancePropertyValues(
    bucket.component,
    bucket.variant,
  );
  const definitions = Object.values(getComponentPropertyDefinitions(bucket.component));
  const definitionNames = new Set(definitions.map((definition) => definition.name));
  const propertyNames = Array.from(
    new Set([...Object.keys(expectedValues), ...Object.keys(currentValues)]),
  ).sort();

  return propertyNames.flatMap((propertyName): ComponentPropertyDiff[] => {
    const current = currentValues[propertyName] ?? "";
    const source = expectedValues[propertyName] ?? "";

    if (current === source && definitionNames.has(propertyName)) {
      return [];
    }

    return [{
      propertyName,
      current: current || "Empty",
      source: definitionNames.has(propertyName)
        ? source || "Empty"
        : "Undefined property",
    }];
  });
}

function getSlotIssues(
  bucket: ComponentInstanceBucket,
  source: DesignComponent | DesignComponentVariant,
) {
  const issues: ComponentSlotIssue[] = [];
  const sourceLayers = source.layers;
  const sourceById = new Map(sourceLayers.map((layer) => [layer.id, layer]));
  const sourceSlotNames = sourceLayers.map(getComponentSlotName);
  const duplicateSlotNames = getDuplicates(sourceSlotNames);

  if (bucket.variantId && !bucket.variant) {
    issues.push({
      id: `${bucket.id}:missing-variant`,
      label: "Missing variant",
      detail: "This instance points to a variant id that no longer exists.",
    });
  }

  if (bucket.layers.length !== sourceLayers.length) {
    issues.push({
      id: `${bucket.id}:layer-count`,
      label: "Layer count mismatch",
      detail: `${bucket.layers.length} instance layers for ${sourceLayers.length} source layers.`,
    });
  }

  duplicateSlotNames.forEach((slotName) => {
    issues.push({
      id: `${bucket.id}:duplicate-slot:${slotName}`,
      label: "Duplicate source slot",
      detail: `${slotName} appears more than once in the component source.`,
    });
  });

  bucket.layers.forEach((layer, index) => {
    const sourceLayer =
      sourceById.get(layer.componentLayerId ?? "") ?? sourceLayers[index];

    if (!sourceLayer) {
      issues.push({
        id: `${bucket.id}:${layer.id}:missing-source`,
        label: "Source layer missing",
        detail: `${layer.name} does not have a matching component source layer.`,
      });
      return;
    }

    if (!layer.componentLayerId && sourceLayers.length > 1) {
      issues.push({
        id: `${bucket.id}:${layer.id}:missing-source-id`,
        label: "Source id missing",
        detail: `${layer.name} relies on index matching instead of a stable component layer id.`,
      });
    }

    if (getComponentSlotType(sourceLayer) !== getComponentSlotType(layer)) {
      issues.push({
        id: `${bucket.id}:${layer.id}:slot-type`,
        label: "Slot type drift",
        detail: `${getComponentSlotName(sourceLayer)} expects ${getComponentSlotType(
          sourceLayer,
        )} but instance is ${getComponentSlotType(layer)}.`,
      });
    }
  });

  return issues;
}

function getRowStatus(
  bucket: ComponentInstanceBucket,
  propertyDiffs: ComponentPropertyDiff[],
  slotIssues: ComponentSlotIssue[],
  overrideCount: number,
): ComponentOverrideReviewStatus {
  if ((bucket.variantId && !bucket.variant) || slotIssues.length > 0) {
    return "blocked";
  }

  if (overrideCount > 0 || propertyDiffs.length > 0) {
    return "review";
  }

  return "ready";
}

function getRowLabel(
  status: ComponentOverrideReviewStatus,
  overrideCount: number,
  propertyDiffCount: number,
  slotIssueCount: number,
) {
  if (status === "blocked") {
    return "Slot validation needed";
  }

  if (overrideCount > 0) {
    return "Instance overrides";
  }

  if (propertyDiffCount > 0) {
    return "Property diffs";
  }

  if (slotIssueCount > 0) {
    return "Slot review";
  }

  return "Source aligned";
}

function getRowDetail(
  overrideCount: number,
  propertyDiffCount: number,
  slotIssueCount: number,
  variantAdoptionPercent: number,
) {
  const parts = [
    `${overrideCount} override${overrideCount === 1 ? "" : "s"}`,
    `${propertyDiffCount} property diff${propertyDiffCount === 1 ? "" : "s"}`,
    `${slotIssueCount} slot issue${slotIssueCount === 1 ? "" : "s"}`,
    `${variantAdoptionPercent}% variant adoption`,
  ];

  return parts.join(", ");
}

function getVariantStats(
  components: DesignComponent[],
  analyticsByComponentId: Record<string, ComponentUsageAnalytics>,
) {
  const variants = components.flatMap((component) =>
    (component.variants ?? []).map((variant) => ({
      componentId: component.id,
      variantId: variant.id,
    })),
  );
  const usedVariantCount = variants.filter(
    (item) =>
      (analyticsByComponentId[item.componentId]?.variantUsage[item.variantId] ??
        0) > 0,
  ).length;
  const variantCount = variants.length;

  return {
    variantCount,
    usedVariantCount,
    unusedVariantCount: variantCount - usedVariantCount,
    variantCoveragePercent:
      variantCount === 0 ? 100 : Math.round((usedVariantCount / variantCount) * 100),
  };
}

function getVariantUsageTotal(analytics: ComponentUsageAnalytics | undefined) {
  return Object.values(analytics?.variantUsage ?? {}).reduce(
    (total, count) => total + count,
    0,
  );
}

function getInstanceKey(pageId: string, layer: DesignLayer) {
  return `${pageId}:${layer.componentId}:${layer.componentVariantId ?? "main"}:${
    layer.groupId ?? layer.id
  }`;
}

function getDuplicates(values: string[]) {
  const counts = new Map<string, number>();

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });

  return Array.from(counts)
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
}

function sortRows(
  first: ComponentOverrideReviewRow,
  second: ComponentOverrideReviewRow,
) {
  if (first.status !== second.status) {
    return getStatusPriority(first.status) - getStatusPriority(second.status);
  }

  const impactDifference =
    second.overrideCount +
    second.propertyDiffCount +
    second.slotIssueCount -
    (first.overrideCount + first.propertyDiffCount + first.slotIssueCount);

  if (impactDifference !== 0) {
    return impactDifference;
  }

  return `${first.componentName}:${first.pageName}:${first.variantName}`.localeCompare(
    `${second.componentName}:${second.pageName}:${second.variantName}`,
  );
}

function getStatusPriority(status: ComponentOverrideReviewStatus) {
  if (status === "blocked") {
    return 0;
  }

  return status === "review" ? 1 : 2;
}
