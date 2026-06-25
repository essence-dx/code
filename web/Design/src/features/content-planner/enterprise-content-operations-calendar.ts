import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type {
  EnterpriseCampaignCapacityPlan,
  EnterpriseContentDependencyBlocker,
  EnterpriseContentDependencyHeatmapCell,
  EnterpriseContentOperationsCalendarCenter,
  EnterpriseContentOperationsCalendarInput,
  EnterpriseContentOperationsStatus,
  EnterpriseContentRecoveryPlaybook,
  EnterpriseContentStaffingSignal,
} from "@/features/content-planner/enterprise-content-operations-calendar-types";

export type {
  EnterpriseCampaignCapacityPlan,
  EnterpriseContentDependencyBlocker,
  EnterpriseContentDependencyHeatmapCell,
  EnterpriseContentOperationsCalendarCenter,
  EnterpriseContentOperationsCalendarInput,
  EnterpriseContentOperationsStatus,
  EnterpriseContentRecoveryPlaybook,
  EnterpriseContentStaffingSignal,
  EnterpriseContentStaffingSignalKind,
} from "@/features/content-planner/enterprise-content-operations-calendar-types";

export function createEnterpriseContentOperationsCalendar(
  input: EnterpriseContentOperationsCalendarInput,
): EnterpriseContentOperationsCalendarCenter {
  const now = normalizeDate(input.now);
  const generatedAt = now.toISOString();
  const activeCampaigns = input.campaigns.filter(
    (campaign) => campaign.status !== "complete",
  );
  const activeCampaignProjectIds = createCampaignProjectIdSet(activeCampaigns);
  const teamMembers = createUniqueTeamMembers(input.teamManagement);
  const capacityPlans = activeCampaigns
    .map((campaign) =>
      createCapacityPlan({
        campaign,
        contentScheduleItems: input.contentScheduleItems,
        teamMemberCount: teamMembers.length,
        now,
      }),
    )
    .sort(compareCapacityPlans);
  const dependencyHeatmap = activeCampaigns
    .flatMap((campaign) =>
      createDependencyHeatmap({
        campaign,
        contentScheduleItems: input.contentScheduleItems,
        reviewTasks: input.reviewTasks,
      }),
    )
    .sort(compareHeatmapCells);
  const staffingSignals = createStaffingSignals({
    campaigns: activeCampaigns,
    reviewTasks: input.reviewTasks,
    teamManagement: input.teamManagement,
    now,
  });
  const recoveryPlaybooks = activeCampaigns
    .map((campaign) =>
      createRecoveryPlaybook({
        campaign,
        capacityPlan: capacityPlans.find(
          (plan) => plan.campaignId === campaign.id,
        )!,
        dependencyHeatmap: dependencyHeatmap.filter(
          (cell) => cell.campaignId === campaign.id,
        ),
        staffingSignals,
        generatedAt,
        auditLogIds: input.auditLogs
          .filter(
            (log) =>
              log.targetId === campaign.id ||
              stringOrNull(log.metadata.campaignId) === campaign.id,
          )
          .map((log) => log.id),
      }),
    )
    .filter((playbook): playbook is EnterpriseContentRecoveryPlaybook =>
      Boolean(playbook),
    )
    .sort(comparePlaybooks);
  const status = aggregateStatus([
    ...capacityPlans.map((plan) => plan.status),
    ...dependencyHeatmap.map((cell) => cell.status),
    ...staffingSignals.map((signal) => signal.status),
  ]);
  const score = average(
    [
      average(
        capacityPlans.map((plan) => plan.score),
        100,
      ),
      average(
        dependencyHeatmap.map((cell) => statusScore(cell.status)),
        100,
      ),
      average(
        staffingSignals.map((signal) => signal.workloadScore),
        100,
      ),
    ],
    100,
  );

  return {
    generatedAt,
    status,
    score,
    capacityPlans,
    dependencyHeatmap,
    staffingSignals,
    recoveryPlaybooks,
    nextActions: createNextActions({
      capacityPlans,
      dependencyHeatmap,
      staffingSignals,
    }),
    totals: {
      campaigns: activeCampaigns.length,
      deliverables: activeCampaigns.reduce(
        (total, campaign) => total + campaign.deliverables.length,
        0,
      ),
      scheduledItems: input.contentScheduleItems.filter(
        (item) =>
          item.projectId &&
          activeCampaignProjectIds.has(item.projectId) &&
          item.status !== "cancelled",
      ).length,
      capacityPlans: capacityPlans.length,
      dependencyHeatmapCells: dependencyHeatmap.length,
      staffingSignals: staffingSignals.length,
      recoveryPlaybooks: recoveryPlaybooks.length,
      blockedCampaigns: capacityPlans.filter(
        (plan) => plan.status === "blocked",
      ).length,
      teamMembers: teamMembers.length,
      publicationGaps: capacityPlans.reduce(
        (total, plan) => total + plan.unscheduledDeliverables,
        0,
      ),
    },
  };
}

function createCapacityPlan(input: {
  campaign: CampaignBoardSummary;
  contentScheduleItems: ContentScheduleSummary[];
  teamMemberCount: number;
  now: Date;
}): EnterpriseCampaignCapacityPlan {
  const deliverables = input.campaign.deliverables;
  const scheduledDeliverables = countScheduledDeliverables({
    campaign: input.campaign,
    contentScheduleItems: input.contentScheduleItems,
  });
  const unscheduledDeliverables = Math.max(
    0,
    deliverables.length - scheduledDeliverables,
  );
  const daysToLaunch = input.campaign.launchAt
    ? Math.max(
        0,
        Math.ceil(
          (Date.parse(input.campaign.launchAt) - input.now.getTime()) /
            dayMilliseconds,
        ),
      )
    : null;
  const effectiveDays = Math.max(1, daysToLaunch ?? 7);
  const availableTeamMembers = input.teamMemberCount;
  const requiredDailyThroughput =
    Math.round((unscheduledDeliverables / effectiveDays) * 10) / 10;
  const dailyCapacity = availableTeamMembers * 0.5;
  const capacityUsedPercent = Math.round(
    (requiredDailyThroughput / Math.max(0.1, dailyCapacity)) * 100,
  );
  const status: EnterpriseContentOperationsStatus =
    !availableTeamMembers && unscheduledDeliverables
      ? "blocked"
      : daysToLaunch !== null && daysToLaunch <= 1 && unscheduledDeliverables
        ? "blocked"
        : capacityUsedPercent > 100
          ? "blocked"
          : unscheduledDeliverables
            ? "review"
            : "ready";
  const score = Math.max(
    0,
    Math.min(
      100,
      100 -
        unscheduledDeliverables * 12 -
        (status === "blocked" ? 20 : status === "review" ? 8 : 0),
    ),
  );

  return {
    id: `capacity-${input.campaign.id}`,
    campaignId: input.campaign.id,
    campaignName: input.campaign.name,
    status,
    score,
    launchAt: input.campaign.launchAt,
    daysToLaunch,
    deliverables: deliverables.length,
    scheduledDeliverables,
    unscheduledDeliverables,
    availableTeamMembers,
    requiredDailyThroughput,
    capacityUsedPercent,
    detail: `${unscheduledDeliverables} unscheduled deliverable${unscheduledDeliverables === 1 ? "" : "s"} across ${effectiveDays} day${effectiveDays === 1 ? "" : "s"} with ${availableTeamMembers} available team member${availableTeamMembers === 1 ? "" : "s"}.`,
  };
}

function createDependencyHeatmap(input: {
  campaign: CampaignBoardSummary;
  contentScheduleItems: ContentScheduleSummary[];
  reviewTasks: ReviewTaskSummary[];
}): EnterpriseContentDependencyHeatmapCell[] {
  const deliverablesByChannel = groupBy(input.campaign.deliverables, (item) =>
    normalizeChannel(item.channel),
  );

  return Array.from(deliverablesByChannel.entries()).map(
    ([channel, deliverables]) => {
      const projectIds = new Set(
        deliverables
          .map((deliverable) => deliverable.projectId)
          .filter((projectId): projectId is string => Boolean(projectId)),
      );
      const scheduledDeliverables = deliverables.filter(
        (deliverable) =>
          deliverable.projectId &&
          input.contentScheduleItems.some(
            (item) =>
              item.projectId === deliverable.projectId &&
              item.status !== "cancelled",
          ),
      ).length;
      const approvedDeliverables = deliverables.filter(
        (deliverable) => deliverable.approvalStatus === "approved",
      ).length;
      const openTasks = input.reviewTasks.filter(
        (task) =>
          projectIds.has(task.projectId) &&
          !task.resolved &&
          task.taskStatus !== "done" &&
          task.taskStatus !== "none",
      ).length;
      const blockers: EnterpriseContentDependencyBlocker[] = [
        ...(approvedDeliverables < deliverables.length
          ? (["approval"] as const)
          : []),
        ...(scheduledDeliverables < deliverables.length
          ? (["schedule"] as const)
          : []),
        ...(openTasks ? (["tasks"] as const) : []),
      ];
      const status = blockers.includes("approval")
        ? "blocked"
        : blockers.length
          ? "review"
          : "ready";

      return {
        id: `heatmap-${input.campaign.id}-${slugify(channel)}`,
        campaignId: input.campaign.id,
        campaignName: input.campaign.name,
        channel,
        status,
        deliverables: deliverables.length,
        scheduledDeliverables,
        approvedDeliverables,
        openTasks,
        blockers,
        detail: `${channel} has ${scheduledDeliverables}/${deliverables.length} scheduled, ${approvedDeliverables}/${deliverables.length} approved, and ${openTasks} open task${openTasks === 1 ? "" : "s"}.`,
      };
    },
  );
}

function createStaffingSignals(input: {
  campaigns: CampaignBoardSummary[];
  reviewTasks: ReviewTaskSummary[];
  teamManagement: TeamWorkspaceManagementSummary[];
  now: Date;
}): EnterpriseContentStaffingSignal[] {
  const activeProjectCampaigns = createProjectCampaignMap(input.campaigns);
  const openTasks = input.reviewTasks.filter(
    (task) =>
      !task.resolved &&
      task.taskStatus !== "done" &&
      task.taskStatus !== "none" &&
      activeProjectCampaigns.has(task.projectId),
  );
  const byOwner = groupBy(
    openTasks,
    (task) => (task.taskAssigneeName ?? "Unassigned").trim() || "Unassigned",
  );
  const assignmentSignals = Array.from(byOwner.entries()).map(
    ([ownerName, tasks]) => {
      const overdueTasks = tasks.filter((task) =>
        isTaskOverdue(task, input.now),
      ).length;
      const campaignIds = unique(
        tasks.flatMap(
          (task) => activeProjectCampaigns.get(task.projectId) ?? [],
        ),
      );
      const status: EnterpriseContentOperationsStatus =
        ownerName === "Unassigned" || overdueTasks
          ? "blocked"
          : tasks.length > 3
            ? "review"
            : "ready";
      const workloadScore = Math.max(
        0,
        100 - tasks.length * 14 - overdueTasks * 22,
      );

      return {
        id: `staffing-${slugify(ownerName)}`,
        kind:
          ownerName === "Unassigned"
            ? ("unassigned-work" as const)
            : ("assignee-load" as const),
        ownerName,
        status,
        assignedTasks: tasks.length,
        overdueTasks,
        campaignIds,
        workloadScore,
        detail: `${ownerName} owns ${tasks.length} open campaign task${tasks.length === 1 ? "" : "s"} across ${campaignIds.length} campaign${campaignIds.length === 1 ? "" : "s"}.`,
      };
    },
  );
  const inviteSignals = input.teamManagement.flatMap((workspace) =>
    workspace.pendingInvites.map(
      (invite): EnterpriseContentStaffingSignal => ({
        id: `staffing-invite-${invite.id}`,
        kind: "pending-invite",
        ownerName: invite.email,
        status: "review",
        assignedTasks: 0,
        overdueTasks: 0,
        campaignIds: input.campaigns.map((campaign) => campaign.id),
        workloadScore: 70,
        detail: `${invite.email} is invited as ${invite.role} for ${workspace.name}; accept before moving urgent content work to them.`,
      }),
    ),
  );

  return [...assignmentSignals, ...inviteSignals].sort(compareStaffingSignals);
}

function createRecoveryPlaybook(input: {
  campaign: CampaignBoardSummary;
  capacityPlan: EnterpriseCampaignCapacityPlan;
  dependencyHeatmap: EnterpriseContentDependencyHeatmapCell[];
  staffingSignals: EnterpriseContentStaffingSignal[];
  generatedAt: string;
  auditLogIds: string[];
}): EnterpriseContentRecoveryPlaybook | null {
  const blockers = unique(
    input.dependencyHeatmap.flatMap((cell) => cell.blockers),
  );
  const relevantStaffingSignals = input.staffingSignals.filter((signal) =>
    signal.campaignIds.includes(input.campaign.id),
  );
  const status = aggregateStatus([
    input.capacityPlan.status,
    ...input.dependencyHeatmap.map((cell) => cell.status),
    ...relevantStaffingSignals.map((signal) => signal.status),
  ]);

  if (status === "ready") return null;

  const steps = unique([
    input.capacityPlan.unscheduledDeliverables
      ? `Schedule ${input.capacityPlan.unscheduledDeliverables} remaining deliverable${input.capacityPlan.unscheduledDeliverables === 1 ? "" : "s"} before ${input.campaign.launchAt ?? "launch"}.`
      : "Keep the publishing calendar locked through launch.",
    ...input.dependencyHeatmap
      .filter((cell) => cell.status !== "ready")
      .map((cell) => `Clear ${cell.channel}: ${cell.detail}`),
    ...relevantStaffingSignals
      .filter((signal) => signal.status !== "ready")
      .map((signal) => signal.detail),
    "Download this playbook and attach it to the launch room before escalation.",
  ]);
  const payload = {
    kind: "essence-studio.enterprise-content-operations-calendar",
    schemaVersion: 1,
    generatedAt: input.generatedAt,
    campaign: {
      id: input.campaign.id,
      name: input.campaign.name,
      launchAt: input.campaign.launchAt,
      status: input.campaign.status,
    },
    capacityPlan: input.capacityPlan,
    dependencyHeatmap: input.dependencyHeatmap,
    staffingSignals: relevantStaffingSignals,
    blockers,
    auditLogIds: input.auditLogIds,
    steps,
  };
  const json = JSON.stringify(payload, null, 2);

  return {
    id: `content-ops-playbook-${input.campaign.id}`,
    campaignId: input.campaign.id,
    campaignName: input.campaign.name,
    status,
    fileName: `content-ops-playbook-${slugify(input.campaign.name)}.json`,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
    json,
    steps,
    blockers,
  };
}

function createNextActions(input: {
  capacityPlans: EnterpriseCampaignCapacityPlan[];
  dependencyHeatmap: EnterpriseContentDependencyHeatmapCell[];
  staffingSignals: EnterpriseContentStaffingSignal[];
}) {
  const capacityActions = input.capacityPlans
    .filter((plan) => plan.status !== "ready")
    .map(
      (plan) =>
        `${plan.campaignName}: schedule ${plan.unscheduledDeliverables} content deliverable${plan.unscheduledDeliverables === 1 ? "" : "s"} across the next ${Math.max(1, plan.daysToLaunch ?? 7)} day${Math.max(1, plan.daysToLaunch ?? 7) === 1 ? "" : "s"}.`,
    );
  const dependencyActions = input.dependencyHeatmap
    .filter((cell) => cell.status === "blocked")
    .map((cell) => `${cell.campaignName} ${cell.channel}: ${cell.detail}`);
  const staffingActions = input.staffingSignals
    .filter((signal) => signal.status === "blocked")
    .map((signal) => signal.detail);
  const actions = [
    ...capacityActions,
    ...dependencyActions,
    ...staffingActions,
  ];

  return actions.length
    ? unique(actions).slice(0, 6)
    : ["Enterprise content operations calendar is clear for launch work."];
}

function countScheduledDeliverables(input: {
  campaign: CampaignBoardSummary;
  contentScheduleItems: ContentScheduleSummary[];
}) {
  return input.campaign.deliverables.filter(
    (deliverable) =>
      deliverable.projectId &&
      input.contentScheduleItems.some(
        (item) =>
          item.projectId === deliverable.projectId &&
          item.status !== "cancelled",
      ),
  ).length;
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

function createCampaignProjectIdSet(campaigns: CampaignBoardSummary[]) {
  return new Set(
    campaigns.flatMap((campaign) =>
      campaign.deliverables
        .map((deliverable) => deliverable.projectId)
        .filter((projectId): projectId is string => Boolean(projectId)),
    ),
  );
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

function normalizeChannel(value: string) {
  return value.trim() || "General";
}

function aggregateStatus(statuses: EnterpriseContentOperationsStatus[]) {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("review")) return "review";

  return "ready";
}

function statusScore(status: EnterpriseContentOperationsStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 65;

  return 15;
}

function average(values: number[], fallback: number) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function compareCapacityPlans(
  left: EnterpriseCampaignCapacityPlan,
  right: EnterpriseCampaignCapacityPlan,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    right.unscheduledDeliverables - left.unscheduledDeliverables ||
    (left.daysToLaunch ?? 999) - (right.daysToLaunch ?? 999) ||
    left.campaignName.localeCompare(right.campaignName)
  );
}

function compareHeatmapCells(
  left: EnterpriseContentDependencyHeatmapCell,
  right: EnterpriseContentDependencyHeatmapCell,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    right.blockers.length - left.blockers.length ||
    left.campaignName.localeCompare(right.campaignName) ||
    left.channel.localeCompare(right.channel)
  );
}

function compareStaffingSignals(
  left: EnterpriseContentStaffingSignal,
  right: EnterpriseContentStaffingSignal,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    right.overdueTasks - left.overdueTasks ||
    right.assignedTasks - left.assignedTasks ||
    left.ownerName.localeCompare(right.ownerName)
  );
}

function comparePlaybooks(
  left: EnterpriseContentRecoveryPlaybook,
  right: EnterpriseContentRecoveryPlaybook,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    right.steps.length - left.steps.length ||
    left.campaignName.localeCompare(right.campaignName)
  );
}

function statusWeight(status: EnterpriseContentOperationsStatus) {
  if (status === "blocked") return 2;
  if (status === "review") return 1;

  return 0;
}

function normalizeDate(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "content-ops"
  );
}

const dayMilliseconds = 24 * 60 * 60 * 1000;
