export type ComponentOverrideReviewStatus = "ready" | "review" | "blocked";

export type ComponentOverrideReviewRow = {
  id: string;
  pageId: string;
  pageName: string;
  componentId: string;
  componentName: string;
  variantId?: string;
  variantName: string;
  status: ComponentOverrideReviewStatus;
  label: string;
  detail: string;
  resetLayerId?: string;
  canReset: boolean;
  layerIds: string[];
  layerNames: string[];
  instanceLayerCount: number;
  overrideCount: number;
  propertyDiffCount: number;
  slotIssueCount: number;
  instanceCount: number;
  variantInstanceCount: number;
  variantAdoptionPercent: number;
  resetPreview: ComponentOverrideResetPreview[];
  propertyDiffs: ComponentPropertyDiff[];
  slotIssues: ComponentSlotIssue[];
};

export type ComponentOverrideResetPreview = {
  id: string;
  layerName: string;
  label: string;
  current: string;
  source: string;
};

export type ComponentPropertyDiff = {
  propertyName: string;
  current: string;
  source: string;
};

export type ComponentSlotIssue = {
  id: string;
  label: string;
  detail: string;
};

export type ComponentOverrideReviewReport = {
  score: number;
  instanceCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  resettableCount: number;
  overrideCount: number;
  propertyDiffCount: number;
  slotIssueCount: number;
  componentAdoptionCount: number;
  unusedComponentCount: number;
  variantCount: number;
  usedVariantCount: number;
  unusedVariantCount: number;
  variantCoveragePercent: number;
  rows: ComponentOverrideReviewRow[];
};
