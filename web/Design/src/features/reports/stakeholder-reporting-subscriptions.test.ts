import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ClientAnalyticsHandoffRoomCenter } from "@/features/client-portal/client-analytics-handoff-rooms";
import type { NotificationPreferenceRoutingCenter } from "@/features/notifications/notification-preference-routing-types";
import type { DataConnectedReportDashboardCenter } from "@/features/reports/data-connected-report-dashboards";
import { createStakeholderReportingSubscriptionCenter } from "@/features/reports/stakeholder-reporting-subscriptions";
import type { WorkspaceIntelligenceBriefingCenter } from "@/features/workspace-intelligence/workspace-intelligence-briefings";

describe("stakeholder reporting subscriptions", () => {
  test("creates role-safe recurring reports, signed packets, delivery history, and digest recovery", () => {
    const center = createStakeholderReportingSubscriptionCenter({
      workspaceName: "Essence Growth",
      reportDashboards: createReportDashboards(),
      clientHandoffRooms: createClientHandoffRooms(),
      workspaceIntelligence: createWorkspaceIntelligence(),
      notificationRouting: createNotificationRouting(),
      teamManagement: [createWorkspace()],
      auditLogs: [
        createAuditLog({
          id: "audit-delivered",
          action: "report.subscription.delivered",
          targetId: "subscription-leadership-weekly",
          summary: "Leadership weekly report delivered.",
          metadata: {
            channel: "email_digest",
            recipientEmail: "owner@example.com",
            packetId: "packet-leadership-weekly",
          },
        }),
        createAuditLog({
          id: "audit-failed",
          action: "report.subscription.failed",
          targetId: "subscription-client-stakeholder",
          summary: "Client stakeholder digest failed.",
          metadata: {
            channel: "email_digest",
            recipientEmail: "client@example.com",
            packetId: "packet-client-stakeholder",
            failureReason: "SMTP bounce",
          },
        }),
      ],
      now: "2026-05-19T10:00:00.000Z",
    });

    assert.equal(center.status, "blocked");
    assert.equal(center.totals.subscriptions, 4);
    assert.equal(center.totals.roleSafeDashboards, 3);
    assert.equal(center.totals.signedPackets, 4);
    assert.equal(center.totals.deliveryHistory, 2);
    assert.equal(center.totals.digestFailureRecoveries, 1);

    const leadership = center.subscriptions.find(
      (subscription) => subscription.id === "subscription-leadership-weekly",
    );
    assert.equal(leadership?.status, "ready");
    assert.equal(leadership?.recipientCount, 2);
    assert.equal(leadership?.roleSafety.status, "ready");
    assert.ok(leadership?.dashboardIds.includes("dashboard-executive"));
    assert.ok(leadership?.digestPacketIds.includes("digest-weekly"));

    const client = center.subscriptions.find(
      (subscription) => subscription.id === "subscription-client-stakeholder",
    );
    assert.equal(client?.roleSafety.status, "ready");
    assert.deepEqual(client?.roomIds, ["room-safe"]);
    assert.ok(!client?.roomIds.includes("room-unsafe"));
    assert.ok(client?.roleSafety.redactedFields.includes("raw actor emails"));
    assert.ok(
      client?.roleSafety.redactedFields.includes("internal audit metadata"),
    );

    const failedDelivery = center.deliveryHistory.find(
      (delivery) => delivery.status === "failed",
    );
    assert.equal(failedDelivery?.recoveryPlanId, "recovery-email-digest");

    const recovery = center.digestFailureRecoveries.find(
      (plan) => plan.id === "recovery-email-digest",
    );
    assert.deepEqual(recovery?.fallbackChannels, ["in_app", "slack"]);
    assert.ok(recovery?.nextAction.includes("Reissue"));

    const packet = decodePacket(center.signedPackets[0]?.dataUrl ?? "");
    assert.equal(
      packet.kind,
      "essence-studio.stakeholder-reporting-subscription",
    );
    assert.equal(packet.signature, center.signedPackets[0]?.signature);
    assert.ok(packet.roleSafety.redactedFields.includes("raw actor emails"));
  });
});

function decodePacket(dataUrl: string) {
  const [, payload = ""] = dataUrl.split(",");

  return JSON.parse(decodeURIComponent(payload)) as {
    kind: string;
    signature: string;
    roleSafety: {
      redactedFields: string[];
    };
  };
}

function createReportDashboards(): DataConnectedReportDashboardCenter {
  return {
    generatedAt: "2026-05-19T09:00:00.000Z",
    status: "review",
    score: 82,
    dashboards: [
      {
        id: "dashboard-executive",
        title: "Executive distribution dashboard",
        audience: "Leadership",
        status: "ready",
        score: 91,
        exportReady: true,
        blockIds: ["kpi-revenue", "chart-funnel"],
        refreshPlanIds: ["refresh-production-analytics"],
        staleWarningIds: [],
        summary: "Leadership-ready distribution report.",
      },
      {
        id: "dashboard-channel",
        title: "Channel report dashboard",
        audience: "Publishing team",
        status: "review",
        score: 78,
        exportReady: true,
        blockIds: ["chart-channel"],
        refreshPlanIds: ["refresh-channel"],
        staleWarningIds: ["stale-channel"],
        summary: "Channel performance needs freshness review.",
      },
      {
        id: "dashboard-content-source",
        title: "Content source dashboard",
        audience: "Content team",
        status: "blocked",
        score: 54,
        exportReady: false,
        blockIds: ["chart-content"],
        refreshPlanIds: ["refresh-content"],
        staleWarningIds: ["stale-content"],
        summary: "Content source report is not ready for sharing.",
      },
    ],
    chartBlocks: [],
    refreshPlans: [],
    staleSourceWarnings: [],
    executivePacket: {
      fileName: "executive-report.json",
      dataUrl: "data:application/json,%7B%7D",
      status: "ready",
      generatedAt: "2026-05-19T09:00:00.000Z",
      dashboardIds: ["dashboard-executive"],
      chartBlockIds: ["kpi-revenue", "chart-funnel"],
      staleWarningIds: [],
    },
    nextActions: ["Refresh channel dashboard before client sharing."],
    totals: {
      dashboards: 3,
      chartBlocks: 0,
      refreshPlans: 0,
      staleWarnings: 2,
      exportReadyDashboards: 2,
    },
  };
}

function createClientHandoffRooms(): ClientAnalyticsHandoffRoomCenter {
  return {
    generatedAt: "2026-05-19T09:00:00.000Z",
    status: "blocked",
    score: 76,
    rooms: [
      createRoom({
        id: "room-safe",
        projectId: "project-safe",
        projectName: "Safe launch room",
        safeShare: true,
        rawActorEmailsExposed: false,
      }),
      createRoom({
        id: "room-unsafe",
        projectId: "project-unsafe",
        projectName: "Unsafe launch room",
        safeShare: false,
        rawActorEmailsExposed: true,
      }),
    ],
    nextActions: ["Switch unsafe launch room to a safe stakeholder view."],
    totals: {
      rooms: 2,
      safeViews: 1,
      analyticsSnapshots: 2,
      approvalContexts: 2,
      deliveryMilestones: 4,
      evidenceBundles: 2,
      blockedRooms: 1,
    },
  };
}

function createRoom(input: {
  id: string;
  projectId: string;
  projectName: string;
  safeShare: boolean;
  rawActorEmailsExposed: boolean;
}): ClientAnalyticsHandoffRoomCenter["rooms"][number] {
  return {
    id: input.id,
    projectId: input.projectId,
    projectName: input.projectName,
    campaignId: "campaign-launch",
    campaignName: "Launch campaign",
    status: input.safeShare ? "ready" : "blocked",
    score: input.safeShare ? 88 : 45,
    nextAction: input.safeShare
      ? "Send the stakeholder packet."
      : "Switch to a safe stakeholder view.",
    stakeholderView: {
      label: "Stakeholder view",
      href: `/client/${input.projectId}`,
      safeShare: input.safeShare,
      canComment: true,
      rawActorEmailsExposed: input.rawActorEmailsExposed,
      exposedFields: ["analytics", "approval", "delivery timeline"],
      redactions: ["raw actor emails", "internal audit metadata"],
    },
    analyticsSnapshot: {
      id: `snapshot-${input.id}`,
      status: input.safeShare ? "ready" : "blocked",
      campaignId: "campaign-launch",
      campaignName: "Launch campaign",
      websiteViews: 1200,
      websiteClicks: 210,
      formSubmissions: 42,
      conversionRate: 20,
      publishedItems: 4,
      exportArtifacts: 2,
      reportDashboardCount: 2,
      exportReadyDashboards: 1,
      summary: "Launch analytics snapshot.",
    },
    approvalContext: {
      status: input.safeShare ? "ready" : "blocked",
      approvalStatus: input.safeShare ? "approved" : "changes-requested",
      packetStatus: input.safeShare ? "ready" : "blocked",
      packetScore: input.safeShare ? 90 : 44,
      openTasks: input.safeShare ? 0 : 2,
      overdueTasks: input.safeShare ? 0 : 1,
      resolvedTasks: 3,
      deliverableApprovalStatus: input.safeShare
        ? "approved"
        : "changes-requested",
      latestApprovalSummary: "Stakeholder approval reviewed.",
      blockers: input.safeShare ? [] : ["Open stakeholder task"],
    },
    deliveryTimeline: {
      status: input.safeShare ? "ready" : "blocked",
      nextDeliveryAt: "2026-05-20T10:00:00.000Z",
      summary: "Next stakeholder delivery is scheduled.",
      milestones: [
        {
          id: `milestone-${input.id}`,
          kind: "handoff",
          label: "Stakeholder handoff",
          status: input.safeShare ? "ready" : "blocked",
          date: "2026-05-20T10:00:00.000Z",
          detail: "Deliver signed stakeholder report packet.",
        },
      ],
    },
    evidenceBundle: {
      id: `bundle-${input.id}`,
      status: input.safeShare ? "ready" : "blocked",
      generatedAt: "2026-05-19T09:00:00.000Z",
      fileName: `${input.id}.json`,
      dataUrl: "data:application/json,%7B%7D",
    },
  };
}

function createWorkspaceIntelligence(): WorkspaceIntelligenceBriefingCenter {
  return {
    generatedAt: "2026-05-19T09:00:00.000Z",
    workspaceName: "Essence Growth",
    status: "review",
    score: 84,
    executiveNarrative: "Workspace needs channel freshness review.",
    executiveSummaries: [],
    anomalyExplanations: [],
    recommendedActions: [],
    digestPackets: [
      {
        id: "digest-daily",
        cadence: "daily",
        audience: "Executive daily brief",
        scheduledFor: "2026-05-20T09:00:00.000Z",
        topics: ["publishing", "review"],
        fileName: "daily.json",
        dataUrl: "data:application/json,%7B%7D",
        json: "{}",
      },
      {
        id: "digest-weekly",
        cadence: "weekly",
        audience: "Operator weekly recovery brief",
        scheduledFor: "2026-05-26T09:00:00.000Z",
        topics: ["publishing", "performance"],
        fileName: "weekly.json",
        dataUrl: "data:application/json,%7B%7D",
        json: "{}",
      },
    ],
    nextActions: ["Review channel freshness before next report."],
    totals: {
      executiveSummaries: 0,
      anomalyExplanations: 0,
      recommendedActions: 0,
      digestPackets: 2,
      criticalAnomalies: 0,
      watchAnomalies: 1,
      unreadDigestItems: 3,
      recentAuditEvents: 2,
    },
  };
}

function createNotificationRouting(): NotificationPreferenceRoutingCenter {
  return {
    status: "blocked",
    score: 62,
    quietHours: {
      enabled: true,
      startHour: 21,
      endHour: 7,
      timezoneLabel: "UTC",
      digestDuringQuietHours: true,
      urgentBypassTopics: ["security"],
      active: false,
      resumesAt: null,
    },
    routePlans: [],
    digestPreview: {
      enabled: true,
      scheduledFor: "2026-05-20T09:00:00.000Z",
      cadence: "daily",
      totalUnread: 3,
      topicCounts: {
        review: 1,
        publishing: 1,
        automation: 0,
        team: 1,
        security: 0,
        general: 0,
      },
      items: [],
    },
    failureRecovery: [
      {
        channel: "email_digest",
        label: "Email digest",
        lastFailureAt: "2026-05-19T08:55:00.000Z",
        reason: "SMTP bounce",
        retryAfterMinutes: 30,
        fallbackChannels: ["in_app", "slack"],
        affectedTopics: ["publishing", "review"],
        nextAction: "Reconnect email digest before the next scheduled report.",
      },
    ],
    nextActions: ["Reconnect email digest before the next scheduled report."],
    totals: {
      notifications: 4,
      unread: 3,
      subscribedTopics: 3,
      activeImmediateRoutes: 2,
      deferredRoutes: 1,
      failedChannels: 1,
    },
  };
}

function createWorkspace(): TeamWorkspaceManagementSummary {
  return {
    id: "workspace-growth",
    ownerId: "owner-user",
    name: "Growth workspace",
    role: "owner",
    pendingInviteCount: 0,
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-19T10:00:00.000Z",
    members: [
      createMember("owner-user", "owner@example.com", "owner"),
      createMember("admin-user", "admin@example.com", "admin"),
      createMember("member-user", "member@example.com", "member"),
    ],
    pendingInvites: [],
    recentActivity: [],
  };
}

function createMember(
  userId: string,
  email: string,
  role: TeamWorkspaceManagementSummary["members"][number]["role"],
): TeamWorkspaceManagementSummary["members"][number] {
  return {
    id: `member-${userId}`,
    workspaceId: "workspace-growth",
    userId,
    email,
    role,
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-19T10:00:00.000Z",
  };
}

function createAuditLog(
  overrides: Partial<WorkspaceAuditLogSummary> = {},
): WorkspaceAuditLogSummary {
  return {
    id: "audit-1",
    action: "report.subscription.delivered",
    targetType: "report_subscription",
    targetId: "subscription-leadership-weekly",
    summary: "Report delivered.",
    actorEmail: "owner@example.com",
    metadata: {},
    createdAt: "2026-05-19T09:00:00.000Z",
    ...overrides,
  };
}
