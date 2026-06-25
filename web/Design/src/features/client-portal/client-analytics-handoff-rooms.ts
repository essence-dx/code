import type { CampaignBoardSummary } from "@/db/campaigns";
import type { ContentScheduleSummary } from "@/db/content-planner";
import type { ReviewTaskSummary } from "@/db/project-comments";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type {
  ClientPortalCenter,
  ClientPortalRoom,
} from "@/features/client-portal/client-portal-rooms";
import type { ProductionDistributionAnalyticsCenter } from "@/features/distribution/production-distribution-analytics";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import type { DataConnectedReportDashboardCenter } from "@/features/reports/data-connected-report-dashboards";
import type {
  ClientAnalyticsApprovalContext,
  ClientAnalyticsDeliveryMilestone,
  ClientAnalyticsDeliveryTimeline,
  ClientAnalyticsEvidenceBundle,
  ClientAnalyticsHandoffRoom,
  ClientAnalyticsHandoffRoomCenter,
  ClientAnalyticsHandoffStatus,
  ClientAnalyticsSnapshot,
  ClientAnalyticsStakeholderView,
} from "@/features/client-portal/client-analytics-handoff-rooms-types";
import { isReviewTaskOverdue } from "@/features/review/review-tasks";

export type {
  ClientAnalyticsApprovalContext,
  ClientAnalyticsDeliveryMilestone,
  ClientAnalyticsDeliveryTimeline,
  ClientAnalyticsEvidenceBundle,
  ClientAnalyticsHandoffRoom,
  ClientAnalyticsHandoffRoomCenter,
  ClientAnalyticsHandoffStatus,
  ClientAnalyticsMilestoneKind,
  ClientAnalyticsSnapshot,
  ClientAnalyticsStakeholderView,
} from "@/features/client-portal/client-analytics-handoff-rooms-types";

export function createClientAnalyticsHandoffRooms(input: {
  clientPortal: ClientPortalCenter;
  productionAnalytics: ProductionDistributionAnalyticsCenter;
  reportDashboards: DataConnectedReportDashboardCenter;
  campaigns: CampaignBoardSummary[];
  contentScheduleItems: ContentScheduleSummary[];
  projectHandoffPackets: ProjectHandoffPacket[];
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: Date | string;
}): ClientAnalyticsHandoffRoomCenter {
  const now = normalizeDate(input.now);
  const generatedAt = now.toISOString();
  const packetByProject = new Map(
    input.projectHandoffPackets.map((packet) => [packet.projectId, packet]),
  );
  const rooms = input.clientPortal.rooms
    .map((portalRoom) => {
      const campaignRef = findCampaignRef(
        input.campaigns,
        portalRoom.projectId,
      );
      const analyticsSnapshot = createAnalyticsSnapshot({
        portalRoom,
        campaignRef,
        productionAnalytics: input.productionAnalytics,
        reportDashboards: input.reportDashboards,
      });
      const approvalContext = createApprovalContext({
        portalRoom,
        campaignRef,
        packet: packetByProject.get(portalRoom.projectId) ?? null,
        reviewTasks: input.reviewTasks.filter(
          (task) => task.projectId === portalRoom.projectId,
        ),
        auditLogs: input.auditLogs,
        now,
      });
      const deliveryTimeline = createDeliveryTimeline({
        portalRoom,
        campaignRef,
        packet: packetByProject.get(portalRoom.projectId) ?? null,
        schedules: input.contentScheduleItems.filter(
          (item) => item.projectId === portalRoom.projectId,
        ),
        reportDashboards: input.reportDashboards,
      });
      const stakeholderView = createStakeholderView(portalRoom);
      const score = average([
        portalRoom.score,
        statusScore(analyticsSnapshot.status),
        statusScore(approvalContext.status),
        statusScore(deliveryTimeline.status),
        stakeholderView.safeShare ? 100 : 20,
      ]);
      const status = aggregateStatus([
        scoreToStatus(score),
        analyticsSnapshot.status,
        approvalContext.status,
        deliveryTimeline.status,
        stakeholderView.safeShare ? "ready" : "blocked",
      ]);
      const room: ClientAnalyticsHandoffRoom = {
        id: `client-analytics-room-${portalRoom.projectId}`,
        projectId: portalRoom.projectId,
        projectName: portalRoom.projectName,
        campaignId: campaignRef?.campaign.id ?? null,
        campaignName: campaignRef?.campaign.name ?? null,
        status,
        score,
        nextAction: createRoomNextAction({
          projectName: portalRoom.projectName,
          status,
          stakeholderView,
          analyticsSnapshot,
          approvalContext,
          deliveryTimeline,
        }),
        stakeholderView,
        analyticsSnapshot,
        approvalContext,
        deliveryTimeline,
        evidenceBundle: createEvidenceBundle({
          generatedAt,
          portalRoom,
          stakeholderView,
          analyticsSnapshot,
          approvalContext,
          deliveryTimeline,
          campaignName: campaignRef?.campaign.name ?? null,
        }),
      };

      return room;
    })
    .sort(compareRooms);
  const score = average(
    rooms.map((room) => room.score),
    100,
  );
  const status = aggregateStatus(rooms.map((room) => room.status));

  return {
    generatedAt,
    status,
    score,
    rooms,
    nextActions: createNextActions(rooms),
    totals: {
      rooms: rooms.length,
      safeViews: rooms.filter((room) => room.stakeholderView.safeShare).length,
      analyticsSnapshots: rooms.filter(
        (room) => room.analyticsSnapshot.status !== "blocked",
      ).length,
      approvalContexts: rooms.filter(
        (room) => room.approvalContext.status !== "blocked",
      ).length,
      deliveryMilestones: rooms.reduce(
        (total, room) => total + room.deliveryTimeline.milestones.length,
        0,
      ),
      evidenceBundles: rooms.filter(
        (room) => room.evidenceBundle.status !== "blocked",
      ).length,
      blockedRooms: rooms.filter((room) => room.status === "blocked").length,
    },
  };
}

function createStakeholderView(
  portalRoom: ClientPortalRoom,
): ClientAnalyticsStakeholderView {
  const safeShare =
    portalRoom.approvalSafe && portalRoom.viewMode !== "editable-risk";

  return {
    label: portalRoom.viewLabel,
    href: portalRoom.href,
    safeShare,
    canComment: portalRoom.canComment,
    rawActorEmailsExposed: false,
    exposedFields: [
      "projectName",
      "approvalStatus",
      "aggregateAnalytics",
      "deliveryTimeline",
      "handoffReadiness",
    ],
    redactions: [
      "Internal actor emails are redacted from the client bundle.",
      "Raw audit metadata stays inside the workspace.",
      "Only aggregate analytics are exposed to stakeholders.",
    ],
  };
}

function createAnalyticsSnapshot(input: {
  portalRoom: ClientPortalRoom;
  campaignRef: CampaignProjectRef | null;
  productionAnalytics: ProductionDistributionAnalyticsCenter;
  reportDashboards: DataConnectedReportDashboardCenter;
}): ClientAnalyticsSnapshot {
  const attribution =
    input.productionAnalytics.campaignAttribution.find((campaign) =>
      campaign.projectIds.includes(input.portalRoom.projectId),
    ) ??
    (input.campaignRef
      ? input.productionAnalytics.campaignAttribution.find(
          (campaign) => campaign.campaignId === input.campaignRef?.campaign.id,
        )
      : null);
  const websiteViews =
    attribution?.websiteViews ?? input.productionAnalytics.totals.websiteViews;
  const websiteClicks =
    attribution?.websiteClicks ??
    input.productionAnalytics.totals.websiteClicks;
  const formSubmissions =
    attribution?.formSubmissions ??
    input.productionAnalytics.totals.formSubmissions;
  const conversionRate =
    attribution?.conversionRate ?? safePercent(websiteClicks, websiteViews);
  const publishedItems =
    attribution?.scheduledPublishes ??
    input.productionAnalytics.totals.publishedItems;
  const exportArtifacts =
    attribution?.exportArtifacts ??
    input.productionAnalytics.totals.exportArtifacts;
  const status = aggregateStatus([
    input.productionAnalytics.status,
    input.reportDashboards.status,
    attribution?.status ??
      (websiteViews || exportArtifacts ? "review" : "blocked"),
  ]);

  return {
    id: `client-analytics-${input.portalRoom.projectId}`,
    status,
    campaignId:
      attribution?.campaignId ?? input.campaignRef?.campaign.id ?? null,
    campaignName:
      attribution?.campaignName ?? input.campaignRef?.campaign.name ?? null,
    websiteViews,
    websiteClicks,
    formSubmissions,
    conversionRate,
    publishedItems,
    exportArtifacts,
    reportDashboardCount: input.reportDashboards.totals.dashboards,
    exportReadyDashboards: input.reportDashboards.totals.exportReadyDashboards,
    summary: `${formatNumber(websiteViews)} views, ${formatNumber(
      websiteClicks,
    )} clicks, ${formatNumber(formSubmissions)} responses, and ${formatNumber(
      exportArtifacts,
    )} export artifact${exportArtifacts === 1 ? "" : "s"} are ready for stakeholder review.`,
  };
}

function createApprovalContext(input: {
  portalRoom: ClientPortalRoom;
  campaignRef: CampaignProjectRef | null;
  packet: ProjectHandoffPacket | null;
  reviewTasks: ReviewTaskSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now: Date;
}): ClientAnalyticsApprovalContext {
  const openTasks = input.reviewTasks.filter(
    (task) => !task.resolved || task.taskStatus !== "done",
  );
  const overdueTasks = openTasks.filter((task) =>
    isReviewTaskOverdue({ ...task, now: input.now }),
  );
  const latestApprovalLog = input.auditLogs
    .filter(
      (log) =>
        log.action === "approval.updated" &&
        (log.targetId === input.portalRoom.projectId ||
          log.summary.includes(input.portalRoom.projectName)),
    )
    .sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    )[0];
  const packetStatus = input.packet?.status ?? "blocked";
  const blockers = [
    input.portalRoom.approvalSafe
      ? null
      : "Stakeholder view is not approval safe.",
    input.portalRoom.approvalLabel === "Approved"
      ? null
      : `${input.portalRoom.approvalLabel} approval still needs review.`,
    input.packet ? null : "Project handoff packet is missing.",
    packetStatus === "ready"
      ? null
      : (input.packet?.nextAction ?? "Prepare handoff packet."),
    overdueTasks.length
      ? `${overdueTasks.length} overdue scoped task${overdueTasks.length === 1 ? "" : "s"} remain.`
      : null,
    input.campaignRef?.deliverable.approvalStatus === "changes-requested"
      ? "Campaign deliverable has requested changes."
      : null,
  ].filter((blocker): blocker is string => Boolean(blocker));
  const status = blockers.length
    ? blockers.some(
        (blocker) =>
          blocker.includes("not approval safe") ||
          blocker.includes("overdue") ||
          blocker.includes("missing") ||
          blocker.includes("requested changes"),
      )
      ? "blocked"
      : "review"
    : "ready";

  return {
    status,
    approvalStatus: input.packet?.approvalStatus ?? "draft",
    packetStatus,
    packetScore: input.packet?.packetScore ?? 0,
    openTasks: openTasks.length,
    overdueTasks: overdueTasks.length,
    resolvedTasks: input.reviewTasks.filter(
      (task) => task.resolved && task.taskStatus === "done",
    ).length,
    deliverableApprovalStatus:
      input.campaignRef?.deliverable.approvalStatus ?? null,
    latestApprovalSummary: latestApprovalLog?.summary ?? null,
    blockers,
  };
}

function createDeliveryTimeline(input: {
  portalRoom: ClientPortalRoom;
  campaignRef: CampaignProjectRef | null;
  packet: ProjectHandoffPacket | null;
  schedules: ContentScheduleSummary[];
  reportDashboards: DataConnectedReportDashboardCenter;
}): ClientAnalyticsDeliveryTimeline {
  const schedule = input.schedules
    .slice()
    .sort(
      (left, right) =>
        Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt),
    )[0];
  const milestones: ClientAnalyticsDeliveryMilestone[] = [
    {
      id: `approval-${input.portalRoom.projectId}`,
      kind: "approval",
      label: "Approval context",
      status: input.portalRoom.approvalSafe ? "ready" : "blocked",
      date: input.packet?.updatedAt ?? null,
      detail: input.portalRoom.approvalSafe
        ? `${input.portalRoom.approvalLabel} view is safe for stakeholders.`
        : "Switch the room to view or comment access before sharing.",
    },
    {
      id: `schedule-${input.portalRoom.projectId}`,
      kind: "scheduled-publish",
      label: schedule ? `${schedule.channel} publish` : "Distribution schedule",
      status: schedule
        ? schedule.status === "published"
          ? "ready"
          : schedule.status === "cancelled"
            ? "blocked"
            : "review"
        : "review",
      date:
        schedule?.scheduledAt ?? input.campaignRef?.campaign.launchAt ?? null,
      detail: schedule
        ? `${schedule.title} is ${schedule.status}.`
        : "No direct publishing schedule is attached to this handoff room.",
    },
    {
      id: `export-${input.portalRoom.projectId}`,
      kind: "export",
      label: "Export evidence",
      status: mapPacketExportStatus(
        input.packet?.exportBundle.status ?? "missing",
      ),
      date: input.packet?.exportBundle.latestCompletedAt ?? null,
      detail: input.packet?.exportBundle.latestArtifactName
        ? `${input.packet.exportBundle.latestArtifactName} is available.`
        : "Create a completed export artifact for the client bundle.",
    },
    {
      id: `handoff-${input.portalRoom.projectId}`,
      kind: "handoff",
      label: "Handoff packet",
      status: input.packet?.status ?? "blocked",
      date: input.packet?.updatedAt ?? null,
      detail: input.packet?.nextAction ?? "Generate a project handoff packet.",
    },
    {
      id: `report-refresh-${input.portalRoom.projectId}`,
      kind: "report-refresh",
      label: "Report freshness",
      status: input.reportDashboards.status,
      date: input.reportDashboards.generatedAt,
      detail: `${input.reportDashboards.totals.exportReadyDashboards} export-ready report dashboard${input.reportDashboards.totals.exportReadyDashboards === 1 ? "" : "s"}.`,
    },
  ];
  const status = aggregateStatus(
    milestones.map((milestone) => milestone.status),
  );
  const nextDeliveryAt =
    milestones.find((milestone) => milestone.status !== "ready")?.date ??
    schedule?.scheduledAt ??
    input.packet?.updatedAt ??
    null;

  return {
    status,
    nextDeliveryAt,
    summary: `${milestones.length} delivery milestones connect approval, publishing, export, handoff, and report freshness.`,
    milestones,
  };
}

function createEvidenceBundle(input: {
  generatedAt: string;
  portalRoom: ClientPortalRoom;
  stakeholderView: ClientAnalyticsStakeholderView;
  analyticsSnapshot: ClientAnalyticsSnapshot;
  approvalContext: ClientAnalyticsApprovalContext;
  deliveryTimeline: ClientAnalyticsDeliveryTimeline;
  campaignName: string | null;
}): ClientAnalyticsEvidenceBundle {
  const payload = {
    kind: "essence-studio.client-analytics-handoff",
    version: 1,
    generatedAt: input.generatedAt,
    room: {
      projectId: input.portalRoom.projectId,
      projectName: input.portalRoom.projectName,
      campaignName: input.campaignName,
      status: input.portalRoom.status,
      stakeholderView: input.stakeholderView,
      analyticsSnapshot: input.analyticsSnapshot,
      approvalContext: {
        ...input.approvalContext,
        latestApprovalSummary: input.approvalContext.latestApprovalSummary,
      },
      deliveryTimeline: input.deliveryTimeline,
    },
  };

  return {
    id: `client-analytics-evidence-${input.portalRoom.projectId}`,
    status: aggregateStatus([
      input.analyticsSnapshot.status,
      input.approvalContext.status,
      input.deliveryTimeline.status,
      input.stakeholderView.safeShare ? "ready" : "blocked",
    ]),
    generatedAt: input.generatedAt,
    fileName: `${slugify(input.portalRoom.projectName)}-client-analytics-handoff.json`,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(payload, null, 2),
    )}`,
  };
}

type CampaignProjectRef = {
  campaign: CampaignBoardSummary;
  deliverable: CampaignBoardSummary["deliverables"][number];
};

function findCampaignRef(
  campaigns: CampaignBoardSummary[],
  projectId: string,
): CampaignProjectRef | null {
  for (const campaign of campaigns) {
    const deliverable = campaign.deliverables.find(
      (item) => item.projectId === projectId,
    );

    if (deliverable) return { campaign, deliverable };
  }

  return null;
}

function createRoomNextAction(input: {
  projectName: string;
  status: ClientAnalyticsHandoffStatus;
  stakeholderView: ClientAnalyticsStakeholderView;
  analyticsSnapshot: ClientAnalyticsSnapshot;
  approvalContext: ClientAnalyticsApprovalContext;
  deliveryTimeline: ClientAnalyticsDeliveryTimeline;
}) {
  if (!input.stakeholderView.safeShare) {
    return `${input.projectName}: switch to an approval-safe stakeholder view.`;
  }
  if (input.approvalContext.status !== "ready") {
    return `${input.projectName}: ${input.approvalContext.blockers[0] ?? "review approval context"}`;
  }
  if (input.analyticsSnapshot.status !== "ready") {
    return `${input.projectName}: refresh analytics before client analytics handoff.`;
  }
  if (input.deliveryTimeline.status !== "ready") {
    return `${input.projectName}: complete delivery timeline milestones.`;
  }

  return `${input.projectName} is ready for client analytics handoff.`;
}

function createNextActions(rooms: ClientAnalyticsHandoffRoom[]) {
  return rooms.length
    ? rooms
        .slice()
        .sort(compareRooms)
        .slice(0, 5)
        .map((room) => room.nextAction)
    : ["Create a client portal room before analytics handoff."];
}

function compareRooms(
  left: ClientAnalyticsHandoffRoom,
  right: ClientAnalyticsHandoffRoom,
) {
  return (
    statusWeight(left.status) - statusWeight(right.status) ||
    left.score - right.score ||
    left.projectName.localeCompare(right.projectName)
  );
}

function aggregateStatus(statuses: ClientAnalyticsHandoffStatus[]) {
  if (!statuses.length) return "blocked";
  if (statuses.some((status) => status === "blocked")) return "blocked";
  if (statuses.some((status) => status === "review")) return "review";

  return "ready";
}

function statusScore(status: ClientAnalyticsHandoffStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 70;

  return 25;
}

function scoreToStatus(score: number): ClientAnalyticsHandoffStatus {
  if (score >= 85) return "ready";
  if (score >= 58) return "review";

  return "blocked";
}

function statusWeight(status: ClientAnalyticsHandoffStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function average(values: number[], fallback = 0) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function safePercent(value: number, total: number) {
  if (!total) return 0;

  return Math.round((value / total) * 100);
}

function mapPacketExportStatus(
  status: ProjectHandoffPacket["exportBundle"]["status"],
) {
  if (status === "ready") return "ready";
  if (status === "running") return "review";

  return "blocked";
}

function formatNumber(value: number) {
  return value.toLocaleString("en");
}

function normalizeDate(value: Date | string | undefined) {
  if (value instanceof Date) return value;
  if (typeof value === "string") return new Date(value);

  return new Date();
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "client-handoff"
  );
}
