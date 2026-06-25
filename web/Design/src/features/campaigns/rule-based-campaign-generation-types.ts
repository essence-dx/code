import type { CampaignBoardSummary } from "@/db/campaigns";
import type {
  ContentDatabaseCenter,
  ContentTemplateSurface,
} from "@/features/content-database/content-database";
import type { TemplateCollectionResult } from "@/features/templates/template-collections";
import type { TemplateCatalogFormat } from "@/features/templates/template-catalog";

export type CampaignGenerationStatus = "ready" | "review" | "blocked";

export type CampaignGenerationTrace = {
  id: string;
  sourceType:
    | "campaign"
    | "brand-kit"
    | "content-record"
    | "starter-pack"
    | "template";
  sourceId: string;
  label: string;
  field: string;
  value: string;
};

export type CampaignGeneratedSurface =
  | ContentTemplateSurface
  | "presentation"
  | "video"
  | "print"
  | "document";

export type CampaignGeneratedVariant = {
  id: string;
  campaignId: string;
  templateId: string;
  templateName: string;
  format: TemplateCatalogFormat;
  surface: CampaignGeneratedSurface;
  reviewStatus: CampaignGenerationStatus;
  title: string;
  copyBlocks: string[];
  variableMap: Record<string, string>;
  sourceTrace: CampaignGenerationTrace[];
  checks: CampaignGenerationCheck[];
};

export type CampaignGenerationCheck = {
  id: string;
  label: string;
  status: CampaignGenerationStatus;
  detail: string;
};

export type CampaignGenerationPlan = {
  id: string;
  campaignId: string;
  campaignName: string;
  status: CampaignGenerationStatus;
  score: number;
  starterPack: {
    id: string;
    name: string;
    templateIds: string[];
    formats: TemplateCatalogFormat[];
  };
  variants: CampaignGeneratedVariant[];
  sourceTrace: CampaignGenerationTrace[];
};

export type RuleBasedCampaignGenerationCenter = {
  generatedAt: string;
  status: CampaignGenerationStatus;
  score: number;
  engine: {
    mode: "deterministic-rules";
    paidAiDependency: false;
  };
  plans: CampaignGenerationPlan[];
  variants: CampaignGeneratedVariant[];
  packet: {
    fileName: string;
    dataUrl: string;
  };
  nextActions: string[];
  totals: {
    campaigns: number;
    variants: number;
    readyVariants: number;
    reviewVariants: number;
    blockedVariants: number;
    starterPacks: number;
    sourceTraces: number;
  };
};

export type RuleBasedCampaignGenerationInput = {
  campaigns: CampaignBoardSummary[];
  contentDatabase: ContentDatabaseCenter;
  starterPacks: TemplateCollectionResult[];
  generatedAt?: string;
};
