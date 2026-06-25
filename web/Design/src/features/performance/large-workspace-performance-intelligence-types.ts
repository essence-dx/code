export type LargeWorkspacePerformanceStatus = "ready" | "review" | "blocked";

export type LargeWorkspaceSlowSurface =
  | "editor-canvas"
  | "asset-manifest"
  | "version-history"
  | "export-pipeline"
  | "audit-readiness";

export type LargeWorkspaceDocumentBudget = {
  id: string;
  projectId: string;
  projectName: string;
  status: LargeWorkspacePerformanceStatus;
  score: number;
  canvasPixels: number;
  assetBytes: number;
  assetReferenceCount: number;
  skippedReferenceCount: number;
  versionCount: number;
  exportArtifactBytes: number;
  auditScore: number | null;
  detail: string;
};

export type LargeWorkspaceSlowSurfaceDiagnostic = {
  id: string;
  projectId: string;
  projectName: string;
  surface: LargeWorkspaceSlowSurface;
  status: LargeWorkspacePerformanceStatus;
  metricLabel: string;
  detail: string;
  recoveryRecommendationId: string;
};

export type LargeWorkspaceRecoveryRecommendation = {
  id: string;
  projectId: string;
  projectName: string;
  status: LargeWorkspacePerformanceStatus;
  title: string;
  impact: string;
  steps: string[];
};

export type LargeWorkspaceTelemetryPacket = {
  id: string;
  status: LargeWorkspacePerformanceStatus;
  generatedAt: string;
  fileName: string;
  dataUrl: string;
};

export type LargeWorkspacePerformanceIntelligenceCenter = {
  generatedAt: string;
  status: LargeWorkspacePerformanceStatus;
  score: number;
  documentBudgets: LargeWorkspaceDocumentBudget[];
  slowSurfaceDiagnostics: LargeWorkspaceSlowSurfaceDiagnostic[];
  recoveryRecommendations: LargeWorkspaceRecoveryRecommendation[];
  telemetryPacket: LargeWorkspaceTelemetryPacket;
  nextActions: string[];
  totals: {
    projects: number;
    documentBudgets: number;
    slowSurfaceDiagnostics: number;
    recoveryRecommendations: number;
    telemetryPackets: number;
    blockedProjects: number;
    totalAssetBytes: number;
  };
};
