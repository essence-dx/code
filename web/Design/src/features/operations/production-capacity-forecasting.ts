import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ServerExportJobSummary } from "@/features/editor/server-export-job-model";
import type {
  ProductionCampaignCapacityForecast,
  ProductionCapacityForecastingCenter,
  ProductionCapacityForecastingInput,
  ProductionCapacityForecastingStatus,
  ProductionCapacityQueueForecast,
  ProductionCapacityQueueKind,
  ProductionCapacityRecoveryScenario,
  ProductionCapacityScenarioRecoveryPlan,
  ProductionTeamCapacityForecast,
} from "@/features/operations/production-capacity-forecasting-types";

export type {
  ProductionCampaignCapacityForecast,
  ProductionCapacityForecastingCenter,
  ProductionCapacityForecastingInput,
  ProductionCapacityForecastingStatus,
  ProductionCapacityQueueForecast,
  ProductionCapacityQueueKind,
  ProductionCapacityRecoveryScenario,
  ProductionCapacityScenarioRecoveryPlan,
  ProductionTeamCapacityForecast,
} from "@/features/operations/production-capacity-forecasting-types";

type ScenarioRecoveryPlanDraft = Omit<
  ProductionCapacityScenarioRecoveryPlan,
  "dataUrl" | "json"
>;

export function createProductionCapacityForecastingCenter(
  input: ProductionCapacityForecastingInput,
): ProductionCapacityForecastingCenter {
  const now = normalizeDate(input.now);
  const generatedAt = now.toISOString();
  const activeCampaigns = input.campaigns.filter(
    (campaign) => campaign.status !== "complete",
  );
  const projectCampaignMap = createProjectCampaignMap(activeCampaigns);
  const teamMembers = createUniqueTeamMembers(input.teamManagement);
  const openReviewTasks = input.reviewTasks.filter(isOpenTask);
  const queuedExportJobs = input.serverExportJobs.filter(isOpenExportJob);
  const publishingQueueItems = input.contentScheduleItems.filter(
    (item) => item.status === "planned",
  );
  const availableDailyCapacity = Math.max(0, teamMembers.length * 2);
  const campaignForecasts = activeCampaigns
    .map((campaign) =>
      createCampaignForecast({
        campaign,
        contentScheduleItems: input.contentScheduleItems,
        exportJobs: queuedExportJobs,
        reviewTasks: openReviewTasks,
        availableDailyCapacity,
        now,
      }),
    )
    .sort(compareCampaignForecasts);
  const teamForecasts = createTeamForecasts({
    reviewTasks: openReviewTasks,
    projectCampaignMap,
    teamMembers,
    now,
  });
  const queueForecasts = createQueueForecasts({
    contentScheduleItems: publishingQueueItems,
    exportJobs: queuedExportJobs,
    teamMemberCount: teamMembers.length,
    now,
  });
  const status = aggregateStatus([
    ...campaignForecasts.map((forecast) => forecast.status),
    ...teamForecasts.map((forecast) => forecast.status),
    ...queueForecasts.map((forecast) => forecast.status),
  ]);
  const score = scoreCenter({
    campaignForecasts,
    teamForecasts,
    queueForecasts,
  });
  const scenarioRecoveryPlans = createScenarioRecoveryPlans({
    generatedAt,
    status,
    score,
    campaignForecasts,
    teamForecasts,
    queueForecasts,
    auditLogs: input.auditLogs,
  });
  const nextActions = createNextActions({
    campaignForecasts,
    teamForecasts,
    queueForecasts,
  });

  return {
    generatedAt,
    status,
    score,
    campaignForecasts,
    teamForecasts,
    queueForecasts,
    scenarioRecoveryPlans,
    nextActions,
    totals: {
      campaigns: activeCampaigns.length,
      teamMembers: teamMembers.length,
      pendingInvites: input.teamManagement.reduce(
        (total, workspace) => total + workspace.pendingInvites.length,
        0,
      ),
      reviewTasks: openReviewTasks.length,
      exportQueueItems: queuedExportJobs.length,
      publishingQueueItems: publishingQueueItems.length,
      blockedCampaigns: campaignForecasts.filter(
        (forecast) => forecast.status === "blocked",
      ).length,
      blockedQueues: queueForecasts.filter(
        (forecast) => forecast.status === "blocked",
      ).length,
      scenarioRecoveryPlans: scenarioRecoveryPlans.length,
    },
  };
}

function createCampaignForecast(input: {
  campaign: CampaignBoardSummary;
  contentScheduleItems: ContentScheduleSummary[];
  exportJobs: ServerExportJobSummary[];
  reviewTasks: ReviewTaskSummary[];
  availableDailyCapacity: number;
  now: Date;
}): ProductionCampaignCapacityForecast {
  const projectIds = unique(
    input.campaign.deliverables
      .map((deliverable) => deliverable.projectId)
      .filter((projectId): projectId is string => Boolean(projectId)),
  );
  const projectIdSet = new Set(projectIds);
  const scheduledDeliverables = input.campaign.deliverables.filter(
    (deliverable) =>
      deliverable.projectId &&
      input.contentScheduleItems.some(
        (item) =>
          item.projectId === deliverable.projectId &&
          item.status !== "cancelled",
      ),
  ).length;
  const remainingDeliverables = input.campaign.deliverables.filter(
    (deliverable) => deliverable.status !== "done",
  ).length;
  const unscheduledDeliverables = Math.max(
    0,
    input.campaign.deliverables.length - scheduledDeliverables,
  );
  const approvalBlockers = input.campaign.deliverables.filter(
    (deliverable) => deliverable.approvalStatus !== "approved",
  ).length;
  const openTasks = input.reviewTasks.filter((task) =>
    projectIdSet.has(task.projectId),
  ).length;
  const exportQueueItems = input.exportJobs.filter((job) =>
    projectIdSet.has(job.projectId),
  ).length;
  const daysToLaunch = input.campaign.launchAt
    ? Math.max(
        0,
        Math.ceil(
          (Date.parse(input.campaign.launchAt) - input.now.getTime()) /
            dayMilliseconds,
        ),
      )
    : null;
  const effectiveDays = Math.max(1, daysToLaunch ?? 10);
  const forecastUnits =
    remainingDeliverables +
    unscheduledDeliverables +
    approvalBlockers +
    openTasks +
    exportQueueItems;
  const requiredDailyCapacity =
    Math.round((forecastUnits / effectiveDays) * 10) / 10;
  const capacityUsedPercent = Math.round(
    (requiredDailyCapacity / Math.max(0.1, input.availableDailyCapacity)) * 100,
  );
  const blocked =
    (!input.availableDailyCapacity && forecastUnits > 0) ||
    capacityUsedPercent > 100 ||
    (daysToLaunch !== null &&
      daysToLaunch <= 2 &&
      (approvalBlockers > 0 ||
        unscheduledDeliverables > 0 ||
        exportQueueItems > 0));
  const status: ProductionCapacityForecastingStatus = blocked
    ? "blocked"
    : forecastUnits > 0
      ? "review"
      : "ready";

  return {
    id: `campaign-capacity-${input.campaign.id}`,
    campaignId: input.campaign.id,
    campaignName: input.campaign.name,
    status,
    score: Math.max(
      0,
      Math.min(
        100,
        100 -
          Math.max(0, capacityUsedPercent - 100) -
          approvalBlockers * 8 -
          unscheduledDeliverables * 6 -
          exportQueueItems * 5,
      ),
    ),
    launchAt: input.campaign.launchAt,
    daysToLaunch,
    deliverables: input.campaign.deliverables.length,
    remainingDeliverables,
    scheduledDeliverables,
    unscheduledDeliverables,
    approvalBlockers,
    openTasks,
    exportQueueItems,
    availableDailyCapacity: input.availableDailyCapacity,
    requiredDailyCapacity,
    capacityUsedPercent,
    affectedProjectIds: projectIds,
    detail: `${input.campaign.name} needs ${requiredDailyCapacity.toLocaleString()} production unit${requiredDailyCapacity === 1 ? "" : "s"} per day across ${effectiveDays} day${effectiveDays === 1 ? "" : "s"}.`,
  };
}

function createTeamForecasts(input: {
  reviewTasks: ReviewTaskSummary[];
  projectCampaignMap: Map<string, string[]>;
  teamMembers: TeamWorkspaceManagementSummary["members"];
  now: Date;
}): ProductionTeamCapacityForecast[] {
  const grouped = groupBy(
    input.reviewTasks,
    (task) => task.taskAssigneeName?.trim() || "Unassigned",
  );
  const forecasts = Array.from(grouped.entries()).map(([ownerName, tasks]) => {
    const overdueTasks = tasks.filter((task) =>
      isTaskOverdue(task, input.now),
    ).length;
    const campaignIds = unique(
      tasks.flatMap(
        (task) => input.projectCampaignMap.get(task.projectId) ?? [],
      ),
    );
    const forecastUnits = tasks.length + overdueTasks * 2;
    const capacityUnits = ownerName === "Unassigned" ? 0 : 3;
    const pressurePercent = Math.round(
      (forecastUnits / Math.max(0.1, capacityUnits)) * 100,
    );
    const status: ProductionCapacityForecastingStatus =
      ownerName === "Unassigned" || overdueTasks > 0 || pressurePercent > 100
        ? "blocked"
        : pressurePercent > 80
          ? "review"
          : "ready";

    return {
      id: `team-capacity-${slugify(ownerName)}`,
      ownerName,
      status,
      assignedTasks: tasks.length,
      overdueTasks,
      campaignIds,
      forecastUnits,
      capacityUnits,
      pressurePercent,
      detail: `${ownerName} has ${tasks.length} open review task${tasks.length === 1 ? "" : "s"} across ${campaignIds.length} campaign${campaignIds.length === 1 ? "" : "s"}.`,
    };
  });
  const memberIds = new Set(
    forecasts.map((forecast) => forecast.ownerName.toLowerCase()),
  );
  const idleMembers = input.teamMembers
    .filter((member) => !memberIds.has(member.email.toLowerCase()))
    .map(
      (member): ProductionTeamCapacityForecast => ({
        id: `team-capacity-${slugify(member.email)}`,
        ownerName: member.email,
        status: "ready",
        assignedTasks: 0,
        overdueTasks: 0,
        campaignIds: [],
        forecastUnits: 0,
        capacityUnits: 3,
        pressurePercent: 0,
        detail: `${member.email} has no assigned production review load.`,
      }),
    );

  return [...forecasts, ...idleMembers].sort(compareTeamForecasts).slice(0, 12);
}

function createQueueForecasts(input: {
  contentScheduleItems: ContentScheduleSummary[];
  exportJobs: ServerExportJobSummary[];
  teamMemberCount: number;
  now: Date;
}): ProductionCapacityQueueForecast[] {
  const teamDivisor = Math.max(1, input.teamMemberCount);
  const activeExportJobs = input.exportJobs.filter(
    (job) => job.status === "queued" || job.status === "running",
  );
  const failedExportJobs = input.exportJobs.filter(
    (job) => job.status === "failed",
  );
  const exportQueue: ProductionCapacityQueueForecast = {
    id: "capacity-queue-exports",
    kind: "exports",
    label: "Export queue",
    status: failedExportJobs.length
      ? "blocked"
      : activeExportJobs.length > teamDivisor * 4
        ? "review"
        : "ready",
    totalItems: input.exportJobs.length,
    activeItems: activeExportJobs.length,
    blockedItems: failedExportJobs.length,
    pressurePercent: Math.round(
      ((activeExportJobs.length + failedExportJobs.length * 2) /
        Math.max(1, teamDivisor * 2)) *
        100,
    ),
    estimatedClearHours:
      Math.round(
        ((activeExportJobs.length * 1.5 + failedExportJobs.length * 3) /
          teamDivisor) *
          10,
      ) / 10,
    channels: unique(input.exportJobs.map((job) => job.formatLabel)),
    recoverySteps: createExportRecoverySteps({
      activeItems: activeExportJobs.length,
      failedItems: failedExportJobs.length,
    }),
    detail: `${activeExportJobs.length} exports are active and ${failedExportJobs.length} failed export${failedExportJobs.length === 1 ? "" : "s"} need recovery.`,
  };
  const overduePublishingItems = input.contentScheduleItems.filter(
    (item) => Date.parse(item.scheduledAt) < input.now.getTime(),
  );
  const publishingQueue: ProductionCapacityQueueForecast = {
    id: "capacity-queue-publishing",
    kind: "publishing",
    label: "Publishing queue",
    status: overduePublishingItems.length
      ? "blocked"
      : input.contentScheduleItems.length > teamDivisor * 6
        ? "review"
        : "ready",
    totalItems: input.contentScheduleItems.length,
    activeItems: input.contentScheduleItems.length,
    blockedItems: overduePublishingItems.length,
    pressurePercent: Math.round(
      ((input.contentScheduleItems.length + overduePublishingItems.length * 2) /
        Math.max(1, teamDivisor * 4)) *
        100,
    ),
    estimatedClearHours:
      Math.round(
        ((input.contentScheduleItems.length * 0.75 +
          overduePublishingItems.length * 2) /
          teamDivisor) *
          10,
      ) / 10,
    channels: unique(input.contentScheduleItems.map((item) => item.channel)),
    recoverySteps: createPublishingRecoverySteps({
      activeItems: input.contentScheduleItems.length,
      overdueItems: overduePublishingItems.length,
    }),
    detail: `${input.contentScheduleItems.length} planned publishes are queued and ${overduePublishingItems.length} are overdue.`,
  };

  return [exportQueue, publishingQueue].sort(compareQueueForecasts);
}

function createScenarioRecoveryPlans(input: {
  generatedAt: string;
  status: ProductionCapacityForecastingStatus;
  score: number;
  campaignForecasts: ProductionCampaignCapacityForecast[];
  teamForecasts: ProductionTeamCapacityForecast[];
  queueForecasts: ProductionCapacityQueueForecast[];
  auditLogs: WorkspaceAuditLogSummary[];
}): ProductionCapacityScenarioRecoveryPlan[] {
  const plans = [
    createDeadlineCompressionPlan(input),
    createQueuePlan({
      ...input,
      queueKind: "exports",
      scenario: "export-backlog",
      title: "Export backlog recovery",
    }),
    createQueuePlan({
      ...input,
      queueKind: "publishing",
      scenario: "publishing-slip",
      title: "Publishing queue recovery",
    }),
  ].filter((plan): plan is ScenarioRecoveryPlanDraft => Boolean(plan));

  return plans.map((plan) => {
    const payload = {
      kind: "essence-studio.production-capacity-forecasting",
      schemaVersion: 1,
      generatedAt: input.generatedAt,
      status: input.status,
      score: input.score,
      scenarioRecoveryPlanIds: plans.map((item) => item.id),
      plan: {
        id: plan.id,
        scenario: plan.scenario,
        title: plan.title,
        status: plan.status,
        affectedCampaignIds: plan.affectedCampaignIds,
        affectedQueueKinds: plan.affectedQueueKinds,
        auditEvidenceIds: plan.auditEvidenceIds,
        steps: plan.steps,
      },
    };
    const json = JSON.stringify(payload, null, 2);

    return {
      ...plan,
      json,
      dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    };
  });
}

function createDeadlineCompressionPlan(input: {
  generatedAt: string;
  campaignForecasts: ProductionCampaignCapacityForecast[];
  teamForecasts: ProductionTeamCapacityForecast[];
  auditLogs: WorkspaceAuditLogSummary[];
}): ScenarioRecoveryPlanDraft | null {
  const riskyCampaigns = input.campaignForecasts.filter(
    (forecast) =>
      forecast.status !== "ready" &&
      (forecast.daysToLaunch === null || forecast.daysToLaunch <= 7),
  );

  if (!riskyCampaigns.length) return null;

  const blockedTeam = input.teamForecasts.filter(
    (forecast) => forecast.status === "blocked",
  );
  const auditEvidenceIds = matchAuditEvidence(input.auditLogs, [
    ...riskyCampaigns.map((forecast) => forecast.campaignId),
    ...riskyCampaigns.flatMap((forecast) => forecast.affectedProjectIds),
  ]);

  return {
    id: "scenario-deadline-compression",
    scenario: "deadline-compression" as const,
    title: "Deadline compression recovery",
    status: aggregateStatus([
      ...riskyCampaigns.map((forecast) => forecast.status),
      ...blockedTeam.map((forecast) => forecast.status),
    ]),
    affectedCampaignIds: riskyCampaigns.map((forecast) => forecast.campaignId),
    affectedQueueKinds: [
      "exports",
      "publishing",
    ] as ProductionCapacityQueueKind[],
    auditEvidenceIds,
    steps: unique([
      ...riskyCampaigns.map(
        (forecast) =>
          `${forecast.campaignName}: reduce ${forecast.capacityUsedPercent}% capacity pressure by scheduling ${forecast.unscheduledDeliverables} missing deliverable${forecast.unscheduledDeliverables === 1 ? "" : "s"} and clearing ${forecast.approvalBlockers} approval blocker${forecast.approvalBlockers === 1 ? "" : "s"}.`,
      ),
      ...blockedTeam.map(
        (forecast) =>
          `Rebalance ${forecast.ownerName} from ${forecast.forecastUnits} forecast units to backup owners before launch.`,
      ),
      "Freeze low-priority creative changes until queue pressure returns below 80%.",
    ]),
    fileName: `production-capacity-${slugify("deadline-compression")}.json`,
  };
}

function createQueuePlan(input: {
  generatedAt: string;
  queueForecasts: ProductionCapacityQueueForecast[];
  campaignForecasts: ProductionCampaignCapacityForecast[];
  auditLogs: WorkspaceAuditLogSummary[];
  queueKind: ProductionCapacityQueueKind;
  scenario: ProductionCapacityRecoveryScenario;
  title: string;
}): ScenarioRecoveryPlanDraft | null {
  const queue = input.queueForecasts.find(
    (forecast) => forecast.kind === input.queueKind,
  );

  if (!queue || queue.status === "ready") return null;

  const affectedCampaigns = input.campaignForecasts.filter(
    (forecast) => forecast.status !== "ready",
  );

  return {
    id: `scenario-${input.scenario}`,
    scenario: input.scenario,
    title: input.title,
    status: queue.status,
    affectedCampaignIds: affectedCampaigns.map(
      (forecast) => forecast.campaignId,
    ),
    affectedQueueKinds: [input.queueKind],
    auditEvidenceIds: matchAuditEvidence(input.auditLogs, [
      queue.id,
      ...affectedCampaigns.map((forecast) => forecast.campaignId),
      ...affectedCampaigns.flatMap((forecast) => forecast.affectedProjectIds),
    ]),
    steps: queue.recoverySteps,
    fileName: `production-capacity-${slugify(input.scenario)}.json`,
  };
}

function createNextActions(input: {
  campaignForecasts: ProductionCampaignCapacityForecast[];
  teamForecasts: ProductionTeamCapacityForecast[];
  queueForecasts: ProductionCapacityQueueForecast[];
}) {
  return unique([
    ...input.campaignForecasts
      .filter((forecast) => forecast.status !== "ready")
      .map(
        (forecast) =>
          `${forecast.campaignName}: bring capacity pressure down from ${forecast.capacityUsedPercent}% before launch.`,
      ),
    ...input.teamForecasts
      .filter((forecast) => forecast.status === "blocked")
      .map(
        (forecast) =>
          `Reassign or split ${forecast.ownerName}'s ${forecast.forecastUnits} forecast units.`,
      ),
    ...input.queueForecasts
      .filter((forecast) => forecast.status !== "ready")
      .map((forecast) => `${forecast.label}: ${forecast.recoverySteps[0]}`),
  ]).slice(0, 6);
}

function createExportRecoverySteps(input: {
  activeItems: number;
  failedItems: number;
}) {
  return unique(
    [
      input.failedItems
        ? `Retry failed exports and attach failure diagnostics for ${input.failedItems} job${input.failedItems === 1 ? "" : "s"}.`
        : null,
      input.activeItems
        ? `Reserve export worker time for ${input.activeItems} active job${input.activeItems === 1 ? "" : "s"}.`
        : null,
      "Pause non-launch export requests until the active queue clears.",
    ].filter((step): step is string => Boolean(step)),
  );
}

function createPublishingRecoverySteps(input: {
  activeItems: number;
  overdueItems: number;
}) {
  return unique(
    [
      input.overdueItems
        ? `Reschedule overdue publishing item${input.overdueItems === 1 ? "" : "s"} before approving new launches.`
        : null,
      input.activeItems
        ? `Confirm captions, links, and channel owners for ${input.activeItems} planned publish${input.activeItems === 1 ? "" : "es"}.`
        : null,
      "Move low-priority planned posts out of the launch window if pressure remains high.",
    ].filter((step): step is string => Boolean(step)),
  );
}

function createProjectCampaignMap(campaigns: CampaignBoardSummary[]) {
  const map = new Map<string, string[]>();

  for (const campaign of campaigns) {
    for (const deliverable of campaign.deliverables) {
      if (!deliverable.projectId) continue;
      map.set(deliverable.projectId, [
        ...(map.get(deliverable.projectId) ?? []),
        campaign.id,
      ]);
    }
  }

  return map;
}

function createUniqueTeamMembers(workspaces: TeamWorkspaceManagementSummary[]) {
  const members = new Map<
    string,
    TeamWorkspaceManagementSummary["members"][number]
  >();

  for (const workspace of workspaces) {
    for (const member of workspace.members) {
      members.set(member.userId, member);
    }
  }

  return Array.from(members.values());
}

function matchAuditEvidence(
  auditLogs: WorkspaceAuditLogSummary[],
  ids: string[],
) {
  const idSet = new Set(ids.filter(Boolean));

  return auditLogs
    .filter((log) => {
      if (log.targetId && idSet.has(log.targetId)) return true;

      return Object.values(log.metadata).some(
        (value) => typeof value === "string" && idSet.has(value),
      );
    })
    .map((log) => log.id);
}

function scoreCenter(input: {
  campaignForecasts: ProductionCampaignCapacityForecast[];
  teamForecasts: ProductionTeamCapacityForecast[];
  queueForecasts: ProductionCapacityQueueForecast[];
}) {
  const statuses = [
    ...input.campaignForecasts.map((forecast) => forecast.status),
    ...input.teamForecasts.map((forecast) => forecast.status),
    ...input.queueForecasts.map((forecast) => forecast.status),
  ];

  if (!statuses.length) return 100;

  const blocked = statuses.filter((status) => status === "blocked").length;
  const review = statuses.filter((status) => status === "review").length;

  return Math.max(0, Math.min(100, 100 - blocked * 16 - review * 7));
}

function aggregateStatus(statuses: ProductionCapacityForecastingStatus[]) {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("review")) return "review";

  return "ready";
}

function compareCampaignForecasts(
  left: ProductionCampaignCapacityForecast,
  right: ProductionCampaignCapacityForecast,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    right.capacityUsedPercent - left.capacityUsedPercent ||
    (left.daysToLaunch ?? 999) - (right.daysToLaunch ?? 999) ||
    left.campaignName.localeCompare(right.campaignName)
  );
}

function compareTeamForecasts(
  left: ProductionTeamCapacityForecast,
  right: ProductionTeamCapacityForecast,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    right.forecastUnits - left.forecastUnits ||
    left.ownerName.localeCompare(right.ownerName)
  );
}

function compareQueueForecasts(
  left: ProductionCapacityQueueForecast,
  right: ProductionCapacityQueueForecast,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    right.pressurePercent - left.pressurePercent ||
    left.label.localeCompare(right.label)
  );
}

function statusWeight(status: ProductionCapacityForecastingStatus) {
  if (status === "blocked") return 2;
  if (status === "review") return 1;

  return 0;
}

function isOpenTask(task: ReviewTaskSummary) {
  return (
    !task.resolved && task.taskStatus !== "done" && task.taskStatus !== "none"
  );
}

function isOpenExportJob(job: ServerExportJobSummary) {
  return (
    job.status === "queued" ||
    job.status === "running" ||
    job.status === "failed"
  );
}

function isTaskOverdue(task: ReviewTaskSummary, now: Date) {
  return Boolean(
    task.taskDueAt &&
    Date.parse(task.taskDueAt) < now.getTime() &&
    task.taskStatus !== "done",
  );
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const key = getKey(item);
    grouped.set(key, [...(grouped.get(key) ?? []), item]);
  }

  return grouped;
}

function normalizeDate(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "capacity"
  );
}

const dayMilliseconds = 24 * 60 * 60 * 1000;
