export type VectorPathReviewStatus = "ready" | "review" | "blocked";

export type VectorPathReviewSeverity = "high" | "medium" | "low";

export type VectorPathReviewAction = "select" | "close" | "normalize" | "snap";

export type VectorPathReviewRow = {
  id: string;
  pageId: string;
  pageName: string;
  layerId: string;
  layerName: string;
  status: VectorPathReviewStatus;
  severity: VectorPathReviewSeverity;
  label: string;
  detail: string;
  action: VectorPathReviewAction;
  actionLabel: string;
  selected: boolean;
  anchorCount: number;
  controlHandleCount: number;
  commandCount: number;
  subpathCount: number;
};

export type VectorPathReviewReport = {
  score: number;
  pathLayerCount: number;
  selectedPathLayerCount: number;
  exportSafeLayerCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  repairableCount: number;
  anchorCount: number;
  controlHandleCount: number;
  commandCount: number;
  booleanReviewCount: number;
  rows: VectorPathReviewRow[];
};
