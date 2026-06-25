import type { EnterpriseDesktopReleaseOperationsSynthesisReport } from "@/features/editor/enterprise-desktop-release-operations-synthesis";
import type { TauriDesktopPackagingReadinessReport } from "@/features/editor/tauri-desktop-packaging-readiness";

export type DesktopUpdateCohortStatus = "ready" | "review" | "blocked";

export type DesktopUpdateChannelKind = "beta" | "canary" | "stable";

export type DesktopUpdateCohortCategory =
  | "channel-health"
  | "release-gate"
  | "rollback-cohorts"
  | "signed-evidence"
  | "updater-failures";

export type DesktopUpdateEvidencePacketKind =
  | "channel-health"
  | "release-gate"
  | "rollback-cohort"
  | "signed-evidence"
  | "updater-failure";

export type DesktopUpdateCohortSnapshot = {
  id: string;
  channel: DesktopUpdateChannelKind;
  label: string;
  currentVersion: string;
  targetVersion: string;
  rolloutPercent: number;
  totalDevices: number;
  updatedDevices: number;
  failedUpdateCount: number;
  rollbackDeviceCount: number;
  signatureVerifiedCount: number;
  latestSignalAt: string;
  evidenceIds: string[];
};

export type DesktopUpdateCohortRow = {
  id: string;
  status: DesktopUpdateCohortStatus;
  category: DesktopUpdateCohortCategory;
  label: string;
  detail: string;
  metric: number;
  threshold: number;
  channel: DesktopUpdateChannelKind | "all";
  evidenceIds: string[];
  recommendation: string;
};

export type DesktopUpdateEvidencePacket = {
  id: string;
  kind: DesktopUpdateEvidencePacketKind;
  status: DesktopUpdateCohortStatus;
  label: string;
  detail: string;
  evidence: string[];
  evidenceCount: number;
};

export type DesktopUpdateCohortObservabilityReport = {
  generatedAt: string;
  status: DesktopUpdateCohortStatus;
  score: number;
  channelCount: number;
  stableCohortCount: number;
  betaCohortCount: number;
  canaryCohortCount: number;
  totalDeviceCount: number;
  updatedDeviceCount: number;
  rolloutCoveragePercent: number;
  updaterFailureCount: number;
  updaterFailureRate: number;
  rollbackCohortCount: number;
  rollbackDeviceCount: number;
  signedEvidenceCount: number;
  unsignedDeviceCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  rows: DesktopUpdateCohortRow[];
  cohorts: DesktopUpdateCohortSnapshot[];
  evidencePackets: DesktopUpdateEvidencePacket[];
  signedEvidenceExports: string[];
};

export type DesktopUpdateCohortObservabilityInput = {
  cohorts?: DesktopUpdateCohortSnapshot[];
  enterpriseReleaseOperations: EnterpriseDesktopReleaseOperationsSynthesisReport;
  generatedAt?: string;
  tauriDesktopPackaging: TauriDesktopPackagingReadinessReport;
};
