import type { UserNotificationSummary } from "@/db/notifications";
import type {
  NotificationChannelStatus,
  NotificationDigestPreference,
  NotificationDigestPreview,
  NotificationFailureRecovery,
  NotificationPreferenceRoutingCenter,
  NotificationQuietHoursPreference,
  NotificationRouteChannel,
  NotificationRoutePlan,
  NotificationRouteStatus,
  NotificationRouteTopic,
  NotificationRoutingPreferences,
  NotificationTopicSubscription,
} from "@/features/notifications/notification-preference-routing-types";

export type {
  NotificationChannelStatus,
  NotificationDigestPreference,
  NotificationDigestPreview,
  NotificationDigestPreviewItem,
  NotificationFailureRecovery,
  NotificationPreferenceRoutingCenter,
  NotificationQuietHoursPreference,
  NotificationRouteChannel,
  NotificationRoutePlan,
  NotificationRouteStatus,
  NotificationRouteTopic,
  NotificationRoutingPreferences,
  NotificationRoutingStatus,
  NotificationTopicSubscription,
} from "@/features/notifications/notification-preference-routing-types";

export function createDefaultNotificationRoutingPreferences(
  overrides: Partial<NotificationRoutingPreferences> = {},
): NotificationRoutingPreferences {
  return {
    quietHours: {
      enabled: true,
      startHour: 18,
      endHour: 8,
      timezoneLabel: "local",
      digestDuringQuietHours: true,
      urgentBypassTopics: ["security"],
      ...overrides.quietHours,
    },
    subscriptions:
      overrides.subscriptions ??
      notificationTopics.map((topic) => ({
        topic,
        channels:
          topic === "security"
            ? ([
                "in_app",
                "slack",
                "email_digest",
              ] as NotificationRouteChannel[])
            : ([
                "in_app",
                "email_digest",
                topic === "publishing" ? "teams" : "slack",
              ] as NotificationRouteChannel[]),
        digest: topic !== "security",
        muted: false,
      })),
    digest: {
      enabled: true,
      cadence: "daily",
      hour: 9,
      maxPreviewItems: 5,
      ...overrides.digest,
    },
  };
}

export function createWorkspaceNotificationChannelStatuses(
  env: Record<string, string | undefined> = process.env,
): NotificationChannelStatus[] {
  const teamsUrl = env.MICROSOFT_TEAMS_WEBHOOK_URL ?? env.TEAMS_WEBHOOK_URL;

  return [
    { channel: "in_app", configured: true },
    { channel: "email_digest", configured: true },
    { channel: "slack", configured: Boolean(env.SLACK_WEBHOOK_URL) },
    { channel: "teams", configured: Boolean(teamsUrl) },
  ];
}

export function createNotificationPreferenceRoutingCenter(input: {
  notifications: UserNotificationSummary[];
  preferences?: NotificationRoutingPreferences;
  channels?: NotificationChannelStatus[];
  now?: string;
}): NotificationPreferenceRoutingCenter {
  const preferences =
    input.preferences ?? createDefaultNotificationRoutingPreferences();
  const channels =
    input.channels ?? createWorkspaceNotificationChannelStatuses({});
  const now = parseDate(input.now ?? new Date().toISOString());
  const quietActive = isInsideQuietHours(now, preferences.quietHours);
  const resumesAt =
    quietActive && preferences.quietHours.enabled
      ? createQuietHoursResumeAt(now, preferences.quietHours).toISOString()
      : null;
  const unreadNotifications = input.notifications.filter(
    (notification) => !notification.readAt,
  );
  const unreadByTopic = createUnreadTopicMap(unreadNotifications);
  const routePlans = preferences.subscriptions.map((subscription) =>
    createRoutePlan({
      subscription,
      channels,
      quietActive,
      quietHours: preferences.quietHours,
      unreadCount: unreadByTopic.get(subscription.topic)?.length ?? 0,
    }),
  );
  const digestPreview = createDigestPreview({
    notifications: unreadNotifications,
    preferences,
    now,
    quietResumesAt: resumesAt,
  });
  const failureRecovery = createFailureRecovery({
    channels,
    routePlans,
  });
  const score = createRoutingScore(routePlans, failureRecovery);
  const status = score < 50 ? "blocked" : score < 90 ? "review" : "ready";

  return {
    status,
    score,
    quietHours: {
      ...preferences.quietHours,
      active: quietActive,
      resumesAt,
    },
    routePlans,
    digestPreview,
    failureRecovery,
    nextActions: createNextActions(routePlans, failureRecovery, quietActive),
    totals: {
      notifications: input.notifications.length,
      unread: unreadNotifications.length,
      subscribedTopics: routePlans.filter((route) => route.status !== "muted")
        .length,
      activeImmediateRoutes: routePlans.reduce(
        (total, route) => total + route.immediateChannels.length,
        0,
      ),
      deferredRoutes: routePlans.filter(
        (route) => route.deferredChannels.length > 0,
      ).length,
      failedChannels: failureRecovery.length,
    },
  };
}

const notificationTopics: NotificationRouteTopic[] = [
  "review",
  "publishing",
  "automation",
  "team",
  "security",
  "general",
];

const channelLabels: Record<NotificationRouteChannel, string> = {
  in_app: "In-app",
  slack: "Slack",
  teams: "Microsoft Teams",
  email_digest: "Email digest",
};

const topicLabels: Record<NotificationRouteTopic, string> = {
  review: "Review",
  publishing: "Publishing",
  automation: "Automation",
  team: "Team",
  security: "Security",
  general: "General",
};

function createRoutePlan(input: {
  subscription: NotificationTopicSubscription;
  channels: NotificationChannelStatus[];
  quietActive: boolean;
  quietHours: NotificationQuietHoursPreference;
  unreadCount: number;
}): NotificationRoutePlan {
  const subscribedChannels = [...new Set(input.subscription.channels)];
  const unavailableChannels = subscribedChannels.filter(
    (channel) => !isChannelAvailable(channel, input.channels),
  );
  const failedChannels = subscribedChannels.filter((channel) =>
    hasChannelFailure(channel, input.channels),
  );

  if (input.subscription.muted) {
    return {
      topic: input.subscription.topic,
      status: "muted",
      label: topicLabels[input.subscription.topic],
      unreadCount: input.unreadCount,
      subscribedChannels,
      immediateChannels: [],
      deferredChannels: [],
      unavailableChannels,
      reason: "This topic is muted by workspace notification preferences.",
    };
  }

  const quieted =
    input.quietActive &&
    !input.quietHours.urgentBypassTopics.includes(input.subscription.topic);
  const availableChannels = subscribedChannels.filter((channel) =>
    isChannelAvailable(channel, input.channels),
  );
  const deliverableChannels = availableChannels.filter(
    (channel) => !hasChannelFailure(channel, input.channels),
  );
  const immediateChannels = quieted
    ? deliverableChannels.filter((channel) => channel === "in_app")
    : deliverableChannels.filter(
        (channel) => channel !== "email_digest" || !input.subscription.digest,
      );
  const deferredChannels = sortChannels([
    ...(input.subscription.digest ? ["email_digest" as const] : []),
    ...(quieted
      ? deliverableChannels.filter((channel) => channel !== "in_app")
      : []),
    ...failedChannels,
  ]);
  const status = failedChannels.length
    ? "recovery"
    : quieted
      ? "quiet"
      : unavailableChannels.length
        ? "review"
        : "ready";

  return {
    topic: input.subscription.topic,
    status,
    label: topicLabels[input.subscription.topic],
    unreadCount: input.unreadCount,
    subscribedChannels,
    immediateChannels: sortChannels(immediateChannels),
    deferredChannels,
    unavailableChannels,
    reason: createRouteReason({
      status,
      unavailableChannels,
      failedChannels,
      quieted,
    }),
  };
}

function createDigestPreview(input: {
  notifications: UserNotificationSummary[];
  preferences: NotificationRoutingPreferences;
  now: Date;
  quietResumesAt: string | null;
}): NotificationDigestPreview {
  const topicCounts = createEmptyTopicCounts();
  const subscriptionMap = new Map(
    input.preferences.subscriptions.map((subscription) => [
      subscription.topic,
      subscription,
    ]),
  );
  const digestItems = input.notifications
    .map((notification) => ({
      notification,
      topic: classifyNotificationTopic(notification),
    }))
    .filter(({ topic }) => {
      const subscription = subscriptionMap.get(topic);

      return (
        input.preferences.digest.enabled &&
        subscription?.digest &&
        !subscription.muted
      );
    })
    .sort(
      (left, right) =>
        Date.parse(right.notification.createdAt) -
        Date.parse(left.notification.createdAt),
    );

  for (const item of digestItems) {
    topicCounts[item.topic] += 1;
  }

  return {
    enabled: input.preferences.digest.enabled,
    scheduledFor:
      input.quietResumesAt ??
      createNextDigestAt(input.now, input.preferences.digest).toISOString(),
    cadence: input.preferences.digest.cadence,
    totalUnread: digestItems.length,
    topicCounts,
    items: digestItems
      .slice(0, input.preferences.digest.maxPreviewItems)
      .map(({ notification, topic }) => ({
        id: notification.id,
        topic,
        title: notification.title,
        body: notification.body,
        targetHref: notification.targetHref,
        createdAt: notification.createdAt,
      })),
  };
}

function createFailureRecovery(input: {
  channels: NotificationChannelStatus[];
  routePlans: NotificationRoutePlan[];
}): NotificationFailureRecovery[] {
  return input.channels
    .filter((channel) => channel.lastFailureAt || channel.lastFailureReason)
    .map((channel) => {
      const affectedTopics = input.routePlans
        .filter((route) => route.subscribedChannels.includes(channel.channel))
        .map((route) => route.topic);
      const fallbackChannels = sortChannels(
        [
          ...new Set(
            input.routePlans.flatMap((route) => route.immediateChannels),
          ),
        ]
          .filter((candidate) => candidate !== channel.channel)
          .concat("email_digest"),
      );

      return {
        channel: channel.channel,
        label: channelLabels[channel.channel],
        lastFailureAt: channel.lastFailureAt ?? new Date(0).toISOString(),
        reason: channel.lastFailureReason ?? "Delivery failed.",
        retryAfterMinutes: channel.retryAfterMinutes ?? null,
        fallbackChannels,
        affectedTopics: [...new Set(affectedTopics)],
        nextAction: `Retry ${channelLabels[channel.channel]} delivery and keep ${fallbackChannels.map((fallback) => channelLabels[fallback]).join(", ")} fallback active.`,
      };
    });
}

function createNextActions(
  routePlans: NotificationRoutePlan[],
  recovery: NotificationFailureRecovery[],
  quietActive: boolean,
) {
  const actions = [
    ...recovery.map((item) => item.nextAction),
    ...routePlans
      .filter((route) => route.unavailableChannels.length > 0)
      .map(
        (route) =>
          `Configure ${route.unavailableChannels.map((channel) => channelLabels[channel]).join(", ")} for ${route.label} notifications.`,
      ),
  ];

  if (quietActive) {
    actions.push("Review digest preview before quiet hours release.");
  }

  return [...new Set(actions)].slice(0, 5);
}

function createRoutingScore(
  routes: NotificationRoutePlan[],
  recovery: NotificationFailureRecovery[],
) {
  if (!routes.length) return 0;

  const routeScore =
    routes.reduce((total, route) => total + routeStatusScore(route.status), 0) /
    routes.length;
  const recoveryPenalty = recovery.length * 12;

  return Math.max(0, Math.min(100, Math.round(routeScore - recoveryPenalty)));
}

function routeStatusScore(status: NotificationRouteStatus) {
  if (status === "ready") return 100;
  if (status === "quiet") return 88;
  if (status === "muted") return 78;
  if (status === "recovery") return 70;

  return 62;
}

function createRouteReason(input: {
  status: NotificationRouteStatus;
  unavailableChannels: NotificationRouteChannel[];
  failedChannels: NotificationRouteChannel[];
  quieted: boolean;
}) {
  if (input.failedChannels.length) {
    return `${input.failedChannels.map((channel) => channelLabels[channel]).join(", ")} delivery needs recovery.`;
  }
  if (input.quieted) {
    return "Quiet hours hold external delivery and keep in-app visibility.";
  }
  if (input.unavailableChannels.length) {
    return `${input.unavailableChannels.map((channel) => channelLabels[channel]).join(", ")} is not configured.`;
  }

  return "Subscribed channels can deliver immediately.";
}

function createUnreadTopicMap(notifications: UserNotificationSummary[]) {
  const byTopic = new Map<NotificationRouteTopic, UserNotificationSummary[]>();

  for (const notification of notifications) {
    const topic = classifyNotificationTopic(notification);
    const existing = byTopic.get(topic) ?? [];
    existing.push(notification);
    byTopic.set(topic, existing);
  }

  return byTopic;
}

function classifyNotificationTopic(
  notification: UserNotificationSummary,
): NotificationRouteTopic {
  const text = `${notification.type} ${notification.title}`.toLowerCase();

  if (text.includes("review") || text.includes("approval")) return "review";
  if (
    text.includes("publish") ||
    text.includes("website") ||
    text.includes("content")
  ) {
    return "publishing";
  }
  if (text.includes("automation") || text.includes("recipe")) {
    return "automation";
  }
  if (text.includes("team") || text.includes("invite")) return "team";
  if (
    text.includes("security") ||
    text.includes("auth") ||
    text.includes("factor")
  ) {
    return "security";
  }

  return "general";
}

function isInsideQuietHours(
  now: Date,
  quietHours: NotificationQuietHoursPreference,
) {
  if (!quietHours.enabled) return false;

  const hour = now.getUTCHours();
  const start = normalizeHour(quietHours.startHour);
  const end = normalizeHour(quietHours.endHour);

  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;

  return hour >= start || hour < end;
}

function createQuietHoursResumeAt(
  now: Date,
  quietHours: NotificationQuietHoursPreference,
) {
  const resume = new Date(now);
  const endHour = normalizeHour(quietHours.endHour);

  resume.setUTCHours(endHour, 0, 0, 0);
  if (resume <= now) {
    resume.setUTCDate(resume.getUTCDate() + 1);
  }

  return resume;
}

function createNextDigestAt(now: Date, digest: NotificationDigestPreference) {
  const scheduled = new Date(now);
  scheduled.setUTCHours(normalizeHour(digest.hour), 0, 0, 0);

  if (scheduled <= now) {
    scheduled.setUTCDate(
      scheduled.getUTCDate() + (digest.cadence === "weekly" ? 7 : 1),
    );
  }

  return scheduled;
}

function isChannelAvailable(
  channel: NotificationRouteChannel,
  statuses: NotificationChannelStatus[],
) {
  if (channel === "in_app" || channel === "email_digest") return true;

  return statuses.some(
    (status) => status.channel === channel && status.configured,
  );
}

function hasChannelFailure(
  channel: NotificationRouteChannel,
  statuses: NotificationChannelStatus[],
) {
  return statuses.some(
    (status) =>
      status.channel === channel &&
      Boolean(status.lastFailureAt || status.lastFailureReason),
  );
}

function createEmptyTopicCounts(): Record<NotificationRouteTopic, number> {
  return {
    review: 0,
    publishing: 0,
    automation: 0,
    team: 0,
    security: 0,
    general: 0,
  };
}

function sortChannels(channels: NotificationRouteChannel[]) {
  const order: NotificationRouteChannel[] = [
    "in_app",
    "email_digest",
    "slack",
    "teams",
  ];

  return [...new Set(channels)].sort(
    (left, right) => order.indexOf(left) - order.indexOf(right),
  );
}

function normalizeHour(value: number) {
  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(23, Math.round(value)));
}

function parseDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}
