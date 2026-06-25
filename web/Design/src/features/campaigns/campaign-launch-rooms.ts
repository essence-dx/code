import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { PublishingChannelCenter } from "@/features/publishing/publishing-channel-depth";
import { isReviewTaskOverdue } from "@/features/review/review-tasks";
import type {
  CampaignChannelReadiness,
  CampaignLaunchChannel,
  CampaignLaunchCommand,
  CampaignLaunchCommandPacket,
  CampaignLaunchRoom,
  CampaignLaunchRoomCenter,
  CampaignLaunchRoomStatus,
  CampaignRolloutMilestone,
  CampaignRolloutTimeline,
  CampaignStakeholderSignoff,
  CampaignStakeholderSignoffItem,
} from "@/features/campaigns/campaign-launch-rooms-types";
import {
  addDays,
  average,
  ratioScore,
  scoreToLaunchStatus,
  sortLaunchRooms,
  statusWeight,
  uniqueStrings,
} from "@/features/campaigns/campaign-launch-rooms-utils";

export type {
  CampaignChannelReadiness,
  CampaignLaunchChannel,
  CampaignLaunchCommand,
  CampaignLaunchCommandKind,
  CampaignLaunchCommandPacket,
  CampaignLaunchRoom,
  CampaignLaunchRoomCenter,
  CampaignLaunchRoomCheck,
  CampaignLaunchRoomStatus,
  CampaignRolloutMilestone,
  CampaignRolloutTimeline,
  CampaignStakeholderSignoff,
  CampaignStakeholderSignoffItem,
} from "@/features/campaigns/campaign-launch-rooms-types";

type CampaignLaunchRoomInput = {
  campaigns: CampaignBoardSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  reviewTasks: ReviewTaskSummary[];
  projectAudits: ProjectAuditSummary[];
  publishingChannelCenter: PublishingChannelCenter;
  auditLogs: WorkspaceAuditLogSummary[];
  now?: Date;
};

export function createCampaignLaunchRoomCenter(
  input: CampaignLaunchRoomInput,
): CampaignLaunchRoomCenter {
  const now = input.now ?? new Date();
  const generatedAt = now.toISOString();
  const rooms = input.campaigns
    .map((campaign) =>
      createCampaignLaunchRoom({
        campaign,
        contentScheduleItems: input.contentScheduleItems,
        reviewTasks: input.reviewTasks,
        projectAudits: input.projectAudits,
        publishingChannelCenter: input.publishingChannelCenter,
        auditLogs: input.auditLogs,
        generatedAt,
        now,
      }),
    )
    .sort(sortLaunchRooms);
  const score = average(
    rooms.map((room) => room.score),
    100,
  );
  const status = scoreToLaunchStatus(
    score,
    rooms.some((room) => room.status === "blocked"),
  );
  const totals = {
    campaigns: rooms.length,
    readyRooms: rooms.filter((room) => room.status === "ready").length,
    reviewRooms: rooms.filter((room) => room.status === "review").length,
    blockedRooms: rooms.filter((room) => room.status === "blocked").length,
    deliverables: rooms.reduce(
      (total, room) => total + room.totals.deliverables,
      0,
    ),
    scheduledDeliverables: rooms.reduce(
      (total, room) => total + room.totals.scheduledDeliverables,
      0,
    ),
    pendingSignoffs: rooms.reduce(
      (total, room) => total + room.totals.pendingSignoffs,
      0,
    ),
    commandPackets: rooms.length,
  };

  return {
    generatedAt,
    status,
    score,
    rooms,
    nextActions: createCenterNextActions(rooms),
    totals,
  };
}

function createCampaignLaunchRoom(input: {
  campaign: CampaignBoardSummary;
  contentScheduleItems: ContentScheduleSummary[];
  reviewTasks: ReviewTaskSummary[];
  projectAudits: ProjectAuditSummary[];
  publishingChannelCenter: PublishingChannelCenter;
  auditLogs: WorkspaceAuditLogSummary[];
  generatedAt: string;
  now: Date;
}): CampaignLaunchRoom {
  const deliverables = input.campaign.deliverables;
  const projectIds = new Set(
    deliverables
      .map((deliverable) => deliverable.projectId)
      .filter((projectId): projectId is string => Boolean(projectId)),
  );
  const scheduleItems = input.contentScheduleItems.filter(
    (item) => item.projectId && projectIds.has(item.projectId),
  );
  const reviewTasks = input.reviewTasks.filter((task) =>
    projectIds.has(task.projectId),
  );
  const projectAudits = input.projectAudits.filter((audit) =>
    projectIds.has(audit.projectId),
  );
  const approvalLogs = input.auditLogs.filter(
    (log) =>
      log.action === "approval.updated" &&
      (log.targetId === input.campaign.id ||
        Boolean(log.targetId && projectIds.has(log.targetId))),
  );
  const stakeholderSignoff = createStakeholderSignoff({
    campaign: input.campaign,
    reviewTasks,
    approvalLogs,
    now: input.now,
  });
  const channelReadiness = createChannelReadiness({
    campaign: input.campaign,
    scheduleItems,
    projectAudits,
    publishingChannelCenter: input.publishingChannelCenter,
  });
  const rolloutTimeline = createRolloutTimeline({
    campaign: input.campaign,
    scheduleItems,
    stakeholderSignoff,
    channelReadiness,
    now: input.now,
  });
  const score = average([
    stakeholderSignoff.score,
    channelReadiness.score,
    rolloutTimeline.score,
  ]);
  const status = scoreToLaunchStatus(
    score,
    [
      stakeholderSignoff.status,
      channelReadiness.status,
      rolloutTimeline.status,
    ].includes("blocked"),
  );
  const scheduledDeliverables = deliverables.filter(
    (deliverable) =>
      deliverable.projectId &&
      scheduleItems.some(
        (item) =>
          item.projectId === deliverable.projectId &&
          item.status !== "cancelled",
      ),
  ).length;
  const nextActions = createRoomNextActions({
    stakeholderSignoff,
    channelReadiness,
    rolloutTimeline,
  });

  return {
    id: `campaign-launch-room-${input.campaign.id}`,
    campaignId: input.campaign.id,
    campaignName: input.campaign.name,
    status,
    score,
    launchAt: input.campaign.launchAt,
    goal: input.campaign.goal,
    audience: input.campaign.audience,
    stakeholderSignoff,
    channelReadiness,
    rolloutTimeline,
    launchCommandPacket: createLaunchCommandPacket({
      campaign: input.campaign,
      generatedAt: input.generatedAt,
      status,
      score,
      stakeholderSignoff,
      channelReadiness,
      rolloutTimeline,
      nextActions,
    }),
    nextActions,
    totals: {
      deliverables: deliverables.length,
      formats: channelReadiness.channels.length,
      scheduledDeliverables,
      unscheduledDeliverables: deliverables.length - scheduledDeliverables,
      approvedDeliverables: stakeholderSignoff.approvedDeliverables,
      pendingSignoffs: stakeholderSignoff.pendingDeliverables,
      openReviewTasks: stakeholderSignoff.openTasks,
    },
  };
}

function createStakeholderSignoff(input: {
  campaign: CampaignBoardSummary;
  reviewTasks: ReviewTaskSummary[];
  approvalLogs: WorkspaceAuditLogSummary[];
  now: Date;
}): CampaignStakeholderSignoff {
  const deliverables = input.campaign.deliverables;
  const approvedDeliverables = deliverables.filter(
    (deliverable) => deliverable.approvalStatus === "approved",
  );
  const pendingDeliverables = deliverables.filter(
    (deliverable) => deliverable.approvalStatus !== "approved",
  );
  const openTasks = input.reviewTasks.filter(
    (task) => task.taskStatus !== "done" && task.taskStatus !== "none",
  );
  const overdueTasks = openTasks.filter((task) =>
    isReviewTaskOverdue({ ...task, now: input.now }),
  );
  const items: CampaignStakeholderSignoffItem[] = [
    ...pendingDeliverables.map(
      (deliverable): CampaignStakeholderSignoffItem => ({
        id: `deliverable-${deliverable.id}`,
        title: deliverable.projectName ?? deliverable.role,
        owner: "Stakeholder",
        status: (deliverable.approvalStatus === "changes-requested"
          ? "blocked"
          : "review") satisfies CampaignLaunchRoomStatus,
        detail: `${deliverable.role} on ${deliverable.channel} is ${deliverable.approvalStatus}.`,
        href: deliverable.projectId ? `/editor/${deliverable.projectId}` : null,
      }),
    ),
    ...openTasks.map(
      (task): CampaignStakeholderSignoffItem => ({
        id: `task-${task.id}`,
        title: task.body,
        owner: task.taskAssigneeName ?? "Unassigned",
        status: isReviewTaskOverdue({ ...task, now: input.now })
          ? "blocked"
          : "review",
        detail: `${task.projectName} review task is ${task.taskStatus}.`,
        href: `/editor/${task.projectId}`,
      }),
    ),
  ];
  const score = average([
    ratioScore(approvedDeliverables.length, deliverables.length, 55),
    openTasks.length ? Math.max(0, 100 - openTasks.length * 20) : 100,
    overdueTasks.length ? Math.max(0, 100 - overdueTasks.length * 45) : 100,
    input.approvalLogs.length || !deliverables.length ? 100 : 78,
  ]);
  const status = scoreToLaunchStatus(
    score,
    pendingDeliverables.some(
      (deliverable) => deliverable.approvalStatus === "changes-requested",
    ) || overdueTasks.length > 0,
  );

  return {
    status,
    score,
    approvedDeliverables: approvedDeliverables.length,
    pendingDeliverables: pendingDeliverables.length,
    openTasks: openTasks.length,
    overdueTasks: overdueTasks.length,
    approvalEvents: input.approvalLogs.length,
    items,
  };
}

function createChannelReadiness(input: {
  campaign: CampaignBoardSummary;
  scheduleItems: ContentScheduleSummary[];
  projectAudits: ProjectAuditSummary[];
  publishingChannelCenter: PublishingChannelCenter;
}): CampaignChannelReadiness {
  const channels = groupDeliverablesByChannel(input.campaign.deliverables).map(
    ([channelId, deliverables]) => {
      const approved = deliverables.filter(
        (deliverable) => deliverable.approvalStatus === "approved",
      );
      const scheduled = deliverables.filter(
        (deliverable) =>
          deliverable.projectId &&
          input.scheduleItems.some(
            (item) =>
              item.projectId === deliverable.projectId &&
              item.status !== "cancelled",
          ),
      );
      const auditReady = deliverables.filter(
        (deliverable) =>
          deliverable.projectId &&
          input.projectAudits.some(
            (audit) =>
              audit.projectId === deliverable.projectId &&
              audit.status === "ready",
          ),
      );
      const publishingRollup = input.publishingChannelCenter.channels.find(
        (channel) => channel.id === toPublishingChannelId(channelId),
      );
      const score = average([
        ratioScore(approved.length, deliverables.length),
        ratioScore(scheduled.length, deliverables.length),
        ratioScore(auditReady.length, deliverables.length, 80),
      ]);
      const status = scoreToLaunchStatus(
        score,
        deliverables.some(
          (deliverable) =>
            deliverable.approvalStatus === "changes-requested" ||
            !deliverable.projectId,
        ),
      );

      return {
        id: channelId,
        name: formatChannelName(channelId),
        status,
        score,
        deliverables: deliverables.length,
        approvedDeliverables: approved.length,
        scheduledDeliverables: scheduled.length,
        auditReadyDeliverables: auditReady.length,
        publishingRollupScore: publishingRollup?.score ?? null,
        detail: `${approved.length}/${deliverables.length} approved, ${scheduled.length}/${deliverables.length} scheduled.`,
        nextAction:
          status === "ready"
            ? "Channel launch path is ready."
            : scheduled.length < deliverables.length
              ? "Schedule every channel deliverable in the content planner."
              : "Resolve channel approvals and readiness checks.",
      } satisfies CampaignLaunchChannel;
    },
  );
  const score = average(
    channels.map((channel) => channel.score),
    input.campaign.deliverables.length ? 50 : 100,
  );
  const status = scoreToLaunchStatus(
    score,
    channels.some((channel) => channel.status === "blocked") ||
      (input.campaign.deliverables.length > 0 && channels.length === 0),
  );

  return { status, score, channels };
}

function createRolloutTimeline(input: {
  campaign: CampaignBoardSummary;
  scheduleItems: ContentScheduleSummary[];
  stakeholderSignoff: CampaignStakeholderSignoff;
  channelReadiness: CampaignChannelReadiness;
  now: Date;
}): CampaignRolloutTimeline {
  const launchAt = input.campaign.launchAt;
  const hasBrief = Boolean(
    input.campaign.brief.trim() &&
    input.campaign.goal.trim() &&
    input.campaign.audience.trim(),
  );
  const hasSchedule = input.scheduleItems.some(
    (item) => item.status !== "cancelled",
  );
  const launchDate = launchAt ? new Date(launchAt) : null;
  const launchIsPast =
    launchDate && !Number.isNaN(launchDate.getTime())
      ? launchDate.getTime() < input.now.getTime()
      : false;
  const milestones: CampaignRolloutMilestone[] = [
    {
      id: "brief",
      title: "Brief locked",
      status: hasBrief ? "ready" : "review",
      date: input.campaign.createdAt,
      detail: hasBrief
        ? "Brief, goal, and audience are set."
        : "Add brief, goal, and audience before launch.",
    },
    {
      id: "signoff",
      title: "Stakeholder signoff",
      status: input.stakeholderSignoff.status,
      date: launchAt ? addDays(launchAt, -2) : null,
      detail: `${input.stakeholderSignoff.approvedDeliverables} approved, ${input.stakeholderSignoff.pendingDeliverables} pending.`,
    },
    {
      id: "scheduling",
      title: "Channel scheduling",
      status: hasSchedule ? input.channelReadiness.status : "blocked",
      date: firstScheduleDate(input.scheduleItems),
      detail: hasSchedule
        ? `${input.scheduleItems.length} planner items are connected.`
        : "No campaign deliverables are scheduled yet.",
    },
    {
      id: "launch",
      title: "Launch command",
      status:
        !launchAt || launchIsPast
          ? "blocked"
          : input.stakeholderSignoff.status === "blocked" ||
              input.channelReadiness.status === "blocked"
            ? "blocked"
            : input.stakeholderSignoff.status === "review" ||
                input.channelReadiness.status === "review"
              ? "review"
              : "ready",
      date: launchAt,
      detail: launchAt
        ? `Launch is set for ${new Date(launchAt).toLocaleDateString("en")}.`
        : "Set a launch date before opening the command packet.",
    },
    {
      id: "follow-up",
      title: "Follow-up reporting",
      status: input.channelReadiness.status === "ready" ? "ready" : "review",
      date: launchAt ? addDays(launchAt, 3) : null,
      detail:
        "Review planner status, channel results, and stakeholder notes after launch.",
    },
  ];
  const score = average(
    milestones.map((milestone) => statusScore(milestone.status)),
  );
  const status = scoreToLaunchStatus(
    score,
    milestones.some((milestone) => milestone.status === "blocked"),
  );

  return { status, score, milestones };
}

function createLaunchCommandPacket(input: {
  campaign: CampaignBoardSummary;
  generatedAt: string;
  status: CampaignLaunchRoomStatus;
  score: number;
  stakeholderSignoff: CampaignStakeholderSignoff;
  channelReadiness: CampaignChannelReadiness;
  rolloutTimeline: CampaignRolloutTimeline;
  nextActions: string[];
}): CampaignLaunchCommandPacket {
  const commands: CampaignLaunchCommand[] = [
    {
      id: `${input.campaign.id}-signoff`,
      kind: "signoff",
      title: "Confirm stakeholder signoff",
      status: input.stakeholderSignoff.status,
      detail: `${input.stakeholderSignoff.approvedDeliverables} approved deliverables, ${input.stakeholderSignoff.openTasks} open review tasks.`,
      targetDate: input.campaign.launchAt
        ? addDays(input.campaign.launchAt, -2)
        : null,
    },
    {
      id: `${input.campaign.id}-schedule`,
      kind: "schedule",
      title: "Release channel schedule",
      status: input.channelReadiness.status,
      detail: `${input.channelReadiness.channels.length} channel paths are prepared.`,
      targetDate: firstMilestoneDate(input.rolloutTimeline, "scheduling"),
    },
    {
      id: `${input.campaign.id}-launch`,
      kind: "launch",
      title: "Launch campaign",
      status: input.status,
      detail: input.nextActions[0] ?? "All launch-room checks are ready.",
      targetDate: input.campaign.launchAt,
    },
    {
      id: `${input.campaign.id}-report`,
      kind: "report",
      title: "Send post-launch report",
      status: input.status === "blocked" ? "review" : "ready",
      detail:
        "Summarize signoff, channel release state, and next optimizations.",
      targetDate: input.campaign.launchAt
        ? addDays(input.campaign.launchAt, 3)
        : null,
    },
  ];
  const payload = {
    generatedAt: input.generatedAt,
    campaign: {
      id: input.campaign.id,
      name: input.campaign.name,
      launchAt: input.campaign.launchAt,
      status: input.status,
      score: input.score,
    },
    commands,
    nextActions: input.nextActions,
    signoff: input.stakeholderSignoff,
    channels: input.channelReadiness.channels,
    timeline: input.rolloutTimeline.milestones,
  };

  return {
    fileName: `campaign-launch-command-${input.campaign.id}.json`,
    generatedAt: input.generatedAt,
    summary: `${input.campaign.name} launch room is ${input.status} at ${input.score}/100.`,
    commands,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(payload, null, 2),
    )}`,
  };
}

function groupDeliverablesByChannel(
  deliverables: CampaignBoardSummary["deliverables"],
) {
  const groups = new Map<string, CampaignBoardSummary["deliverables"]>();

  for (const deliverable of deliverables) {
    const channel = normalizeChannelGroup(deliverable.channel);
    const list = groups.get(channel) ?? [];
    list.push(deliverable);
    groups.set(channel, list);
  }

  return [...groups.entries()].sort((left, right) =>
    left[0].localeCompare(right[0]),
  );
}

function normalizeChannelGroup(channel: string) {
  const value = channel.toLowerCase();

  if (
    value.includes("instagram") ||
    value.includes("tiktok") ||
    value.includes("youtube") ||
    value.includes("social") ||
    value.includes("linkedin") ||
    value.includes("pinterest")
  ) {
    return "social";
  }

  if (value.includes("website") || value.includes("landing")) return "website";
  if (value.includes("email") || value.includes("newsletter")) return "email";
  if (value.includes("presentation") || value.includes("deck")) {
    return "presentation";
  }
  if (value.includes("print") || value.includes("poster")) return "print";

  return value.trim().toLowerCase() || "general";
}

function toPublishingChannelId(channelId: string) {
  if (channelId === "website") return "website";
  if (channelId === "email") return "email";
  if (channelId === "social") return "social";

  return "campaign";
}

function formatChannelName(channelId: string) {
  return channelId
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function firstScheduleDate(items: ContentScheduleSummary[]) {
  return (
    [...items]
      .filter((item) => item.status !== "cancelled")
      .sort(
        (left, right) =>
          Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt),
      )[0]?.scheduledAt ?? null
  );
}

function firstMilestoneDate(
  timeline: CampaignRolloutTimeline,
  id: CampaignRolloutMilestone["id"],
) {
  return (
    timeline.milestones.find((milestone) => milestone.id === id)?.date ?? null
  );
}

function statusScore(status: CampaignLaunchRoomStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 70;

  return 25;
}

function createRoomNextActions(input: {
  stakeholderSignoff: CampaignStakeholderSignoff;
  channelReadiness: CampaignChannelReadiness;
  rolloutTimeline: CampaignRolloutTimeline;
}) {
  const actions: string[] = [];

  if (input.stakeholderSignoff.status !== "ready") {
    actions.push(
      `Resolve stakeholder signoff for ${input.stakeholderSignoff.pendingDeliverables} deliverables and ${input.stakeholderSignoff.openTasks} open review tasks.`,
    );
  }

  if (input.channelReadiness.status !== "ready") {
    const channel = [...input.channelReadiness.channels].sort(
      (left, right) => left.score - right.score,
    )[0];

    actions.push(
      channel
        ? `${channel.name}: ${channel.nextAction}`
        : "Add campaign deliverables before preparing channel launch paths.",
    );
  }

  if (input.rolloutTimeline.status !== "ready") {
    const milestone = [...input.rolloutTimeline.milestones].sort(
      (left, right) => statusWeight(left.status) - statusWeight(right.status),
    )[0];

    if (milestone) actions.push(`${milestone.title}: ${milestone.detail}`);
  }

  return uniqueStrings(actions).slice(0, 5);
}

function createCenterNextActions(rooms: CampaignLaunchRoom[]) {
  return uniqueStrings(
    rooms
      .filter((room) => room.status !== "ready")
      .flatMap((room) =>
        room.nextActions.map((action) => `${room.campaignName}: ${action}`),
      ),
  ).slice(0, 6);
}
