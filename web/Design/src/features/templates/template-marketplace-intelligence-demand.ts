import type { MarketplaceDiscoveryTemplate } from "@/features/templates/template-marketplace-discovery";
import type {
  MarketplaceDemandSignal,
  MarketplaceDemandSignalType,
} from "@/features/templates/template-marketplace-intelligence-types";
import {
  daysBetween,
  signalWeight,
} from "@/features/templates/template-marketplace-intelligence-utils";

export function createDemandSignals(
  templates: MarketplaceDiscoveryTemplate[],
  now: Date,
): MarketplaceDemandSignal[] {
  return templates
    .map((template) => {
      const signal = classifyDemandSignal(template);
      const publishedDays = template.publishedAt
        ? daysBetween(now, template.publishedAt)
        : 999;
      const recencyBoost = Math.max(0, 28 - publishedDays);
      const conversionScore =
        signal === "under-converting"
          ? Math.max(0, template.conversionRate - 8)
          : template.conversionRate * 4;
      const demandScore = Math.round(
        template.useCount * 6 +
          template.viewCount * 1.2 +
          conversionScore +
          template.qualityScore +
          recencyBoost +
          signalWeight(signal),
      );

      return {
        templateId: template.id,
        templateName: template.name,
        collection: template.collection,
        collectionLabel: template.collectionLabel,
        creatorDetail: template.creatorDetail,
        signal,
        demandScore,
        views: template.viewCount,
        uses: template.useCount,
        conversionRate: template.conversionRate,
        qualityScore: template.qualityScore,
        badge: createDemandBadge(template, signal),
        detail: createDemandDetail(signal),
      };
    })
    .filter(
      (signal) =>
        signal.views > 0 ||
        signal.uses > 0 ||
        signal.signal !== "needs-visibility",
    )
    .sort(
      (a, b) =>
        b.demandScore - a.demandScore ||
        b.uses - a.uses ||
        b.views - a.views ||
        a.templateName.localeCompare(b.templateName),
    )
    .slice(0, 8);
}

function classifyDemandSignal(
  template: MarketplaceDiscoveryTemplate,
): MarketplaceDemandSignalType {
  if (template.viewCount >= 24 && template.conversionRate < 8) {
    return "under-converting";
  }

  if (template.useCount >= 5 && template.conversionRate >= 18) {
    return "rising";
  }

  if (template.viewCount >= 40 || template.useCount >= 10) {
    return "high-intent";
  }

  return "needs-visibility";
}

function createDemandBadge(
  template: MarketplaceDiscoveryTemplate,
  signal: MarketplaceDemandSignalType,
) {
  if (signal === "rising") return `${template.conversionRate}% conversion`;
  if (signal === "under-converting") return `${template.viewCount} views`;
  if (signal === "high-intent") return `${template.useCount} uses`;

  return "Needs reach";
}

function createDemandDetail(signal: MarketplaceDemandSignalType) {
  if (signal === "rising") {
    return "Strong use rate and healthy conversion make this a promotion candidate.";
  }

  if (signal === "under-converting") {
    return "Views are present but installs are low, so preview, naming, or collection fit need attention.";
  }

  if (signal === "high-intent") {
    return "Template is attracting enough attention to deserve cohort tracking.";
  }

  return "Template needs more marketplace exposure before demand can be trusted.";
}
