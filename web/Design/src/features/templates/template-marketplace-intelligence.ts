import {
  createTemplateMarketplaceDiscovery,
  toDiscoveryTemplate,
} from "@/features/templates/template-marketplace-discovery";
import { createCollectionGaps } from "@/features/templates/template-marketplace-intelligence-collections";
import { createInstallCohorts } from "@/features/templates/template-marketplace-intelligence-cohorts";
import { createCreatorTrends } from "@/features/templates/template-marketplace-intelligence-creators";
import { createDemandSignals } from "@/features/templates/template-marketplace-intelligence-demand";
import { createModerationSla } from "@/features/templates/template-marketplace-intelligence-moderation";
import type {
  MarketplaceCreatorTrend,
  MarketplaceDemandSignal,
  MarketplaceIntelligenceStatus,
  TemplateMarketplaceIntelligence,
  TemplateMarketplaceIntelligenceInput,
} from "@/features/templates/template-marketplace-intelligence-types";
import {
  average,
  round,
  sum,
} from "@/features/templates/template-marketplace-intelligence-utils";

export type {
  MarketplaceCollectionGap,
  MarketplaceCreatorTrend,
  MarketplaceDemandSignal,
  MarketplaceDemandSignalType,
  MarketplaceInstallCohort,
  MarketplaceIntelligenceStatus,
  MarketplaceModerationSlaItem,
  MarketplaceModerationSlaStatus,
  TemplateMarketplaceIntelligence,
  TemplateMarketplaceIntelligenceInput,
} from "@/features/templates/template-marketplace-intelligence-types";

export function createTemplateMarketplaceIntelligence(
  input: TemplateMarketplaceIntelligenceInput,
): TemplateMarketplaceIntelligence {
  const now = input.now ?? new Date();
  const generatedAt = now.toISOString();
  const activeTemplates = input.templates.filter(
    (template) => template.marketplaceStatus !== "archived",
  );
  const discovery = createTemplateMarketplaceDiscovery(activeTemplates);
  const allDiscoveryTemplates = activeTemplates.map(toDiscoveryTemplate);
  const demandSignals = createDemandSignals(discovery.publishedTemplates, now);
  const creatorTrends = createCreatorTrends(allDiscoveryTemplates);
  const collectionGaps = createCollectionGaps(allDiscoveryTemplates);
  const moderationSla = createModerationSla({
    templates: activeTemplates,
    discoveryTemplates: allDiscoveryTemplates,
    auditLogs: input.auditLogs,
    now,
  });
  const installCohorts = createInstallCohorts(
    discovery.publishedTemplates,
    now,
  );
  const totalViews = sum(
    discovery.publishedTemplates.map((item) => item.viewCount),
  );
  const totalUses = sum(
    discovery.publishedTemplates.map((item) => item.useCount),
  );
  const score = calculateMarketplaceIntelligenceScore({
    demandSignals,
    collectionGaps,
    moderationSla,
    creatorTrends,
    publishedCount: discovery.totals.published,
  });
  const status = scoreToStatus(score, moderationSla.overdueCount > 0);
  const nextActions = createMarketplaceIntelligenceNextActions({
    demandSignals,
    collectionGaps,
    moderationSla,
    creatorTrends,
  });

  return {
    generatedAt,
    status,
    score,
    demandSignals,
    creatorTrends,
    collectionGaps,
    moderationSla,
    installCohorts,
    nextActions,
    totals: {
      templates: activeTemplates.length,
      publishedTemplates: discovery.totals.published,
      reviewTemplates: activeTemplates.filter(
        (template) => template.marketplaceStatus === "review",
      ).length,
      totalViews,
      totalUses,
      averageConversionRate: totalViews
        ? round((totalUses / totalViews) * 100, 1)
        : 0,
      activeDemandSignals: demandSignals.length,
      collectionGaps: collectionGaps.filter((gap) => gap.severity !== "ready")
        .length,
      moderationOpen: moderationSla.items.length,
    },
  };
}

function calculateMarketplaceIntelligenceScore(input: {
  demandSignals: MarketplaceDemandSignal[];
  collectionGaps: TemplateMarketplaceIntelligence["collectionGaps"];
  moderationSla: TemplateMarketplaceIntelligence["moderationSla"];
  creatorTrends: MarketplaceCreatorTrend[];
  publishedCount: number;
}) {
  const collectionScore = average(
    input.collectionGaps.map((gap) =>
      gap.severity === "ready" ? 100 : gap.severity === "review" ? 65 : 20,
    ),
    0,
  );
  const moderationScore = Math.max(
    0,
    100 -
      input.moderationSla.overdueCount * 28 -
      input.moderationSla.dueSoonCount * 12,
  );
  const creatorScore = average(
    input.creatorTrends.map((trend) => trend.averageQuality),
    0,
  );
  const demandScore = average(
    input.demandSignals.map((signal) =>
      signal.signal === "under-converting"
        ? 45
        : signal.signal === "needs-visibility"
          ? 60
          : 100,
    ),
    0,
  );
  const inventoryScore = Math.min(100, input.publishedCount * 10);

  return average(
    [
      collectionScore,
      moderationScore,
      creatorScore,
      demandScore,
      inventoryScore,
    ],
    0,
  );
}

function createMarketplaceIntelligenceNextActions(input: {
  demandSignals: MarketplaceDemandSignal[];
  collectionGaps: TemplateMarketplaceIntelligence["collectionGaps"];
  moderationSla: TemplateMarketplaceIntelligence["moderationSla"];
  creatorTrends: MarketplaceCreatorTrend[];
}) {
  const actions: string[] = [];
  const overdueModeration = input.moderationSla.items.filter(
    (item) => item.status === "overdue",
  );
  const blockedCollections = input.collectionGaps.filter(
    (gap) => gap.severity === "blocked",
  );
  const underConverting = input.demandSignals.filter(
    (signal) => signal.signal === "under-converting",
  );
  const creatorsNeedingReview = input.creatorTrends.filter(
    (creator) => creator.trend === "needs-review",
  );

  if (overdueModeration.length) {
    actions.push(
      `Review overdue marketplace submissions: ${overdueModeration
        .slice(0, 2)
        .map((item) => item.templateName)
        .join(", ")}.`,
    );
  }

  if (blockedCollections.length) {
    actions.push(
      `Backfill empty marketplace collections: ${blockedCollections
        .slice(0, 3)
        .map((gap) => gap.label)
        .join(", ")}.`,
    );
  }

  if (underConverting.length) {
    actions.push(
      `Improve conversion for high-view templates: ${underConverting
        .slice(0, 2)
        .map((signal) => signal.templateName)
        .join(", ")}.`,
    );
  }

  if (creatorsNeedingReview.length) {
    actions.push(
      `Coach creator quality for: ${creatorsNeedingReview
        .slice(0, 2)
        .map((creator) => creator.creatorDetail)
        .join(", ")}.`,
    );
  }

  return actions.slice(0, 5);
}

function scoreToStatus(
  score: number,
  hasOverdueModeration: boolean,
): MarketplaceIntelligenceStatus {
  if (hasOverdueModeration || score < 50) return "blocked";
  if (score < 85) return "review";

  return "ready";
}
