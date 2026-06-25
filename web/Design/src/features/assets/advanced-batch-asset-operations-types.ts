import type { AssetAuditScope } from "@/features/assets/asset-library-audit";

export type AdvancedBatchAssetOperationStatus = "ready" | "review" | "blocked";

export type BatchAssetTransformKind =
  | "resize"
  | "crop"
  | "format-conversion";

export type BatchAssetTransformPlan = {
  id: string;
  kind: BatchAssetTransformKind;
  label: string;
  status: AdvancedBatchAssetOperationStatus;
  assetIds: string[];
  targetProjectIds: string[];
  inputFormats: string[];
  outputFormat: string;
  operationCount: number;
  estimatedReclaimBytes: number;
  instructions: string[];
};

export type AssetAltTextQueueItem = {
  id: string;
  assetId: string;
  assetName: string;
  scope: AssetAuditScope;
  suggestedAltText: string;
  status: AdvancedBatchAssetOperationStatus;
  reason: string;
};

export type AssetLicenseMetadataQueueItem = {
  id: string;
  assetId: string;
  assetName: string;
  scope: AssetAuditScope;
  missingFields: Array<"source" | "author" | "license">;
  status: AdvancedBatchAssetOperationStatus;
  reason: string;
};

export type AssetUsageImpactPreview = {
  id: string;
  projectId: string;
  projectName: string;
  status: AdvancedBatchAssetOperationStatus;
  publicSurface: boolean;
  referenceCount: number;
  skippedReferenceCount: number;
  transformPlanIds: string[];
  cleanupPacketIds: string[];
  warnings: string[];
};

export type ReversibleAssetCleanupPacket = {
  id: string;
  status: AdvancedBatchAssetOperationStatus;
  duplicateKey: string;
  retainAssetId: string;
  removeAssetIds: string[];
  reclaimBytes: number;
  affectedProjectIds: string[];
  rollbackSteps: string[];
  dataUrl: string;
};

export type AdvancedBatchAssetOperationCenter = {
  generatedAt: string;
  status: AdvancedBatchAssetOperationStatus;
  score: number;
  transformPlans: BatchAssetTransformPlan[];
  altTextQueue: AssetAltTextQueueItem[];
  licenseMetadataQueue: AssetLicenseMetadataQueueItem[];
  usageImpactPreviews: AssetUsageImpactPreview[];
  reversibleCleanupPackets: ReversibleAssetCleanupPacket[];
  nextActions: string[];
  totals: {
    assets: number;
    transformCandidates: number;
    metadataQueueItems: number;
    usagePreviews: number;
    cleanupPackets: number;
    estimatedReclaimBytes: number;
  };
};
