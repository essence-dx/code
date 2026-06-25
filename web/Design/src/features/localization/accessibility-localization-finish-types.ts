import type { ProjectDetail } from "@/features/editor/types";

export type AccessibilityLocalizationStatus = "ready" | "review" | "blocked";

export type AccessibilityLocalizationSectionId =
  | "page-routing"
  | "copy-length"
  | "translation-qa"
  | "handoff-export";

export type AccessibilityLocalizationIssueKind =
  | "accessibility"
  | "copy-length"
  | "translation"
  | "handoff";

export type AccessibilityLocalizationItem = {
  id: string;
  title: string;
  detail: string;
  href: string | null;
  status: AccessibilityLocalizationStatus;
  badge: string;
  meta: string[];
  kind: AccessibilityLocalizationIssueKind;
};

export type AccessibilityLocalizationSection = {
  id: AccessibilityLocalizationSectionId;
  title: string;
  description: string;
  status: AccessibilityLocalizationStatus;
  score: number;
  metricLabel: string;
  metricValue: number;
  emptyState: string;
  items: AccessibilityLocalizationItem[];
};

export type AccessibilityLocalizationHandoffExport = {
  fileName: string;
  generatedAt: string;
  dataUrl: string;
};

export type AccessibilityLocalizationFinishCenter = {
  status: AccessibilityLocalizationStatus;
  score: number;
  sections: AccessibilityLocalizationSection[];
  nextActions: string[];
  handoffExport: AccessibilityLocalizationHandoffExport;
  totals: {
    projects: number;
    pages: number;
    routedIssues: number;
    copyWarnings: number;
    translationEntries: number;
    handoffExports: number;
  };
};

export type ProjectFinishSummary = {
  project: ProjectDetail;
  pageIssues: AccessibilityLocalizationItem[];
  copyIssues: AccessibilityLocalizationItem[];
  translationItem: AccessibilityLocalizationItem;
  handoffItem: AccessibilityLocalizationItem;
  translationEntries: number;
};

export type CopyEntry = {
  id: string;
  label: string;
  field: string;
  sourceText: string;
  projectId: string;
  projectName: string;
  pageId: string;
  pageName: string;
  pageTypeLabel: string;
};
