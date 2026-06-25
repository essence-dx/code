import type {
  NotificationFailureRecovery,
  NotificationRouteChannel,
} from "@/features/notifications/notification-preference-routing-types";
import type {
  StakeholderDigestFailureRecovery,
  StakeholderReportingAudienceRole,
  StakeholderReportingDeliveryHistoryItem,
  StakeholderReportingDeliveryStatus,
  StakeholderReportingStatus,
  StakeholderReportingSubscription,
  StakeholderReportingSubscriptionCenter,
  StakeholderReportingSubscriptionInput,
  StakeholderRoleSafeDashboard,
  StakeholderRoleSafety,
} from "@/features/reports/stakeholder-reporting-subscriptions-types";

export type {
  StakeholderDigestFailureRecovery,
  StakeholderReportingAudienceRole,
  StakeholderReportingCadence,
  StakeholderReportingDashboardSource,
  StakeholderReportingDeliveryHistoryItem,
  StakeholderReportingDeliveryStatus,
  StakeholderReportingSignedPacket,
  StakeholderReportingStatus,
  StakeholderReportingSubscription,
  StakeholderReportingSubscriptionCenter,
  StakeholderReportingSubscriptionInput,
  StakeholderRoleSafeDashboard,
  StakeholderRoleSafety,
} from "@/features/reports/stakeholder-reporting-subscriptions-types";

export function createStakeholderReportingSubscriptionCenter(
  input: StakeholderReportingSubscriptionInput,
): StakeholderReportingSubscriptionCenter {
  const now = normalizeDate(input.now);
  const generatedAt = now.toISOString();
  const roleSafeDashboards = createRoleSafeDashboards(input);
  const draftSubscriptions = createSubscriptions({
    input,
    roleSafeDashboards,
    now,
  });
  const draftDeliveryHistory = createDeliveryHistory({
    auditLogs: input.auditLogs,
  });
  const digestFailureRecoveries = createDigestFailureRecoveries({
    notificationFailures: input.notificationRouting.failureRecovery,
    deliveryHistory: draftDeliveryHistory,
    subscriptions: draftSubscriptions,
  });
  const deliveryHistory = draftDeliveryHistory.map((delivery) => ({
    ...delivery,
    recoveryPlanId:
      delivery.status === "failed"
        ? (findRecoveryForChannel(digestFailureRecoveries, delivery.channel)
            ?.id ?? null)
        : null,
  }));
  const subscriptions = applyDeliveryPressure({
    subscriptions: draftSubscriptions,
    deliveryHistory,
    digestFailureRecoveries,
  });
  const signedPackets = createSignedPackets({
    workspaceName: input.workspaceName,
    generatedAt,
    subscriptions,
    deliveryHistory,
    digestFailureRecoveries,
    auditLogIds: input.auditLogs.map((log) => log.id),
  });
  const status = aggregateStatus([
    ...subscriptions.map((subscription) => subscription.status),
    ...digestFailureRecoveries.map((recovery) => recovery.status),
  ]);
  const score = scoreCenter({
    subscriptions,
    deliveryHistory,
    digestFailureRecoveries,
  });
  const nextActions = createNextActions({
    subscriptions,
    digestFailureRecoveries,
    roleSafeDashboards,
  });

  return {
    generatedAt,
    workspaceName: input.workspaceName,
    status,
    score,
    roleSafeDashboards,
    subscriptions,
    signedPackets,
    deliveryHistory,
    digestFailureRecoveries,
    nextActions,
    totals: {
      roleSafeDashboards: roleSafeDashboards.length,
      subscriptions: subscriptions.length,
      signedPackets: signedPackets.length,
      deliveryHistory: deliveryHistory.length,
      digestFailureRecoveries: digestFailureRecoveries.length,
      blockedSubscriptions: subscriptions.filter(
        (subscription) => subscription.status === "blocked",
      ).length,
      failedDeliveries: deliveryHistory.filter(
        (delivery) => delivery.status === "failed",
      ).length,
    },
  };
}

function createRoleSafeDashboards(
  input: StakeholderReportingSubscriptionInput,
): StakeholderRoleSafeDashboard[] {
  const reportDashboards = input.reportDashboards.dashboards
    .filter(
      (dashboard) => dashboard.exportReady && dashboard.status !== "blocked",
    )
    .map((dashboard): StakeholderRoleSafeDashboard => {
      const allowedRoles = rolesForAudience(dashboard.audience);

      return {
        id: dashboard.id,
        source: "report-dashboard",
        title: dashboard.title,
        status: dashboard.status,
        score: dashboard.score,
        audience: dashboard.audience,
        allowedRoles,
        redactedFields: defaultRedactedFields,
        summary: dashboard.summary,
        href: null,
        evidenceIds: [
          ...dashboard.blockIds,
          ...dashboard.refreshPlanIds,
          ...dashboard.staleWarningIds,
        ],
      };
    });
  const safeRooms = input.clientHandoffRooms.rooms
    .filter((room) => room.stakeholderView.safeShare)
    .map(
      (room): StakeholderRoleSafeDashboard => ({
        id: room.id,
        source: "client-handoff-room",
        title: room.projectName,
        status: room.status,
        score: room.score,
        audience: room.stakeholderView.label,
        allowedRoles: ["client", "stakeholder"],
        redactedFields: unique([
          ...room.stakeholderView.redactions,
          ...defaultRedactedFields,
        ]),
        summary: room.analyticsSnapshot.summary,
        href: room.stakeholderView.href,
        evidenceIds: [
          room.analyticsSnapshot.id,
          room.evidenceBundle.id,
          ...room.deliveryTimeline.milestones.map((milestone) => milestone.id),
        ],
      }),
    );

  return [...reportDashboards, ...safeRooms].sort(compareRoleSafeDashboards);
}

function createSubscriptions(input: {
  input: StakeholderReportingSubscriptionInput;
  roleSafeDashboards: StakeholderRoleSafeDashboard[];
  now: Date;
}): StakeholderReportingSubscription[] {
  const leadershipDashboards = input.roleSafeDashboards.filter(
    (dashboard) =>
      dashboard.source === "report-dashboard" &&
      dashboard.allowedRoles.some((role) => role === "owner"),
  );
  const publishingDashboards = input.roleSafeDashboards.filter(
    (dashboard) =>
      dashboard.source === "report-dashboard" &&
      dashboard.allowedRoles.includes("member"),
  );
  const clientRooms = input.roleSafeDashboards.filter(
    (dashboard) => dashboard.source === "client-handoff-room",
  );
  const weeklyDigest = findDigestPacket(input.input, "weekly");
  const dailyDigest = findDigestPacket(input.input, "daily");

  return [
    createSubscription({
      id: "subscription-leadership-weekly",
      title: "Leadership weekly report",
      cadence: "weekly",
      channel: "email_digest",
      recipientRole: "admin",
      recipientCount: countRecipients(input.input.teamManagement, [
        "owner",
        "admin",
      ]),
      nextRunAt:
        weeklyDigest?.scheduledFor ??
        createFutureDate(input.now, 7).toISOString(),
      dashboards: leadershipDashboards,
      roomIds: [],
      digestPacketIds: weeklyDigest ? [weeklyDigest.id] : [],
      missingReasons: weeklyDigest
        ? []
        : ["Weekly intelligence digest missing."],
      summary:
        "Executive-ready report subscription for leadership dashboards and weekly workspace intelligence.",
    }),
    createSubscription({
      id: "subscription-publishing-daily",
      title: "Publishing daily report",
      cadence: "daily",
      channel: "email_digest",
      recipientRole: "member",
      recipientCount: countRecipients(input.input.teamManagement, [
        "admin",
        "member",
      ]),
      nextRunAt:
        dailyDigest?.scheduledFor ??
        input.input.notificationRouting.digestPreview.scheduledFor,
      dashboards: publishingDashboards,
      roomIds: [],
      digestPacketIds: dailyDigest ? [dailyDigest.id] : [],
      missingReasons: dailyDigest ? [] : ["Daily intelligence digest missing."],
      summary:
        "Daily publishing report subscription for channel freshness, review work, and operational handoffs.",
    }),
    createSubscription({
      id: "subscription-client-stakeholder",
      title: "Client stakeholder report",
      cadence: "weekly",
      channel: "email_digest",
      recipientRole: "client",
      recipientCount: clientRooms.length,
      nextRunAt:
        nextClientDeliveryAt(input.input) ??
        weeklyDigest?.scheduledFor ??
        createFutureDate(input.now, 7).toISOString(),
      dashboards: clientRooms,
      roomIds: clientRooms.map((room) => room.id),
      digestPacketIds: weeklyDigest ? [weeklyDigest.id] : [],
      missingReasons: clientRooms.length
        ? []
        : ["No safe client handoff room is ready."],
      summary:
        "Stakeholder-safe client delivery subscription with redacted analytics rooms and recurring evidence packets.",
    }),
    createSubscription({
      id: "subscription-digest-recovery",
      title: "Digest failure recovery report",
      cadence: "on-demand",
      channel: "email_digest",
      recipientRole: "admin",
      recipientCount: countRecipients(input.input.teamManagement, [
        "owner",
        "admin",
      ]),
      nextRunAt: nextRecoveryRunAt(
        input.now,
        input.input.notificationRouting.failureRecovery,
      ).toISOString(),
      dashboards: leadershipDashboards.slice(0, 1),
      roomIds: [],
      digestPacketIds: [dailyDigest?.id, weeklyDigest?.id].filter(
        (id): id is string => Boolean(id),
      ),
      missingReasons: input.input.notificationRouting.failureRecovery.length
        ? ["Digest channel has active delivery failures."]
        : [],
      summary:
        "Admin recovery subscription for failed stakeholder digests and fallback delivery proof.",
      forceStatus: input.input.notificationRouting.failureRecovery.length
        ? "blocked"
        : "ready",
    }),
  ];
}

function createSubscription(input: {
  id: string;
  title: string;
  cadence: StakeholderReportingSubscription["cadence"];
  channel: NotificationRouteChannel;
  recipientRole: StakeholderReportingAudienceRole;
  recipientCount: number;
  nextRunAt: string;
  dashboards: StakeholderRoleSafeDashboard[];
  roomIds: string[];
  digestPacketIds: string[];
  missingReasons: string[];
  summary: string;
  forceStatus?: StakeholderReportingStatus;
}): StakeholderReportingSubscription {
  const roleSafety = createRoleSafety({
    dashboards: input.dashboards,
    missingReasons: input.missingReasons,
  });
  const status =
    input.forceStatus ??
    aggregateStatus([
      roleSafety.status,
      ...input.dashboards.map((dashboard) => dashboard.status),
      input.recipientCount > 0 ? "ready" : "review",
    ]);
  const score = scoreSubscription({
    status,
    dashboards: input.dashboards,
    recipientCount: input.recipientCount,
    missingReasons: input.missingReasons,
  });

  return {
    id: input.id,
    title: input.title,
    status,
    score,
    cadence: input.cadence,
    channel: input.channel,
    recipientRole: input.recipientRole,
    recipientCount: input.recipientCount,
    nextRunAt: input.nextRunAt,
    dashboardIds: input.dashboards
      .filter((dashboard) => dashboard.source === "report-dashboard")
      .map((dashboard) => dashboard.id),
    roomIds: input.roomIds,
    digestPacketIds: input.digestPacketIds,
    roleSafety,
    summary: input.summary,
    nextAction: createSubscriptionNextAction({
      title: input.title,
      status,
      missingReasons: input.missingReasons,
      recipientCount: input.recipientCount,
    }),
  };
}

function createRoleSafety(input: {
  dashboards: StakeholderRoleSafeDashboard[];
  missingReasons: string[];
}): StakeholderRoleSafety {
  const unsafeReasons = [...input.missingReasons];
  const allowedRoles = uniqueRoles(
    input.dashboards.flatMap((dashboard) => dashboard.allowedRoles),
  );
  const redactedFields = unique([
    ...defaultRedactedFields,
    ...input.dashboards.flatMap((dashboard) => dashboard.redactedFields),
  ]);

  if (!input.dashboards.length) {
    unsafeReasons.push("No role-safe dashboard source is available.");
  }

  return {
    status: unsafeReasons.length ? "review" : "ready",
    allowedRoles,
    redactedFields,
    unsafeReasons: unique(unsafeReasons),
  };
}

function createDeliveryHistory(input: {
  auditLogs: StakeholderReportingSubscriptionInput["auditLogs"];
}): StakeholderReportingDeliveryHistoryItem[] {
  return input.auditLogs
    .filter((log) => log.action.startsWith("report.subscription."))
    .map((log): StakeholderReportingDeliveryHistoryItem => {
      const status: StakeholderReportingDeliveryStatus = log.action.includes(
        "failed",
      )
        ? "failed"
        : "delivered";
      const channel = normalizeChannel(
        getMetadataString(log.metadata, "channel"),
      );

      return {
        id: `delivery-${log.id}`,
        subscriptionId: log.targetId ?? "subscription-unknown",
        status,
        channel,
        recipientEmail: getMetadataString(log.metadata, "recipientEmail"),
        packetId: getMetadataString(log.metadata, "packetId"),
        deliveredAt: log.createdAt,
        failureReason:
          status === "failed"
            ? (getMetadataString(log.metadata, "failureReason") ?? log.summary)
            : null,
        recoveryPlanId: null,
        auditLogId: log.id,
      };
    })
    .sort(
      (left, right) =>
        Date.parse(right.deliveredAt) - Date.parse(left.deliveredAt),
    );
}

function createDigestFailureRecoveries(input: {
  notificationFailures: NotificationFailureRecovery[];
  deliveryHistory: StakeholderReportingDeliveryHistoryItem[];
  subscriptions: StakeholderReportingSubscription[];
}): StakeholderDigestFailureRecovery[] {
  const channelMap = new Map<
    NotificationRouteChannel,
    NotificationFailureRecovery
  >();

  for (const failure of input.notificationFailures) {
    channelMap.set(failure.channel, failure);
  }

  for (const delivery of input.deliveryHistory) {
    if (delivery.status !== "failed" || channelMap.has(delivery.channel)) {
      continue;
    }

    channelMap.set(delivery.channel, {
      channel: delivery.channel,
      label: channelLabels[delivery.channel],
      lastFailureAt: delivery.deliveredAt,
      reason: delivery.failureReason ?? "Delivery failed.",
      retryAfterMinutes: 30,
      fallbackChannels: ["in_app"],
      affectedTopics: ["general"],
      nextAction: "Retry the failed stakeholder report delivery.",
    });
  }

  return [...channelMap.values()]
    .map((failure): StakeholderDigestFailureRecovery => {
      const failedDeliveryIds = input.deliveryHistory
        .filter(
          (delivery) =>
            delivery.status === "failed" &&
            delivery.channel === failure.channel,
        )
        .map((delivery) => delivery.id);
      const affectedSubscriptionIds = input.subscriptions
        .filter((subscription) => subscription.channel === failure.channel)
        .map((subscription) => subscription.id);

      return {
        id: `recovery-${slugify(failure.channel)}`,
        status: "blocked",
        channel: failure.channel,
        label: failure.label,
        lastFailureAt: failure.lastFailureAt,
        reason: failure.reason,
        retryAfterMinutes: failure.retryAfterMinutes,
        fallbackChannels: failure.fallbackChannels,
        affectedSubscriptionIds,
        failedDeliveryIds,
        nextAction: `Reissue ${failure.label.toLowerCase()} for ${affectedSubscriptionIds.length} subscription${affectedSubscriptionIds.length === 1 ? "" : "s"} through ${formatChannelList(failure.fallbackChannels)}. ${failure.nextAction}`,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

function applyDeliveryPressure(input: {
  subscriptions: StakeholderReportingSubscription[];
  deliveryHistory: StakeholderReportingDeliveryHistoryItem[];
  digestFailureRecoveries: StakeholderDigestFailureRecovery[];
}): StakeholderReportingSubscription[] {
  const failedSubscriptionIds = new Set(
    input.deliveryHistory
      .filter((delivery) => delivery.status === "failed")
      .map((delivery) => delivery.subscriptionId),
  );
  const failedChannels = new Set(
    input.digestFailureRecoveries.map((recovery) => recovery.channel),
  );

  return input.subscriptions.map((subscription) => {
    const hasFailedDelivery = failedSubscriptionIds.has(subscription.id);
    const hasChannelFailure =
      failedChannels.has(subscription.channel) &&
      subscription.id === "subscription-digest-recovery";
    const status =
      hasFailedDelivery || hasChannelFailure ? "blocked" : subscription.status;

    return {
      ...subscription,
      status,
      score:
        status === subscription.status
          ? subscription.score
          : Math.max(0, subscription.score - 28),
      nextAction: hasFailedDelivery
        ? `Reissue ${subscription.title.toLowerCase()} after failed delivery recovery.`
        : subscription.nextAction,
    };
  });
}

function createSignedPackets(input: {
  workspaceName: string;
  generatedAt: string;
  subscriptions: StakeholderReportingSubscription[];
  deliveryHistory: StakeholderReportingDeliveryHistoryItem[];
  digestFailureRecoveries: StakeholderDigestFailureRecovery[];
  auditLogIds: string[];
}) {
  return input.subscriptions.map((subscription) => {
    const deliveryHistoryIds = input.deliveryHistory
      .filter((delivery) => delivery.subscriptionId === subscription.id)
      .map((delivery) => delivery.id);
    const recoveryPlanIds = input.digestFailureRecoveries
      .filter((recovery) =>
        recovery.affectedSubscriptionIds.includes(subscription.id),
      )
      .map((recovery) => recovery.id);
    const payloadWithoutSignature = {
      kind: "essence-studio.stakeholder-reporting-subscription",
      schemaVersion: 1,
      workspaceName: input.workspaceName,
      generatedAt: input.generatedAt,
      subscription: {
        id: subscription.id,
        title: subscription.title,
        cadence: subscription.cadence,
        channel: subscription.channel,
        status: subscription.status,
        score: subscription.score,
        recipientRole: subscription.recipientRole,
        recipientCount: subscription.recipientCount,
        nextRunAt: subscription.nextRunAt,
        dashboardIds: subscription.dashboardIds,
        roomIds: subscription.roomIds,
        digestPacketIds: subscription.digestPacketIds,
      },
      roleSafety: subscription.roleSafety,
      deliveryHistoryIds,
      recoveryPlanIds,
      auditLogIds: input.auditLogIds,
    };
    const signature = `essence-signature-${hashString(
      JSON.stringify(payloadWithoutSignature),
    )}`;
    const payload = {
      ...payloadWithoutSignature,
      signature,
    };
    const json = JSON.stringify(payload, null, 2);

    return {
      id: packetIdForSubscription(subscription.id),
      subscriptionId: subscription.id,
      status: subscription.status,
      generatedAt: input.generatedAt,
      signature,
      fileName: `${slugify(subscription.id)}-${input.generatedAt.slice(0, 10)}.json`,
      dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    };
  });
}

function createNextActions(input: {
  subscriptions: StakeholderReportingSubscription[];
  digestFailureRecoveries: StakeholderDigestFailureRecovery[];
  roleSafeDashboards: StakeholderRoleSafeDashboard[];
}) {
  return unique([
    ...input.digestFailureRecoveries.map((recovery) => recovery.nextAction),
    ...input.subscriptions
      .filter((subscription) => subscription.status !== "ready")
      .map((subscription) => subscription.nextAction),
    input.roleSafeDashboards.length
      ? "Review role-safe dashboard access before the next stakeholder packet run."
      : "Create at least one role-safe dashboard before enabling stakeholder reports.",
  ]).slice(0, 6);
}

function createSubscriptionNextAction(input: {
  title: string;
  status: StakeholderReportingStatus;
  missingReasons: string[];
  recipientCount: number;
}) {
  if (input.recipientCount === 0) {
    return `${input.title}: add recipients before enabling this subscription.`;
  }

  if (input.missingReasons.length) {
    return `${input.title}: ${input.missingReasons[0]}`;
  }

  if (input.status === "review") {
    return `${input.title}: review report freshness before the next packet run.`;
  }

  if (input.status === "blocked") {
    return `${input.title}: repair blockers before stakeholder delivery.`;
  }

  return `${input.title}: keep the next signed packet on schedule.`;
}

function scoreCenter(input: {
  subscriptions: StakeholderReportingSubscription[];
  deliveryHistory: StakeholderReportingDeliveryHistoryItem[];
  digestFailureRecoveries: StakeholderDigestFailureRecovery[];
}) {
  const blocked = input.subscriptions.filter(
    (subscription) => subscription.status === "blocked",
  ).length;
  const review = input.subscriptions.filter(
    (subscription) => subscription.status === "review",
  ).length;
  const failedDeliveries = input.deliveryHistory.filter(
    (delivery) => delivery.status === "failed",
  ).length;

  return Math.max(
    0,
    Math.min(
      100,
      100 -
        blocked * 16 -
        review * 8 -
        failedDeliveries * 10 -
        input.digestFailureRecoveries.length * 10,
    ),
  );
}

function scoreSubscription(input: {
  status: StakeholderReportingStatus;
  dashboards: StakeholderRoleSafeDashboard[];
  recipientCount: number;
  missingReasons: string[];
}) {
  const dashboardScore = input.dashboards.length
    ? average(input.dashboards.map((dashboard) => dashboard.score))
    : 50;
  const penalty =
    input.missingReasons.length * 12 + (input.recipientCount ? 0 : 25);
  const statusPenalty =
    input.status === "blocked" ? 20 : input.status === "review" ? 8 : 0;

  return Math.max(0, Math.min(100, dashboardScore - penalty - statusPenalty));
}

function rolesForAudience(
  audience: string,
): StakeholderReportingAudienceRole[] {
  const normalized = audience.toLowerCase();

  if (normalized.includes("leadership") || normalized.includes("executive")) {
    return ["owner", "admin"];
  }

  if (normalized.includes("client") || normalized.includes("stakeholder")) {
    return ["client", "stakeholder"];
  }

  return ["admin", "member"];
}

function countRecipients(
  workspaces: StakeholderReportingSubscriptionInput["teamManagement"],
  roles: StakeholderReportingAudienceRole[],
) {
  const allowed = new Set(roles);
  const emails = new Set<string>();

  for (const workspace of workspaces) {
    for (const member of workspace.members) {
      if (allowed.has(member.role)) {
        emails.add(member.email);
      }
    }
  }

  return emails.size;
}

function findDigestPacket(
  input: StakeholderReportingSubscriptionInput,
  cadence: "daily" | "weekly",
) {
  return input.workspaceIntelligence.digestPackets.find(
    (packet) => packet.cadence === cadence,
  );
}

function nextClientDeliveryAt(input: StakeholderReportingSubscriptionInput) {
  return input.clientHandoffRooms.rooms
    .filter((room) => room.stakeholderView.safeShare)
    .map((room) => room.deliveryTimeline.nextDeliveryAt)
    .filter((date): date is string => Boolean(date))
    .sort()[0];
}

function nextRecoveryRunAt(now: Date, failures: NotificationFailureRecovery[]) {
  const retryAfterMinutes = failures
    .map((failure) => failure.retryAfterMinutes)
    .filter((value): value is number => typeof value === "number")
    .sort((left, right) => left - right)[0];

  return new Date(now.getTime() + (retryAfterMinutes ?? 30) * 60 * 1000);
}

function createFutureDate(now: Date, days: number) {
  return new Date(now.getTime() + days * dayMilliseconds);
}

function findRecoveryForChannel(
  recoveries: StakeholderDigestFailureRecovery[],
  channel: NotificationRouteChannel,
) {
  return recoveries.find((recovery) => recovery.channel === channel);
}

function aggregateStatus(statuses: StakeholderReportingStatus[]) {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("review")) return "review";

  return "ready";
}

function compareRoleSafeDashboards(
  left: StakeholderRoleSafeDashboard,
  right: StakeholderRoleSafeDashboard,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    right.score - left.score ||
    left.title.localeCompare(right.title)
  );
}

function statusWeight(status: StakeholderReportingStatus) {
  if (status === "blocked") return 2;
  if (status === "review") return 1;

  return 0;
}

function getMetadataString(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];

  return typeof value === "string" && value.trim() ? value : null;
}

function normalizeChannel(value: string | null): NotificationRouteChannel {
  if (
    value === "in_app" ||
    value === "slack" ||
    value === "teams" ||
    value === "email_digest"
  ) {
    return value;
  }

  return "email_digest";
}

function formatChannelList(channels: NotificationRouteChannel[]) {
  return channels.map((channel) => channelLabels[channel]).join(", ");
}

function packetIdForSubscription(subscriptionId: string) {
  return `packet-${subscriptionId.replace(/^subscription-/, "")}`;
}

function normalizeDate(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function average(values: number[]) {
  if (!values.length) return 100;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function uniqueRoles(values: StakeholderReportingAudienceRole[]) {
  return [...new Set(values)];
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "report"
  );
}

function hashString(value: string) {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(16);
}

const defaultRedactedFields = [
  "raw actor emails",
  "internal audit metadata",
  "private team operations",
];

const channelLabels: Record<NotificationRouteChannel, string> = {
  in_app: "In-app",
  slack: "Slack",
  teams: "Teams",
  email_digest: "Email digest",
};

const dayMilliseconds = 24 * 60 * 60 * 1000;
