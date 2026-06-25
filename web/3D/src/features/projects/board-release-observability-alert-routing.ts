import { createHash } from "node:crypto";
import type { BoardReleaseObservabilityIncidentNotesReport, BoardReleaseObservabilityIncidentNote } from "@/features/projects/board-release-observability-incident-notes";
import type { BoardReleaseObservabilityTrendSnapshotReport, BoardReleaseObservabilityTrendSnapshot } from "@/features/projects/board-release-observability-trend-snapshots";
import { canWorkspaceRoleReceiveNotificationTopic } from "@/features/workspaces/notification-email-delivery";
import { isWorkspaceNotificationTopicEnabled, normalizeWorkspaceNotificationDeliveryPreferences } from "@/features/workspaces/notification-delivery-preferences";
import type { WorkspaceMemberRow, WorkspaceNotificationDeliveryPreference, WorkspaceNotificationTopic, WorkspaceRole } from "@/features/workspaces/types";

export type BoardReleaseObservabilityAlertSeverity = "critical" | "info" | "warning";
export type BoardReleaseObservabilityAlertKind = "incident-note" | "trend-decline" | "trend-watch";
export type BoardReleaseObservabilityAlertChannel = "email" | "in-app";
export type BoardReleaseObservabilityAlertRouteStatus = "eligible" | "suppressed-by-preference" | "suppressed-by-role";

export interface BoardReleaseObservabilityAlertCandidate {
  actionLabel: string;
  detail: string;
  id: string;
  kind: BoardReleaseObservabilityAlertKind;
  severity: BoardReleaseObservabilityAlertSeverity;
  sourceId: string;
  title: string;
  topic: WorkspaceNotificationTopic;
}

export interface BoardReleaseObservabilityAlertRoute {
  candidateId: string;
  channel: BoardReleaseObservabilityAlertChannel;
  dedupeKey: string;
  reason: string;
  recipientEmail: string;
  recipientName: string;
  recipientRole: WorkspaceRole;
  routeHash: string;
  status: BoardReleaseObservabilityAlertRouteStatus;
  topic: WorkspaceNotificationTopic;
  userId: string;
}

export interface BoardReleaseObservabilityAlertRoutingReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  notifications: BoardReleaseObservabilityAlertCandidate[];
  routes: BoardReleaseObservabilityAlertRoute[];
  summary: {
    criticalCount: number;
    eligibleRouteCount: number;
    emailEligibleCount: number;
    inAppEligibleCount: number;
    nextAction: string;
    notificationCount: number;
    routeCount: number;
    routingScore: number;
    status: BoardReleaseObservabilityAlertSeverity;
    suppressedByPreferenceCount: number;
    suppressedByRoleCount: number;
    warningCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseObservabilityAlertRoutingReportInput {
  generatedAt?: string;
  incidentNotes: BoardReleaseObservabilityIncidentNotesReport;
  members: WorkspaceMemberRow[];
  preferencesByUserId?: Map<string, WorkspaceNotificationDeliveryPreference[]>;
  trendSnapshots: BoardReleaseObservabilityTrendSnapshotReport;
  workspaceId?: string;
}

const channels: BoardReleaseObservabilityAlertChannel[] = ["in-app", "email"];

const severityRank: Record<BoardReleaseObservabilityAlertSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const kindRank: Record<BoardReleaseObservabilityAlertKind, number> = {
  "incident-note": 0,
  "trend-decline": 1,
  "trend-watch": 2,
};

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
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

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function severityFromNote(note: BoardReleaseObservabilityIncidentNote): BoardReleaseObservabilityAlertSeverity {
  return note.severity === "critical" ? "critical" : note.severity === "warning" ? "warning" : "info";
}

function noteTopic(note: BoardReleaseObservabilityIncidentNote): WorkspaceNotificationTopic {
  return note.severity === "critical" ? "release" : "health";
}

function noteCandidate(note: BoardReleaseObservabilityIncidentNote): BoardReleaseObservabilityAlertCandidate {
  return {
    actionLabel: note.summary,
    detail: `${note.ownerRole} owns ${note.status} observability note due ${note.dueAt}.`,
    id: `board-release-observability:incident-note:${note.noteId}`,
    kind: "incident-note",
    severity: severityFromNote(note),
    sourceId: note.noteId,
    title: `${note.title} ${note.status}`,
    topic: noteTopic(note),
  };
}

function severityFromTrend(snapshot: BoardReleaseObservabilityTrendSnapshot): BoardReleaseObservabilityAlertSeverity {
  if (snapshot.status === "blocked" || snapshot.direction === "declining") {
    return "critical";
  }

  return snapshot.status === "watch" ? "warning" : "info";
}

function trendCandidate(snapshot: BoardReleaseObservabilityTrendSnapshot): BoardReleaseObservabilityAlertCandidate {
  const severity = severityFromTrend(snapshot);

  return {
    actionLabel: snapshot.nextAction,
    detail: `${snapshot.title} moved from ${snapshot.previousValue} to ${snapshot.currentValue} (${snapshot.delta > 0 ? "+" : ""}${snapshot.delta}).`,
    id: `board-release-observability:trend:${snapshot.metric}`,
    kind: snapshot.direction === "declining" ? "trend-decline" : "trend-watch",
    severity,
    sourceId: snapshot.metric,
    title: `${snapshot.title} ${snapshot.direction}`,
    topic: severity === "critical" ? "release" : "health",
  };
}

function createCandidates(input: CreateBoardReleaseObservabilityAlertRoutingReportInput) {
  const noteCandidates = input.incidentNotes.notes
    .filter((note) => note.status !== "closed")
    .map(noteCandidate);
  const trendCandidates = input.trendSnapshots.snapshots
    .filter((snapshot) => snapshot.status !== "ready" || snapshot.direction === "declining")
    .map(trendCandidate);

  return [...noteCandidates, ...trendCandidates].sort(
    (first, second) =>
      severityRank[first.severity] - severityRank[second.severity] ||
      kindRank[first.kind] - kindRank[second.kind] ||
      first.title.localeCompare(second.title),
  );
}

function routeReason(input: {
  candidate: BoardReleaseObservabilityAlertCandidate;
  channel: BoardReleaseObservabilityAlertChannel;
  member: WorkspaceMemberRow;
  status: BoardReleaseObservabilityAlertRouteStatus;
}) {
  if (input.status === "eligible") {
    return `${input.member.role} receives ${input.candidate.topic} ${input.channel} routing for ${input.candidate.kind}.`;
  }

  if (input.status === "suppressed-by-role") {
    return `${input.member.role} cannot receive ${input.candidate.topic} observability routing.`;
  }

  return `${input.channel} is disabled for ${input.candidate.topic} notifications.`;
}

function createRoutes(input: {
  candidates: BoardReleaseObservabilityAlertCandidate[];
  members: WorkspaceMemberRow[];
  preferencesByUserId: Map<string, WorkspaceNotificationDeliveryPreference[]>;
  workspaceId: string;
}) {
  const routes: BoardReleaseObservabilityAlertRoute[] = [];

  for (const candidate of input.candidates) {
    for (const member of input.members) {
      const preferences = normalizeWorkspaceNotificationDeliveryPreferences(input.preferencesByUserId.get(member.userId) ?? []);

      for (const channel of channels) {
        const roleEligible = canWorkspaceRoleReceiveNotificationTopic(member.role, candidate.topic);
        const preferenceEnabled = isWorkspaceNotificationTopicEnabled(preferences, candidate.topic, channel === "email" ? "email" : "inApp");
        const status: BoardReleaseObservabilityAlertRouteStatus = !roleEligible ? "suppressed-by-role" : preferenceEnabled ? "eligible" : "suppressed-by-preference";
        const dedupeKey = `${input.workspaceId}:${member.userId}:board-release-observability:${candidate.id}:${channel}`;
        const routeCore = {
          candidateId: candidate.id,
          channel,
          dedupeKey,
          recipientRole: member.role,
          status,
          topic: candidate.topic,
          userId: member.userId,
        };

        routes.push({
          candidateId: candidate.id,
          channel,
          dedupeKey,
          reason: routeReason({
            candidate,
            channel,
            member,
            status,
          }),
          recipientEmail: member.email,
          recipientName: member.name,
          recipientRole: member.role,
          routeHash: sha256(routeCore),
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
  notifications: BoardReleaseObservabilityAlertCandidate[];
  routes: BoardReleaseObservabilityAlertRoute[];
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
  notifications: BoardReleaseObservabilityAlertCandidate[];
  routes: BoardReleaseObservabilityAlertRoute[];
}): BoardReleaseObservabilityAlertRoutingReport["summary"] {
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
        ? "Route critical board release observability alerts before release closeout."
        : warningCount > 0
          ? "Review warning-level board release observability alert routes."
          : (topNotification?.actionLabel ?? "No board release observability alert routing is needed."),
    notificationCount: input.notifications.length,
    routeCount: input.routes.length,
    routingScore: input.routes.length > 0 ? Math.round((eligibleRoutes.length / input.routes.length) * 100) : 100,
    status: criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "info",
    suppressedByPreferenceCount: input.routes.filter((route) => route.status === "suppressed-by-preference").length,
    suppressedByRoleCount: input.routes.filter((route) => route.status === "suppressed-by-role").length,
    warningCount,
  };
}

function createJson(input: {
  generatedAt: string;
  notifications: BoardReleaseObservabilityAlertCandidate[];
  routes: BoardReleaseObservabilityAlertRoute[];
  summary: BoardReleaseObservabilityAlertRoutingReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      notifications: input.notifications,
      routes: input.routes,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseObservabilityAlertRoutingReport(
  input: CreateBoardReleaseObservabilityAlertRoutingReportInput,
): BoardReleaseObservabilityAlertRoutingReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.incidentNotes.workspaceId;
  const preferencesByUserId = input.preferencesByUserId ?? new Map<string, WorkspaceNotificationDeliveryPreference[]>();
  const notifications = createCandidates(input);
  const routes = createRoutes({
    candidates: notifications,
    members: input.members,
    preferencesByUserId,
    workspaceId,
  });
  const summary = summarize({
    notifications,
    routes,
  });
  const csvContent = createCsv({
    notifications,
    routes,
  });
  const jsonContent = createJson({
    generatedAt,
    notifications,
    routes,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-observability-alert-routing-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    notifications,
    routes,
    summary,
    workspaceId,
  };
}
