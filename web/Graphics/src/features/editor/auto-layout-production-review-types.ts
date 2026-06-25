import type { DesignLayer } from "@/features/editor/types";

export type AutoLayoutProductionStatus = "ready" | "review" | "blocked";

export type AutoLayoutProductionAction =
  | "select"
  | "adopt"
  | "migrate"
  | "enable-wrap"
  | "add-grid"
  | "show-grid"
  | "apply-layout";

export type AutoLayoutProductionCategory =
  | "ownership"
  | "migration"
  | "wrap"
  | "grid"
  | "nested"
  | "regression"
  | "ready";

export type AutoLayoutProductionReviewRow = {
  id: string;
  pageId: string;
  pageName: string;
  frameId: string;
  frameName: string;
  status: AutoLayoutProductionStatus;
  category: AutoLayoutProductionCategory;
  label: string;
  detail: string;
  action: AutoLayoutProductionAction;
  actionLabel: string;
  layerIds: string[];
  mode: "manual" | NonNullable<DesignLayer["autoLayout"]>["mode"];
  wrap: "manual" | "nowrap" | "wrap";
  childCount: number;
  containedUnownedCount: number;
  overflowCount: number;
  fillChildCount: number;
  hugChildCount: number;
  absoluteChildCount: number;
  gridCount: number;
  visibleGridCount: number;
  hiddenGridCount: number;
  nestedAutoLayoutCount: number;
  nestedDepth: number;
  frameSizing: string;
  responsiveScore: number;
  regressionPatchCount: number;
  regressionEvidence: string;
  repairable: boolean;
};

export type AutoLayoutProductionReviewReport = {
  score: number;
  pageCount: number;
  frameCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  repairableCount: number;
  autoLayoutFrameCount: number;
  manualFrameCount: number;
  wrapFrameCount: number;
  gridFrameCount: number;
  hiddenGridCount: number;
  nestedAutoLayoutCount: number;
  migrationCount: number;
  regressionEvidenceCount: number;
  rows: AutoLayoutProductionReviewRow[];
};

export const autoLayoutProductionStatusRank: Record<
  AutoLayoutProductionStatus,
  number
> = {
  blocked: 0,
  review: 1,
  ready: 2,
};
