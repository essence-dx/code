import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { ProjectSummary } from "@/features/editor/types";
import type {
  ProjectDependencyCluster,
  ProjectDependencyEdge,
  ProjectDependencyRisk,
} from "@/features/projects/project-dependency-graph";
import type {
  WorkspacePortfolioDependencyMap,
  WorkspacePortfolioGoal,
  WorkspacePortfolioGoalMetrics,
  WorkspacePortfolioOwnerLane,
  WorkspacePortfolioOutcomeTrack,
  WorkspacePortfolioPlanningCenter,
  WorkspacePortfolioPlanningInput,
  WorkspacePortfolioPlanningStatus,
} from "@/features/portfolio/workspace-portfolio-planning-types";

export type {
  WorkspacePortfolioDependencyMap,
  WorkspacePortfolioGoal,
  WorkspacePortfolioGoalKind,
  WorkspacePortfolioGoalMetrics,
  WorkspacePortfolioOutcomeKind,
  WorkspacePortfolioOutcomeTrack,
  WorkspacePortfolioOwnerLane,
  WorkspacePortfolioPlanningCenter,
  WorkspacePortfolioPlanningInput,
  WorkspacePortfolioPlanningStatus,
} from "@/features/portfolio/workspace-portfolio-planning-types";

export function createWorkspacePortfolioPlanningCenter(
  input: WorkspacePortfolioPlanningInput,
): WorkspacePortfolioPlanningCenter {
  const now = normalizeDate(input.now);
  const generatedAt = now.toISOString();
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const activeCampaigns = input.campaigns.filter(
    (campaign) => campaign.status !== "complete",
  );
  const campaignProjectIds = new Set(
    activeCampaigns.flatMap((campaign) => getCampaignProjectIds(campaign)),
  );
  const goals = [
    ...activeCampaigns.map((campaign) =>
      createCampaignGoal({
        campaign,
        input,
        now,
      }),
    ),
    ...activeProjects
      .filter((project) => !campaignProjectIds.has(project.id))
      .map((project) => createProjectGoal({ project, input, now })),
  ].sort(compareGoals);
  const dependencyMaps = goals.map((goal) =>
    createDependencyMap({ goal, input }),
  );
  const ownerLanes = createOwnerLanes({
    goals,
    input,
    now,
  });
  const outcomeTracks = goals.map((goal) =>
    createOutcomeTrack({ goal, input }),
  );
  const status = aggregateStatus(goals.map((goal) => goal.status));
  const score = average(
    [
      average(
        goals.map((goal) => goal.healthScore),
        100,
      ),
      average(
        dependencyMaps.map((map) => statusScore(map.status)),
        100,
      ),
      average(
        ownerLanes.map((lane) => lane.score),
        100,
      ),
    ],
    100,
  );

  return {
    generatedAt,
    status,
    score,
    goals,
    ownerLanes,
    dependencyMaps,
    outcomeTracks,
    nextActions: createNextActions({ goals, ownerLanes, dependencyMaps }),
    totals: {
      goals: goals.length,
      ownerLanes: ownerLanes.length,
      dependencyMaps: dependencyMaps.length,
      outcomeTracks: outcomeTracks.length,
      blockedGoals: goals.filter((goal) => goal.status === "blocked").length,
      reviewGoals: goals.filter((goal) => goal.status === "review").length,
      activeCampaigns: activeCampaigns.length,
      activeProjects: activeProjects.length,
      dependencyRisks: goals.reduce(
        (total, goal) => total + goal.metrics.dependencyRisks,
        0,
      ),
      overdueTasks: goals.reduce(
        (total, goal) => total + goal.metrics.overdueTasks,
        0,
      ),
    },
  };
}

function createCampaignGoal(input: {
  campaign: CampaignBoardSummary;
  input: WorkspacePortfolioPlanningInput;
  now: Date;
}): WorkspacePortfolioGoal {
  const projectIds = getCampaignProjectIds(input.campaign);
  const tasks = getOpenTasksForProjects(input.input.reviewTasks, projectIds);
  const overdueTasks = tasks.filter((task) => isTaskOverdue(task, input.now));
  const approvedDeliverables = input.campaign.deliverables.filter(
    (deliverable) => deliverable.approvalStatus === "approved",
  ).length;
  const scheduledDeliverables = countScheduledProjects({
    projectIds,
    input: input.input,
  });
  const dependencyRisks = countDependencyRisks({
    projectIds,
    input: input.input,
  });
  const metrics: WorkspacePortfolioGoalMetrics = {
    projects: projectIds.length,
    deliverables: input.campaign.deliverables.length,
    approvedDeliverables,
    scheduledDeliverables,
    openTasks: tasks.length,
    overdueTasks: overdueTasks.length,
    dependencyRisks,
  };
  const unscheduledDeliverables = Math.max(
    0,
    input.campaign.deliverables.length - scheduledDeliverables,
  );
  const unapprovedDeliverables = Math.max(
    0,
    input.campaign.deliverables.length - approvedDeliverables,
  );
  const healthScore = calculateHealthScore({
    unapprovedDeliverables,
    unscheduledDeliverables,
    overdueTasks: overdueTasks.length,
    dependencyRisks,
  });
  const status = statusFromHealth({
    score: healthScore,
    blocked:
      Boolean(overdueTasks.length) ||
      hasBlockedDependencyRisk({ projectIds, input: input.input }),
  });

  return {
    id: `portfolio-goal-campaign-${input.campaign.id}`,
    kind: "campaign",
    title: input.campaign.name,
    objective: input.campaign.goal || input.campaign.brief,
    ownerName: chooseGoalOwner(tasks),
    status,
    healthScore,
    targetAt: input.campaign.launchAt,
    campaignIds: [input.campaign.id],
    projectIds,
    metrics,
    detail: `${approvedDeliverables}/${input.campaign.deliverables.length} deliverables approved, ${scheduledDeliverables}/${input.campaign.deliverables.length} scheduled, ${tasks.length} open task${tasks.length === 1 ? "" : "s"}, and ${dependencyRisks} dependency risk${dependencyRisks === 1 ? "" : "s"}.`,
  };
}

function createProjectGoal(input: {
  project: ProjectSummary;
  input: WorkspacePortfolioPlanningInput;
  now: Date;
}): WorkspacePortfolioGoal {
  const projectIds = [input.project.id];
  const tasks = getOpenTasksForProjects(input.input.reviewTasks, projectIds);
  const overdueTasks = tasks.filter((task) => isTaskOverdue(task, input.now));
  const dependencyRisks = countDependencyRisks({
    projectIds,
    input: input.input,
  });
  const approvedDeliverables =
    input.project.approvalStatus === "approved" ? 1 : 0;
  const scheduledDeliverables = countScheduledProjects({
    projectIds,
    input: input.input,
  });
  const metrics: WorkspacePortfolioGoalMetrics = {
    projects: 1,
    deliverables: 1,
    approvedDeliverables,
    scheduledDeliverables,
    openTasks: tasks.length,
    overdueTasks: overdueTasks.length,
    dependencyRisks,
  };
  const healthScore = calculateHealthScore({
    unapprovedDeliverables: approvedDeliverables ? 0 : 1,
    unscheduledDeliverables: 0,
    overdueTasks: overdueTasks.length,
    dependencyRisks,
  });
  const status = statusFromHealth({
    score: healthScore,
    blocked:
      Boolean(overdueTasks.length) ||
      hasBlockedDependencyRisk({ projectIds, input: input.input }),
  });

  return {
    id: `portfolio-goal-project-${input.project.id}`,
    kind: "project",
    title: input.project.name,
    objective: "Keep this standalone project ready for portfolio outcomes.",
    ownerName: chooseGoalOwner(tasks),
    status,
    healthScore,
    targetAt: input.project.updatedAt,
    campaignIds: [],
    projectIds,
    metrics,
    detail: `${input.project.name} is ${input.project.approvalStatus} with ${tasks.length} open task${tasks.length === 1 ? "" : "s"} and ${dependencyRisks} dependency risk${dependencyRisks === 1 ? "" : "s"}.`,
  };
}

function createOwnerLanes(input: {
  goals: WorkspacePortfolioGoal[];
  input: WorkspacePortfolioPlanningInput;
  now: Date;
}): WorkspacePortfolioOwnerLane[] {
  const ownerNames = unique([
    ...input.goals.map((goal) => goal.ownerName),
    ...input.input.reviewTasks
      .map((task) => task.taskAssigneeName?.trim())
      .filter((owner): owner is string => Boolean(owner)),
  ]);

  return ownerNames
    .map((ownerName) => {
      const projectIds = unique(
        input.goals
          .filter((goal) => goal.ownerName === ownerName)
          .flatMap((goal) => goal.projectIds),
      );
      const ownedTaskProjects = getProjectIdsForOwner({
        ownerName,
        tasks: input.input.reviewTasks,
      });
      const allProjectIds = unique([...projectIds, ...ownedTaskProjects]);
      const tasks = input.input.reviewTasks.filter(
        (task) =>
          allProjectIds.includes(task.projectId) &&
          !isTaskClosed(task) &&
          ((task.taskAssigneeName ?? "Unassigned").trim() || "Unassigned") ===
            ownerName,
      );
      const overdueTasks = tasks.filter((task) =>
        isTaskOverdue(task, input.now),
      );
      const goalIds = input.goals
        .filter(
          (goal) =>
            goal.ownerName === ownerName ||
            goal.projectIds.some((projectId) =>
              ownedTaskProjects.includes(projectId),
            ),
        )
        .map((goal) => goal.id);
      const inheritedStatus = aggregateStatus(
        input.goals
          .filter((goal) => goalIds.includes(goal.id))
          .map((goal) => goal.status),
      );
      const score = Math.max(
        0,
        100 -
          tasks.length * 10 -
          overdueTasks.length * 25 -
          (inheritedStatus === "blocked"
            ? 15
            : inheritedStatus === "review"
              ? 8
              : 0),
      );
      const status = statusFromHealth({
        score,
        blocked: Boolean(overdueTasks.length),
      });

      return {
        id: `portfolio-owner-${slugify(ownerName)}`,
        ownerName,
        workspaceNames: getWorkspaceNamesForOwner({
          ownerName,
          workspaces: input.input.teamManagement,
        }),
        status,
        score,
        goalIds,
        projectIds: allProjectIds,
        openTasks: tasks.length,
        overdueTasks: overdueTasks.length,
        detail: `${ownerName} owns ${goalIds.length} portfolio goal${goalIds.length === 1 ? "" : "s"} with ${tasks.length} open task${tasks.length === 1 ? "" : "s"}.`,
      };
    })
    .sort(compareOwnerLanes);
}

function createDependencyMap(input: {
  goal: WorkspacePortfolioGoal;
  input: WorkspacePortfolioPlanningInput;
}): WorkspacePortfolioDependencyMap {
  const clusters = getClustersForProjects({
    projectIds: input.goal.projectIds,
    input: input.input,
  });
  const risks = getRisksForProjects({
    projectIds: input.goal.projectIds,
    input: input.input,
  });
  const edges = getEdgesForProjects({
    projectIds: input.goal.projectIds,
    input: input.input,
  });
  const status = aggregateStatus([
    input.goal.status,
    ...clusters.map((cluster) => normalizeDependencyStatus(cluster.status)),
    ...risks.map((risk) => normalizeDependencyStatus(risk.status)),
    ...edges.map((edge) => normalizeDependencyStatus(edge.status)),
  ]);

  return {
    id: `portfolio-dependency-map-${input.goal.id}`,
    goalId: input.goal.id,
    title: `${input.goal.title} dependency map`,
    status,
    nodeCount: clusters.reduce(
      (total, cluster) => total + cluster.nodes.length,
      0,
    ),
    edgeCount: edges.length,
    riskCount: risks.length,
    blockedRiskTitles: risks
      .filter((risk) => risk.status === "blocked")
      .map((risk) => risk.title),
    dependencySummary: `${input.goal.projectIds.length} projects, ${edges.length} edges, and ${risks.length} risks connected to ${input.goal.title}.`,
  };
}

function createOutcomeTrack(input: {
  goal: WorkspacePortfolioGoal;
  input: WorkspacePortfolioPlanningInput;
}): WorkspacePortfolioOutcomeTrack {
  if (input.goal.kind === "campaign") {
    const approved = input.goal.metrics.approvedDeliverables;
    const deliverables = Math.max(1, input.goal.metrics.deliverables);
    const scheduled = input.goal.metrics.scheduledDeliverables;

    return {
      id: `portfolio-outcome-${input.goal.id}`,
      kind: "campaign",
      title: `${input.goal.title} outcome`,
      status: input.goal.status,
      score: input.goal.healthScore,
      targetLabel: `${deliverables} deliverables approved and scheduled`,
      actualLabel: `${approved} approved, ${scheduled} scheduled`,
      progressPercent: Math.round((approved / deliverables) * 100),
      evidence: [
        `${approved}/${deliverables} deliverables approved`,
        `${scheduled}/${deliverables} deliverables scheduled`,
        `${input.goal.metrics.openTasks} open tasks`,
      ],
    };
  }

  const project = input.input.projects.find(
    (item) => item.id === input.goal.projectIds[0],
  );
  const approved = project?.approvalStatus === "approved" ? 1 : 0;

  return {
    id: `portfolio-outcome-${input.goal.id}`,
    kind: "project",
    title: `${input.goal.title} outcome`,
    status: input.goal.status,
    score: input.goal.healthScore,
    targetLabel: "1 project approved with no blocking dependencies",
    actualLabel: `${approved} approved project`,
    progressPercent: approved ? 100 : 50,
    evidence: [
      `${approved}/1 projects approved`,
      `${input.goal.metrics.dependencyRisks} dependency risks`,
      `${input.goal.metrics.openTasks} open tasks`,
    ],
  };
}

function createNextActions(input: {
  goals: WorkspacePortfolioGoal[];
  ownerLanes: WorkspacePortfolioOwnerLane[];
  dependencyMaps: WorkspacePortfolioDependencyMap[];
}) {
  const goalActions = input.goals
    .filter((goal) => goal.status !== "ready")
    .map((goal) => `${goal.title}: ${goal.detail}`);
  const ownerActions = input.ownerLanes
    .filter((lane) => lane.status === "blocked")
    .map(
      (lane) =>
        `${lane.ownerName}: clear ${lane.overdueTasks} overdue portfolio task${lane.overdueTasks === 1 ? "" : "s"}.`,
    );
  const dependencyActions = input.dependencyMaps
    .filter((map) => map.status === "blocked" && map.blockedRiskTitles.length)
    .map(
      (map) =>
        `${map.title}: resolve ${map.blockedRiskTitles.slice(0, 2).join(", ")}.`,
    );

  return unique([...goalActions, ...ownerActions, ...dependencyActions]).slice(
    0,
    6,
  );
}

function getCampaignProjectIds(campaign: CampaignBoardSummary) {
  return unique(
    campaign.deliverables
      .map((deliverable) => deliverable.projectId)
      .filter((projectId): projectId is string => Boolean(projectId)),
  );
}

function getOpenTasksForProjects(
  tasks: ReviewTaskSummary[],
  projectIds: string[],
) {
  return tasks.filter(
    (task) => projectIds.includes(task.projectId) && !isTaskClosed(task),
  );
}

function getProjectIdsForOwner(input: {
  ownerName: string;
  tasks: ReviewTaskSummary[];
}) {
  return unique(
    input.tasks
      .filter(
        (task) =>
          ((task.taskAssigneeName ?? "Unassigned").trim() || "Unassigned") ===
            input.ownerName && !isTaskClosed(task),
      )
      .map((task) => task.projectId),
  );
}

function countScheduledProjects(input: {
  projectIds: string[];
  input: WorkspacePortfolioPlanningInput;
}) {
  const scheduledProjectIds = new Set(
    input.input.contentScheduleItems
      .filter(
        (item) =>
          item.projectId &&
          input.projectIds.includes(item.projectId) &&
          item.status !== "cancelled",
      )
      .map((item) => item.projectId),
  );

  return scheduledProjectIds.size;
}

function countDependencyRisks(input: {
  projectIds: string[];
  input: WorkspacePortfolioPlanningInput;
}) {
  return getRisksForProjects(input).length;
}

function hasBlockedDependencyRisk(input: {
  projectIds: string[];
  input: WorkspacePortfolioPlanningInput;
}) {
  return getRisksForProjects(input).some((risk) => risk.status === "blocked");
}

function getClustersForProjects(input: {
  projectIds: string[];
  input: WorkspacePortfolioPlanningInput;
}) {
  return input.input.projectDependencyGraph.clusters.filter((cluster) =>
    input.projectIds.includes(cluster.projectId),
  );
}

function getRisksForProjects(input: {
  projectIds: string[];
  input: WorkspacePortfolioPlanningInput;
}) {
  return input.input.projectDependencyGraph.risks.filter((risk) =>
    input.projectIds.some((projectId) => risk.nodeId.includes(projectId)),
  );
}

function getEdgesForProjects(input: {
  projectIds: string[];
  input: WorkspacePortfolioPlanningInput;
}) {
  return input.input.projectDependencyGraph.edges.filter((edge) =>
    input.projectIds.some(
      (projectId) =>
        edge.sourceNodeId.includes(projectId) ||
        edge.targetNodeId.includes(projectId),
    ),
  );
}

function chooseGoalOwner(tasks: ReviewTaskSummary[]) {
  const assignedTask = tasks.find((task) => task.taskAssigneeName?.trim());

  return assignedTask?.taskAssigneeName?.trim() || "Unassigned";
}

function getWorkspaceNamesForOwner(input: {
  ownerName: string;
  workspaces: WorkspacePortfolioPlanningInput["teamManagement"];
}) {
  const lowerOwner = input.ownerName.toLowerCase();
  const names = input.workspaces
    .filter((workspace) =>
      workspace.members.some((member) =>
        member.email.toLowerCase().startsWith(lowerOwner.toLowerCase()),
      ),
    )
    .map((workspace) => workspace.name);

  return names.length ? names : ["Unassigned"];
}

function calculateHealthScore(input: {
  unapprovedDeliverables: number;
  unscheduledDeliverables: number;
  overdueTasks: number;
  dependencyRisks: number;
}) {
  return Math.max(
    0,
    100 -
      input.unapprovedDeliverables * 14 -
      input.unscheduledDeliverables * 10 -
      input.overdueTasks * 18 -
      input.dependencyRisks * 12,
  );
}

function statusFromHealth(input: {
  score: number;
  blocked: boolean;
}): WorkspacePortfolioPlanningStatus {
  if (input.blocked || input.score < 55) return "blocked";
  if (input.score < 85) return "review";

  return "ready";
}

function normalizeDependencyStatus(
  status:
    | ProjectDependencyCluster["status"]
    | ProjectDependencyRisk["status"]
    | ProjectDependencyEdge["status"],
): WorkspacePortfolioPlanningStatus {
  return status;
}

function isTaskClosed(task: ReviewTaskSummary) {
  return (
    task.resolved || task.taskStatus === "done" || task.taskStatus === "none"
  );
}

function isTaskOverdue(task: ReviewTaskSummary, now: Date) {
  return Boolean(task.taskDueAt && Date.parse(task.taskDueAt) < now.getTime());
}

function aggregateStatus(
  statuses: WorkspacePortfolioPlanningStatus[],
): WorkspacePortfolioPlanningStatus {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("review")) return "review";

  return "ready";
}

function statusScore(status: WorkspacePortfolioPlanningStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 70;

  return 30;
}

function average(values: number[], fallback: number) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function compareGoals(
  left: WorkspacePortfolioGoal,
  right: WorkspacePortfolioGoal,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    right.metrics.overdueTasks - left.metrics.overdueTasks ||
    right.metrics.dependencyRisks - left.metrics.dependencyRisks ||
    left.title.localeCompare(right.title)
  );
}

function compareOwnerLanes(
  left: WorkspacePortfolioOwnerLane,
  right: WorkspacePortfolioOwnerLane,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    right.overdueTasks - left.overdueTasks ||
    right.openTasks - left.openTasks ||
    left.ownerName.localeCompare(right.ownerName)
  );
}

function statusWeight(status: WorkspacePortfolioPlanningStatus) {
  if (status === "blocked") return 2;
  if (status === "review") return 1;

  return 0;
}

function normalizeDate(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "portfolio"
  );
}
