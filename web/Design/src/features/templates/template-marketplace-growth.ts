import type { DesignTemplateSummary } from "@/features/editor/types";
import {
  createTemplateMarketplaceDiscovery,
  type MarketplaceDiscoveryTemplate,
} from "@/features/templates/template-marketplace-discovery";
import {
  average,
  deriveInstallTrend,
  deriveModerationReasons,
  deriveModerationStatus,
  deriveRatingAverage,
  deriveReviewSignalCount,
  estimateOfflinePackSize,
  sum,
} from "@/features/templates/template-marketplace-growth-scoring";
import {
  createMarketplaceOfflinePackId,
  getMarketplaceCreatorKey,
  normalizeMarketplaceGrowthState,
  type MarketplaceGrowth,
  type MarketplaceGrowthCreator,
  type MarketplaceGrowthState,
  type MarketplaceGrowthTemplate,
  type MarketplaceInstallHistoryItem,
  type MarketplaceModerationStatus,
  type MarketplaceOfflinePack,
} from "@/features/templates/template-marketplace-growth-model";

export {
  addMarketplaceInstallRecord,
  createOfflineTemplatePackManifest,
  emptyMarketplaceGrowthState,
  normalizeMarketplaceGrowthState,
  toggleMarketplaceGrowthListValue,
  type MarketplaceGrowthCreator,
  type MarketplaceGrowthState,
  type MarketplaceGrowthTemplate,
  type MarketplaceInstallHistoryItem,
  type MarketplaceInstallRecord,
  type MarketplaceInstallTrend,
  type MarketplaceModerationQueueItem,
  type MarketplaceModerationStatus,
  type MarketplaceOfflinePack,
  type MarketplaceOfflinePackManifest,
} from "@/features/templates/template-marketplace-growth-model";

export function createTemplateMarketplaceGrowth(
  templates: DesignTemplateSummary[],
  rawState?: Partial<MarketplaceGrowthState> | null,
): MarketplaceGrowth {
  const state = normalizeMarketplaceGrowthState(rawState);
  const discovery = createTemplateMarketplaceDiscovery(templates);
  const growthTemplates = discovery.publishedTemplates
    .map((template) => toGrowthTemplate(template, state))
    .sort(compareGrowthTemplates);
  const creators = createMarketplaceGrowthCreators(growthTemplates, state);
  const offlinePacks = createMarketplaceOfflinePacks(growthTemplates, state);
  const installHistory = createMarketplaceInstallHistory(
    growthTemplates,
    state,
  );
  const favoriteTemplates = growthTemplates.filter(
    (template) => template.isFavorite,
  );
  const savedCreators = creators.filter((creator) => creator.saved);
  const savedOfflinePacks = offlinePacks.filter((pack) => pack.saved);
  const moderationQueue = growthTemplates
    .filter((template) => template.moderationStatus !== "ready")
    .map((template) => ({
      template,
      status: template.moderationStatus,
      reasons: template.moderationReasons,
    }))
    .sort(
      (a, b) =>
        moderationRank(a.status) - moderationRank(b.status) ||
        a.template.qualityScore - b.template.qualityScore ||
        b.template.viewCount - a.template.viewCount,
    )
    .slice(0, 8);

  return {
    templates: growthTemplates,
    featuredTemplates: growthTemplates.slice(0, 6),
    favoriteTemplates,
    creators,
    savedCreators,
    offlinePacks,
    savedOfflinePacks,
    installHistory,
    moderationQueue,
    totals: {
      published: growthTemplates.length,
      favorites: favoriteTemplates.length,
      savedCreators: savedCreators.length,
      installs: installHistory.length,
      offlinePacks: offlinePacks.length,
      averageRating: average(
        growthTemplates.map((template) => template.ratingAverage),
        1,
      ),
      moderationNeeds: moderationQueue.length,
    },
  };
}

function toGrowthTemplate(
  template: MarketplaceDiscoveryTemplate,
  state: MarketplaceGrowthState,
): MarketplaceGrowthTemplate {
  const creatorKey = getMarketplaceCreatorKey(template);
  const offlinePackId = createMarketplaceOfflinePackId(template.collection);
  const ratingAverage = deriveRatingAverage(template);
  const reviewSignalCount = deriveReviewSignalCount(template);
  const installTrend = deriveInstallTrend(template);
  const moderationReasons = deriveModerationReasons(template, ratingAverage);
  const moderationStatus = deriveModerationStatus(
    template,
    ratingAverage,
    moderationReasons,
  );
  const isFavorite = state.favoriteTemplateIds.includes(template.id);
  const isCreatorSaved = state.savedCreatorKeys.includes(creatorKey);
  const isInstalled = state.installRecords.some(
    (record) => record.templateId === template.id,
  );

  return {
    ...template,
    creatorKey,
    favoriteScore:
      template.score +
      ratingAverage * 12 +
      reviewSignalCount * 2 +
      (isFavorite ? 80 : 0) +
      (isCreatorSaved ? 32 : 0) +
      (isInstalled ? 24 : 0),
    ratingAverage,
    reviewSignalCount,
    installTrend,
    moderationStatus,
    moderationReasons,
    offlinePackId,
    isFavorite,
    isCreatorSaved,
    isInstalled,
  };
}

function createMarketplaceGrowthCreators(
  templates: MarketplaceGrowthTemplate[],
  state: MarketplaceGrowthState,
): MarketplaceGrowthCreator[] {
  const grouped = new Map<string, MarketplaceGrowthTemplate[]>();

  for (const template of templates) {
    grouped.set(template.creatorKey, [
      ...(grouped.get(template.creatorKey) ?? []),
      template,
    ]);
  }

  return Array.from(grouped.entries())
    .map(([key, creatorTemplates]) => {
      const firstTemplate = creatorTemplates[0];
      const saved = state.savedCreatorKeys.includes(key);

      return {
        key,
        label: firstTemplate?.creatorLabel ?? "Creator",
        detail: firstTemplate?.creatorDetail ?? "Unknown creator",
        templateCount: creatorTemplates.length,
        templateIds: creatorTemplates.map((template) => template.id),
        totalViews: sum(creatorTemplates.map((template) => template.viewCount)),
        totalUses: sum(creatorTemplates.map((template) => template.useCount)),
        averageRating: average(
          creatorTemplates.map((template) => template.ratingAverage),
          1,
        ),
        averageQuality: average(
          creatorTemplates.map((template) => template.qualityScore),
          0,
        ),
        saved,
      };
    })
    .sort(
      (a, b) =>
        Number(b.saved) - Number(a.saved) ||
        b.templateCount - a.templateCount ||
        b.totalUses - a.totalUses ||
        b.averageRating - a.averageRating ||
        a.detail.localeCompare(b.detail),
    );
}

function createMarketplaceOfflinePacks(
  templates: MarketplaceGrowthTemplate[],
  state: MarketplaceGrowthState,
): MarketplaceOfflinePack[] {
  const grouped = new Map<string, MarketplaceGrowthTemplate[]>();

  for (const template of templates) {
    grouped.set(template.offlinePackId, [
      ...(grouped.get(template.offlinePackId) ?? []),
      template,
    ]);
  }

  return Array.from(grouped.entries())
    .map(([id, packTemplates]) => {
      const sortedTemplates = [...packTemplates].sort(compareGrowthTemplates);
      const collectionLabel =
        sortedTemplates[0]?.collectionLabel ?? "General templates";

      return {
        id,
        label: `${collectionLabel} offline pack`,
        collection: sortedTemplates[0]?.collection ?? "general",
        templateCount: sortedTemplates.length,
        templateIds: sortedTemplates.map((template) => template.id),
        totalViews: sum(sortedTemplates.map((template) => template.viewCount)),
        totalUses: sum(sortedTemplates.map((template) => template.useCount)),
        averageQuality: average(
          sortedTemplates.map((template) => template.qualityScore),
          0,
        ),
        estimatedSizeKb: estimateOfflinePackSize(sortedTemplates),
        saved: state.offlinePackIds.includes(id),
        templates: sortedTemplates,
      };
    })
    .sort(
      (a, b) =>
        Number(b.saved) - Number(a.saved) ||
        b.templateCount - a.templateCount ||
        b.totalUses - a.totalUses ||
        b.averageQuality - a.averageQuality ||
        a.label.localeCompare(b.label),
    );
}

function createMarketplaceInstallHistory(
  templates: MarketplaceGrowthTemplate[],
  state: MarketplaceGrowthState,
): MarketplaceInstallHistoryItem[] {
  const templateById = new Map(
    templates.map((template) => [template.id, template] as const),
  );

  return state.installRecords
    .map((record) => {
      const template = templateById.get(record.templateId);

      if (!template) return null;

      return {
        template,
        installedAt: record.installedAt,
      };
    })
    .filter((item): item is MarketplaceInstallHistoryItem => Boolean(item));
}

function compareGrowthTemplates(
  a: MarketplaceGrowthTemplate,
  b: MarketplaceGrowthTemplate,
) {
  return (
    b.favoriteScore - a.favoriteScore ||
    b.ratingAverage - a.ratingAverage ||
    b.reviewSignalCount - a.reviewSignalCount ||
    a.name.localeCompare(b.name)
  );
}

function moderationRank(status: MarketplaceModerationStatus) {
  if (status === "action") return 0;
  if (status === "watch") return 1;

  return 2;
}
