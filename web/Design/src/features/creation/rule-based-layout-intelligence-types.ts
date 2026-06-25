import type { DesignPresetId, ProjectDetail } from "@/features/editor/types";

export type RuleBasedLayoutStatus = "ready" | "review" | "blocked";

export type LayoutSpacingIssue =
  | "balanced"
  | "alignment-drift"
  | "cramped-spacing"
  | "density-risk"
  | "margin-risk";

export type LayoutHierarchyIssue =
  | "balanced"
  | "missing-heading"
  | "body-outsizes-heading"
  | "heading-order-risk";

export type LayoutRepairOperationKind =
  | "align-left-edges"
  | "distribute-vertical-spacing"
  | "restore-text-hierarchy"
  | "scale-to-safe-area"
  | "resize-for-format";

export type RuleBasedLayoutIntelligenceInput = {
  projects: ProjectDetail[];
  now?: string | Date;
};

export type LayoutContentBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

export type LayoutPageDimensions = {
  width: number;
  height: number;
};

export type LayoutSpacingAudit = {
  id: string;
  projectId: string;
  pageId: string;
  status: RuleBasedLayoutStatus;
  issue: LayoutSpacingIssue;
  elementIds: string[];
  measurement: number;
  detail: string;
  repairAction: string;
};

export type LayoutHierarchyCheck = {
  id: string;
  projectId: string;
  pageId: string;
  status: RuleBasedLayoutStatus;
  issue: LayoutHierarchyIssue;
  headingElementId: string | null;
  bodyElementId: string | null;
  headingSize: number;
  bodySize: number;
  detail: string;
  repairAction: string;
};

export type LayoutResponsiveSuggestion = {
  id: string;
  projectId: string;
  pageId: string;
  targetFormatId: "mobile-story" | "presentation-slide";
  targetLabel: string;
  status: RuleBasedLayoutStatus;
  targetWidth: number;
  targetHeight: number;
  scalePercent: number;
  safeAreaCoverage: number;
  suggestedFormat: DesignPresetId;
  detail: string;
  steps: string[];
};

export type LayoutRepairOperation = {
  kind: LayoutRepairOperationKind;
  targetElementIds: string[];
  description: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fontSize?: number;
};

export type LayoutRepairPlan = {
  id: string;
  projectId: string;
  pageId: string;
  title: string;
  status: RuleBasedLayoutStatus;
  sourceIds: string[];
  operations: LayoutRepairOperation[];
  fileName: string;
  dataUrl: string;
  json: string;
};

export type RuleBasedLayoutPageReport = {
  id: string;
  projectId: string;
  projectName: string;
  pageId: string;
  pageName: string;
  status: RuleBasedLayoutStatus;
  score: number;
  dimensions: LayoutPageDimensions;
  contentBounds: LayoutContentBounds | null;
  spacingAuditIds: string[];
  hierarchyCheckIds: string[];
  responsiveSuggestionIds: string[];
  repairPlanIds: string[];
  nextAction: string;
};

export type RuleBasedLayoutProjectReport = {
  id: string;
  projectId: string;
  projectName: string;
  status: RuleBasedLayoutStatus;
  score: number;
  pageCount: number;
  pageReportIds: string[];
  repairPlanIds: string[];
  nextAction: string;
};

export type RuleBasedLayoutIntelligenceCenter = {
  generatedAt: string;
  status: RuleBasedLayoutStatus;
  score: number;
  projectReports: RuleBasedLayoutProjectReport[];
  pageReports: RuleBasedLayoutPageReport[];
  spacingAudits: LayoutSpacingAudit[];
  hierarchyChecks: LayoutHierarchyCheck[];
  responsiveSuggestions: LayoutResponsiveSuggestion[];
  repairPlans: LayoutRepairPlan[];
  nextActions: string[];
  totals: {
    projects: number;
    pages: number;
    spacingAudits: number;
    hierarchyChecks: number;
    responsiveSuggestions: number;
    repairPlans: number;
    blockedPages: number;
    reviewPages: number;
  };
};
