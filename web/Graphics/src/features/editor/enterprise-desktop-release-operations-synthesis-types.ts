import type { DesktopCollaborationRecoveryBridgeReport } from "@/features/editor/desktop-collaboration-recovery-bridge";
import type { NativePluginSandboxOperationsReport } from "@/features/editor/native-plugin-sandbox-operations";
import type { ProductionReadinessSynthesisPacket } from "@/features/editor/production-readiness-synthesis";
import type { WorkspaceFileOperationsReviewReport } from "@/features/editor/workspace-file-operations-review";
import type { WorkspaceRestoreDrillsReport } from "@/features/editor/workspace-restore-drills";

export type EnterpriseDesktopReleaseOperationsStatus =
  | "ready"
  | "review"
  | "blocked";

export type EnterpriseDesktopReleaseOperationsCategory =
  | "collaboration-recovery"
  | "plugin-sandbox"
  | "production-evidence"
  | "restore-drills"
  | "ship-gate"
  | "workspace-operations";

export type EnterpriseDesktopReleaseDecision =
  | "ship"
  | "review-required"
  | "do-not-ship";

export type EnterpriseDesktopReleasePacketKind =
  | "admin-evidence"
  | "collaboration-recovery"
  | "offline-readiness"
  | "plugin-sandbox"
  | "production-evidence"
  | "restore-drill"
  | "rollback"
  | "ship-gate"
  | "workspace-operations";

export type EnterpriseDesktopReleasePacket = {
  id: string;
  kind: EnterpriseDesktopReleasePacketKind;
  category: EnterpriseDesktopReleaseOperationsCategory;
  status: EnterpriseDesktopReleaseOperationsStatus;
  label: string;
  detail: string;
  source: string;
  evidence: string[];
  evidenceCount: number;
};

export type EnterpriseDesktopReleaseOperationsRow = {
  id: string;
  status: EnterpriseDesktopReleaseOperationsStatus;
  category: EnterpriseDesktopReleaseOperationsCategory;
  label: string;
  detail: string;
  sourceScore: number;
  blockerCount: number;
  reviewCount: number;
  evidenceCount: number;
  releasePacketIds: string[];
  recommendation: string;
};

export type EnterpriseDesktopReleaseOperationsSynthesisReport = {
  generatedAt: string;
  status: EnterpriseDesktopReleaseOperationsStatus;
  desktopReleaseDecision: EnterpriseDesktopReleaseDecision;
  score: number;
  sourceCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  blockerCount: number;
  reviewItemCount: number;
  evidenceCount: number;
  releasePacketCount: number;
  offlineReadinessEvidenceCount: number;
  adminEvidenceCount: number;
  rollbackEvidenceCount: number;
  minimumScoreCategory: EnterpriseDesktopReleaseOperationsCategory;
  sourceScores: Record<EnterpriseDesktopReleaseOperationsCategory, number>;
  executiveSummary: string[];
  signoffChecklist: string[];
  rows: EnterpriseDesktopReleaseOperationsRow[];
  releasePackets: EnterpriseDesktopReleasePacket[];
};

export type EnterpriseDesktopReleaseOperationsSynthesisInput = {
  desktopCollaborationRecovery: DesktopCollaborationRecoveryBridgeReport;
  generatedAt?: string;
  nativePluginSandbox: NativePluginSandboxOperationsReport;
  productionReadiness: ProductionReadinessSynthesisPacket;
  workspaceFileOperations: WorkspaceFileOperationsReviewReport;
  workspaceRestoreDrills: WorkspaceRestoreDrillsReport;
};
