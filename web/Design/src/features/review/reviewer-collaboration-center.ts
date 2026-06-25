import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  ApprovalStatus,
  DesignTemplateSummary,
  ProjectSummary,
  SharePermission,
} from "@/features/editor/types";
import {
  projectPermissionPresetLabels,
  sharePermissionLabels,
} from "@/features/projects/project-permissions";
import { isReviewTaskOverdue } from "@/features/review/review-tasks";

export type ReviewerCollaborationStatus = "ready" | "attention" | "blocked";

export type ReviewerCollaborationCheck = {
  id: "links" | "approvals" | "assignments" | "audit";
  label: string;
  status: ReviewerCollaborationStatus;
  score: number;
  detail: string;
};

export type ReviewOnlyLinkSummary = {
  projectId: string;
  projectName: string;
  permission: Extract<SharePermission, "view" | "comment">;
  permissionLabel: string;
  roleLabel: string;
  canComment: boolean;
  updatedAt: string;
};

export type ApprovalQueueItem = {
  id: string;
  subject: "project" | "template" | "campaign-deliverable";
  name: string;
  owner: string;
  status: ApprovalStatus;
  targetHref: string | null;
  updatedAt: string;
};

export type ReviewAssignmentFilter = {
  assigneeName: string;
  total: number;
  open: number;
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
};

export type ReviewerCollaborationCenter = {
  status: ReviewerCollaborationStatus;
  score: number;
  checks: ReviewerCollaborationCheck[];
  reviewOnlyLinks: ReviewOnlyLinkSummary[];
  editableShareRisks: Array<{
    projectId: string;
    projectName: string;
    permissionLabel: string;
    updatedAt: string;
  }>;
  approvalQueue: ApprovalQueueItem[];
  assignmentFilters: ReviewAssignmentFilter[];
  recentReviewAudit: WorkspaceAuditLogSummary[];
  nextActions: string[];
  totals: {
    reviewOnlyLinks: number;
    editableShareRisks: number;
    approvalQueue: number;
    openTasks: number;
    overdueTasks: number;
    assignees: number;
    approvalEvents: number;
  };
};

const unassignedLabel = "Unassigned";

export function createReviewerCollaborationCenter(input: {
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  campaigns: CampaignBoardSummary[];
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: Date;
}): ReviewerCollaborationCenter {
  const now = input.now ?? new Date();
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const reviewOnlyLinks = createReviewOnlyLinks(activeProjects);
  const editableShareRisks = activeProjects
    .filter((project) => project.editShareId && project.editSharePermission === "edit")
    .map((project) => ({
      projectId: project.id,
      projectName: project.name,
      permissionLabel: sharePermissionLabels[project.editSharePermission],
      updatedAt: project.updatedAt,
    }));
  const approvalQueue = createApprovalQueue(input);
  const assignmentFilters = createAssignmentFilters(input.reviewTasks, now);
  const openTasks = input.reviewTasks.filter((task) => task.taskStatus !== "done");
  const overdueTasks = openTasks.filter((task) =>
    isReviewTaskOverdue({ ...task, now }),
  );
  const recentReviewAudit = input.auditLogs
    .filter(
      (log) =>
        log.action === "approval.updated" ||
        log.action === "team.member.role.updated" ||
        log.action === "team.invite.created",
    )
    .slice(0, 6);
  const checks = [
    createLinkCheck({
      activeProjectCount: activeProjects.length,
      reviewOnlyLinkCount: reviewOnlyLinks.length,
      editableShareRiskCount: editableShareRisks.length,
    }),
    createApprovalCheck(approvalQueue),
    createAssignmentCheck({
      openTaskCount: openTasks.length,
      overdueTaskCount: overdueTasks.length,
      unassignedOpenTaskCount:
        assignmentFilters.find((filter) => filter.assigneeName === unassignedLabel)
          ?.open ?? 0,
    }),
    createAuditCheck({
      recentReviewAuditCount: recentReviewAudit.length,
      approvalQueueCount: approvalQueue.length,
      openTaskCount: openTasks.length,
    }),
  ];
  const score = Math.round(
    checks.reduce((total, check) => total + check.score, 0) / checks.length,
  );

  return {
    status: scoreToStatus(score),
    score,
    checks,
    reviewOnlyLinks,
    editableShareRisks,
    approvalQueue,
    assignmentFilters,
    recentReviewAudit,
    nextActions: createNextActions(checks),
    totals: {
      reviewOnlyLinks: reviewOnlyLinks.length,
      editableShareRisks: editableShareRisks.length,
      approvalQueue: approvalQueue.length,
      openTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      assignees: assignmentFilters.length,
      approvalEvents: recentReviewAudit.length,
    },
  };
}

function createReviewOnlyLinks(projects: ProjectSummary[]) {
  return projects
    .filter(
      (project) =>
        project.editShareId &&
        (project.editSharePermission === "view" ||
          project.editSharePermission === "comment"),
    )
    .map((project) => ({
      projectId: project.id,
      projectName: project.name,
      permission: project.editSharePermission as Extract<
        SharePermission,
        "view" | "comment"
      >,
      permissionLabel: sharePermissionLabels[project.editSharePermission],
      roleLabel:
        project.editSharePermission === "comment"
          ? projectPermissionPresetLabels.commenter
          : projectPermissionPresetLabels.viewer,
      canComment: project.editSharePermission === "comment",
      updatedAt: project.updatedAt,
    }))
    .sort(sortByUpdatedAt);
}

function createApprovalQueue(input: {
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  campaigns: CampaignBoardSummary[];
}) {
  const projectItems = input.projects
    .filter((project) => !project.deletedAt && project.approvalStatus !== "approved")
    .map((project) => ({
      id: `project-${project.id}`,
      subject: "project" as const,
      name: project.name,
      owner: "Project",
      status: project.approvalStatus,
      targetHref: `/editor/${project.id}`,
      updatedAt: project.updatedAt,
    }));
  const templateItems = input.templates
    .filter((template) => template.approvalStatus !== "approved")
    .map((template) => ({
      id: `template-${template.id}`,
      subject: "template" as const,
      name: template.name,
      owner:
        template.creatorName ??
        template.creatorEmail ??
        (template.isTeamTemplate ? "Team template" : "Template"),
      status: template.approvalStatus,
      targetHref: null,
      updatedAt: template.updatedAt,
    }));
  const campaignItems = input.campaigns.flatMap((campaign) =>
    campaign.deliverables
      .filter((deliverable) => deliverable.approvalStatus !== "approved")
      .map((deliverable) => ({
        id: `campaign-${campaign.id}-${deliverable.id}`,
        subject: "campaign-deliverable" as const,
        name: `${campaign.name}: ${deliverable.role}`,
        owner: deliverable.projectName ?? "Campaign deliverable",
        status: deliverable.approvalStatus,
        targetHref: deliverable.projectId
          ? `/editor/${deliverable.projectId}`
          : null,
        updatedAt: deliverable.updatedAt,
      })),
  );

  return [...projectItems, ...templateItems, ...campaignItems]
    .sort(
      (left, right) =>
        approvalWeight(left.status) - approvalWeight(right.status) ||
        Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    )
    .slice(0, 20);
}

function createAssignmentFilters(tasks: ReviewTaskSummary[], now: Date) {
  const filtersByAssignee = new Map<string, ReviewAssignmentFilter>();

  for (const task of tasks) {
    const assigneeName = task.taskAssigneeName?.trim() || unassignedLabel;
    const filter =
      filtersByAssignee.get(assigneeName) ??
      ({
        assigneeName,
        total: 0,
        open: 0,
        todo: 0,
        inProgress: 0,
        done: 0,
        overdue: 0,
      } satisfies ReviewAssignmentFilter);

    filter.total += 1;
    if (task.taskStatus !== "done") filter.open += 1;
    if (task.taskStatus === "todo") filter.todo += 1;
    if (task.taskStatus === "in-progress") filter.inProgress += 1;
    if (task.taskStatus === "done") filter.done += 1;
    if (isReviewTaskOverdue({ ...task, now })) filter.overdue += 1;

    filtersByAssignee.set(assigneeName, filter);
  }

  return [...filtersByAssignee.values()].sort(
    (left, right) =>
      right.overdue - left.overdue ||
      right.open - left.open ||
      left.assigneeName.localeCompare(right.assigneeName),
  );
}

function createLinkCheck(input: {
  activeProjectCount: number;
  reviewOnlyLinkCount: number;
  editableShareRiskCount: number;
}): ReviewerCollaborationCheck {
  const score =
    input.activeProjectCount === 0
      ? 100
      : input.reviewOnlyLinkCount > 0 && input.editableShareRiskCount === 0
        ? 100
        : input.reviewOnlyLinkCount > 0
          ? 70
          : input.editableShareRiskCount > 0
            ? 35
            : 45;

  return createCheck({
    id: "links",
    label: "Review-only links",
    score,
    detail: `${input.reviewOnlyLinkCount} review-only links, ${input.editableShareRiskCount} editable share risks`,
  });
}

function createApprovalCheck(
  approvalQueue: ApprovalQueueItem[],
): ReviewerCollaborationCheck {
  const changesRequested = approvalQueue.filter(
    (item) => item.status === "changes-requested",
  ).length;
  const score = !approvalQueue.length
    ? 100
    : changesRequested
      ? 45
      : approvalQueue.length <= 5
        ? 70
        : 55;

  return createCheck({
    id: "approvals",
    label: "Approval queues",
    score,
    detail: `${approvalQueue.length} approval items, ${changesRequested} changes-requested`,
  });
}

function createAssignmentCheck(input: {
  openTaskCount: number;
  overdueTaskCount: number;
  unassignedOpenTaskCount: number;
}): ReviewerCollaborationCheck {
  const score = input.overdueTaskCount
    ? 40
    : input.unassignedOpenTaskCount
      ? 60
      : input.openTaskCount
        ? 85
        : 100;

  return createCheck({
    id: "assignments",
    label: "Assignment filters",
    score,
    detail: `${input.openTaskCount} open tasks, ${input.overdueTaskCount} overdue, ${input.unassignedOpenTaskCount} unassigned`,
  });
}

function createAuditCheck(input: {
  recentReviewAuditCount: number;
  approvalQueueCount: number;
  openTaskCount: number;
}): ReviewerCollaborationCheck {
  const score = input.recentReviewAuditCount
    ? 100
    : input.approvalQueueCount || input.openTaskCount
      ? 55
      : 80;

  return createCheck({
    id: "audit",
    label: "Workspace review report",
    score,
    detail: `${input.recentReviewAuditCount} recent review or approval audit events`,
  });
}

function createCheck(input: {
  id: ReviewerCollaborationCheck["id"];
  label: string;
  score: number;
  detail: string;
}): ReviewerCollaborationCheck {
  return {
    id: input.id,
    label: input.label,
    status: scoreToStatus(input.score),
    score: input.score,
    detail: input.detail,
  };
}

function createNextActions(checks: ReviewerCollaborationCheck[]) {
  return checks
    .filter((check) => check.status !== "ready")
    .sort((left, right) => left.score - right.score)
    .map((check) => `${check.label}: ${check.detail}`)
    .slice(0, 4);
}

function approvalWeight(status: ApprovalStatus) {
  if (status === "changes-requested") return 0;
  if (status === "in-review") return 1;
  if (status === "draft") return 2;

  return 3;
}

function sortByUpdatedAt(
  left: { updatedAt: string },
  right: { updatedAt: string },
) {
  return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
}

function scoreToStatus(score: number): ReviewerCollaborationStatus {
  if (score >= 80) return "ready";
  if (score >= 50) return "attention";

  return "blocked";
}
