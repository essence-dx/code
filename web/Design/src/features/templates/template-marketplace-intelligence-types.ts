import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { DesignTemplateSummary } from "@/features/editor/types";

export type MarketplaceIntelligenceStatus = "ready" | "review" | "blocked";

export type MarketplaceDemandSignalType =
  | "rising"
  | "high-intent"
  | "under-converting"
  | "needs-visibility";

export type MarketplaceDemandSignal = {
  templateId: string;
  templateName: string;
  collection: string;
  collectionLabel: string;
  creatorDetail: string;
  signal: MarketplaceDemandSignalType;
  demandScore: number;
  views: number;
  uses: number;
  conversionRate: number;
  qualityScore: number;
  badge: string;
  detail: string;
};

export type MarketplaceCreatorTrend = {
  creatorKey: string;
  creatorLabel: string;
  creatorDetail: string;
  trend: "leader" | "rising" | "needs-review" | "developing";
  templateCount: number;
  publishedCount: number;
  reviewCount: number;
  totalViews: number;
  totalUses: number;
  averageQuality: number;
  averageConversionRate: number;
  score: number;
};

export type MarketplaceCollectionGap = {
  collection: string;
  label: string;
  severity: MarketplaceIntelligenceStatus;
  templateCount: number;
  publishedCount: number;
  totalViews: number;
  totalUses: number;
  averageQuality: number;
  detail: string;
};

export type MarketplaceModerationSlaStatus =
  | "on-track"
  | "due-soon"
  | "overdue";

export type MarketplaceModerationSlaItem = {
  templateId: string;
  templateName: string;
  creatorDetail: string;
  collectionLabel: string;
  status: MarketplaceModerationSlaStatus;
  daysOpen: number;
  openedAt: string;
  reasons: string[];
};

export type MarketplaceInstallCohort = {
  id: string;
  label: string;
  templateCount: number;
  views: number;
  uses: number;
  conversionRate: number;
};

export type TemplateMarketplaceIntelligence = {
  generatedAt: string;
  status: MarketplaceIntelligenceStatus;
  score: number;
  demandSignals: MarketplaceDemandSignal[];
  creatorTrends: MarketplaceCreatorTrend[];
  collectionGaps: MarketplaceCollectionGap[];
  moderationSla: {
    items: MarketplaceModerationSlaItem[];
    overdueCount: number;
    dueSoonCount: number;
    averageDaysOpen: number;
  };
  installCohorts: MarketplaceInstallCohort[];
  nextActions: string[];
  totals: {
    templates: number;
    publishedTemplates: number;
    reviewTemplates: number;
    totalViews: number;
    totalUses: number;
    averageConversionRate: number;
    activeDemandSignals: number;
    collectionGaps: number;
    moderationOpen: number;
  };
};

export type TemplateMarketplaceIntelligenceInput = {
  templates: DesignTemplateSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: Date;
};
