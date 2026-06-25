import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  ApprovalStatus,
  DesignTemplateSummary,
  ProjectSummary,
} from "@/features/editor/types";
import { approvalStatusLabels } from "@/features/review/approval-status";
import {
  createApprovalAnalyticsExecutivePacket,
  createNextApprovalAnalyticsActions,
} from "@/features/review/enterprise-approval-analytics-packet";
import type {
  EnterpriseApprovalAnalyticsCenter,
  EnterpriseApprovalAnalyticsInput,
  EnterpriseApprovalAnalyticsWorkspace,
  EnterpriseApprovalBottleneck,
  EnterpriseApprovalReviewerForecast,
  EnterpriseApprovalSubjectAnalytics,
  EnterpriseApprovalTrendBaseline,
} from "@/features/review/enterprise-approval-analytics-types";
import {
  addDays,
  type ApprovalAnalyticsWorkspaceScope,
  type ApprovalAnalyticsWorkspaceTask,
  createTargetWorkspaceMap,
  createWorkspaceScopes,
  fallbackWorkspaceId,
  fallbackWorkspaceName,
  findTrend,
  findWorkspaceId,
  isTaskOverdue,
  mostCommonAssignee,
  readWorkspaceId,
  scoreWorkspace,
  slugify,
  statusToRisk,
} from "@/features/review/enterprise-approval-analytics-utils";
import {
  isApprovalAuditLog,
  isReviewTaskDueSoon,
  normalizeNow,
  scoreToStatus,
  statusWeight,
} from "@/features/review/enterprise-approval-workflow-utils";

export type {
  EnterpriseApprovalAnalyticsCenter,
  EnterpriseApprovalAnalyticsInput,
  EnterpriseApprovalAnalyticsStatus,
  EnterpriseApprovalAnalyticsWorkspace,
  EnterpriseApprovalBottleneck,
  EnterpriseApprovalExecutivePacket,
  EnterpriseApprovalReviewerForecast,
  EnterpriseApprovalSubjectAnalytics,
  EnterpriseApprovalTrendBaseline,
  EnterpriseApprovalTrendDirection,
} from "@/features/review/enterprise-approval-analytics-types";

export function createEnterpriseApprovalAnalyticsCenter(
  input: EnterpriseApprovalAnalyticsInput,
): EnterpriseApprovalAnalyticsCenter {
  const now = normalizeNow(input.now);
  const baselineDays = input.baselineDays ?? 7;
  const workspaces = createWorkspaceScopes(input.teamManagement);
  const workspaceById = new Map(
    workspaces.map((workspace) => [workspace.id, workspace]),
  );
  const fallbackWorkspace = workspaces[0] ?? {
    id: fallbackWorkspaceId,
    name: fallbackWorkspaceName,
    role: "personal" as const,
  };
  const targetWorkspaceIds = createTargetWorkspaceMap({
    auditLogs: input.auditLogs,
    knownWorkspaceIds: new Set(workspaces.map((workspace) => workspace.id)),
  });
  const subjects = createPendingSubjects({
    projects: input.projects,
    templates: input.templates,
    campaigns: input.campaigns,
    targetWorkspaceIds,
    workspaceById,
    fallbackWorkspace,
  });
  const workspaceTasks = createWorkspaceTasks({
    reviewTasks: input.reviewTasks,
    targetWorkspaceIds,
    workspaceById,
    fallbackWorkspace,
  });
  const approvalEvents = input.auditLogs.filter(isApprovalAuditLog);
  const trendBaselines = workspaces.map((workspace) =>
    createTrendBaseline({
      workspace,
      approvalEvents,
      baselineDays,
      now,
    }),
  );
  const reviewerForecasts = createReviewerForecasts(workspaceTasks, now);
  const bottlenecks = createBottlenecks({
    workspaces,
    subjects,
    workspaceTasks,
    trendBaselines,
    now,
  });
  const workspaceAnalytics = workspaces.map((workspace) =>
    createWorkspaceAnalytics({
      workspace,
      subjects,
      workspaceTasks,
      trend: findTrend(workspace.id, trendBaselines),
      bottlenecks,
      reviewerForecasts,
      now,
    }),
  );
  const blockedWorkspaces = workspaceAnalytics.filter(
    (workspace) => workspace.status === "blocked",
  ).length;
  const reviewWorkspaces = workspaceAnalytics.filter(
    (workspace) => workspace.status === "review",
  ).length;
  const score = workspaceAnalytics.length
    ? Math.round(
        workspaceAnalytics.reduce(
          (total, workspace) => total + workspace.score,
          0,
        ) / workspaceAnalytics.length,
      )
    : 80;
  const status = blockedWorkspaces
    ? "blocked"
    : reviewWorkspaces
      ? "review"
      : scoreToStatus(score);
  const nextActions = createNextApprovalAnalyticsActions({
    bottlenecks,
    reviewerForecasts,
    workspaceAnalytics,
  });
  const executivePacket = createApprovalAnalyticsExecutivePacket({
    status,
    workspaceAnalytics,
    trendBaselines,
    bottlenecks,
    reviewerForecasts,
    nextActions,
    now,
  });

  return {
    status,
    score,
    workspaceAnalytics,
    trendBaselines,
    bottlenecks,
    reviewerForecasts,
    executivePacket,
    nextActions,
    totals: {
      workspaces: workspaceAnalytics.length,
      pendingSubjects: subjects.length,
      currentApprovalEvents: trendBaselines.reduce(
        (total, trend) => total + trend.currentApprovalEvents,
        0,
      ),
      previousApprovalEvents: trendBaselines.reduce(
        (total, trend) => total + trend.previousApprovalEvents,
        0,
      ),
      bottlenecks: bottlenecks.length,
      blockedWorkspaces,
      reviewWorkspaces,
      reviewerForecasts: reviewerForecasts.length,
      overdueReviewTasks: workspaceTasks.filter((task) =>
        isTaskOverdue(task, now),
      ).length,
    },
  };
}

function createPendingSubjects(input: {
  projects: ProjectSummary[];
  templates: DesignTemplateSummary[];
  campaigns: CampaignBoardSummary[];
  targetWorkspaceIds: Map<string, string>;
  workspaceById: Map<string, ApprovalAnalyticsWorkspaceScope>;
  fallbackWorkspace: ApprovalAnalyticsWorkspaceScope;
}) {
  const projectSubjects = input.projects
    .filter((project) => !project.deletedAt && project.approvalStatus !== "approved")
    .map((project) =>
      createSubject({
        id: `project-${project.id}`,
        kind: "project",
        name: project.name,
        approvalStatus: project.approvalStatus,
        updatedAt: project.updatedAt,
        projectId: project.id,
        workspaceId: findWorkspaceId({
          keys: [`project:${project.id}`],
          targetWorkspaceIds: input.targetWorkspaceIds,
          fallbackWorkspaceId: input.fallbackWorkspace.id,
        }),
        workspaceById: input.workspaceById,
        fallbackWorkspace: input.fallbackWorkspace,
      }),
    );
  const templateSubjects = input.templates
    .filter(
      (template) =>
        template.approvalStatus !== "approved" ||
        template.marketplaceStatus === "review",
    )
    .map((template) =>
      createSubject({
        id: `template-${template.id}`,
        kind: "template",
        name: template.name,
        approvalStatus: template.approvalStatus,
        updatedAt: template.updatedAt,
        projectId: null,
        workspaceId: findWorkspaceId({
          keys: [`template:${template.id}`],
          targetWorkspaceIds: input.targetWorkspaceIds,
          fallbackWorkspaceId: input.fallbackWorkspace.id,
        }),
        workspaceById: input.workspaceById,
        fallbackWorkspace: input.fallbackWorkspace,
      }),
    );
  const campaignSubjects = input.campaigns.flatMap((campaign) =>
    campaign.deliverables
      .filter((deliverable) => deliverable.approvalStatus !== "approved")
      .map((deliverable) =>
        createSubject({
          id: `campaign-${campaign.id}-${deliverable.id}`,
          kind: "campaign-deliverable",
          name: `${campaign.name}: ${deliverable.role}${
            deliverable.projectName ? ` (${deliverable.projectName})` : ""
          }`,
          approvalStatus: deliverable.approvalStatus,
          updatedAt: deliverable.updatedAt,
          projectId: deliverable.projectId,
          workspaceId: findWorkspaceId({
            keys: [
              `campaign:${campaign.id}`,
              deliverable.projectId ? `project:${deliverable.projectId}` : "",
            ],
            targetWorkspaceIds: input.targetWorkspaceIds,
            fallbackWorkspaceId: input.fallbackWorkspace.id,
          }),
          workspaceById: input.workspaceById,
          fallbackWorkspace: input.fallbackWorkspace,
        }),
      ),
  );

  return [...projectSubjects, ...templateSubjects, ...campaignSubjects];
}

function createSubject(input: {
  id: string;
  workspaceId: string;
  workspaceById: Map<string, ApprovalAnalyticsWorkspaceScope>;
  fallbackWorkspace: ApprovalAnalyticsWorkspaceScope;
  kind: EnterpriseApprovalSubjectAnalytics["kind"];
  name: string;
  approvalStatus: ApprovalStatus;
  updatedAt: string;
  projectId: string | null;
}): EnterpriseApprovalSubjectAnalytics {
  const workspace =
    input.workspaceById.get(input.workspaceId) ?? input.fallbackWorkspace;

  return {
    id: input.id,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    kind: input.kind,
    name: input.name,
    approvalStatus: input.approvalStatus,
    approvalLabel: approvalStatusLabels[input.approvalStatus],
    updatedAt: input.updatedAt,
    projectId: input.projectId,
  };
}

function createWorkspaceTasks(input: {
  reviewTasks: ReviewTaskSummary[];
  targetWorkspaceIds: Map<string, string>;
  workspaceById: Map<string, ApprovalAnalyticsWorkspaceScope>;
  fallbackWorkspace: ApprovalAnalyticsWorkspaceScope;
}): ApprovalAnalyticsWorkspaceTask[] {
  return input.reviewTasks
    .filter((task) => task.taskStatus !== "done" && !task.resolved)
    .map((task) => {
      const workspaceId = findWorkspaceId({
        keys: [`project:${task.projectId}`],
        targetWorkspaceIds: input.targetWorkspaceIds,
        fallbackWorkspaceId: input.fallbackWorkspace.id,
      });
      const workspace =
        input.workspaceById.get(workspaceId) ?? input.fallbackWorkspace;

      return {
        ...task,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
      };
    });
}

function createTrendBaseline(input: {
  workspace: ApprovalAnalyticsWorkspaceScope;
  approvalEvents: WorkspaceAuditLogSummary[];
  baselineDays: number;
  now: Date;
}): EnterpriseApprovalTrendBaseline {
  const currentStart = addDays(input.now, -input.baselineDays);
  const previousStart = addDays(input.now, -input.baselineDays * 2);
  const workspaceEvents = input.approvalEvents.filter(
    (event) => readWorkspaceId(event.metadata) === input.workspace.id,
  );
  const currentApprovalEvents = workspaceEvents.filter((event) => {
    const createdAt = Date.parse(event.createdAt);

    return createdAt >= currentStart.getTime() && createdAt <= input.now.getTime();
  }).length;
  const previousApprovalEvents = workspaceEvents.filter((event) => {
    const createdAt = Date.parse(event.createdAt);

    return (
      createdAt >= previousStart.getTime() && createdAt < currentStart.getTime()
    );
  }).length;
  const delta = currentApprovalEvents - previousApprovalEvents;
  const direction =
    delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const status =
    currentApprovalEvents || previousApprovalEvents
      ? "ready"
      : "review";

  return {
    id: `trend-${input.workspace.id}`,
    workspaceId: input.workspace.id,
    workspaceName: input.workspace.name,
    currentApprovalEvents,
    previousApprovalEvents,
    delta,
    direction,
    baselineDays: input.baselineDays,
    status,
    detail: `${currentApprovalEvents} current approval events versus ${previousApprovalEvents} baseline events.`,
  };
}

function createReviewerForecasts(
  workspaceTasks: ApprovalAnalyticsWorkspaceTask[],
  now: Date,
): EnterpriseApprovalReviewerForecast[] {
  const grouped = new Map<string, ApprovalAnalyticsWorkspaceTask[]>();

  for (const task of workspaceTasks) {
    const reviewerName = task.taskAssigneeName?.trim() || "Unassigned";
    const key = `${task.workspaceId}:${reviewerName}`;
    const tasks = grouped.get(key) ?? [];
    tasks.push(task);
    grouped.set(key, tasks);
  }

  return Array.from(grouped.entries())
    .map(([key, tasks]) => {
      const [workspaceId, reviewerName] = key.split(":");
      const firstTask = tasks[0];
      const overdueTasks = tasks.filter((task) => isTaskOverdue(task, now)).length;
      const dueSoonTasks = tasks.filter((task) =>
        isReviewTaskDueSoon(task, now),
      ).length;
      const forecastNext7Days = tasks.length + dueSoonTasks;
      const loadScore = Math.max(
        0,
        Math.min(100, 100 - tasks.length * 10 - overdueTasks * 28 - dueSoonTasks * 8),
      );
      const status = overdueTasks
        ? "blocked"
        : loadScore < 70
          ? "review"
          : "ready";

      return {
        id: `forecast-${workspaceId}-${slugify(reviewerName)}`,
        workspaceId,
        workspaceName: firstTask?.workspaceName ?? fallbackWorkspaceName,
        reviewerName,
        status,
        openTasks: tasks.length,
        overdueTasks,
        dueSoonTasks,
        forecastNext7Days,
        loadScore,
        capacityRisk: statusToRisk(status),
        projectNames: [...new Set(tasks.map((task) => task.projectName))].slice(
          0,
          6,
        ),
      } satisfies EnterpriseApprovalReviewerForecast;
    })
    .sort(
      (left, right) =>
        statusWeight(left.status) - statusWeight(right.status) ||
        right.forecastNext7Days - left.forecastNext7Days ||
        left.reviewerName.localeCompare(right.reviewerName),
    );
}

function createBottlenecks(input: {
  workspaces: ApprovalAnalyticsWorkspaceScope[];
  subjects: EnterpriseApprovalSubjectAnalytics[];
  workspaceTasks: ApprovalAnalyticsWorkspaceTask[];
  trendBaselines: EnterpriseApprovalTrendBaseline[];
  now: Date;
}): EnterpriseApprovalBottleneck[] {
  return input.workspaces
    .flatMap((workspace) => {
      const workspaceSubjects = input.subjects.filter(
        (subject) => subject.workspaceId === workspace.id,
      );
      const workspaceTasks = input.workspaceTasks.filter(
        (task) => task.workspaceId === workspace.id,
      );
      const overdueTasks = workspaceTasks.filter((task) =>
        isTaskOverdue(task, input.now),
      );
      const changesRequested = workspaceSubjects.filter(
        (subject) => subject.approvalStatus === "changes-requested",
      );
      const trend = findTrend(workspace.id, input.trendBaselines);
      const bottlenecks: EnterpriseApprovalBottleneck[] = [];

      if (overdueTasks.length) {
        bottlenecks.push({
          id: `${workspace.id}-reviewer-sla`,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          stage: "Reviewer SLA",
          status: "blocked",
          count: overdueTasks.length,
          overdueTasks: overdueTasks.length,
          ownerLabel: mostCommonAssignee(overdueTasks),
          subjectNames: [...new Set(overdueTasks.map((task) => task.projectName))],
          detail: `${overdueTasks.length} review task${
            overdueTasks.length === 1 ? " is" : "s are"
          } overdue in ${workspace.name}.`,
        });
      }

      if (changesRequested.length) {
        bottlenecks.push({
          id: `${workspace.id}-changes-requested`,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          stage: "Changes requested",
          status: "blocked",
          count: changesRequested.length,
          overdueTasks: 0,
          ownerLabel: workspace.name,
          subjectNames: changesRequested.map((subject) => subject.name),
          detail: `${changesRequested.length} approval subject${
            changesRequested.length === 1 ? " is" : "s are"
          } waiting on changes.`,
        });
      }

      if (workspaceSubjects.length && trend.currentApprovalEvents === 0) {
        bottlenecks.push({
          id: `${workspace.id}-audit-baseline`,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          stage: "Audit baseline",
          status: "review",
          count: workspaceSubjects.length,
          overdueTasks: 0,
          ownerLabel: workspace.name,
          subjectNames: workspaceSubjects.map((subject) => subject.name),
          detail:
            "Pending approvals exist, but the current trend window has no approval audit movement.",
        });
      }

      return bottlenecks;
    })
    .sort(
      (left, right) =>
        statusWeight(left.status) - statusWeight(right.status) ||
        right.count - left.count ||
        left.workspaceName.localeCompare(right.workspaceName),
    );
}

function createWorkspaceAnalytics(input: {
  workspace: ApprovalAnalyticsWorkspaceScope;
  subjects: EnterpriseApprovalSubjectAnalytics[];
  workspaceTasks: ApprovalAnalyticsWorkspaceTask[];
  trend: EnterpriseApprovalTrendBaseline;
  bottlenecks: EnterpriseApprovalBottleneck[];
  reviewerForecasts: EnterpriseApprovalReviewerForecast[];
  now: Date;
}): EnterpriseApprovalAnalyticsWorkspace {
  const workspaceSubjects = input.subjects.filter(
    (subject) => subject.workspaceId === input.workspace.id,
  );
  const workspaceTasks = input.workspaceTasks.filter(
    (task) => task.workspaceId === input.workspace.id,
  );
  const workspaceBottlenecks = input.bottlenecks.filter(
    (bottleneck) => bottleneck.workspaceId === input.workspace.id,
  );
  const overdueReviewTasks = workspaceTasks.filter((task) =>
    isTaskOverdue(task, input.now),
  ).length;
  const dueSoonReviewTasks = workspaceTasks.filter((task) =>
    isReviewTaskDueSoon(task, input.now),
  ).length;
  const changesRequestedSubjects = workspaceSubjects.filter(
    (subject) => subject.approvalStatus === "changes-requested",
  ).length;
  const status = workspaceBottlenecks.some(
    (bottleneck) => bottleneck.status === "blocked",
  )
    ? "blocked"
    : workspaceBottlenecks.length || workspaceSubjects.length
      ? "review"
      : "ready";

  return {
    workspaceId: input.workspace.id,
    workspaceName: input.workspace.name,
    role: input.workspace.role,
    status,
    score: scoreWorkspace({
      pendingSubjects: workspaceSubjects.length,
      changesRequestedSubjects,
      overdueReviewTasks,
      dueSoonReviewTasks,
      auditGap: workspaceSubjects.length > 0 && input.trend.currentApprovalEvents === 0,
    }),
    pendingSubjects: workspaceSubjects.length,
    changesRequestedSubjects,
    openReviewTasks: workspaceTasks.length,
    overdueReviewTasks,
    dueSoonReviewTasks,
    reviewerForecasts: input.reviewerForecasts.filter(
      (forecast) => forecast.workspaceId === input.workspace.id,
    ).length,
    bottlenecks: workspaceBottlenecks.length,
    trend: input.trend,
  };
}
