import type { DesignLayer } from "@/features/editor/types";

export type DevModeInspectionStatus = "ready" | "review" | "blocked";

export type DevModeInspectionRow = {
  id: string;
  pageId: string;
  pageName: string;
  layerId: string;
  layerName: string;
  layerType: DesignLayer["type"];
  status: DevModeInspectionStatus;
  severity: "high" | "medium" | "low";
  readyForDev: boolean;
  summary: string;
  detail: string;
  boundsLabel: string;
  spacingLabel: string;
  measurementOverlayLabel: string;
  assetKind: string;
  assetFormat: string;
  exportable: boolean;
  assetSliceName: string;
  cssLineCount: number;
  swiftLineCount: number;
  composeLineCount: number;
  htmlLineCount: number;
  jsxLineCount: number;
  codeConnectReady: boolean;
  devLinkCount: number;
  tokenCount: number;
  annotationCount: number;
  openAnnotationCount: number;
  handoffBundleReady: boolean;
  layerIds: string[];
};

export type DevModeInspectionReport = {
  score: number;
  inspectedLayerCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  markableCount: number;
  measurementOverlayCount: number;
  assetSliceCount: number;
  cssExportCount: number;
  swiftExportCount: number;
  composeExportCount: number;
  handoffBundleCount: number;
  openAnnotationCount: number;
  rows: DevModeInspectionRow[];
};

export const devModeInspectionStatusRank: Record<
  DevModeInspectionStatus,
  number
> = {
  blocked: 0,
  review: 1,
  ready: 2,
};
