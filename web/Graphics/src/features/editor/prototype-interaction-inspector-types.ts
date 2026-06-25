import type { DesignLayer } from "@/features/editor/types";

export type PrototypeInteractionStatus = "ready" | "review" | "blocked";

export type PrototypeInteractionCategory =
  | "starting-point"
  | "trigger"
  | "overlay"
  | "scroll"
  | "transition"
  | "presentation-route"
  | "ready";

export type PrototypeInteractionAction =
  | "select"
  | "set-start"
  | "clear-prototype"
  | "set-click-trigger"
  | "set-duration"
  | "set-scroll-reset";

export type PrototypeInteractionInspectorRow = {
  id: string;
  status: PrototypeInteractionStatus;
  category: PrototypeInteractionCategory;
  label: string;
  detail: string;
  action: PrototypeInteractionAction;
  actionLabel: string;
  pageId: string;
  pageName: string;
  layerId?: string;
  layerName?: string;
  layerIds: string[];
  targetPageId?: string;
  targetPageName?: string;
  targetExists: boolean;
  trigger: NonNullable<DesignLayer["prototype"]>["trigger"] | "none";
  prototypeAction: NonNullable<DesignLayer["prototype"]>["action"] | "none";
  transition: NonNullable<DesignLayer["prototype"]>["transition"] | "none";
  durationMs: number;
  scrollBehavior: NonNullable<DesignLayer["prototype"]>["scrollBehavior"] | "none";
  overlayPosition:
    | NonNullable<DesignLayer["prototype"]>["overlayPosition"]
    | "none";
  deviceFrame: NonNullable<DesignLayer["prototype"]>["deviceFrame"] | "none";
  routeEvidence: string;
  repairable: boolean;
};

export type PrototypeInteractionInspectorReport = {
  score: number;
  pageCount: number;
  hotspotCount: number;
  startPageCount: number;
  routePageCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  repairableCount: number;
  overlayReviewCount: number;
  scrollReviewCount: number;
  transitionReviewCount: number;
  unsupportedTriggerCount: number;
  presentationRouteIssueCount: number;
  rows: PrototypeInteractionInspectorRow[];
};

export const prototypeInteractionStatusRank: Record<
  PrototypeInteractionStatus,
  number
> = {
  blocked: 0,
  review: 1,
  ready: 2,
};
