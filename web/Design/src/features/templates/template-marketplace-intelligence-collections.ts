import type { MarketplaceDiscoveryTemplate } from "@/features/templates/template-marketplace-discovery";
import {
  templateMarketplaceCollections,
  type TemplateMarketplaceCollection,
} from "@/features/templates/template-marketplace";
import type {
  MarketplaceCollectionGap,
  MarketplaceIntelligenceStatus,
} from "@/features/templates/template-marketplace-intelligence-types";
import {
  average,
  collectionLabel,
  minimumPublishedPerCollection,
  statusWeight,
  sum,
} from "@/features/templates/template-marketplace-intelligence-utils";

export function createCollectionGaps(
  templates: MarketplaceDiscoveryTemplate[],
): MarketplaceCollectionGap[] {
  const collections = new Map<string, MarketplaceDiscoveryTemplate[]>();

  for (const template of templates) {
    collections.set(template.collection, [
      ...(collections.get(template.collection) ?? []),
      template,
    ]);
  }

  for (const collection of templateMarketplaceCollections) {
    collections.set(collection, collections.get(collection) ?? []);
  }

  return Array.from(collections.entries())
    .map(([collection, collectionTemplates]) => {
      const publishedTemplates = collectionTemplates.filter(
        (template) => template.publishedAt,
      );
      const totalViews = sum(collectionTemplates.map((item) => item.viewCount));
      const totalUses = sum(collectionTemplates.map((item) => item.useCount));
      const averageQuality = average(
        collectionTemplates.map((item) => item.qualityScore),
        0,
      );
      const severity: MarketplaceIntelligenceStatus =
        publishedTemplates.length === 0
          ? "blocked"
          : publishedTemplates.length < minimumPublishedPerCollection
            ? "review"
            : "ready";

      return {
        collection,
        label: collectionLabel(collection as TemplateMarketplaceCollection),
        severity,
        templateCount: collectionTemplates.length,
        publishedCount: publishedTemplates.length,
        totalViews,
        totalUses,
        averageQuality,
        detail: createCollectionGapDetail(
          collection,
          publishedTemplates.length,
        ),
      };
    })
    .sort(
      (a, b) =>
        statusWeight(a.severity) - statusWeight(b.severity) ||
        a.publishedCount - b.publishedCount ||
        b.totalViews - a.totalViews ||
        a.label.localeCompare(b.label),
    )
    .slice(0, 8);
}

function createCollectionGapDetail(collection: string, publishedCount: number) {
  if (publishedCount === 0) {
    return `${collectionLabel(collection)} has no published marketplace coverage.`;
  }

  if (publishedCount < minimumPublishedPerCollection) {
    return `${collectionLabel(collection)} needs at least ${minimumPublishedPerCollection} published templates for useful discovery.`;
  }

  return `${collectionLabel(collection)} has enough starter coverage for this pass.`;
}
