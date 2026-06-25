export type CanvasViewportIntelligenceStatus = "ready" | "review" | "blocked";

export type CanvasViewportIntelligenceCategory =
  | "render-window"
  | "interaction-cost"
  | "hit-test"
  | "safe-mode"
  | "ready";

export type CanvasViewportIntelligenceAction =
  | "select"
  | "disable-effects"
  | "lock-layers";

export type CanvasViewportIntelligenceRow = {
  id: string;
  pageId: string;
  pageName: string;
  status: CanvasViewportIntelligenceStatus;
  category: CanvasViewportIntelligenceCategory;
  label: string;
  detail: string;
  layerIds: string[];
  layerNames: string[];
  action: CanvasViewportIntelligenceAction;
  actionLabel: string;
  metric: number;
  renderWindowLabel: string;
  estimatedRenderCost: number;
  interactionCost: number;
  hitTestPairCount: number;
  stackDepth: number;
  offscreenLayerCount: number;
  recommendation: string;
  repairable: boolean;
};

export type CanvasViewportIntelligenceReport = {
  score: number;
  status: CanvasViewportIntelligenceStatus;
  pageCount: number;
  reviewedLayerCount: number;
  renderWindowCount: number;
  renderWindowLayerCount: number;
  offscreenLayerCount: number;
  expensiveLayerCount: number;
  deepHitTestPairCount: number;
  deepHitTestStackDepth: number;
  interactionCost: number;
  estimatedRenderCost: number;
  safeModeThresholdCount: number;
  repairableCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  rows: CanvasViewportIntelligenceRow[];
};

export const canvasViewportIntelligenceStatusRank = {
  blocked: 0,
  review: 1,
  ready: 2,
} satisfies Record<CanvasViewportIntelligenceStatus, number>;
