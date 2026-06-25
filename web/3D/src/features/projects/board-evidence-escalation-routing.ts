import type { BoardAuditEvidenceReadinessDigest, BoardAuditEvidenceReadinessRisk } from "@/features/projects/board-audit-evidence-readiness-digest";
import { canWorkspaceRoleReceiveNotificationTopic } from "@/features/workspaces/notification-email-delivery";
import {
  isWorkspaceNotificationTopicEnabled,
  normalizeWorkspaceNotificationDeliveryPreferences,
} from "@/features/workspaces/notification-delivery-preferences";
import type { WorkspaceMemberRow, WorkspaceNotificationDeliveryPreference, WorkspaceNotificationTopic, WorkspaceRole } from "@/features/workspaces/types";

export type BoardEvidenceEscalationChannel = "email" | "in-app";
export type BoardEvidenceEscalationSeverity = "critical" | "warning";
export type BoardEvidenceEscalationRouteStatus = "eligible" | "suppressed-by-preference" | "suppressed-by-role";

export interface BoardEvidenceEscalationCandidate {
  detail: string;
  id: string;
  nextAction: string;
  ownerName: string;
  readinessScore: number;
  severity: BoardEvidenceEscalationSeverity;
  taskId: string;
  title: string;
  topic: WorkspaceNotificationTopic;
}

export interface BoardEvidenceEscalationRoute {
  channel: BoardEvidenceEscalationChannel;
  dedupeKey: string;
  escalationId: string;
  reason: string;
  recipientEmail: string;
  recipientName: string;
  recipientRole: WorkspaceRole;
  status: BoardEvidenceEscalationRouteStatus;
  topic: WorkspaceNotificationTopic;
  userId: string;
}

export interface BoardEvidenceEscalationRoutingReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  escalations: BoardEvidenceEscalationCandidate[];
  generatedAt: string;
  routes: BoardEvidenceEscalationRoute[];
  summary: {
    criticalCount: number;
    eligibleRouteCount: number;
    emailEligibleCount: number;
    escalationCount: number;
    inAppEligibleCount: number;
    nextAction: string;
    routeCount: number;
    routingScore: number;
    status: "critical" | "ready" | "warning";
    suppressedByPreferenceCount: number;
    suppressedByRoleCount: number;
    warningCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardEvidenceEscalationRoutingReportInput {
  generatedAt?: string;
  members: WorkspaceMemberRow[];
  preferencesByUserId?: Map<string, WorkspaceNotificationDeliveryPreference[]>;
  readiness: BoardAuditEvidenceReadinessDigest;
  workspaceId?: string;
}

const channels: BoardEvidenceEscalationChannel[] = ["in-app", "email"];

const severityRank: Record<BoardEvidenceEscalationSeverity, number> = {
  critical: 0,
  warning: 1,
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

function escalationSeverity(risk: BoardAuditEvidenceReadinessRisk): BoardEvidenceEscalationSeverity {
  return risk.riskLevel === "critical" || risk.readinessScore < 55 ? "critical" : "warning";
}

function escalationFor(risk: BoardAuditEvidenceReadinessRisk): BoardEvidenceEscalationCandidate {
  const severity = escalationSeverity(risk);

  return {
    detail: `${risk.title} is ${risk.status} with ${risk.riskLevel} readiness risk at ${risk.readinessScore}/100.`,
    id: `board-evidence-escalation:${risk.taskId}`,
    nextAction: risk.nextAction,
    ownerName: risk.ownerName,
    readinessScore: risk.readinessScore,
    severity,
    taskId: risk.taskId,
    title: `${risk.title} evidence escalation`,
    topic: "review",
  };
}

function createEscalations(readiness: BoardAuditEvidenceReadinessDigest) {
  return readiness.risks
    .filter((risk) => risk.status === "blocked" || risk.riskLevel === "critical" || risk.riskLevel === "high")
    .map(escalationFor)
    .sort(
      (first, second) =>
        severityRank[first.severity] - severityRank[second.severity] ||
        first.readinessScore - second.readinessScore ||
        first.title.localeCompare(second.title),
    );
}

function routeReason(input: {
  channel: BoardEvidenceEscalationChannel;
  escalation: BoardEvidenceEscalationCandidate;
  member: WorkspaceMemberRow;
  status: BoardEvidenceEscalationRouteStatus;
}) {
  if (input.status === "eligible") {
    return `${input.member.role} receives board evidence ${input.channel} escalation routing for ${input.escalation.taskId}.`;
  }

  if (input.status === "suppressed-by-role") {
    return `${input.member.role} cannot receive review-topic board evidence escalations.`;
  }

  return `${input.channel} is disabled for review notifications.`;
}

function createRoutes(input: {
  escalations: BoardEvidenceEscalationCandidate[];
  members: WorkspaceMemberRow[];
  preferencesByUserId: Map<string, WorkspaceNotificationDeliveryPreference[]>;
  workspaceId: string;
}) {
  const routes: BoardEvidenceEscalationRoute[] = [];

  for (const escalation of input.escalations) {
    for (const member of input.members) {
      const preferences = normalizeWorkspaceNotificationDeliveryPreferences(input.preferencesByUserId.get(member.userId) ?? []);

      for (const channel of channels) {
        const roleEligible = canWorkspaceRoleReceiveNotificationTopic(member.role, escalation.topic);
        const status: BoardEvidenceEscalationRouteStatus = !roleEligible
          ? "suppressed-by-role"
          : isWorkspaceNotificationTopicEnabled(preferences, escalation.topic, channel === "email" ? "email" : "inApp")
            ? "eligible"
            : "suppressed-by-preference";

        routes.push({
          channel,
          dedupeKey: `${input.workspaceId}:${member.userId}:board-evidence-escalation:${escalation.taskId}:${channel}`,
          escalationId: escalation.id,
          reason: routeReason({
            channel,
            escalation,
            member,
            status,
          }),
          recipientEmail: member.email,
          recipientName: member.name,
          recipientRole: member.role,
          status,
          topic: escalation.topic,
          userId: member.userId,
        });
      }
    }
  }

  return routes;
}

function createCsv(input: {
  escalations: BoardEvidenceEscalationCandidate[];
  routes: BoardEvidenceEscalationRoute[];
}) {
  const header = ["escalation_id", "task_id", "severity", "owner", "eligible_routes", "next_action"];
  const rows = input.escalations.map((escalation) => [
    escalation.id,
    escalation.taskId,
    escalation.severity,
    escalation.ownerName,
    input.routes.filter((route) => route.escalationId === escalation.id && route.status === "eligible").length,
    escalation.nextAction,
  ]);

  return `${[header.join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n")}\n`;
}

function summarize(input: {
  escalations: BoardEvidenceEscalationCandidate[];
  routes: BoardEvidenceEscalationRoute[];
}): BoardEvidenceEscalationRoutingReport["summary"] {
  const criticalCount = input.escalations.filter((escalation) => escalation.severity === "critical").length;
  const warningCount = input.escalations.filter((escalation) => escalation.severity === "warning").length;
  const eligibleRoutes = input.routes.filter((route) => route.status === "eligible");

  return {
    criticalCount,
    eligibleRouteCount: eligibleRoutes.length,
    emailEligibleCount: eligibleRoutes.filter((route) => route.channel === "email").length,
    escalationCount: input.escalations.length,
    inAppEligibleCount: eligibleRoutes.filter((route) => route.channel === "in-app").length,
    nextAction:
      criticalCount > 0
        ? "Route critical board evidence escalations before packet lock."
        : warningCount > 0
          ? "Route warning-level board evidence escalations before closeout drift grows."
          : "No board evidence escalation routing is needed.",
    routeCount: input.routes.length,
    routingScore: input.routes.length > 0 ? Math.round((eligibleRoutes.length / input.routes.length) * 100) : 100,
    status: criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "ready",
    suppressedByPreferenceCount: input.routes.filter((route) => route.status === "suppressed-by-preference").length,
    suppressedByRoleCount: input.routes.filter((route) => route.status === "suppressed-by-role").length,
    warningCount,
  };
}

export function createBoardEvidenceEscalationRoutingReport(
  input: CreateBoardEvidenceEscalationRoutingReportInput,
): BoardEvidenceEscalationRoutingReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.readiness.workspaceId;
  const escalations = createEscalations(input.readiness);
  const routes = createRoutes({
    escalations,
    members: input.members,
    preferencesByUserId: input.preferencesByUserId ?? new Map<string, WorkspaceNotificationDeliveryPreference[]>(),
    workspaceId,
  });
  const csvContent = createCsv({
    escalations,
    routes,
  });

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-evidence-escalation-routing-${dateStamp(generatedAt)}.csv`,
    escalations,
    generatedAt,
    routes,
    summary: summarize({
      escalations,
      routes,
    }),
    workspaceId,
  };
}
