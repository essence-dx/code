export type AssetLifecycleGovernanceStatus = "ready" | "review" | "blocked";

export type AssetRightsRenewal = {
  id: string;
  assetId: string;
  assetName: string;
  status: AssetLifecycleGovernanceStatus;
  reviewDueAt: string | null;
  renewalReason: string;
  action: string;
  auditEvidenceIds: string[];
};

export type AssetReplacementPlan = {
  id: string;
  sourceAssetId: string;
  sourceAssetName: string;
  replacementAssetId: string | null;
  replacementAssetName: string | null;
  status: AssetLifecycleGovernanceStatus;
  affectedProjectIds: string[];
  affectedProjectNames: string[];
  propagationSteps: string[];
  rollbackNotes: string[];
  auditEvidenceIds: string[];
};

export type AssetBulkRelinkPlan = {
  id: string;
  label: string;
  status: AssetLifecycleGovernanceStatus;
  sourceAssetIds: string[];
  replacementAssetIds: string[];
  targetProjectIds: string[];
  operationCount: number;
  warnings: string[];
};

export type AssetLifecycleUsagePreview = {
  id: string;
  projectId: string;
  projectName: string;
  status: AssetLifecycleGovernanceStatus;
  relinkPlanIds: string[];
  sourceAssetIds: string[];
  warnings: string[];
};

export type AssetLifecycleSignedEvidencePacket = {
  id: string;
  status: AssetLifecycleGovernanceStatus;
  generatedAt: string;
  signature: string;
  fileName: string;
  dataUrl: string;
  json: string;
  renewalIds: string[];
  replacementPlanIds: string[];
  relinkPlanIds: string[];
  usagePreviewIds: string[];
  auditEvidenceIds: string[];
};

export type AssetLifecycleGovernanceTotals = {
  assets: number;
  rightsRenewals: number;
  replacementPlans: number;
  bulkRelinkPlans: number;
  usageImpactPreviews: number;
  signedEvidencePackets: number;
  blockedAssets: number;
  affectedProjects: number;
  auditEvidence: number;
};

export type AssetLifecycleGovernanceCenter = {
  generatedAt: string;
  status: AssetLifecycleGovernanceStatus;
  score: number;
  rightsRenewals: AssetRightsRenewal[];
  replacementPlans: AssetReplacementPlan[];
  bulkRelinkPlans: AssetBulkRelinkPlan[];
  usageImpactPreviews: AssetLifecycleUsagePreview[];
  signedEvidencePackets: AssetLifecycleSignedEvidencePacket[];
  nextActions: string[];
  totals: AssetLifecycleGovernanceTotals;
};
