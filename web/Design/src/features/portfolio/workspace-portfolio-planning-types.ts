import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ProjectSummary } from "@/features/editor/types";
import type { ProjectDependencyGraph } from "@/features/projects/project-dependency-graph";

export type WorkspacePortfolioPlanningStatus = "ready" | "review" | "blocked";

export type WorkspacePortfolioGoalKind = "campaign" | "project";

export type WorkspacePortfolioOutcomeKind = "campaign" | "project";

export type WorkspacePortfolioPlanningInput = {
  projects: ProjectSummary[];
  campaigns: CampaignBoardSummary[];
  reviewTasks: ReviewTaskSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  teamManagement: TeamWorkspaceManagementSummary[];
  projectDependencyGraph: ProjectDependencyGraph;
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

export type WorkspacePortfolioGoalMetrics = {
  projects: number;
  deliverables: number;
  approvedDeliverables: number;
  scheduledDeliverables: number;
  openTasks: number;
  overdueTasks: number;
  dependencyRisks: number;
};

export type WorkspacePortfolioGoal = {
  id: string;
  kind: WorkspacePortfolioGoalKind;
  title: string;
  objective: string;
  ownerName: string;
  status: WorkspacePortfolioPlanningStatus;
  healthScore: number;
  targetAt: string | null;
  campaignIds: string[];
  projectIds: string[];
  metrics: WorkspacePortfolioGoalMetrics;
  detail: string;
};

export type WorkspacePortfolioOwnerLane = {
  id: string;
  ownerName: string;
  workspaceNames: string[];
  status: WorkspacePortfolioPlanningStatus;
  score: number;
  goalIds: string[];
  projectIds: string[];
  openTasks: number;
  overdueTasks: number;
  detail: string;
};

export type WorkspacePortfolioDependencyMap = {
  id: string;
  goalId: string;
  title: string;
  status: WorkspacePortfolioPlanningStatus;
  nodeCount: number;
  edgeCount: number;
  riskCount: number;
  blockedRiskTitles: string[];
  dependencySummary: string;
};

export type WorkspacePortfolioOutcomeTrack = {
  id: string;
  kind: WorkspacePortfolioOutcomeKind;
  title: string;
  status: WorkspacePortfolioPlanningStatus;
  score: number;
  targetLabel: string;
  actualLabel: string;
  progressPercent: number;
  evidence: string[];
};

export type WorkspacePortfolioPlanningCenter = {
  generatedAt: string;
  status: WorkspacePortfolioPlanningStatus;
  score: number;
  goals: WorkspacePortfolioGoal[];
  ownerLanes: WorkspacePortfolioOwnerLane[];
  dependencyMaps: WorkspacePortfolioDependencyMap[];
  outcomeTracks: WorkspacePortfolioOutcomeTrack[];
  nextActions: string[];
  totals: {
    goals: number;
    ownerLanes: number;
    dependencyMaps: number;
    outcomeTracks: number;
    blockedGoals: number;
    reviewGoals: number;
    activeCampaigns: number;
    activeProjects: number;
    dependencyRisks: number;
    overdueTasks: number;
  };
};
