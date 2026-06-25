import {
  templateMarketplaceCollectionLabels,
  type TemplateMarketplaceCollection,
} from "@/features/templates/template-marketplace";
import type {
  MarketplaceCreatorTrend,
  MarketplaceDemandSignalType,
  MarketplaceIntelligenceStatus,
  MarketplaceModerationSlaStatus,
} from "@/features/templates/template-marketplace-intelligence-types";

export const marketplaceIntelligenceDayMs = 24 * 60 * 60 * 1000;
export const minimumPublishedPerCollection = 2;

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function average(values: number[], fractionDigits: number) {
  if (!values.length) return 0;

  return round(sum(values) / values.length, fractionDigits);
}

export function round(value: number, fractionDigits: number) {
  const multiplier = 10 ** fractionDigits;

  return Math.round(value * multiplier) / multiplier;
}

export function daysBetween(now: Date, timestamp: string) {
  const parsed = Date.parse(timestamp);

  if (!Number.isFinite(parsed)) return 0;

  return Math.max(
    0,
    Math.floor((now.getTime() - parsed) / marketplaceIntelligenceDayMs),
  );
}

export function uniqueStrings(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

export function creatorKey(template: {
  creatorLabel: string;
  creatorDetail: string;
}) {
  return `${template.creatorLabel}:${template.creatorDetail}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function collectionLabel(collection: string) {
  return (
    templateMarketplaceCollectionLabels[
      collection as TemplateMarketplaceCollection
    ] ??
    collection
      .split(/[-_\s]+/)
      .filter(Boolean)
      .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
      .join(" ")
  );
}

export function signalWeight(signal: MarketplaceDemandSignalType) {
  if (signal === "rising") return 60;
  if (signal === "high-intent") return 32;
  if (signal === "under-converting") return -12;

  return 0;
}

export function creatorTrendWeight(trend: MarketplaceCreatorTrend["trend"]) {
  if (trend === "leader") return 4;
  if (trend === "rising") return 3;
  if (trend === "developing") return 2;

  return 1;
}

export function statusWeight(status: MarketplaceIntelligenceStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

export function moderationSlaWeight(status: MarketplaceModerationSlaStatus) {
  if (status === "overdue") return 0;
  if (status === "due-soon") return 1;

  return 2;
}
