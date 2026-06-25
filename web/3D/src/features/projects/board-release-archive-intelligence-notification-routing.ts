import type {
  BoardReleaseArchiveIntelligencePacketRecommendation,
  BoardReleaseArchiveIntelligencePacketReport,
} from "@/features/projects/board-release-archive-intelligence-packet";
import { canWorkspaceRoleReceiveNotificationTopic } from "@/features/workspaces/notification-email-delivery";
import {
  isWorkspaceNotificationTopicEnabled,
  normalizeWorkspaceNotificationDeliveryPreferences,
} from "@/features/workspaces/notification-delivery-preferences";
import type { WorkspaceMemberRow, WorkspaceNotificationDeliveryPreference, WorkspaceNotificationTopic, WorkspaceRole } from "@/features/workspaces/types";

export type BoardReleaseArchiveIntelligenceNotificationChannel = "email" | "in-app";
export type BoardReleaseArchiveIntelligenceNotificationSeverity = "critical" | "info" | "warning";
export type BoardReleaseArchiveIntelligenceNotificationRouteStatus = "eligible" | "suppressed-by-preference" | "suppressed-by-role";

export interface BoardReleaseArchiveIntelligenceNotificationCandidate {
  actionLabel: string;
  detail: string;
  id: string;
  recommendationId: string;
  severity: BoardReleaseArchiveIntelligenceNotificationSeverity;
  sourceHash: string;
  title: string;
  topic: WorkspaceNotificationTopic;
}

export interface BoardReleaseArchiveIntelligenceNotificationRoute {
  candidateId: string;
  channel: BoardReleaseArchiveIntelligenceNotificationChannel;
  dedupeKey: string;
  reason: string;
  recipientEmail: string;
  recipientName: string;
  recipientRole: WorkspaceRole;
  status: BoardReleaseArchiveIntelligenceNotificationRouteStatus;
  topic: WorkspaceNotificationTopic;
  userId: string;
}

export interface BoardReleaseArchiveIntelligenceNotificationRoutingReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  notifications: BoardReleaseArchiveIntelligenceNotificationCandidate[];
  routes: BoardReleaseArchiveIntelligenceNotificationRoute[];
  summary: {
    criticalCount: number;
    eligibleRouteCount: number;
    emailEligibleCount: number;
    inAppEligibleCount: number;
    nextAction: string;
    notificationCount: number;
    routeCount: number;
    routingScore: number;
    status: BoardReleaseArchiveIntelligenceNotificationSeverity;
    suppressedByPreferenceCount: number;
    suppressedByRoleCount: number;
    warningCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveIntelligenceNotificationRoutingReportInput {
  generatedAt?: string;
  members: WorkspaceMemberRow[];
  packet: BoardReleaseArchiveIntelligencePacketReport;
  preferencesByUserId?: Map<string, WorkspaceNotificationDeliveryPreference[]>;
  workspaceId?: string;
}

const channels: BoardReleaseArchiveIntelligenceNotificationChannel[] = ["in-app", "email"];

const severityRank: Record<BoardReleaseArchiveIntelligenceNotificationSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "workspace"
  );
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function severityFor(recommendation: BoardReleaseArchiveIntelligencePacketRecommendation): BoardReleaseArchiveIntelligenceNotificationSeverity {
  if (recommendation.status === "blocked" || recommendation.priority === "high") {
    return "critical";
  }

  return recommendation.status === "watch" || recommendation.priority === "medium" ? "warning" : "info";
}

function topicFor(recommendation: BoardReleaseArchiveIntelligencePacketRecommendation): WorkspaceNotificationTopic {
  return recommendation.recommendationKind === "stabilize-trend" ? "release" : "review";
}

function createNotifications(packet: BoardReleaseArchiveIntelligencePacketReport) {
  return packet.recommendations
    .filter((recommendation) => recommendation.status !== "ready")
    .map((recommendation) => ({
      actionLabel: recommendation.action,
      detail: `${recommendation.title} is ${recommendation.status} with ${recommendation.priority} priority in packet ${packet.summary.packetHash}.`,
      id: `board-release-archive-intelligence:${recommendation.recommendationId}`,
      recommendationId: recommendation.recommendationId,
      severity: severityFor(recommendation),
      sourceHash: recommendation.recommendationHash,
      title: `${recommendation.title} routing`,
      topic: topicFor(recommendation),
    }))
    .sort((first, second) => severityRank[first.severity] - severityRank[second.severity] || first.title.localeCompare(second.title));
}

function routeReason(input: {
  channel: BoardReleaseArchiveIntelligenceNotificationChannel;
  member: WorkspaceMemberRow;
  notification: BoardReleaseArchiveIntelligenceNotificationCandidate;
  status: BoardReleaseArchiveIntelligenceNotificationRouteStatus;
}) {
  if (input.status === "eligible") {
    return `${input.member.role} receives ${input.notification.topic} ${input.channel} routing for ${input.notification.recommendationId}.`;
  }

  if (input.status === "suppressed-by-role") {
    return `${input.member.role} cannot receive ${input.notification.topic} archive intelligence routing.`;
  }

  return `${input.channel} is disabled for ${input.notification.topic} notifications.`;
}

function createRoutes(input: {
  members: WorkspaceMemberRow[];
  notifications: BoardReleaseArchiveIntelligenceNotificationCandidate[];
  preferencesByUserId: Map<string, WorkspaceNotificationDeliveryPreference[]>;
  workspaceId: string;
}) {
  const routes: BoardReleaseArchiveIntelligenceNotificationRoute[] = [];

  for (const notification of input.notifications) {
    for (const member of input.members) {
      const preferences = normalizeWorkspaceNotificationDeliveryPreferences(input.preferencesByUserId.get(member.userId) ?? []);

      for (const channel of channels) {
        const roleEligible = canWorkspaceRoleReceiveNotificationTopic(member.role, notification.topic);
        const status: BoardReleaseArchiveIntelligenceNotificationRouteStatus = !roleEligible
          ? "suppressed-by-role"
          : isWorkspaceNotificationTopicEnabled(preferences, notification.topic, channel === "email" ? "email" : "inApp")
            ? "eligible"
            : "suppressed-by-preference";

        routes.push({
          candidateId: notification.id,
          channel,
          dedupeKey: `${input.workspaceId}:${member.userId}:archive-intelligence:${notification.recommendationId}:${channel}`,
          reason: routeReason({
            channel,
            member,
            notification,
            status,
          }),
          recipientEmail: member.email,
          recipientName: member.name,
          recipientRole: member.role,
          status,
          topic: notification.topic,
          userId: member.userId,
        });
      }
    }
  }

  return routes;
}

function createCsv(input: {
  notifications: BoardReleaseArchiveIntelligenceNotificationCandidate[];
  routes: BoardReleaseArchiveIntelligenceNotificationRoute[];
}) {
  const header = ["notification_id", "recommendation_id", "severity", "topic", "title", "eligible_routes", "source_hash", "next_action"];
  const rows = input.notifications.map((notification) =>
    [
      notification.id,
      notification.recommendationId,
      notification.severity,
      notification.topic,
      notification.title,
      input.routes.filter((route) => route.candidateId === notification.id && route.status === "eligible").length,
      notification.sourceHash,
      notification.actionLabel,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...rows].join("\n")}\n`;
}

function summarize(input: {
  notifications: BoardReleaseArchiveIntelligenceNotificationCandidate[];
  routes: BoardReleaseArchiveIntelligenceNotificationRoute[];
}): BoardReleaseArchiveIntelligenceNotificationRoutingReport["summary"] {
  const criticalCount = input.notifications.filter((notification) => notification.severity === "critical").length;
  const warningCount = input.notifications.filter((notification) => notification.severity === "warning").length;
  const eligibleRoutes = input.routes.filter((route) => route.status === "eligible");

  return {
    criticalCount,
    eligibleRouteCount: eligibleRoutes.length,
    emailEligibleCount: eligibleRoutes.filter((route) => route.channel === "email").length,
    inAppEligibleCount: eligibleRoutes.filter((route) => route.channel === "in-app").length,
    nextAction:
      criticalCount > 0
        ? "Route critical archive intelligence recommendations before board archive approval."
        : warningCount > 0
          ? "Route warning-level archive intelligence recommendations before the next archive cycle."
          : "No blocked archive intelligence recommendations need routing.",
    notificationCount: input.notifications.length,
    routeCount: input.routes.length,
    routingScore: input.routes.length > 0 ? Math.round((eligibleRoutes.length / input.routes.length) * 100) : 100,
    status: criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "info",
    suppressedByPreferenceCount: input.routes.filter((route) => route.status === "suppressed-by-preference").length,
    suppressedByRoleCount: input.routes.filter((route) => route.status === "suppressed-by-role").length,
    warningCount,
  };
}

export function createBoardReleaseArchiveIntelligenceNotificationRoutingReport(
  input: CreateBoardReleaseArchiveIntelligenceNotificationRoutingReportInput,
): BoardReleaseArchiveIntelligenceNotificationRoutingReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.packet.workspaceId;
  const preferencesByUserId = input.preferencesByUserId ?? new Map<string, WorkspaceNotificationDeliveryPreference[]>();
  const notifications = createNotifications(input.packet);
  const routes = createRoutes({
    members: input.members,
    notifications,
    preferencesByUserId,
    workspaceId,
  });
  const csvContent = createCsv({
    notifications,
    routes,
  });

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-release-archive-intelligence-notification-routing-${dateStamp(generatedAt)}.csv`,
    generatedAt,
    notifications,
    routes,
    summary: summarize({
      notifications,
      routes,
    }),
    workspaceId,
  };
}
