import type { DesignTemplateSummary } from "@/features/editor/types";
import { approvalStatusLabels } from "@/features/review/approval-status";
import {
  templateMarketplaceCollectionLabels,
  type TemplateMarketplaceCollection,
} from "@/features/templates/template-marketplace";

export type TemplateQualityGateStatus = "pass" | "warn" | "fail";

export type TemplateQualityGate = {
  id: string;
  label: string;
  status: TemplateQualityGateStatus;
};

export type MarketplaceDiscoveryTemplate = {
  id: string;
  name: string;
  creatorLabel: string;
  creatorDetail: string;
  collection: string;
  collectionLabel: string;
  season: string | null;
  thumbnail: string | null;
  width: number;
  height: number;
  publishedAt: string | null;
  useCount: number;
  viewCount: number;
  conversionRate: number;
  score: number;
  qualityScore: number;
  qualityStatus: "ready" | "review" | "blocked";
  qualityGates: TemplateQualityGate[];
};

export type MarketplaceDiscoveryCollection = {
  id: string;
  label: string;
  templateCount: number;
  totalUses: number;
  totalViews: number;
  averageQuality: number;
  topTemplate: MarketplaceDiscoveryTemplate | null;
};

export type MarketplaceDiscovery = {
  publishedTemplates: MarketplaceDiscoveryTemplate[];
  featuredTemplates: MarketplaceDiscoveryTemplate[];
  featuredCollections: MarketplaceDiscoveryCollection[];
  qualityQueue: MarketplaceDiscoveryTemplate[];
  totals: {
    published: number;
    views: number;
    uses: number;
    averageQuality: number;
  };
};

const recognizedCollectionLabels: Record<string, string> =
  templateMarketplaceCollectionLabels;

export function createTemplateMarketplaceDiscovery(
  templates: DesignTemplateSummary[],
): MarketplaceDiscovery {
  const publishedTemplates = templates
    .filter((template) => template.marketplaceStatus === "published")
    .map(toDiscoveryTemplate)
    .sort(compareDiscoveryTemplates);
  const featuredCollections =
    createMarketplaceDiscoveryCollections(publishedTemplates);
  const qualityQueue = templates
    .filter((template) => template.marketplaceStatus !== "archived")
    .map(toDiscoveryTemplate)
    .filter((template) => template.qualityStatus !== "ready")
    .sort((a, b) => a.qualityScore - b.qualityScore || b.score - a.score)
    .slice(0, 6);
  const totals = publishedTemplates.reduce(
    (summary, template) => ({
      published: summary.published + 1,
      views: summary.views + template.viewCount,
      uses: summary.uses + template.useCount,
      quality: summary.quality + template.qualityScore,
    }),
    { published: 0, views: 0, uses: 0, quality: 0 },
  );

  return {
    publishedTemplates,
    featuredTemplates: publishedTemplates.slice(0, 6),
    featuredCollections,
    qualityQueue,
    totals: {
      published: totals.published,
      views: totals.views,
      uses: totals.uses,
      averageQuality: totals.published
        ? Math.round(totals.quality / totals.published)
        : 0,
    },
  };
}

export function createMarketplaceDiscoveryCollections(
  templates: MarketplaceDiscoveryTemplate[],
): MarketplaceDiscoveryCollection[] {
  const grouped = new Map<string, MarketplaceDiscoveryTemplate[]>();

  for (const template of templates) {
    const collection = grouped.get(template.collection) ?? [];
    collection.push(template);
    grouped.set(template.collection, collection);
  }

  return Array.from(grouped.entries())
    .map(([id, collectionTemplates]) => {
      const sortedTemplates = [...collectionTemplates].sort(
        compareDiscoveryTemplates,
      );
      const totals = collectionTemplates.reduce(
        (summary, template) => ({
          uses: summary.uses + template.useCount,
          views: summary.views + template.viewCount,
          quality: summary.quality + template.qualityScore,
        }),
        { uses: 0, views: 0, quality: 0 },
      );

      return {
        id,
        label: sortedTemplates[0]?.collectionLabel ?? formatCollectionLabel(id),
        templateCount: collectionTemplates.length,
        totalUses: totals.uses,
        totalViews: totals.views,
        averageQuality: Math.round(totals.quality / collectionTemplates.length),
        topTemplate: sortedTemplates[0] ?? null,
      };
    })
    .sort(
      (a, b) =>
        b.templateCount - a.templateCount ||
        b.totalUses - a.totalUses ||
        b.averageQuality - a.averageQuality,
    )
    .slice(0, 8);
}

export function toDiscoveryTemplate(
  template: DesignTemplateSummary,
): MarketplaceDiscoveryTemplate {
  const collection = normalizeDiscoveryCollection(
    template.marketplaceCollection,
  );
  const qualityGates = getTemplateQualityGates(template, collection);
  const passedGates = qualityGates.filter((gate) => gate.status === "pass");
  const failedGates = qualityGates.filter((gate) => gate.status === "fail");
  const qualityScore = Math.round(
    (passedGates.length / qualityGates.length) * 100,
  );
  const useCount = Math.max(0, template.marketplaceUseCount);
  const viewCount = Math.max(0, template.marketplaceViewCount);
  const publishedAt = template.marketplacePublishedAt
    ? Date.parse(template.marketplacePublishedAt)
    : 0;
  const publishedBoost = publishedAt
    ? Math.max(0, 14 - ageInDays(publishedAt))
    : 0;

  return {
    id: template.id,
    name: template.name,
    creatorLabel: getCreatorLabel(template),
    creatorDetail: getCreatorDetail(template),
    collection,
    collectionLabel: formatCollectionLabel(collection),
    season: template.marketplaceSeason,
    thumbnail: template.thumbnail,
    width: template.width,
    height: template.height,
    publishedAt: template.marketplacePublishedAt,
    useCount,
    viewCount,
    conversionRate: viewCount ? Math.round((useCount / viewCount) * 100) : 0,
    score:
      useCount * 4 +
      viewCount * 2 +
      qualityScore +
      publishedBoost +
      (template.isTeamTemplate ? 6 : 0) +
      (template.isBrandTemplate ? 4 : 0),
    qualityScore,
    qualityStatus: failedGates.length
      ? "blocked"
      : qualityScore >= 85
        ? "ready"
        : "review",
    qualityGates,
  };
}

function getTemplateQualityGates(
  template: DesignTemplateSummary,
  collection: string,
): TemplateQualityGate[] {
  return [
    {
      id: "published",
      label: "Published listing",
      status: template.marketplaceStatus === "published" ? "pass" : "fail",
    },
    {
      id: "approval",
      label: `Approval is ${approvalStatusLabels[template.approvalStatus]}`,
      status: template.approvalStatus === "approved" ? "pass" : "warn",
    },
    {
      id: "collection",
      label: "Collection assigned",
      status: collection !== "general" || template.marketplaceCollection
        ? "pass"
        : "warn",
    },
    {
      id: "preview",
      label: "Preview thumbnail",
      status: template.thumbnail ? "pass" : "warn",
    },
    {
      id: "dimensions",
      label: `${template.width} x ${template.height}`,
      status:
        template.width >= 320 &&
        template.height >= 320 &&
        template.width <= 10_000 &&
        template.height <= 10_000
          ? "pass"
          : "fail",
    },
    {
      id: "review-note",
      label: template.marketplaceReviewNote
        ? "Curator note attached"
        : "Curator note clear",
      status: template.marketplaceReviewNote ? "warn" : "pass",
    },
  ];
}

function compareDiscoveryTemplates(
  a: MarketplaceDiscoveryTemplate,
  b: MarketplaceDiscoveryTemplate,
) {
  return (
    b.score - a.score ||
    b.qualityScore - a.qualityScore ||
    b.useCount - a.useCount ||
    b.viewCount - a.viewCount ||
    a.name.localeCompare(b.name)
  );
}

function normalizeDiscoveryCollection(collection: string | null) {
  return collection?.trim().toLowerCase() || "general";
}

function formatCollectionLabel(collection: string) {
  const knownLabel =
    recognizedCollectionLabels[collection as TemplateMarketplaceCollection];

  if (knownLabel) {
    return knownLabel;
  }

  return collection
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function getCreatorLabel(template: DesignTemplateSummary) {
  if (template.isBrandTemplate) return "Brand kit";
  if (template.isTeamTemplate) return "Team library";

  return "Creator";
}

function getCreatorDetail(template: DesignTemplateSummary) {
  if (template.creatorName?.trim()) {
    return template.creatorName;
  }

  if (template.creatorEmail?.trim()) {
    return template.creatorEmail;
  }

  return template.isTeamTemplate ? "Workspace publisher" : "Private creator";
}

function ageInDays(timestamp: number) {
  const day = 24 * 60 * 60 * 1000;

  return Math.floor((Date.now() - timestamp) / day);
}
