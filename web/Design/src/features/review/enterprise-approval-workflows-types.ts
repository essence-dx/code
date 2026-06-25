import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  ApprovalStatus,
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";

export type EnterpriseApprovalWorkflowStatus =
  | "ready"
  | "review"
  | "blocked";

export type EnterpriseApprovalSubjectKind =
  | "project"
  | "template"
  | "campaign-deliverable";

export type EnterpriseApprovalStageOwnerCoverage =
  | "assigned"
  | "fallback"
  | "missing";

export type EnterpriseApprovalStageOwner = {
  id: string;
  stage: "Intake" | "Review" | "Approval" | "Governance";
  ownerLabel: string;
  role: string;
  coverage: EnterpriseApprovalStageOwnerCoverage;
  sourceIds: string[];
};

export type EnterpriseApprovalWorkflowSubject = {
  id: string;
  kind: EnterpriseApprovalSubjectKind;
  name: string;
  ownerLabel: string;
  approvalStatus: ApprovalStatus;
  approvalLabel: string;
  targetHref: string | null;
  updatedAt: string;
  projectId: string | null;
  openTaskCount: number;
  overdueTaskCount: number;
};

export type EnterpriseApprovalReviewerSla = {
  hours: number;
  status: EnterpriseApprovalWorkflowStatus;
  openCount: number;
  overdueCount: number;
  dueSoonCount: number;
  unassignedCount: number;
  detail: string;
};

export type EnterpriseApprovalEscalationRule = {
  id: string;
  title: string;
  trigger: string;
  action: string;
  status: EnterpriseApprovalWorkflowStatus;
  subjectNames: string[];
  auditLogIds: string[];
};

export type EnterpriseApprovalWorkflowTemplate = {
  id: string;
  title: string;
  description: string;
  subjectKind: EnterpriseApprovalSubjectKind;
  status: EnterpriseApprovalWorkflowStatus;
  score: number;
  stageOwners: EnterpriseApprovalStageOwner[];
  escalationRules: EnterpriseApprovalEscalationRule[];
  reviewerSla: EnterpriseApprovalReviewerSla;
  subjects: EnterpriseApprovalWorkflowSubject[];
  auditLogIds: string[];
  governanceDetail: string;
};

export type EnterpriseApprovalGovernanceReport = {
  id:
    | "workflow-coverage"
    | "stage-owners"
    | "reviewer-slas"
    | "escalation-rules"
    | "audit-evidence";
  label: string;
  status: EnterpriseApprovalWorkflowStatus;
  score: number;
  detail: string;
  evidence: string[];
};

export type EnterpriseApprovalGovernancePacket = {
  id: string;
  status: EnterpriseApprovalWorkflowStatus;
  workflowTemplateIds: string[];
  auditLogIds: string[];
  download: {
    fileName: string;
    href: string;
    json: string;
  };
};

export type EnterpriseApprovalWorkflowCenter = {
  status: EnterpriseApprovalWorkflowStatus;
  score: number;
  workflowTemplates: EnterpriseApprovalWorkflowTemplate[];
  governanceReports: EnterpriseApprovalGovernanceReport[];
  governancePacket: EnterpriseApprovalGovernancePacket;
  nextActions: string[];
  totals: {
    workflowTemplates: number;
    pendingSubjects: number;
    stageOwners: number;
    escalationRules: number;
    blockedWorkflows: number;
    reviewWorkflows: number;
    openReviewerItems: number;
    overdueReviewerItems: number;
    dueSoonReviewerItems: number;
    governanceReports: number;
    auditEvents: number;
  };
};

export type EnterpriseApprovalWorkflowCenterInput = {
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  campaigns: CampaignBoardSummary[];
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  teamManagement: TeamWorkspaceManagementSummary[];
  now?: string | Date;
};
