import type { BrandFontSummary, ProjectDetail } from "@/features/editor/types";

export type ProfessionalTypographyStatus = "ready" | "review" | "blocked";

export type TypographyTokenRole =
  | "display"
  | "heading"
  | "subheading"
  | "body"
  | "caption";

export type TypographyTokenSource = "brand" | "derived";

export type TypographyReadabilityIssue =
  | "balanced"
  | "contrast"
  | "small-text"
  | "line-length"
  | "line-height";

export type TypographyRepairOperationKind =
  | "apply-brand-type-scale"
  | "replace-font-family"
  | "improve-readability"
  | "adjust-line-height";

export type ProfessionalTypographySystemInput = {
  projects: ProjectDetail[];
  brandFonts: BrandFontSummary[];
  now?: string | Date;
};

export type TypographyScaleToken = {
  id: string;
  role: TypographyTokenRole;
  label: string;
  status: ProfessionalTypographyStatus;
  source: TypographyTokenSource;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  detail: string;
};

export type TypographyScale = {
  id: string;
  status: ProfessionalTypographyStatus;
  tokens: TypographyScaleToken[];
  missingBrandRoles: TypographyTokenRole[];
  summary: string;
};

export type TypographyFontPairingGuidance = {
  id: string;
  status: ProfessionalTypographyStatus;
  headingFontFamily: string;
  bodyFontFamily: string;
  captionFontFamily: string;
  headingRole: TypographyTokenRole;
  bodyRole: TypographyTokenRole;
  detail: string;
  recommendation: string;
};

export type TypographyReadabilityCheck = {
  id: string;
  projectId: string;
  pageId: string;
  elementId: string;
  status: ProfessionalTypographyStatus;
  issue: TypographyReadabilityIssue;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  contrastRatio: number | null;
  detail: string;
  repairAction: string;
};

export type TypographyRepairOperation = {
  kind: TypographyRepairOperationKind;
  targetElementIds: string[];
  description: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  color?: string;
};

export type TypographyRepairPacket = {
  id: string;
  projectId: string;
  pageId: string;
  title: string;
  status: ProfessionalTypographyStatus;
  sourceIds: string[];
  operations: TypographyRepairOperation[];
  fileName: string;
  dataUrl: string;
  json: string;
};

export type TypographyPageReport = {
  id: string;
  projectId: string;
  projectName: string;
  pageId: string;
  pageName: string;
  status: ProfessionalTypographyStatus;
  score: number;
  textLayerCount: number;
  readabilityCheckIds: string[];
  repairPacketIds: string[];
  nextAction: string;
};

export type TypographyProjectReport = {
  id: string;
  projectId: string;
  projectName: string;
  status: ProfessionalTypographyStatus;
  score: number;
  pageCount: number;
  textLayerCount: number;
  repairPacketIds: string[];
  nextAction: string;
};

export type ProfessionalTypographySystemCenter = {
  generatedAt: string;
  status: ProfessionalTypographyStatus;
  score: number;
  typeScale: TypographyScale;
  fontPairings: TypographyFontPairingGuidance[];
  readabilityChecks: TypographyReadabilityCheck[];
  repairPackets: TypographyRepairPacket[];
  pageReports: TypographyPageReport[];
  projectReports: TypographyProjectReport[];
  nextActions: string[];
  totals: {
    projects: number;
    pages: number;
    textLayers: number;
    typeScaleTokens: number;
    fontPairings: number;
    readabilityChecks: number;
    repairPackets: number;
    blockedPages: number;
    reviewPages: number;
  };
};
