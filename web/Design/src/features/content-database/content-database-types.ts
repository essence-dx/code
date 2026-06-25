import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";

export type ContentTemplateSurface =
  | "text"
  | "table"
  | "website"
  | "email"
  | "social";

export type ContentDatabaseRecordKind =
  | "brand-copy"
  | "product"
  | "pricing"
  | "person"
  | "event"
  | "campaign-variable";

export type ContentDatabaseStatus = "ready" | "review" | "blocked";

export type ContentDatabaseRecord = {
  id: string;
  kind: ContentDatabaseRecordKind;
  label: string;
  variableKey: string;
  value: string;
  status: ContentDatabaseStatus;
  targetSurfaces: ContentTemplateSurface[];
  sources: ContentDatabaseSourceRef[];
};

export type ContentDatabaseSourceRef = {
  type: string;
  id: string;
  label: string;
  field: string;
  excerpt: string;
  surfaces: ContentTemplateSurface[];
};

export type ContentDatabaseBinding = {
  id: string;
  recordId: string;
  variableKey: string;
  surface: ContentTemplateSurface;
  surfaceLabel: string;
  sourceType: string;
  sourceId: string;
  sourceLabel: string;
  usageCount: number;
};

export type ContentDatabaseSurfaceCoverage = {
  surface: ContentTemplateSurface;
  label: string;
  recordCount: number;
  bindingCount: number;
  status: ContentDatabaseStatus;
};

export type ContentDatabasePacket = {
  fileName: string;
  dataUrl: string;
};

export type ContentDatabaseCenter = {
  status: ContentDatabaseStatus;
  score: number;
  generatedAt: string;
  records: ContentDatabaseRecord[];
  bindings: ContentDatabaseBinding[];
  surfaceCoverage: ContentDatabaseSurfaceCoverage[];
  packet: ContentDatabasePacket;
  nextActions: string[];
  totals: {
    records: number;
    readyRecords: number;
    reviewRecords: number;
    blockedRecords: number;
    variables: number;
    bindings: number;
    sources: number;
    duplicateEvidence: number;
  };
};

export type ContentDatabaseInput = {
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  brandLogos: BrandLogoSummary[];
  templates: DesignTemplateSummary[];
  projects: ProjectSummary[];
  campaigns: CampaignBoardSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  websitePublishes: WebsitePublishSummary[];
  generatedAt?: string;
};

export type DraftRecord = {
  kind: ContentDatabaseRecordKind;
  label: string;
  variableKey: string;
  value: string;
  status: ContentDatabaseStatus;
  targetSurfaces: Set<ContentTemplateSurface>;
  sources: ContentDatabaseSourceRef[];
};

export type DraftState = {
  records: Map<string, DraftRecord>;
  duplicateEvidence: number;
};
