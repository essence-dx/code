import type { MediaAssetPipelineReviewReport } from "@/features/editor/media-asset-pipeline-review";
import type { WorkspaceFileOperationsReviewReport } from "@/features/editor/workspace-file-operations-review";
import type { WorkspaceRestoreDrillsReport } from "@/features/editor/workspace-restore-drills";

export type OfflineWorkspaceHealthStatus = "ready" | "review" | "blocked";

export type OfflineWorkspaceHealthCategory =
  | "autosave-drift"
  | "local-database-integrity"
  | "media-cache-pressure"
  | "repair-packets";

export type OfflineWorkspaceHealthRow = {
  id: string;
  status: OfflineWorkspaceHealthStatus;
  category: OfflineWorkspaceHealthCategory;
  label: string;
  detail: string;
  metric: number;
  threshold: number;
  packetIds: string[];
  recommendation: string;
};

export type OfflineWorkspaceRepairPacket = {
  id: string;
  status: OfflineWorkspaceHealthStatus;
  category: OfflineWorkspaceHealthCategory;
  label: string;
  detail: string;
  userSafe: boolean;
  steps: string[];
  evidenceCount: number;
};

export type OfflineWorkspaceHealthMonitorReport = {
  generatedAt: string;
  status: OfflineWorkspaceHealthStatus;
  score: number;
  fileId: string;
  fileName: string;
  localDatabaseIssueCount: number;
  autosaveDriftCount: number;
  mediaCachePressureBytes: number;
  mediaCachePressureCount: number;
  repairPacketCount: number;
  userSafeRepairCount: number;
  failedOfflineSaveCount: number;
  staleOfflineSaveCount: number;
  retryableOfflineSaveCount: number;
  autosaveSnapshotCount: number;
  staleAutosaveSnapshotCount: number;
  mediaCompressionCandidateCount: number;
  mediaManifestBlockedCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  rows: OfflineWorkspaceHealthRow[];
  repairPackets: OfflineWorkspaceRepairPacket[];
  workspaceRestoreDrills: WorkspaceRestoreDrillsReport;
  workspaceFileOperations: WorkspaceFileOperationsReviewReport;
  mediaAssetPipeline: MediaAssetPipelineReviewReport;
};

export type OfflineWorkspaceHealthMonitorInput = {
  generatedAt?: string;
  mediaAssetPipeline: MediaAssetPipelineReviewReport;
  workspaceFileOperations: WorkspaceFileOperationsReviewReport;
  workspaceRestoreDrills: WorkspaceRestoreDrillsReport;
};
