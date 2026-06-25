import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";

export type EnterpriseContentOperationsStatus = "ready" | "review" | "blocked";

export type EnterpriseContentDependencyBlocker =
  | "approval"
  | "schedule"
  | "tasks"
  | "capacity";

export type EnterpriseContentStaffingSignalKind =
  | "assignee-load"
  | "unassigned-work"
  | "pending-invite";

export type EnterpriseContentOperationsCalendarInput = {
  campaigns: CampaignBoardSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  reviewTasks: ReviewTaskSummary[];
  teamManagement: TeamWorkspaceManagementSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

export type EnterpriseCampaignCapacityPlan = {
  id: string;
  campaignId: string;
  campaignName: string;
  status: EnterpriseContentOperationsStatus;
  score: number;
  launchAt: string | null;
  daysToLaunch: number | null;
  deliverables: number;
  scheduledDeliverables: number;
  unscheduledDeliverables: number;
  availableTeamMembers: number;
  requiredDailyThroughput: number;
  capacityUsedPercent: number;
  detail: string;
};

export type EnterpriseContentDependencyHeatmapCell = {
  id: string;
  campaignId: string;
  campaignName: string;
  channel: string;
  status: EnterpriseContentOperationsStatus;
  deliverables: number;
  scheduledDeliverables: number;
  approvedDeliverables: number;
  openTasks: number;
  blockers: EnterpriseContentDependencyBlocker[];
  detail: string;
};

export type EnterpriseContentStaffingSignal = {
  id: string;
  kind: EnterpriseContentStaffingSignalKind;
  ownerName: string;
  status: EnterpriseContentOperationsStatus;
  assignedTasks: number;
  overdueTasks: number;
  campaignIds: string[];
  workloadScore: number;
  detail: string;
};

export type EnterpriseContentRecoveryPlaybook = {
  id: string;
  campaignId: string;
  campaignName: string;
  status: EnterpriseContentOperationsStatus;
  fileName: string;
  dataUrl: string;
  json: string;
  steps: string[];
  blockers: EnterpriseContentDependencyBlocker[];
};

export type EnterpriseContentOperationsCalendarCenter = {
  generatedAt: string;
  status: EnterpriseContentOperationsStatus;
  score: number;
  capacityPlans: EnterpriseCampaignCapacityPlan[];
  dependencyHeatmap: EnterpriseContentDependencyHeatmapCell[];
  staffingSignals: EnterpriseContentStaffingSignal[];
  recoveryPlaybooks: EnterpriseContentRecoveryPlaybook[];
  nextActions: string[];
  totals: {
    campaigns: number;
    deliverables: number;
    scheduledItems: number;
    capacityPlans: number;
    dependencyHeatmapCells: number;
    staffingSignals: number;
    recoveryPlaybooks: number;
    blockedCampaigns: number;
    teamMembers: number;
    publicationGaps: number;
  };
};
