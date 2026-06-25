export type NotificationRouteTopic =
  | "review"
  | "publishing"
  | "automation"
  | "team"
  | "security"
  | "general";

export type NotificationRouteChannel =
  | "in_app"
  | "slack"
  | "teams"
  | "email_digest";

export type NotificationRouteStatus =
  | "ready"
  | "quiet"
  | "recovery"
  | "muted"
  | "review";

export type NotificationRoutingStatus = "ready" | "review" | "blocked";

export type NotificationQuietHoursPreference = {
  enabled: boolean;
  startHour: number;
  endHour: number;
  timezoneLabel: string;
  digestDuringQuietHours: boolean;
  urgentBypassTopics: NotificationRouteTopic[];
};

export type NotificationTopicSubscription = {
  topic: NotificationRouteTopic;
  channels: NotificationRouteChannel[];
  digest: boolean;
  muted: boolean;
};

export type NotificationDigestPreference = {
  enabled: boolean;
  cadence: "daily" | "weekly";
  hour: number;
  maxPreviewItems: number;
};

export type NotificationRoutingPreferences = {
  quietHours: NotificationQuietHoursPreference;
  subscriptions: NotificationTopicSubscription[];
  digest: NotificationDigestPreference;
};

export type NotificationChannelStatus = {
  channel: NotificationRouteChannel;
  configured: boolean;
  lastFailureAt?: string | null;
  lastFailureReason?: string | null;
  retryAfterMinutes?: number | null;
};

export type NotificationRoutePlan = {
  topic: NotificationRouteTopic;
  status: NotificationRouteStatus;
  label: string;
  unreadCount: number;
  subscribedChannels: NotificationRouteChannel[];
  immediateChannels: NotificationRouteChannel[];
  deferredChannels: NotificationRouteChannel[];
  unavailableChannels: NotificationRouteChannel[];
  reason: string;
};

export type NotificationDigestPreviewItem = {
  id: string;
  topic: NotificationRouteTopic;
  title: string;
  body: string;
  targetHref: string | null;
  createdAt: string;
};

export type NotificationDigestPreview = {
  enabled: boolean;
  scheduledFor: string;
  cadence: NotificationDigestPreference["cadence"];
  totalUnread: number;
  topicCounts: Record<NotificationRouteTopic, number>;
  items: NotificationDigestPreviewItem[];
};

export type NotificationFailureRecovery = {
  channel: NotificationRouteChannel;
  label: string;
  lastFailureAt: string;
  reason: string;
  retryAfterMinutes: number | null;
  fallbackChannels: NotificationRouteChannel[];
  affectedTopics: NotificationRouteTopic[];
  nextAction: string;
};

export type NotificationPreferenceRoutingCenter = {
  status: NotificationRoutingStatus;
  score: number;
  quietHours: NotificationQuietHoursPreference & {
    active: boolean;
    resumesAt: string | null;
  };
  routePlans: NotificationRoutePlan[];
  digestPreview: NotificationDigestPreview;
  failureRecovery: NotificationFailureRecovery[];
  nextActions: string[];
  totals: {
    notifications: number;
    unread: number;
    subscribedTopics: number;
    activeImmediateRoutes: number;
    deferredRoutes: number;
    failedChannels: number;
  };
};
