import type { DesignFileSummary } from "@/features/files/actions";

export type WorkspaceFileOperationsStatus = "ready" | "review" | "blocked";

export type WorkspaceFileOperationsCategory =
  | "offline-open"
  | "operator-evidence"
  | "permission-drift"
  | "recent-files"
  | "workspace-scope";

export type WorkspaceFileOperationsPacketKind =
  | "offline-open-rehearsal"
  | "operator-export"
  | "permission-drift-audit"
  | "recent-file-review"
  | "workspace-scope-review";

export type WorkspaceFileOperationsLocalArtifact = {
  fileId: string;
  fileName: string;
  backupSavedAt: string | null;
  latestSnapshotAt: string | null;
  snapshotCount: number;
  queuedSaveCount: number;
  retryableSaveCount: number;
  failedSaveCount: number;
  syncedSaveCount: number;
};

export type WorkspaceFilePermissionDriftReason =
  | "public-collaborator"
  | "public-handoff"
  | "reviewer-handoff"
  | "viewer-comment-drift";

export type WorkspaceFilePermissionDriftQueueItem = {
  id: string;
  status: WorkspaceFileOperationsStatus;
  fileId: string;
  fileName: string;
  accessRole: DesignFileSummary["accessRole"];
  scope: string;
  teamName: string;
  projectName: string;
  reason: WorkspaceFilePermissionDriftReason;
  handoffSignalCount: number;
  detail: string;
  recommendation: string;
};

export type WorkspaceFileOfflineOpenQueueItem = {
  id: string;
  status: WorkspaceFileOperationsStatus;
  fileId: string;
  fileName: string;
  latestLocalArtifactAt: string | null;
  snapshotCount: number;
  queuedSaveCount: number;
  retryableSaveCount: number;
  failedSaveCount: number;
  syncedSaveCount: number;
  detail: string;
  recommendation: string;
};

export type WorkspaceFileOperationsRow = {
  id: string;
  status: WorkspaceFileOperationsStatus;
  category: WorkspaceFileOperationsCategory;
  label: string;
  detail: string;
  metric: number;
  threshold: number;
  packetIds: string[];
  recommendation: string;
};

export type WorkspaceFileOperationsPacket = {
  id: string;
  kind: WorkspaceFileOperationsPacketKind;
  status: WorkspaceFileOperationsStatus;
  label: string;
  detail: string;
  fileIds: string[];
  steps: string[];
  evidenceCount: number;
};

export type WorkspaceFileOperationsReviewReport = {
  generatedAt: string;
  status: WorkspaceFileOperationsStatus;
  score: number;
  fileCount: number;
  activeFileCount: number;
  recentFileCount: number;
  staleRecentFileCount: number;
  teamScopeCount: number;
  projectScopeCount: number;
  unscopedFileCount: number;
  permissionDriftCount: number;
  blockedPermissionDriftCount: number;
  offlineOpenReadyCount: number;
  offlineOpenReviewCount: number;
  offlineOpenBlockedCount: number;
  failedOfflineSaveCount: number;
  retryableOfflineSaveCount: number;
  operatorEvidenceCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  rows: WorkspaceFileOperationsRow[];
  operationPackets: WorkspaceFileOperationsPacket[];
  permissionDriftQueue: WorkspaceFilePermissionDriftQueueItem[];
  offlineOpenQueue: WorkspaceFileOfflineOpenQueueItem[];
  operatorEvidence: string[];
};

export type WorkspaceFileOperationsReviewInput = {
  files: DesignFileSummary[];
  generatedAt?: string;
  localArtifacts?: WorkspaceFileOperationsLocalArtifact[];
};
