import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { AssetLibraryAudit } from "@/features/assets/asset-library-audit";
import type { DesktopOfflineSyncCenter } from "@/features/desktop/desktop-offline-sync-center";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  ProjectSummary,
  ProjectVersionSummary,
} from "@/features/editor/types";

export type DesktopSyncReconciliationStatus = "ready" | "review" | "blocked";

export type DesktopSyncRecoveryChoiceKind =
  | "merge-review"
  | "keep-local"
  | "restore-cloud"
  | "repair-assets"
  | "retry-export"
  | "audit-sync";

export type DesktopSyncConflictDiff = {
  id: string;
  projectId: string;
  projectName: string;
  status: DesktopSyncReconciliationStatus;
  updatedAt: string;
  localSignal: string;
  cloudSignal: string;
  diffSummary: string;
  recommendedChoice: DesktopSyncRecoveryChoiceKind;
  href: string;
  evidence: string[];
};

export type DesktopSyncRecoveryChoice = {
  id: string;
  kind: DesktopSyncRecoveryChoiceKind;
  title: string;
  detail: string;
  status: DesktopSyncReconciliationStatus;
  riskLevel: "low" | "medium" | "high";
  projectIds: string[];
  commandLabel: string;
  evidence: string[];
};

export type DesktopSyncStaleAssetRepair = {
  id: string;
  projectId: string;
  projectName: string;
  status: DesktopSyncReconciliationStatus;
  detail: string;
  assetBytes: number;
  referenceCount: number;
  skippedReferences: number;
  updatedAt: string;
  repairAction: string;
  href: string;
};

export type DesktopSyncAuditTrailItem = {
  id: string;
  action: string;
  summary: string;
  targetType: string;
  targetId: string | null;
  actorEmail: string | null;
  createdAt: string;
  relevance: string;
};

export type DesktopSyncReconciliationPacket = {
  fileName: string;
  dataUrl: string;
  json: string;
  fingerprint: string;
};

export type DesktopSyncReconciliationCenter = {
  status: DesktopSyncReconciliationStatus;
  score: number;
  generatedAt: string;
  conflictDiffs: DesktopSyncConflictDiff[];
  recoveryChoices: DesktopSyncRecoveryChoice[];
  staleAssetRepairs: DesktopSyncStaleAssetRepair[];
  auditTrail: DesktopSyncAuditTrailItem[];
  packet: DesktopSyncReconciliationPacket;
  nextActions: string[];
  totals: {
    activeProjects: number;
    conflictDiffs: number;
    recoveryChoices: number;
    staleAssetRepairs: number;
    auditTrail: number;
    failedExports: number;
    missingVersions: number;
    missingExports: number;
    offlineQueueItems: number;
  };
};

export type CreateDesktopSyncReconciliationCenterInput = {
  projects: ProjectSummary[];
  projectVersions: ProjectVersionSummary[];
  serverExportJobs: ServerExportJobSummary[];
  assetAudit: AssetLibraryAudit;
  auditLogs: WorkspaceAuditLogSummary[];
  offlineSyncCenter: DesktopOfflineSyncCenter;
  now?: Date | string;
};
