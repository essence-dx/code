import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";

export type ProductionCapacityForecastingStatus =
  | "ready"
  | "review"
  | "blocked";

export type ProductionCapacityQueueKind = "exports" | "publishing";

export type ProductionCapacityRecoveryScenario =
  | "deadline-compression"
  | "export-backlog"
  | "publishing-slip";

export type ProductionCapacityForecastingInput = {
  campaigns: CampaignBoardSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  serverExportJobs: ServerExportJobSummary[];
  reviewTasks: ReviewTaskSummary[];
  teamManagement: TeamWorkspaceManagementSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

export type ProductionCampaignCapacityForecast = {
  id: string;
  campaignId: string;
  campaignName: string;
  status: ProductionCapacityForecastingStatus;
  score: number;
  launchAt: string | null;
  daysToLaunch: number | null;
  deliverables: number;
  remainingDeliverables: number;
  scheduledDeliverables: number;
  unscheduledDeliverables: number;
  approvalBlockers: number;
  openTasks: number;
  exportQueueItems: number;
  availableDailyCapacity: number;
  requiredDailyCapacity: number;
  capacityUsedPercent: number;
  affectedProjectIds: string[];
  detail: string;
};

export type ProductionTeamCapacityForecast = {
  id: string;
  ownerName: string;
  status: ProductionCapacityForecastingStatus;
  assignedTasks: number;
  overdueTasks: number;
  campaignIds: string[];
  forecastUnits: number;
  capacityUnits: number;
  pressurePercent: number;
  detail: string;
};

export type ProductionCapacityQueueForecast = {
  id: string;
  kind: ProductionCapacityQueueKind;
  label: string;
  status: ProductionCapacityForecastingStatus;
  totalItems: number;
  activeItems: number;
  blockedItems: number;
  pressurePercent: number;
  estimatedClearHours: number;
  channels: string[];
  recoverySteps: string[];
  detail: string;
};

export type ProductionCapacityScenarioRecoveryPlan = {
  id: string;
  scenario: ProductionCapacityRecoveryScenario;
  title: string;
  status: ProductionCapacityForecastingStatus;
  affectedCampaignIds: string[];
  affectedQueueKinds: ProductionCapacityQueueKind[];
  auditEvidenceIds: string[];
  steps: string[];
  fileName: string;
  dataUrl: string;
  json: string;
};

export type ProductionCapacityForecastingCenter = {
  generatedAt: string;
  status: ProductionCapacityForecastingStatus;
  score: number;
  campaignForecasts: ProductionCampaignCapacityForecast[];
  teamForecasts: ProductionTeamCapacityForecast[];
  queueForecasts: ProductionCapacityQueueForecast[];
  scenarioRecoveryPlans: ProductionCapacityScenarioRecoveryPlan[];
  nextActions: string[];
  totals: {
    campaigns: number;
    teamMembers: number;
    pendingInvites: number;
    reviewTasks: number;
    exportQueueItems: number;
    publishingQueueItems: number;
    blockedCampaigns: number;
    blockedQueues: number;
    scenarioRecoveryPlans: number;
  };
};
