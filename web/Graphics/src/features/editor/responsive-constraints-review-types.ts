export type ResponsiveConstraintsStatus = "ready" | "review" | "blocked";

export type ResponsiveConstraintsCategory =
  | "resize-simulation"
  | "constraints"
  | "nested"
  | "group"
  | "component"
  | "mask"
  | "grid"
  | "cross-page"
  | "ready";

export type ResponsiveConstraintsAction =
  | "select"
  | "set-stretch"
  | "set-scale"
  | "show-grid"
  | "clip-frame";

export type ResponsiveConstraintsReviewRow = {
  id: string;
  pageId: string;
  pageName: string;
  frameId?: string;
  frameName?: string;
  status: ResponsiveConstraintsStatus;
  category: ResponsiveConstraintsCategory;
  label: string;
  detail: string;
  layerIds: string[];
  layerNames: string[];
  action: ResponsiveConstraintsAction;
  actionLabel: string;
  metric: number;
  previewLabel: string;
  overflowCount: number;
  unstableCount: number;
  recommendation: string;
  repairable: boolean;
};

export type ResponsiveConstraintsReviewReport = {
  score: number;
  status: ResponsiveConstraintsStatus;
  pageCount: number;
  frameCount: number;
  simulatedFrameCount: number;
  resizeScenarioCount: number;
  overflowCount: number;
  unstableCount: number;
  missingConstraintCount: number;
  nestedFrameCount: number;
  groupIssueCount: number;
  componentIssueCount: number;
  maskIssueCount: number;
  gridIssueCount: number;
  crossPageIssueCount: number;
  repairableCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  rows: ResponsiveConstraintsReviewRow[];
};

export const responsiveConstraintsStatusRank = {
  blocked: 0,
  review: 1,
  ready: 2,
} satisfies Record<ResponsiveConstraintsStatus, number>;
