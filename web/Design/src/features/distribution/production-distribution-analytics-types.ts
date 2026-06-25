import type { ContentTemplateSurface } from "@/features/content-database/content-database";

export type ProductionDistributionAnalyticsStatus =
  | "ready"
  | "review"
  | "blocked";

export type ProductionDistributionChannelId =
  | "social"
  | "website"
  | "email"
  | "export";

export type ProductionDistributionFunnelStage = {
  id:
    | "content-sources"
    | "campaign-variants"
    | "distribution-publishes"
    | "export-artifacts"
    | "audience-response";
  label: string;
  status: ProductionDistributionAnalyticsStatus;
  current: number;
  target: number;
  conversionRate: number;
  detail: string;
};

export type ProductionDistributionCampaignAttribution = {
  id: string;
  campaignId: string;
  campaignName: string;
  audience: string;
  status: ProductionDistributionAnalyticsStatus;
  score: number;
  generatedVariants: number;
  contentSources: number;
  scheduledPublishes: number;
  socialPublishes: number;
  websitePublishes: number;
  emailPublishes: number;
  exportArtifacts: number;
  formSubmissions: number;
  websiteViews: number;
  websiteClicks: number;
  conversionRate: number;
  sourceRecordIds: string[];
  projectIds: string[];
  detail: string;
};

export type ProductionDistributionSourceInfluence = {
  id: string;
  recordId: string;
  variableKey: string;
  label: string;
  status: ProductionDistributionAnalyticsStatus;
  surfaces: ContentTemplateSurface[];
  campaignIds: string[];
  attributedVariants: number;
  scheduledPublishes: number;
  formSubmissions: number;
  detail: string;
};

export type ProductionDistributionChannelAttribution = {
  id: ProductionDistributionChannelId;
  label: string;
  status: ProductionDistributionAnalyticsStatus;
  score: number;
  campaigns: number;
  generatedVariants: number;
  plannedPublishes: number;
  publishedItems: number;
  exportArtifacts: number;
  websiteViews: number;
  websiteClicks: number;
  formSubmissions: number;
  detail: string;
};

export type ProductionDistributionAttributionPacket = {
  fileName: string;
  dataUrl: string;
};

export type ProductionDistributionAnalyticsCenter = {
  generatedAt: string;
  status: ProductionDistributionAnalyticsStatus;
  score: number;
  funnelStages: ProductionDistributionFunnelStage[];
  campaignAttribution: ProductionDistributionCampaignAttribution[];
  sourceInfluence: ProductionDistributionSourceInfluence[];
  channelAttribution: ProductionDistributionChannelAttribution[];
  attributionPacket: ProductionDistributionAttributionPacket;
  nextActions: string[];
  totals: {
    campaigns: number;
    variants: number;
    contentSources: number;
    scheduledPublishes: number;
    publishedItems: number;
    websitePublishes: number;
    emailPublishes: number;
    socialPublishes: number;
    exportArtifacts: number;
    formSubmissions: number;
    websiteViews: number;
    websiteClicks: number;
  };
};
