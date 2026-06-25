import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  ApprovalStatus,
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import type { EnterpriseApprovalWorkflowStatus } from "@/features/review/enterprise-approval-workflows-types";

export type EnterpriseApprovalAnalyticsStatus =
  EnterpriseApprovalWorkflowStatus;

export type EnterpriseApprovalTrendDirection = "up" | "down" | "flat";

export type EnterpriseApprovalAnalyticsWorkspace = {
  workspaceId: string;
  workspaceName: string;
  role: TeamWorkspaceManagementSummary["role"] | "personal";
  status: EnterpriseApprovalAnalyticsStatus;
  score: number;
  pendingSubjects: number;
  changesRequestedSubjects: number;
  openReviewTasks: number;
  overdueReviewTasks: number;
  dueSoonReviewTasks: number;
  reviewerForecasts: number;
  bottlenecks: number;
  trend: EnterpriseApprovalTrendBaseline;
};

export type EnterpriseApprovalTrendBaseline = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  currentApprovalEvents: number;
  previousApprovalEvents: number;
  delta: number;
  direction: EnterpriseApprovalTrendDirection;
  baselineDays: number;
  status: EnterpriseApprovalAnalyticsStatus;
  detail: string;
};

export type EnterpriseApprovalSubjectAnalytics = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  kind: "project" | "template" | "campaign-deliverable";
  name: string;
  approvalStatus: ApprovalStatus;
  approvalLabel: string;
  updatedAt: string;
  projectId: string | null;
};

export type EnterpriseApprovalBottleneck = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  stage: "Reviewer SLA" | "Changes requested" | "Audit baseline";
  status: EnterpriseApprovalAnalyticsStatus;
  count: number;
  overdueTasks: number;
  ownerLabel: string;
  subjectNames: string[];
  detail: string;
};

export type EnterpriseApprovalReviewerForecast = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  reviewerName: string;
  status: EnterpriseApprovalAnalyticsStatus;
  openTasks: number;
  overdueTasks: number;
  dueSoonTasks: number;
  forecastNext7Days: number;
  loadScore: number;
  capacityRisk: "low" | "medium" | "high";
  projectNames: string[];
};

export type EnterpriseApprovalExecutivePacket = {
  id: string;
  status: EnterpriseApprovalAnalyticsStatus;
  workspaceIds: string[];
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type EnterpriseApprovalAnalyticsCenter = {
  status: EnterpriseApprovalAnalyticsStatus;
  score: number;
  workspaceAnalytics: EnterpriseApprovalAnalyticsWorkspace[];
  trendBaselines: EnterpriseApprovalTrendBaseline[];
  bottlenecks: EnterpriseApprovalBottleneck[];
  reviewerForecasts: EnterpriseApprovalReviewerForecast[];
  executivePacket: EnterpriseApprovalExecutivePacket;
  nextActions: string[];
  totals: {
    workspaces: number;
    pendingSubjects: number;
    currentApprovalEvents: number;
    previousApprovalEvents: number;
    bottlenecks: number;
    blockedWorkspaces: number;
    reviewWorkspaces: number;
    reviewerForecasts: number;
    overdueReviewTasks: number;
  };
};

export type EnterpriseApprovalAnalyticsInput = {
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  campaigns: CampaignBoardSummary[];
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  teamManagement: TeamWorkspaceManagementSummary[];
  now?: string | Date;
  baselineDays?: number;
};
