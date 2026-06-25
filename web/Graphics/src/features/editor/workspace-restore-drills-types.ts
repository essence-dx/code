import type { LocalDesignSnapshotMeta } from "@/features/editor/offline-backups";
import type { OfflineSaveQueueReport } from "@/features/editor/offline-mutation-queue";
import type { DesignDocument } from "@/features/editor/types";
import type { DesignFileVersionSummary } from "@/features/files/actions";

export type WorkspaceRestoreDrillStatus = "ready" | "review" | "blocked";

export type WorkspaceRestoreDrillCategory =
  | "autosave-snapshot"
  | "corruption-check"
  | "offline-save-queue"
  | "operator-evidence"
  | "restore-preview";

export type WorkspaceRestoreDrillPacketKind =
  | "autosave-rehearsal"
  | "corruption-audit"
  | "offline-replay"
  | "operator-export"
  | "restore-preview";

export type WorkspaceRestoreDrillPacket = {
  id: string;
  kind: WorkspaceRestoreDrillPacketKind;
  status: WorkspaceRestoreDrillStatus;
  label: string;
  detail: string;
  artifactIds: string[];
  steps: string[];
  evidenceCount: number;
};

export type WorkspaceRestoreDrillRow = {
  id: string;
  status: WorkspaceRestoreDrillStatus;
  category: WorkspaceRestoreDrillCategory;
  label: string;
  detail: string;
  metric: number;
  threshold: number;
  drillPacketIds: string[];
  recommendation: string;
};

export type WorkspaceRestoreDrillsReport = {
  generatedAt: string;
  fileId: string;
  fileName: string;
  score: number;
  status: WorkspaceRestoreDrillStatus;
  autosaveSnapshotCount: number;
  staleSnapshotCount: number;
  namedVersionCount: number;
  conflictPreviewCount: number;
  corruptedArtifactCount: number;
  retryableSaveCount: number;
  failedSaveCount: number;
  staleSaveCount: number;
  operatorEvidenceCount: number;
  latestSnapshotAt: string | null;
  latestVersionAt: string | null;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  rows: WorkspaceRestoreDrillRow[];
  drillPackets: WorkspaceRestoreDrillPacket[];
  operatorEvidence: string[];
  corruptionIssues: string[];
};

export type WorkspaceRestoreDrillsInput = {
  fileId: string;
  fileName: string;
  generatedAt?: string;
  localSnapshots: LocalDesignSnapshotMeta[];
  offlineQueue: OfflineSaveQueueReport;
  versions: DesignFileVersionSummary[];
  workspaceDocument: DesignDocument;
};
