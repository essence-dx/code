import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  ApprovalStatus,
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import { approvalStatusLabels } from "@/features/review/approval-status";
import {
  createGovernancePacket,
  createGovernanceReports,
  createNextActions,
} from "@/features/review/enterprise-approval-workflow-reports";
import {
  compareSubjects,
  createAuditLogIds,
  createWorkflowDetail,
  formatSubjectNames,
  isReviewTaskDueSoon,
  mostCommon,
  normalizeNow,
  reviewerSlaHours,
  scoreToStatus,
  scoreWorkflow,
} from "@/features/review/enterprise-approval-workflow-utils";
import type {
  EnterpriseApprovalEscalationRule,
  EnterpriseApprovalReviewerSla,
  EnterpriseApprovalStageOwner,
  EnterpriseApprovalSubjectKind,
  EnterpriseApprovalWorkflowCenter,
  EnterpriseApprovalWorkflowCenterInput,
  EnterpriseApprovalWorkflowSubject,
  EnterpriseApprovalWorkflowTemplate,
} from "@/features/review/enterprise-approval-workflows-types";
import { isReviewTaskOverdue } from "@/features/review/review-tasks";

export type {
  EnterpriseApprovalEscalationRule,
  EnterpriseApprovalGovernancePacket,
  EnterpriseApprovalGovernanceReport,
  EnterpriseApprovalReviewerSla,
  EnterpriseApprovalStageOwner,
  EnterpriseApprovalStageOwnerCoverage,
  EnterpriseApprovalSubjectKind,
  EnterpriseApprovalWorkflowCenter,
  EnterpriseApprovalWorkflowCenterInput,
  EnterpriseApprovalWorkflowStatus,
  EnterpriseApprovalWorkflowSubject,
  EnterpriseApprovalWorkflowTemplate,
} from "@/features/review/enterprise-approval-workflows-types";

export function createEnterpriseApprovalWorkflowCenter(
  input: EnterpriseApprovalWorkflowCenterInput,
): EnterpriseApprovalWorkflowCenter {
  const now = normalizeNow(input.now);
  const openReviewTasks = input.reviewTasks.filter(
    (task) => task.taskStatus !== "done" && !task.resolved,
  );
  const ownership = createOwnershipContext({
    workspaces: input.teamManagement,
    openReviewTasks,
  });
  const workflowTemplates = [
    createProjectApprovalWorkflow({
      projects: input.projects,
      reviewTasks: openReviewTasks,
      auditLogs: input.auditLogs,
      ownership,
      now,
    }),
    createTemplateApprovalWorkflow({
      templates: input.templates,
      reviewTasks: openReviewTasks,
      auditLogs: input.auditLogs,
      ownership,
      now,
    }),
    createCampaignApprovalWorkflow({
      campaigns: input.campaigns,
      reviewTasks: openReviewTasks,
      auditLogs: input.auditLogs,
      ownership,
      now,
    }),
  ];
  const governanceReports = createGovernanceReports({
    workflowTemplates,
    auditLogs: input.auditLogs,
  });
  const score = Math.round(
    governanceReports.reduce((total, report) => total + report.score, 0) /
      governanceReports.length,
  );
  const status = workflowTemplates.some((workflow) => workflow.status === "blocked")
    ? "blocked"
    : workflowTemplates.some((workflow) => workflow.status === "review")
      ? "review"
      : scoreToStatus(score);
  const nextActions = createNextActions(workflowTemplates);
  const governancePacket = createGovernancePacket({
    status,
    workflowTemplates,
    governanceReports,
    nextActions,
    now,
  });
  const uniqueOverdueTaskIds = new Set(
    openReviewTasks
      .filter((task) =>
        isReviewTaskOverdue({
          taskStatus: task.taskStatus,
          taskDueAt: task.taskDueAt,
          now,
        }),
      )
      .map((task) => task.id),
  );
  const uniqueDueSoonTaskIds = new Set(
    openReviewTasks
      .filter((task) => isReviewTaskDueSoon(task, now))
      .map((task) => task.id),
  );

  return {
    status,
    score,
    workflowTemplates,
    governanceReports,
    governancePacket,
    nextActions,
    totals: {
      workflowTemplates: workflowTemplates.length,
      pendingSubjects: workflowTemplates.reduce(
        (total, workflow) => total + workflow.subjects.length,
        0,
      ),
      stageOwners: workflowTemplates.reduce(
        (total, workflow) => total + workflow.stageOwners.length,
        0,
      ),
      escalationRules: workflowTemplates.reduce(
        (total, workflow) => total + workflow.escalationRules.length,
        0,
      ),
      blockedWorkflows: workflowTemplates.filter(
        (workflow) => workflow.status === "blocked",
      ).length,
      reviewWorkflows: workflowTemplates.filter(
        (workflow) => workflow.status === "review",
      ).length,
      openReviewerItems: openReviewTasks.length,
      overdueReviewerItems: uniqueOverdueTaskIds.size,
      dueSoonReviewerItems: uniqueDueSoonTaskIds.size,
      governanceReports: governanceReports.length,
      auditEvents: governancePacket.auditLogIds.length,
    },
  };
}

function createProjectApprovalWorkflow(input: {
  projects: ProjectSummary[];
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  ownership: OwnershipContext;
  now: Date;
}) {
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const pendingProjects = activeProjects.filter(
    (project) => project.approvalStatus !== "approved",
  );
  const projectIds = new Set(activeProjects.map((project) => project.id));
  const workflowTasks = input.reviewTasks.filter((task) =>
    projectIds.has(task.projectId),
  );
  const subjects = pendingProjects.map((project) =>
    createSubject({
      id: project.id,
      kind: "project",
      name: project.name,
      ownerLabel: "Project team",
      approvalStatus: project.approvalStatus,
      targetHref: `/editor/${project.id}`,
      updatedAt: project.updatedAt,
      projectId: project.id,
      reviewTasks: workflowTasks,
      now: input.now,
    }),
  );

  return createWorkflowTemplate({
    id: "project-design-approval",
    title: "Project design approval",
    description:
      "Reusable design approval stages for drafts, reviewer changes, and final project signoff.",
    subjectKind: "project",
    subjects,
    workflowTasks,
    auditLogIds: createAuditLogIds({
      auditLogs: input.auditLogs,
      targetIds: new Set(activeProjects.map((project) => project.id)),
      targetTypes: new Set(["project"]),
    }),
    ownership: input.ownership,
    now: input.now,
  });
}

function createTemplateApprovalWorkflow(input: {
  templates: DesignTemplateSummary[];
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  ownership: OwnershipContext;
  now: Date;
}) {
  const pendingTemplates = input.templates.filter(
    (template) =>
      template.approvalStatus !== "approved" ||
      template.marketplaceStatus === "review",
  );
  const subjects = pendingTemplates.map((template) =>
    createSubject({
      id: template.id,
      kind: "template",
      name: template.name,
      ownerLabel:
        template.creatorName ??
        template.creatorEmail ??
        (template.isTeamTemplate ? "Team template" : "Template owner"),
      approvalStatus: template.approvalStatus,
      targetHref: null,
      updatedAt: template.updatedAt,
      projectId: null,
      reviewTasks: [],
      now: input.now,
    }),
  );

  return createWorkflowTemplate({
    id: "template-release-approval",
    title: "Template release approval",
    description:
      "Reusable template review stages for brand-safe library and marketplace releases.",
    subjectKind: "template",
    subjects,
    workflowTasks: [],
    auditLogIds: createAuditLogIds({
      auditLogs: input.auditLogs,
      targetIds: new Set(input.templates.map((template) => template.id)),
      targetTypes: new Set(["template"]),
    }),
    ownership: input.ownership,
    now: input.now,
  });
}

function createCampaignApprovalWorkflow(input: {
  campaigns: CampaignBoardSummary[];
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  ownership: OwnershipContext;
  now: Date;
}) {
  const pendingDeliverables = input.campaigns.flatMap((campaign) =>
    campaign.deliverables
      .filter((deliverable) => deliverable.approvalStatus !== "approved")
      .map((deliverable) => ({ campaign, deliverable })),
  );
  const projectIds = new Set(
    pendingDeliverables.flatMap(({ deliverable }) =>
      deliverable.projectId ? [deliverable.projectId] : [],
    ),
  );
  const workflowTasks = input.reviewTasks.filter((task) =>
    projectIds.has(task.projectId),
  );
  const subjects = pendingDeliverables.map(({ campaign, deliverable }) =>
    createSubject({
      id: `${campaign.id}-${deliverable.id}`,
      kind: "campaign-deliverable",
      name: `${campaign.name}: ${deliverable.role}${
        deliverable.projectName ? ` (${deliverable.projectName})` : ""
      }`,
      ownerLabel: deliverable.projectName ?? campaign.name,
      approvalStatus: deliverable.approvalStatus,
      targetHref: deliverable.projectId
        ? `/editor/${deliverable.projectId}`
        : null,
      updatedAt: deliverable.updatedAt,
      projectId: deliverable.projectId,
      reviewTasks: workflowTasks,
      now: input.now,
    }),
  );
  const targetIds = new Set([
    ...input.campaigns.map((campaign) => campaign.id),
    ...Array.from(projectIds),
  ]);

  return createWorkflowTemplate({
    id: "campaign-launch-approval",
    title: "Campaign launch approval",
    description:
      "Reusable campaign approval stages for multi-format launch deliverables and final handoff.",
    subjectKind: "campaign-deliverable",
    subjects,
    workflowTasks,
    auditLogIds: createAuditLogIds({
      auditLogs: input.auditLogs,
      targetIds,
      targetTypes: new Set(["campaign", "project", "campaign_deliverable"]),
    }),
    ownership: input.ownership,
    now: input.now,
  });
}

function createWorkflowTemplate(input: {
  id: string;
  title: string;
  description: string;
  subjectKind: EnterpriseApprovalSubjectKind;
  subjects: EnterpriseApprovalWorkflowSubject[];
  workflowTasks: ReviewTaskSummary[];
  auditLogIds: string[];
  ownership: OwnershipContext;
  now: Date;
}): EnterpriseApprovalWorkflowTemplate {
  const reviewerSla = createReviewerSla(input.workflowTasks, input.now);
  const stageOwners = createStageOwners({
    workflowId: input.id,
    subjects: input.subjects,
    workflowTasks: input.workflowTasks,
    ownership: input.ownership,
  });
  const escalationRules = createEscalationRules({
    workflowId: input.id,
    title: input.title,
    subjects: input.subjects,
    reviewerSla,
    stageOwners,
    auditLogIds: input.auditLogIds,
  });
  const status = escalationRules.some((rule) => rule.status === "blocked")
    ? "blocked"
    : escalationRules.some((rule) => rule.status === "review") ||
        input.subjects.length > 0 ||
        reviewerSla.status === "review"
      ? "review"
      : "ready";
  const score = scoreWorkflow({
    subjects: input.subjects,
    reviewerSla,
    stageOwners,
    auditLogCount: input.auditLogIds.length,
  });

  return {
    id: input.id,
    title: input.title,
    description: input.description,
    subjectKind: input.subjectKind,
    status,
    score,
    stageOwners,
    escalationRules,
    reviewerSla,
    subjects: input.subjects.sort(compareSubjects),
    auditLogIds: input.auditLogIds,
    governanceDetail: createWorkflowDetail({
      subjects: input.subjects,
      reviewerSla,
      escalationRules,
    }),
  };
}

function createSubject(input: {
  id: string;
  kind: EnterpriseApprovalSubjectKind;
  name: string;
  ownerLabel: string;
  approvalStatus: ApprovalStatus;
  targetHref: string | null;
  updatedAt: string;
  projectId: string | null;
  reviewTasks: ReviewTaskSummary[];
  now: Date;
}): EnterpriseApprovalWorkflowSubject {
  const subjectTasks = input.projectId
    ? input.reviewTasks.filter((task) => task.projectId === input.projectId)
    : [];
  const openTasks = subjectTasks.filter(
    (task) => task.taskStatus !== "done" && !task.resolved,
  );
  const overdueTasks = openTasks.filter((task) =>
    isReviewTaskOverdue({
      taskStatus: task.taskStatus,
      taskDueAt: task.taskDueAt,
      now: input.now,
    }),
  );

  return {
    id: input.id,
    kind: input.kind,
    name: input.name,
    ownerLabel: input.ownerLabel,
    approvalStatus: input.approvalStatus,
    approvalLabel: approvalStatusLabels[input.approvalStatus],
    targetHref: input.targetHref,
    updatedAt: input.updatedAt,
    projectId: input.projectId,
    openTaskCount: openTasks.length,
    overdueTaskCount: overdueTasks.length,
  };
}

function createStageOwners(input: {
  workflowId: string;
  subjects: EnterpriseApprovalWorkflowSubject[];
  workflowTasks: ReviewTaskSummary[];
  ownership: OwnershipContext;
}): EnterpriseApprovalStageOwner[] {
  const subjectOwner = mostCommon(
    input.subjects.map((subject) => subject.ownerLabel).filter(Boolean),
  );
  const reviewerOwner =
    mostCommon(
      input.workflowTasks.flatMap((task) =>
        task.taskAssigneeName ? [task.taskAssigneeName] : [],
      ),
    ) ?? input.ownership.defaultReviewer;
  const needsReviewer = input.subjects.length > 0 || input.workflowTasks.length > 0;

  return [
    {
      id: `${input.workflowId}-intake-owner`,
      stage: "Intake",
      ownerLabel: subjectOwner ?? "Workspace intake",
      role: "Submitter",
      coverage: subjectOwner ? "assigned" : "fallback",
      sourceIds: input.subjects.map((subject) => subject.id),
    },
    {
      id: `${input.workflowId}-review-owner`,
      stage: "Review",
      ownerLabel:
        reviewerOwner ??
        (needsReviewer ? "Reviewer owner required" : "Reviewer pool"),
      role: "Reviewer",
      coverage: reviewerOwner ? "assigned" : needsReviewer ? "missing" : "assigned",
      sourceIds: input.workflowTasks.map((task) => task.id),
    },
    {
      id: `${input.workflowId}-approval-owner`,
      stage: "Approval",
      ownerLabel: input.ownership.approvalOwner ?? "Workspace admin required",
      role: "Admin",
      coverage: input.ownership.approvalOwner ? "assigned" : "missing",
      sourceIds: input.ownership.approvalOwnerIds,
    },
    {
      id: `${input.workflowId}-governance-owner`,
      stage: "Governance",
      ownerLabel: input.ownership.governanceOwner ?? "Governance owner required",
      role: "Owner",
      coverage: input.ownership.governanceOwner ? "assigned" : "missing",
      sourceIds: input.ownership.governanceOwnerIds,
    },
  ];
}

function createReviewerSla(
  workflowTasks: ReviewTaskSummary[],
  now: Date,
): EnterpriseApprovalReviewerSla {
  const openTasks = workflowTasks.filter(
    (task) => task.taskStatus !== "done" && !task.resolved,
  );
  const overdueCount = openTasks.filter((task) =>
    isReviewTaskOverdue({
      taskStatus: task.taskStatus,
      taskDueAt: task.taskDueAt,
      now,
    }),
  ).length;
  const dueSoonCount = openTasks.filter((task) =>
    isReviewTaskDueSoon(task, now),
  ).length;
  const unassignedCount = openTasks.filter(
    (task) => !task.taskAssigneeName?.trim(),
  ).length;
  const status = overdueCount
    ? "blocked"
    : dueSoonCount || unassignedCount
      ? "review"
      : "ready";

  return {
    hours: reviewerSlaHours,
    status,
    openCount: openTasks.length,
    overdueCount,
    dueSoonCount,
    unassignedCount,
    detail: `${openTasks.length} open reviewer items, ${overdueCount} overdue, ${dueSoonCount} due within ${reviewerSlaHours} hours`,
  };
}

function createEscalationRules(input: {
  workflowId: string;
  title: string;
  subjects: EnterpriseApprovalWorkflowSubject[];
  reviewerSla: EnterpriseApprovalReviewerSla;
  stageOwners: EnterpriseApprovalStageOwner[];
  auditLogIds: string[];
}): EnterpriseApprovalEscalationRule[] {
  const rules: EnterpriseApprovalEscalationRule[] = [];
  const approvalOwner =
    input.stageOwners.find((owner) => owner.stage === "Approval")?.ownerLabel ??
    "workspace admin";
  const changesRequested = input.subjects.filter(
    (subject) => subject.approvalStatus === "changes-requested",
  );
  const overdueSubjects = input.subjects.filter(
    (subject) => subject.overdueTaskCount > 0,
  );
  const missingOwners = input.stageOwners.filter(
    (owner) => owner.coverage === "missing",
  );

  if (input.reviewerSla.overdueCount) {
    rules.push({
      id: `${input.workflowId}-overdue-sla`,
      title: "Escalate overdue reviewer SLA",
      trigger: `${input.reviewerSla.overdueCount} overdue reviewer SLA item${
        input.reviewerSla.overdueCount === 1 ? "" : "s"
      } needs escalation.`,
      action: `Escalate ${formatSubjectNames(overdueSubjects)} to ${approvalOwner}.`,
      status: "blocked",
      subjectNames: overdueSubjects.map((subject) => subject.name),
      auditLogIds: input.auditLogIds,
    });
  }

  if (changesRequested.length) {
    rules.push({
      id: `${input.workflowId}-changes-requested`,
      title: "Resolve changes before release",
      trigger: `${changesRequested.length} approval item${
        changesRequested.length === 1 ? " is" : "s are"
      } changes requested.`,
      action: `Route ${formatSubjectNames(changesRequested)} back to the review owner before final approval.`,
      status: "blocked",
      subjectNames: changesRequested.map((subject) => subject.name),
      auditLogIds: input.auditLogIds,
    });
  }

  if (missingOwners.length) {
    rules.push({
      id: `${input.workflowId}-owner-coverage`,
      title: "Assign missing stage owners",
      trigger: `${missingOwners.length} approval stage owner${
        missingOwners.length === 1 ? "" : "s"
      } missing coverage.`,
      action: `Assign ${missingOwners
        .map((owner) => owner.stage.toLowerCase())
        .join(", ")} owner coverage before workflow rollout.`,
      status: "blocked",
      subjectNames: input.subjects.map((subject) => subject.name),
      auditLogIds: input.auditLogIds,
    });
  }

  if (input.subjects.length && !input.auditLogIds.length) {
    rules.push({
      id: `${input.workflowId}-audit-evidence`,
      title: "Capture approval audit evidence",
      trigger: "Pending approval workflow has no matching audit event yet.",
      action: `Update approval state for ${formatSubjectNames(input.subjects)} so governance reporting has evidence.`,
      status: "review",
      subjectNames: input.subjects.map((subject) => subject.name),
      auditLogIds: [],
    });
  }

  return rules;
}

function createOwnershipContext(input: {
  workspaces: TeamWorkspaceManagementSummary[];
  openReviewTasks: ReviewTaskSummary[];
}): OwnershipContext {
  const members = input.workspaces.flatMap((workspace) => workspace.members);
  const owners = members.filter((member) => member.role === "owner");
  const admins = members.filter(
    (member) => member.role === "owner" || member.role === "admin",
  );
  const reviewOwners = input.openReviewTasks.flatMap((task) =>
    task.taskAssigneeName ? [task.taskAssigneeName] : [],
  );

  return {
    approvalOwner: admins[0]?.email ?? null,
    approvalOwnerIds: admins.map((member) => member.id),
    governanceOwner: owners[0]?.email ?? admins[0]?.email ?? null,
    governanceOwnerIds: owners.length
      ? owners.map((member) => member.id)
      : admins.map((member) => member.id),
    defaultReviewer: mostCommon(reviewOwners),
  };
}

type OwnershipContext = {
  approvalOwner: string | null;
  approvalOwnerIds: string[];
  governanceOwner: string | null;
  governanceOwnerIds: string[];
  defaultReviewer: string | null;
};
