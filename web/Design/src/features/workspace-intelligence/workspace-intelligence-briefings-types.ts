import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { EnterpriseContentOperationsCalendarCenter } from "@/features/content-planner/enterprise-content-operations-calendar";
import type { DesignSystemReleaseGovernanceCenter } from "@/features/design-system/design-system-release-governance";
import type { NotificationPreferenceRoutingCenter } from "@/features/notifications/notification-preference-routing-types";
import type { ProductionObservabilityReport } from "@/features/observability/production-observability";
import type { LargeWorkspacePerformanceIntelligenceCenter } from "@/features/performance/large-workspace-performance-intelligence";
import type { PublishingChannelCenter } from "@/features/publishing/publishing-channel-depth";

export type WorkspaceIntelligenceStatus = "ready" | "review" | "blocked";

export type WorkspaceIntelligenceSeverity = "info" | "watch" | "critical";

export type WorkspaceIntelligenceArea =
  | "observability"
  | "content-operations"
  | "publishing"
  | "performance"
  | "release-governance";

export type WorkspaceIntelligenceActionPriority =
  | "critical"
  | "high"
  | "normal";

export type WorkspaceIntelligenceDigestCadence = "daily" | "weekly";

export type WorkspaceIntelligencePublishingSource = Pick<
  PublishingChannelCenter,
  "status" | "score" | "totals" | "nextActions"
>;

export type WorkspaceIntelligenceContentOperationsSource = Pick<
  EnterpriseContentOperationsCalendarCenter,
  "status" | "score" | "totals" | "nextActions"
>;

export type WorkspaceIntelligencePerformanceSource = Pick<
  LargeWorkspacePerformanceIntelligenceCenter,
  "status" | "score" | "totals" | "nextActions"
>;

export type WorkspaceIntelligenceReleaseGovernanceSource = Pick<
  DesignSystemReleaseGovernanceCenter,
  "status" | "score" | "totals" | "nextActions"
>;

export type WorkspaceIntelligenceObservabilitySource = Pick<
  ProductionObservabilityReport,
  "status" | "score" | "checkedAt" | "totals" | "groups"
>;

export type WorkspaceIntelligenceNotificationSource = Pick<
  NotificationPreferenceRoutingCenter,
  "status" | "score" | "totals" | "digestPreview" | "nextActions"
>;

export type WorkspaceIntelligenceBriefingInput = {
  workspaceName: string;
  publishing: WorkspaceIntelligencePublishingSource;
  contentOperations: WorkspaceIntelligenceContentOperationsSource;
  performance: WorkspaceIntelligencePerformanceSource;
  releaseGovernance: WorkspaceIntelligenceReleaseGovernanceSource;
  observability: WorkspaceIntelligenceObservabilitySource;
  notificationRouting: WorkspaceIntelligenceNotificationSource;
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

export type WorkspaceExecutiveSummary = {
  id: string;
  area: WorkspaceIntelligenceArea;
  title: string;
  status: WorkspaceIntelligenceStatus;
  score: number;
  headline: string;
  detail: string;
  evidence: string[];
};

export type WorkspaceAnomalyExplanation = {
  id: string;
  area: WorkspaceIntelligenceArea;
  severity: WorkspaceIntelligenceSeverity;
  title: string;
  explanation: string;
  evidence: string[];
  recommendedActionId: string;
};

export type WorkspaceRecommendedAction = {
  id: string;
  area: WorkspaceIntelligenceArea | "notifications";
  priority: WorkspaceIntelligenceActionPriority;
  title: string;
  detail: string;
  ownerHint: string;
};

export type WorkspaceIntelligenceDigestPacket = {
  id: string;
  cadence: WorkspaceIntelligenceDigestCadence;
  audience: string;
  scheduledFor: string;
  topics: string[];
  fileName: string;
  dataUrl: string;
  json: string;
};

export type WorkspaceIntelligenceBriefingCenter = {
  generatedAt: string;
  workspaceName: string;
  status: WorkspaceIntelligenceStatus;
  score: number;
  executiveNarrative: string;
  executiveSummaries: WorkspaceExecutiveSummary[];
  anomalyExplanations: WorkspaceAnomalyExplanation[];
  recommendedActions: WorkspaceRecommendedAction[];
  digestPackets: WorkspaceIntelligenceDigestPacket[];
  nextActions: string[];
  totals: {
    executiveSummaries: number;
    anomalyExplanations: number;
    recommendedActions: number;
    digestPackets: number;
    criticalAnomalies: number;
    watchAnomalies: number;
    unreadDigestItems: number;
    recentAuditEvents: number;
  };
};
