import type { BoardAssuranceEvidenceBundleReport, BoardAssuranceEvidenceBundleStatus } from "@/features/projects/board-assurance-evidence-bundle";
import type { BoardAssuranceExceptionStatus, BoardAssuranceExceptionWorkflowReport } from "@/features/projects/board-assurance-exceptions";
import type { BoardDecisionReplayAuditReport, BoardDecisionReplayAuditRow } from "@/features/projects/board-decision-replay-audit";
import type { BoardReleaseVarianceDashboard } from "@/features/projects/board-release-variance-dashboard";
import { canWorkspaceRoleReceiveNotificationTopic } from "@/features/workspaces/notification-email-delivery";
import {
  isWorkspaceNotificationTopicEnabled,
  normalizeWorkspaceNotificationDeliveryPreferences,
} from "@/features/workspaces/notification-delivery-preferences";
import type { WorkspaceMemberRow, WorkspaceNotificationDeliveryPreference, WorkspaceNotificationTopic, WorkspaceRole } from "@/features/workspaces/types";

export type BoardAssuranceNotificationKind = "evidence-readiness" | "exception-expiry" | "replay-blocker";
export type BoardAssuranceNotificationSeverity = "critical" | "info" | "warning";
export type BoardAssuranceNotificationChannel = "email" | "in-app";
export type BoardAssuranceNotificationRouteStatus = "eligible" | "suppressed-by-preference" | "suppressed-by-role";

export interface BoardAssuranceNotificationCandidate {
  actionLabel: string;
  detail: string;
  id: string;
  kind: BoardAssuranceNotificationKind;
  severity: BoardAssuranceNotificationSeverity;
  sourceId: string;
  title: string;
  topic: WorkspaceNotificationTopic;
}

export interface BoardAssuranceNotificationRoute {
  candidateId: string;
  channel: BoardAssuranceNotificationChannel;
  dedupeKey: string;
  reason: string;
  recipientEmail: string;
  recipientName: string;
  recipientRole: WorkspaceRole;
  status: BoardAssuranceNotificationRouteStatus;
  topic: WorkspaceNotificationTopic;
  userId: string;
}

export interface BoardAssuranceNotificationRoutingReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  notifications: BoardAssuranceNotificationCandidate[];
  routes: BoardAssuranceNotificationRoute[];
  summary: {
    criticalCount: number;
    eligibleRouteCount: number;
    emailEligibleCount: number;
    inAppEligibleCount: number;
    notificationCount: number;
    routeCount: number;
    routingScore: number;
    status: BoardAssuranceNotificationSeverity;
    suppressedByPreferenceCount: number;
    suppressedByRoleCount: number;
    warningCount: number;
    nextAction: string;
  };
  workspaceId: string;
}

export interface CreateBoardAssuranceNotificationRoutingReportInput {
  dueSoonDays?: number;
  evidenceBundle: BoardAssuranceEvidenceBundleReport;
  exceptionWorkflow: BoardAssuranceExceptionWorkflowReport | null;
  generatedAt?: string;
  members: WorkspaceMemberRow[];
  preferencesByUserId?: Map<string, WorkspaceNotificationDeliveryPreference[]>;
  replayAudit: BoardDecisionReplayAuditReport;
  varianceDashboard: BoardReleaseVarianceDashboard | null;
  workspaceId?: string;
}

const channels: BoardAssuranceNotificationChannel[] = ["in-app", "email"];

const severityRank: Record<BoardAssuranceNotificationSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const kindRank: Record<BoardAssuranceNotificationKind, number> = {
  "replay-blocker": 0,
  "exception-expiry": 1,
  "evidence-readiness": 2,
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

function replaySeverity(row: BoardDecisionReplayAuditRow): BoardAssuranceNotificationSeverity {
  return row.status === "blocked" ? "critical" : "warning";
}

function replayCandidate(row: BoardDecisionReplayAuditRow): BoardAssuranceNotificationCandidate {
  return {
    actionLabel: row.nextAction,
    detail: row.detail,
    id: `board-assurance:replay:${row.id}`,
    kind: "replay-blocker",
    severity: replaySeverity(row),
    sourceId: row.id,
    title: `${row.title} replay ${row.status}`,
    topic: "release",
  };
}

function exceptionSeverity(status: BoardAssuranceExceptionStatus, expiresInDays: number | null): BoardAssuranceNotificationSeverity {
  if (status === "expired" || status === "rejected" || status === "release-gate-blocked") {
    return "critical";
  }

  if (expiresInDays !== null && expiresInDays <= 3) {
    return "warning";
  }

  return status === "approved" ? "info" : "warning";
}

function exceptionCandidates(workflow: BoardAssuranceExceptionWorkflowReport | null, dueSoonDays: number): BoardAssuranceNotificationCandidate[] {
  return (workflow?.rows ?? [])
    .filter((row) => row.status !== "approved" || (row.expiresInDays !== null && row.expiresInDays <= dueSoonDays))
    .map((row) => {
      const severity = exceptionSeverity(row.status, row.expiresInDays);
      const expiryLabel =
        row.expiresInDays === null
          ? "needs an expiry date"
          : row.expiresInDays < 0
            ? `expired ${Math.abs(row.expiresInDays)} day${Math.abs(row.expiresInDays) === 1 ? "" : "s"} ago`
            : `expires in ${row.expiresInDays} day${row.expiresInDays === 1 ? "" : "s"}`;

      return {
        actionLabel: row.nextAction,
        detail: `${row.title} exception ${expiryLabel}.`,
        id: `board-assurance:exception:${row.scopeId}`,
        kind: "exception-expiry",
        severity,
        sourceId: row.scopeId,
        title: `${row.title} exception ${row.status}`,
        topic: "review",
      };
    });
}

function evidenceSeverity(status: BoardAssuranceEvidenceBundleStatus): BoardAssuranceNotificationSeverity {
  if (status === "blocked") {
    return "critical";
  }

  return status === "watch" ? "warning" : "info";
}

function evidenceCandidate(input: {
  evidenceBundle: BoardAssuranceEvidenceBundleReport;
  varianceDashboard: BoardReleaseVarianceDashboard | null;
}): BoardAssuranceNotificationCandidate {
  const severity = evidenceSeverity(input.evidenceBundle.summary.status);
  const variance = input.varianceDashboard
    ? `Variance ${input.varianceDashboard.summary.status} with ${input.varianceDashboard.summary.blockedCount} blocked row${input.varianceDashboard.summary.blockedCount === 1 ? "" : "s"}.`
    : "No release variance dashboard is attached.";

  return {
    actionLabel: input.evidenceBundle.summary.nextAction,
    detail: `${input.evidenceBundle.summary.status} evidence bundle with ${input.evidenceBundle.summary.blockedEvidenceCount} blocked evidence file${input.evidenceBundle.summary.blockedEvidenceCount === 1 ? "" : "s"}. ${variance}`,
    id: `board-assurance:evidence:${input.evidenceBundle.bundleId}`,
    kind: "evidence-readiness",
    severity,
    sourceId: input.evidenceBundle.bundleId,
    title: `Board assurance evidence bundle ${input.evidenceBundle.summary.status}`,
    topic: "release",
  };
}

function createCandidates(input: CreateBoardAssuranceNotificationRoutingReportInput): BoardAssuranceNotificationCandidate[] {
  const replayCandidates = input.replayAudit.rows.filter((row) => row.status !== "ready").map(replayCandidate);
  const candidates = [
    ...replayCandidates,
    ...exceptionCandidates(input.exceptionWorkflow, input.dueSoonDays ?? 7),
    evidenceCandidate({
      evidenceBundle: input.evidenceBundle,
      varianceDashboard: input.varianceDashboard,
    }),
  ];

  return candidates.sort((first, second) => severityRank[first.severity] - severityRank[second.severity] || kindRank[first.kind] - kindRank[second.kind] || first.title.localeCompare(second.title));
}

function routeReason(input: {
  candidate: BoardAssuranceNotificationCandidate;
  channel: BoardAssuranceNotificationChannel;
  member: WorkspaceMemberRow;
  status: BoardAssuranceNotificationRouteStatus;
}) {
  if (input.status === "eligible") {
    return `${input.member.role} receives ${input.candidate.topic} ${input.channel} routing for ${input.candidate.kind}.`;
  }

  if (input.status === "suppressed-by-role") {
    return `${input.member.role} cannot receive ${input.candidate.topic} board assurance routing.`;
  }

  return `${input.channel} is disabled for ${input.candidate.topic} notifications.`;
}

function createRoutes(input: {
  candidates: BoardAssuranceNotificationCandidate[];
  members: WorkspaceMemberRow[];
  preferencesByUserId: Map<string, WorkspaceNotificationDeliveryPreference[]>;
  workspaceId: string;
}) {
  const routes: BoardAssuranceNotificationRoute[] = [];

  for (const candidate of input.candidates) {
    for (const member of input.members) {
      const preferences = normalizeWorkspaceNotificationDeliveryPreferences(input.preferencesByUserId.get(member.userId) ?? []);

      for (const channel of channels) {
        const roleEligible = canWorkspaceRoleReceiveNotificationTopic(member.role, candidate.topic);
        const status: BoardAssuranceNotificationRouteStatus = !roleEligible
          ? "suppressed-by-role"
          : isWorkspaceNotificationTopicEnabled(preferences, candidate.topic, channel === "email" ? "email" : "inApp")
            ? "eligible"
            : "suppressed-by-preference";

        routes.push({
          candidateId: candidate.id,
          channel,
          dedupeKey: `${input.workspaceId}:${member.userId}:board-assurance:${candidate.id}:${channel}`,
          reason: routeReason({
            candidate,
            channel,
            member,
            status,
          }),
          recipientEmail: member.email,
          recipientName: member.name,
          recipientRole: member.role,
          status,
          topic: candidate.topic,
          userId: member.userId,
        });
      }
    }
  }

  return routes;
}

function createCsv(input: {
  notifications: BoardAssuranceNotificationCandidate[];
  routes: BoardAssuranceNotificationRoute[];
}) {
  const header = ["notification_id", "kind", "severity", "topic", "title", "eligible_routes", "next_action"];
  const rows = input.notifications.map((notification) => [
    notification.id,
    notification.kind,
    notification.severity,
    notification.topic,
    notification.title,
    input.routes.filter((route) => route.candidateId === notification.id && route.status === "eligible").length,
    notification.actionLabel,
  ]);

  return `${[header.join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n")}\n`;
}

function summarize(input: {
  notifications: BoardAssuranceNotificationCandidate[];
  routes: BoardAssuranceNotificationRoute[];
}): BoardAssuranceNotificationRoutingReport["summary"] {
  const criticalCount = input.notifications.filter((notification) => notification.severity === "critical").length;
  const warningCount = input.notifications.filter((notification) => notification.severity === "warning").length;
  const eligibleRoutes = input.routes.filter((route) => route.status === "eligible");
  const topNotification = input.notifications[0] ?? null;

  return {
    criticalCount,
    eligibleRouteCount: eligibleRoutes.length,
    emailEligibleCount: eligibleRoutes.filter((route) => route.channel === "email").length,
    inAppEligibleCount: eligibleRoutes.filter((route) => route.channel === "in-app").length,
    nextAction:
      criticalCount > 0
        ? "Route critical board assurance notifications before release closure."
        : warningCount > 0
          ? "Review warning-level board assurance routes before release closure."
          : (topNotification?.actionLabel ?? "No board assurance notification routing is needed."),
    notificationCount: input.notifications.length,
    routeCount: input.routes.length,
    routingScore: input.routes.length > 0 ? Math.round((eligibleRoutes.length / input.routes.length) * 100) : 100,
    status: criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "info",
    suppressedByPreferenceCount: input.routes.filter((route) => route.status === "suppressed-by-preference").length,
    suppressedByRoleCount: input.routes.filter((route) => route.status === "suppressed-by-role").length,
    warningCount,
  };
}

export function createBoardAssuranceNotificationRoutingReport(
  input: CreateBoardAssuranceNotificationRoutingReportInput,
): BoardAssuranceNotificationRoutingReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.replayAudit.workspaceId;
  const preferencesByUserId = input.preferencesByUserId ?? new Map<string, WorkspaceNotificationDeliveryPreference[]>();
  const notifications = createCandidates(input);
  const routes = createRoutes({
    candidates: notifications,
    members: input.members,
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
    csvFileName: `${slug(workspaceId)}-board-assurance-notification-routing-${dateStamp(generatedAt)}.csv`,
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
