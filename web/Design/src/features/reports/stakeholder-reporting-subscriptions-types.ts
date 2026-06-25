import type { TeamWorkspaceManagementSummary } from "@/db/team-workspace-management";
import type { WorkspaceAuditLogSummary } from "@/db/workspace-audit-logs";
import type { ClientAnalyticsHandoffRoomCenter } from "@/features/client-portal/client-analytics-handoff-rooms";
import type {
  NotificationPreferenceRoutingCenter,
  NotificationRouteChannel,
} from "@/features/notifications/notification-preference-routing-types";
import type { DataConnectedReportDashboardCenter } from "@/features/reports/data-connected-report-dashboards";
import type { WorkspaceIntelligenceBriefingCenter } from "@/features/workspace-intelligence/workspace-intelligence-briefings";

export type StakeholderReportingStatus = "ready" | "review" | "blocked";

export type StakeholderReportingAudienceRole =
  | "owner"
  | "admin"
  | "member"
  | "client"
  | "stakeholder";

export type StakeholderReportingCadence = "daily" | "weekly" | "on-demand";

export type StakeholderReportingDashboardSource =
  | "report-dashboard"
  | "client-handoff-room";

export type StakeholderReportingDeliveryStatus = "delivered" | "failed";

export type StakeholderReportingSubscriptionInput = {
  workspaceName: string;
  reportDashboards: DataConnectedReportDashboardCenter;
  clientHandoffRooms: ClientAnalyticsHandoffRoomCenter;
  workspaceIntelligence: WorkspaceIntelligenceBriefingCenter;
  notificationRouting: NotificationPreferenceRoutingCenter;
  teamManagement: TeamWorkspaceManagementSummary[];
  auditLogs: WorkspaceAuditLogSummary[];
  now?: string | Date;
};

export type StakeholderRoleSafety = {
  status: StakeholderReportingStatus;
  allowedRoles: StakeholderReportingAudienceRole[];
  redactedFields: string[];
  unsafeReasons: string[];
};

export type StakeholderRoleSafeDashboard = {
  id: string;
  source: StakeholderReportingDashboardSource;
  title: string;
  status: StakeholderReportingStatus;
  score: number;
  audience: string;
  allowedRoles: StakeholderReportingAudienceRole[];
  redactedFields: string[];
  summary: string;
  href: string | null;
  evidenceIds: string[];
};

export type StakeholderReportingSubscription = {
  id: string;
  title: string;
  status: StakeholderReportingStatus;
  score: number;
  cadence: StakeholderReportingCadence;
  channel: NotificationRouteChannel;
  recipientRole: StakeholderReportingAudienceRole;
  recipientCount: number;
  nextRunAt: string;
  dashboardIds: string[];
  roomIds: string[];
  digestPacketIds: string[];
  roleSafety: StakeholderRoleSafety;
  summary: string;
  nextAction: string;
};

export type StakeholderReportingSignedPacket = {
  id: string;
  subscriptionId: string;
  status: StakeholderReportingStatus;
  generatedAt: string;
  signature: string;
  fileName: string;
  dataUrl: string;
  json: string;
};

export type StakeholderReportingDeliveryHistoryItem = {
  id: string;
  subscriptionId: string;
  status: StakeholderReportingDeliveryStatus;
  channel: NotificationRouteChannel;
  recipientEmail: string | null;
  packetId: string | null;
  deliveredAt: string;
  failureReason: string | null;
  recoveryPlanId: string | null;
  auditLogId: string;
};

export type StakeholderDigestFailureRecovery = {
  id: string;
  status: StakeholderReportingStatus;
  channel: NotificationRouteChannel;
  label: string;
  lastFailureAt: string;
  reason: string;
  retryAfterMinutes: number | null;
  fallbackChannels: NotificationRouteChannel[];
  affectedSubscriptionIds: string[];
  failedDeliveryIds: string[];
  nextAction: string;
};

export type StakeholderReportingSubscriptionCenter = {
  generatedAt: string;
  workspaceName: string;
  status: StakeholderReportingStatus;
  score: number;
  roleSafeDashboards: StakeholderRoleSafeDashboard[];
  subscriptions: StakeholderReportingSubscription[];
  signedPackets: StakeholderReportingSignedPacket[];
  deliveryHistory: StakeholderReportingDeliveryHistoryItem[];
  digestFailureRecoveries: StakeholderDigestFailureRecovery[];
  nextActions: string[];
  totals: {
    roleSafeDashboards: number;
    subscriptions: number;
    signedPackets: number;
    deliveryHistory: number;
    digestFailureRecoveries: number;
    blockedSubscriptions: number;
    failedDeliveries: number;
  };
};
