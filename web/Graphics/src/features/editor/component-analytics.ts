import type {
  DesignComponent,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

export type ComponentUsageAnalytics = {
  componentId: string;
  instanceCount: number;
  instanceLayerCount: number;
  variantUsage: Record<string, number>;
};

export type ComponentAnalyticsSummary = {
  componentCount: number;
  instanceCount: number;
  updateAvailableCount: number;
  detachedLibraryCount: number;
};

export function getComponentUsageAnalytics(
  components: DesignComponent[],
  pages: DesignPage[],
) {
  const analytics: Record<string, ComponentUsageAnalytics> = Object.fromEntries(
    components.map((component) => [
      component.id,
      {
        componentId: component.id,
        instanceCount: 0,
        instanceLayerCount: 0,
        variantUsage: {},
      } satisfies ComponentUsageAnalytics,
    ]),
  );
  const seenInstanceKeys = new Set<string>();

  pages.flatMap((page) => page.layers).forEach((layer) => {
    if (!layer.componentId || !analytics[layer.componentId]) {
      return;
    }

    const componentAnalytics = analytics[layer.componentId];
    const instanceKey = getInstanceKey(layer);

    componentAnalytics.instanceLayerCount += 1;

    if (!seenInstanceKeys.has(instanceKey)) {
      seenInstanceKeys.add(instanceKey);
      componentAnalytics.instanceCount += 1;

      if (layer.componentVariantId) {
        componentAnalytics.variantUsage[layer.componentVariantId] =
          (componentAnalytics.variantUsage[layer.componentVariantId] ?? 0) + 1;
      }
    }
  });

  return analytics;
}

export function getComponentAnalyticsSummary(
  components: DesignComponent[],
  analytics: Record<string, ComponentUsageAnalytics>,
): ComponentAnalyticsSummary {
  return {
    componentCount: components.length,
    instanceCount: Object.values(analytics).reduce(
      (count, item) => count + item.instanceCount,
      0,
    ),
    updateAvailableCount: components.filter(
      (component) => component.librarySource?.status === "update-available",
    ).length,
    detachedLibraryCount: components.filter(
      (component) => component.librarySource?.status === "detached",
    ).length,
  };
}

function getInstanceKey(layer: DesignLayer) {
  return `${layer.componentId}:${layer.componentVariantId ?? "main"}:${
    layer.groupId ?? layer.id
  }`;
}
