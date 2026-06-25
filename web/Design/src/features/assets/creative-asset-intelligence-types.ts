import type { AssetAuditScope } from "@/features/assets/asset-library-audit";

export type CreativeAssetIntelligenceStatus = "ready" | "review" | "blocked";

export type CreativeAssetRecommendationKind =
  | "duplicate-cleanup"
  | "license-remediation"
  | "usage-optimization"
  | "dependency-impact";

export type CreativeAssetRecommendation = {
  id: string;
  kind: CreativeAssetRecommendationKind;
  title: string;
  detail: string;
  status: CreativeAssetIntelligenceStatus;
  priority: number;
  assetIds: string[];
  affectedProjectIds: string[];
  reclaimBytes: number;
  action: string;
};

export type CreativeAssetBatchCleanupPreview = {
  id: string;
  title: string;
  status: CreativeAssetIntelligenceStatus;
  duplicateKey: string;
  retainAssetId: string;
  removableAssetIds: string[];
  blockedAssetIds: string[];
  reclaimBytes: number;
  reasons: string[];
};

export type CreativeAssetImpactProject = {
  projectId: string;
  projectName: string;
  role: "manifest" | "reference" | "public-surface";
  href: string;
};

export type CreativeAssetImpactExport = {
  exportJobId: string;
  projectId: string;
  status: string;
  fileName: string;
};

export type CreativeAssetImpactWebsite = {
  publishId: string;
  projectId: string;
  title: string;
  status: string;
};

export type CreativeAssetImpactTemplate = {
  templateId: string;
  name: string;
  status: string;
};

export type CreativeAssetDependencyImpactSimulation = {
  id: string;
  assetId: string;
  assetName: string;
  assetScope: AssetAuditScope;
  status: CreativeAssetIntelligenceStatus;
  riskScore: number;
  affectedProjects: CreativeAssetImpactProject[];
  affectedExports: CreativeAssetImpactExport[];
  affectedWebsites: CreativeAssetImpactWebsite[];
  affectedTemplates: CreativeAssetImpactTemplate[];
  skippedReferences: number;
  warnings: string[];
};

export type CreativeAssetIntelligenceTotals = {
  assets: number;
  duplicateGroups: number;
  cleanupCandidates: number;
  reclaimBytes: number;
  licenseGaps: number;
  dependencyRisks: number;
  affectedProjects: number;
  remediationActions: number;
};

export type CreativeAssetRemediationPacket = {
  fileName: string;
  dataUrl: string;
  payload: {
    kind: "essence-studio.creative-asset-intelligence";
    version: 1;
    generatedAt: string;
    status: CreativeAssetIntelligenceStatus;
    score: number;
    recommendations: Array<{
      id: string;
      kind: CreativeAssetRecommendationKind;
      status: CreativeAssetIntelligenceStatus;
      priority: number;
      assetIds: string[];
      affectedProjectIds: string[];
      reclaimBytes: number;
      action: string;
    }>;
    batchCleanupPreviews: Array<{
      id: string;
      status: CreativeAssetIntelligenceStatus;
      retainAssetId: string;
      removableAssetIds: string[];
      blockedAssetIds: string[];
      reclaimBytes: number;
    }>;
    dependencyImpactSimulations: Array<{
      id: string;
      assetId: string;
      status: CreativeAssetIntelligenceStatus;
      riskScore: number;
      affectedProjectIds: string[];
      affectedExports: number;
      affectedWebsites: number;
      warnings: string[];
    }>;
    totals: CreativeAssetIntelligenceTotals;
    nextActions: string[];
  };
};

export type CreativeAssetIntelligenceCenter = {
  status: CreativeAssetIntelligenceStatus;
  score: number;
  checkedAt: string;
  recommendations: CreativeAssetRecommendation[];
  batchCleanupPreviews: CreativeAssetBatchCleanupPreview[];
  dependencyImpactSimulations: CreativeAssetDependencyImpactSimulation[];
  remediationPacket: CreativeAssetRemediationPacket;
  nextActions: string[];
  totals: CreativeAssetIntelligenceTotals;
};
