import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  DesignTemplateSummary,
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";

export type DesignSystemIntelligenceStatus = "ready" | "review" | "blocked";

export type DesignSystemComponentKind =
  | "brand-template"
  | "team-template"
  | "marketplace-template"
  | "private-component";

export type DesignSystemTokenKind = "color" | "font" | "logo" | "project-brand";

export type DesignSystemComponentDefinition = {
  id: string;
  templateId: string;
  name: string;
  kind: DesignSystemComponentKind;
  status: DesignSystemIntelligenceStatus;
  score: number;
  href: string;
  tokenCoverage: {
    colors: number;
    fonts: number;
    logos: number;
    complete: boolean;
  };
  usage: {
    projectIds: string[];
    projectNames: string[];
    relationKinds: string[];
  };
  recommendation: string;
};

export type DesignSystemTokenDriftReport = {
  id: string;
  kind: DesignSystemTokenKind;
  label: string;
  status: DesignSystemIntelligenceStatus;
  driftCount: number;
  detail: string;
  affectedProjectIds: string[];
  recommendedFix: string;
};

export type DesignSystemUsageMap = {
  id: string;
  title: string;
  relation: "source" | "name" | "dimensions" | "audit";
  status: DesignSystemIntelligenceStatus;
  coverageScore: number;
  templateIds: string[];
  projectIds: string[];
  detail: string;
};

export type DesignSystemRefactorPacket = {
  id: string;
  title: string;
  status: DesignSystemIntelligenceStatus;
  fileName: string;
  dataUrl: string;
  json: string;
  affectedProjectIds: string[];
  steps: string[];
};

export type DesignSystemIntelligenceCenter = {
  status: DesignSystemIntelligenceStatus;
  score: number;
  generatedAt: string;
  componentDefinitions: DesignSystemComponentDefinition[];
  tokenDriftReports: DesignSystemTokenDriftReport[];
  usageMaps: DesignSystemUsageMap[];
  refactorPackets: DesignSystemRefactorPacket[];
  nextActions: string[];
  totals: {
    components: number;
    readyComponents: number;
    tokenDrift: number;
    usageMaps: number;
    refactorPackets: number;
    auditEvents: number;
  };
};

export type DesignSystemTokenProfile = {
  colorCount: number;
  fontCount: number;
  logoCount: number;
  missingFontRoles: Array<BrandFontSummary["role"]>;
  complete: boolean;
};

export type DesignSystemIntelligenceInput = {
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  brandLogos: BrandLogoSummary[];
  templates: DesignTemplateSummary[];
  projects: ProjectSummary[];
  projectAudits: ProjectAuditSummary[];
  projectVersions: ProjectVersionSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  generatedAt?: string;
};
