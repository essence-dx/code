import type { MarketplaceDiscoveryTemplate } from "@/features/templates/template-marketplace-discovery";
import type { MarketplaceCreatorTrend } from "@/features/templates/template-marketplace-intelligence-types";
import {
  average,
  creatorKey,
  creatorTrendWeight,
  round,
  sum,
} from "@/features/templates/template-marketplace-intelligence-utils";

export function createCreatorTrends(
  templates: MarketplaceDiscoveryTemplate[],
): MarketplaceCreatorTrend[] {
  const grouped = new Map<string, MarketplaceDiscoveryTemplate[]>();

  for (const template of templates) {
    const key = creatorKey(template);
    grouped.set(key, [...(grouped.get(key) ?? []), template]);
  }

  return Array.from(grouped.entries())
    .map(([key, creatorTemplates]) => {
      const firstTemplate = creatorTemplates[0];
      const totalViews = sum(creatorTemplates.map((item) => item.viewCount));
      const totalUses = sum(creatorTemplates.map((item) => item.useCount));
      const averageQuality = average(
        creatorTemplates.map((item) => item.qualityScore),
        0,
      );
      const averageConversionRate = totalViews
        ? round((totalUses / totalViews) * 100, 1)
        : 0;
      const publishedCount = creatorTemplates.filter(
        (item) => item.publishedAt,
      ).length;
      const reviewCount = creatorTemplates.filter(
        (item) => item.qualityStatus !== "ready",
      ).length;
      const trend = classifyCreatorTrend({
        totalUses,
        totalViews,
        averageQuality,
        averageConversionRate,
        reviewCount,
      });
      const score = Math.round(
        averageQuality +
          totalUses * 4 +
          totalViews * 0.5 +
          averageConversionRate * 2 -
          reviewCount * 18,
      );

      return {
        creatorKey: key,
        creatorLabel: firstTemplate?.creatorLabel ?? "Creator",
        creatorDetail: firstTemplate?.creatorDetail ?? "Unknown creator",
        trend,
        templateCount: creatorTemplates.length,
        publishedCount,
        reviewCount,
        totalViews,
        totalUses,
        averageQuality,
        averageConversionRate,
        score,
      };
    })
    .sort(
      (a, b) =>
        creatorTrendWeight(b.trend) - creatorTrendWeight(a.trend) ||
        b.score - a.score ||
        b.totalUses - a.totalUses ||
        a.creatorDetail.localeCompare(b.creatorDetail),
    )
    .slice(0, 8);
}

function classifyCreatorTrend(input: {
  totalUses: number;
  totalViews: number;
  averageQuality: number;
  averageConversionRate: number;
  reviewCount: number;
}): MarketplaceCreatorTrend["trend"] {
  if (input.reviewCount && input.averageQuality < 85) return "needs-review";
  if (
    input.averageQuality >= 85 &&
    input.totalUses >= 10 &&
    input.averageConversionRate >= 18
  ) {
    return "leader";
  }
  if (input.totalUses >= 5 || input.totalViews >= 40) return "rising";

  return "developing";
}
