import type { MarketplaceDiscoveryTemplate } from "@/features/templates/template-marketplace-discovery";
import type {
  MarketplaceGrowthTemplate,
  MarketplaceInstallTrend,
  MarketplaceModerationStatus,
} from "@/features/templates/template-marketplace-growth-model";

export function deriveRatingAverage(template: MarketplaceDiscoveryTemplate) {
  const qualityScore = template.qualityScore / 100;
  const conversionLift = Math.min(template.conversionRate / 100, 0.35);
  const installLift = Math.min(template.useCount / 100, 0.25);
  const blockedPenalty = template.qualityStatus === "blocked" ? 0.45 : 0;
  const rating = 3.25 + qualityScore * 1.15 + conversionLift + installLift;

  return roundTo(Math.max(2.8, Math.min(5, rating - blockedPenalty)), 1);
}

export function deriveReviewSignalCount(
  template: MarketplaceDiscoveryTemplate,
) {
  return Math.max(
    0,
    Math.round(
      template.useCount * 0.4 +
        template.viewCount * 0.035 +
        (template.qualityStatus === "ready" ? 3 : 1),
    ),
  );
}

export function deriveInstallTrend(
  template: MarketplaceDiscoveryTemplate,
): MarketplaceInstallTrend {
  if (
    template.qualityStatus === "blocked" ||
    (template.viewCount >= 20 && template.conversionRate < 5)
  ) {
    return "needs-attention";
  }

  if (template.useCount >= 5 && template.conversionRate >= 18) {
    return "rising";
  }

  if (template.viewCount < 8 && template.useCount < 2) {
    return "new";
  }

  return "steady";
}

export function deriveModerationStatus(
  template: MarketplaceDiscoveryTemplate,
  ratingAverage: number,
  moderationReasons: string[],
): MarketplaceModerationStatus {
  if (
    template.qualityStatus === "blocked" ||
    ratingAverage < 3.8 ||
    moderationReasons.some((reason) => reason.includes("Low conversion"))
  ) {
    return "action";
  }

  if (template.qualityStatus === "review" || moderationReasons.length) {
    return "watch";
  }

  return "ready";
}

export function deriveModerationReasons(
  template: MarketplaceDiscoveryTemplate,
  ratingAverage: number,
) {
  const gateReasons = template.qualityGates
    .filter((gate) => gate.status !== "pass")
    .map((gate) => gate.label);
  const performanceReasons = [
    template.viewCount >= 20 && template.conversionRate < 5
      ? "Low conversion from marketplace views"
      : null,
    template.useCount === 0 && template.viewCount >= 12
      ? "Viewed but not installed"
      : null,
    ratingAverage < 4 ? "Needs stronger rating/review signals" : null,
  ].filter((reason): reason is string => Boolean(reason));

  return [...gateReasons, ...performanceReasons];
}

export function estimateOfflinePackSize(
  templates: MarketplaceGrowthTemplate[],
) {
  const thumbnailSizeKb = templates.reduce((total, template) => {
    if (!template.thumbnail) return total;

    return total + Math.ceil(template.thumbnail.length / 1024);
  }, 0);

  return Math.max(6, thumbnailSizeKb + templates.length * 4);
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function average(values: number[], fractionDigits: number) {
  if (!values.length) return 0;

  return roundTo(sum(values) / values.length, fractionDigits);
}

function roundTo(value: number, fractionDigits: number) {
  const multiplier = 10 ** fractionDigits;

  return Math.round(value * multiplier) / multiplier;
}
