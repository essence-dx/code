import type { DesktopCrashPerformanceSupportBundleReport } from "@/features/editor/desktop-crash-performance-support-bundle";
import type { DesktopUpdateCohortObservabilityReport } from "@/features/editor/desktop-update-cohort-observability";
import type { EnterpriseDesktopReleaseOperationsSynthesisReport } from "@/features/editor/enterprise-desktop-release-operations-synthesis";
import type { OfflineWorkspaceHealthMonitorReport } from "@/features/editor/offline-workspace-health-monitor";
import type { PluginWidgetTelemetryDigestReport } from "@/features/editor/plugin-widget-runtime-telemetry-digest";

export type DesktopSupportHandoffStatus = "ready" | "review" | "blocked";

export type DesktopSupportHandoffDecision =
  | "do-not-handoff"
  | "handoff"
  | "review-required";

export type DesktopSupportHandoffCategory =
  | "crash-performance"
  | "offline-health"
  | "plugin-telemetry"
  | "release-operations"
  | "support-gate"
  | "update-cohorts";

export type DesktopSupportHandoffRow = {
  id: string;
  status: DesktopSupportHandoffStatus;
  category: DesktopSupportHandoffCategory;
  label: string;
  detail: string;
  sourceScore: number;
  blockerCount: number;
  reviewCount: number;
  packetCount: number;
  recommendation: string;
};

export type DesktopSupportHandoffPacket = {
  id: string;
  status: DesktopSupportHandoffStatus;
  category: DesktopSupportHandoffCategory;
  label: string;
  detail: string;
  evidence: string[];
  evidenceCount: number;
};

export type DesktopSupportEscalation = {
  id: string;
  status: DesktopSupportHandoffStatus;
  category: DesktopSupportHandoffCategory;
  label: string;
  detail: string;
  ownerHint: string;
};

export type DesktopSupportHandoffSynthesisReport = {
  generatedAt: string;
  status: DesktopSupportHandoffStatus;
  decision: DesktopSupportHandoffDecision;
  score: number;
  sourceCount: number;
  blockerCount: number;
  reviewItemCount: number;
  packetCount: number;
  escalationCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  minimumScoreCategory: DesktopSupportHandoffCategory;
  rows: DesktopSupportHandoffRow[];
  handoffPackets: DesktopSupportHandoffPacket[];
  escalationQueue: DesktopSupportEscalation[];
  executiveSummary: string[];
  signoffChecklist: string[];
  desktopUpdateCohorts: DesktopUpdateCohortObservabilityReport;
  crashPerformanceSupport: DesktopCrashPerformanceSupportBundleReport;
  offlineWorkspaceHealth: OfflineWorkspaceHealthMonitorReport;
  pluginTelemetryDigest: PluginWidgetTelemetryDigestReport;
  enterpriseReleaseOperations: EnterpriseDesktopReleaseOperationsSynthesisReport;
};

export type DesktopSupportHandoffSynthesisInput = {
  crashPerformanceSupport: DesktopCrashPerformanceSupportBundleReport;
  desktopUpdateCohorts: DesktopUpdateCohortObservabilityReport;
  enterpriseReleaseOperations: EnterpriseDesktopReleaseOperationsSynthesisReport;
  generatedAt?: string;
  offlineWorkspaceHealth: OfflineWorkspaceHealthMonitorReport;
  pluginTelemetryDigest: PluginWidgetTelemetryDigestReport;
};
