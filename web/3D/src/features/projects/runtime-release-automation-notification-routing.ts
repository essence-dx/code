import { createHash } from "node:crypto";
import type { RuntimeReleaseApprovalChecklist } from "@/features/projects/runtime-release-approval-checklist";
import type { RuntimeReleaseCandidateComparison } from "@/features/projects/runtime-release-candidate-comparison";
import type { RuntimeReleaseOperatorQueue, RuntimeReleaseOperatorQueueRow } from "@/features/projects/runtime-release-operator-queue";
import { canWorkspaceRoleReceiveNotificationTopic } from "@/features/workspaces/notification-email-delivery";
import {
  isWorkspaceNotificationTopicEnabled,
  normalizeWorkspaceNotificationDeliveryPreferences,
} from "@/features/workspaces/notification-delivery-preferences";
import type { WorkspaceMemberRow, WorkspaceNotificationDeliveryPreference, WorkspaceNotificationTopic, WorkspaceRole } from "@/features/workspaces/types";

export type RuntimeReleaseAutomationNotificationKind = "comparison-regression" | "overdue-queue-row" | "stale-approval";
export type RuntimeReleaseAutomationNotificationSeverity = "critical" | "info" | "warning";
export type RuntimeReleaseAutomationNotificationChannel = "email" | "in-app";
export type RuntimeReleaseAutomationNotificationRouteStatus = "eligible" | "suppressed-by-preference" | "suppressed-by-role";
export type RuntimeReleaseAutomationNotificationFileFormat = "csv" | "json";

export interface RuntimeReleaseAutomationNotificationCandidate {
  actionLabel: string;
  detail: string;
  id: string;
  kind: RuntimeReleaseAutomationNotificationKind;
  severity: RuntimeReleaseAutomationNotificationSeverity;
  sourceHash: string;
  sourceId: string;
  title: string;
  topic: WorkspaceNotificationTopic;
}

export interface RuntimeReleaseAutomationNotificationRoute {
  candidateId: string;
  channel: RuntimeReleaseAutomationNotificationChannel;
  dedupeKey: string;
  reason: string;
  recipientEmail: string;
  recipientName: string;
  recipientRole: WorkspaceRole;
  status: RuntimeReleaseAutomationNotificationRouteStatus;
  topic: WorkspaceNotificationTopic;
  userId: string;
}

export interface RuntimeReleaseAutomationNotificationFile {
  download: string;
  format: RuntimeReleaseAutomationNotificationFileFormat;
  href: string;
  label: string;
}

export interface RuntimeReleaseAutomationNotificationRoutingReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: RuntimeReleaseAutomationNotificationFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  notifications: RuntimeReleaseAutomationNotificationCandidate[];
  routes: RuntimeReleaseAutomationNotificationRoute[];
  summary: {
    criticalCount: number;
    eligibleRouteCount: number;
    emailEligibleCount: number;
    inAppEligibleCount: number;
    nextAction: string;
    notificationCount: number;
    routeCount: number;
    routingHash: string;
    routingScore: number;
    status: RuntimeReleaseAutomationNotificationSeverity;
    suppressedByPreferenceCount: number;
    suppressedByRoleCount: number;
    warningCount: number;
  };
  workspaceId: string;
}

export interface CreateRuntimeReleaseAutomationNotificationRoutingInput {
  approvalChecklist: RuntimeReleaseApprovalChecklist;
  candidateComparison: RuntimeReleaseCandidateComparison;
  generatedAt?: string;
  members: WorkspaceMemberRow[];
  operatorQueue: RuntimeReleaseOperatorQueue;
  preferencesByUserId?: Map<string, WorkspaceNotificationDeliveryPreference[]>;
  workspaceId?: string;
}

const channels: RuntimeReleaseAutomationNotificationChannel[] = ["in-app", "email"];

const severityRank: Record<RuntimeReleaseAutomationNotificationSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const kindRank: Record<RuntimeReleaseAutomationNotificationKind, number> = {
  "overdue-queue-row": 0,
  "stale-approval": 1,
  "comparison-regression": 2,
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
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex")}`;
}

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
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

function queueCandidate(row: RuntimeReleaseOperatorQueueRow): RuntimeReleaseAutomationNotificationCandidate {
  return {
    actionLabel: row.nextAction,
    detail: `${row.gateLabel} is overdue for ${row.ownerName} with evidence ${row.evidenceHash}.`,
    id: `runtime-release-automation:queue:${row.gateId}`,
    kind: "overdue-queue-row",
    severity: "critical",
    sourceHash: row.queueRowHash,
    sourceId: row.gateId,
    title: `${row.gateLabel} overdue`,
    topic: "release",
  };
}

function approvalCandidate(approvalChecklist: RuntimeReleaseApprovalChecklist): RuntimeReleaseAutomationNotificationCandidate[] {
  if (approvalChecklist.summary.status !== "expired" && approvalChecklist.summary.expirationStatus !== "expired") {
    return [];
  }

  return [
    {
      actionLabel: approvalChecklist.summary.nextAction,
      detail: `Approval for ${approvalChecklist.releaseCandidateId} is stale or expired for ${approvalChecklist.summary.reviewerName}.`,
      id: `runtime-release-automation:approval:${approvalChecklist.releaseCandidateId}`,
      kind: "stale-approval",
      severity: "critical",
      sourceHash: approvalChecklist.summary.approvalHash,
      sourceId: approvalChecklist.releaseCandidateId,
      title: `${approvalChecklist.releaseCandidateId} stale approval`,
      topic: "review",
    },
  ];
}

function comparisonCandidates(candidateComparison: RuntimeReleaseCandidateComparison): RuntimeReleaseAutomationNotificationCandidate[] {
  return candidateComparison.rows
    .filter((row) => row.change === "regressed")
    .map((row) => ({
      actionLabel: row.nextAction,
      detail: `${row.label} regressed from ${row.lastApprovedScore}/100 to ${row.currentScore}/100.`,
      id: `runtime-release-automation:comparison:${row.id}`,
      kind: "comparison-regression" as const,
      severity: "critical" as const,
      sourceHash: row.rowHash,
      sourceId: row.id,
      title: `${row.label} regression`,
      topic: "release" as const,
    }));
}

function createNotifications(input: CreateRuntimeReleaseAutomationNotificationRoutingInput) {
  const notifications = [
    ...input.operatorQueue.rows.filter((row) => row.status === "overdue").map(queueCandidate),
    ...approvalCandidate(input.approvalChecklist),
    ...comparisonCandidates(input.candidateComparison),
  ];

  return notifications.sort(
    (first, second) =>
      severityRank[first.severity] - severityRank[second.severity] ||
      kindRank[first.kind] - kindRank[second.kind] ||
      first.title.localeCompare(second.title),
  );
}

function routeReason(input: {
  channel: RuntimeReleaseAutomationNotificationChannel;
  member: WorkspaceMemberRow;
  notification: RuntimeReleaseAutomationNotificationCandidate;
  status: RuntimeReleaseAutomationNotificationRouteStatus;
}) {
  if (input.status === "eligible") {
    return `${input.member.role} receives ${input.notification.topic} ${input.channel} routing for ${input.notification.kind}.`;
  }

  if (input.status === "suppressed-by-role") {
    return `${input.member.role} cannot receive ${input.notification.topic} runtime release automation routing.`;
  }

  return `${input.channel} is disabled for ${input.notification.topic} notifications.`;
}

function createRoutes(input: {
  members: WorkspaceMemberRow[];
  notifications: RuntimeReleaseAutomationNotificationCandidate[];
  preferencesByUserId: Map<string, WorkspaceNotificationDeliveryPreference[]>;
  workspaceId: string;
}) {
  const routes: RuntimeReleaseAutomationNotificationRoute[] = [];

  for (const notification of input.notifications) {
    for (const member of input.members) {
      const preferences = normalizeWorkspaceNotificationDeliveryPreferences(input.preferencesByUserId.get(member.userId) ?? []);

      for (const channel of channels) {
        const roleEligible = canWorkspaceRoleReceiveNotificationTopic(member.role, notification.topic);
        const status: RuntimeReleaseAutomationNotificationRouteStatus = !roleEligible
          ? "suppressed-by-role"
          : isWorkspaceNotificationTopicEnabled(preferences, notification.topic, channel === "email" ? "email" : "inApp")
            ? "eligible"
            : "suppressed-by-preference";

        routes.push({
          candidateId: notification.id,
          channel,
          dedupeKey: `${input.workspaceId}:${member.userId}:runtime-release-automation:${notification.sourceId}:${channel}`,
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
  notifications: RuntimeReleaseAutomationNotificationCandidate[];
  routes: RuntimeReleaseAutomationNotificationRoute[];
}) {
  const header = ["notification_id", "kind", "severity", "topic", "title", "eligible_routes", "source_hash", "next_action"];
  const rows = input.notifications.map((notification) =>
    [
      notification.id,
      notification.kind,
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
  notifications: RuntimeReleaseAutomationNotificationCandidate[];
  routes: RuntimeReleaseAutomationNotificationRoute[];
}): RuntimeReleaseAutomationNotificationRoutingReport["summary"] {
  const criticalCount = input.notifications.filter((notification) => notification.severity === "critical").length;
  const warningCount = input.notifications.filter((notification) => notification.severity === "warning").length;
  const eligibleRoutes = input.routes.filter((route) => route.status === "eligible");
  const status: RuntimeReleaseAutomationNotificationSeverity = criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "info";

  return {
    criticalCount,
    eligibleRouteCount: eligibleRoutes.length,
    emailEligibleCount: eligibleRoutes.filter((route) => route.channel === "email").length,
    inAppEligibleCount: eligibleRoutes.filter((route) => route.channel === "in-app").length,
    nextAction:
      status === "critical"
        ? "Route critical runtime release automation notifications before promotion."
        : status === "warning"
          ? "Route warning-level runtime release automation notifications before promotion."
          : "No runtime release automation notifications need routing.",
    notificationCount: input.notifications.length,
    routeCount: input.routes.length,
    routingHash: sha256({
      notificationHashes: input.notifications.map((notification) => notification.sourceHash),
      routeKeys: input.routes.map((route) => `${route.dedupeKey}:${route.status}`),
      status,
    }),
    routingScore: input.routes.length > 0 ? Math.round((eligibleRoutes.length / input.routes.length) * 100) : 100,
    status,
    suppressedByPreferenceCount: input.routes.filter((route) => route.status === "suppressed-by-preference").length,
    suppressedByRoleCount: input.routes.filter((route) => route.status === "suppressed-by-role").length,
    warningCount,
  };
}

function filesFor(input: {
  csvDataUri: string;
  csvFileName: string;
  jsonDataUri: string;
  jsonFileName: string;
}): RuntimeReleaseAutomationNotificationFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV routing",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON routing",
    },
  ];
}

export function createRuntimeReleaseAutomationNotificationRouting(
  input: CreateRuntimeReleaseAutomationNotificationRoutingInput,
): RuntimeReleaseAutomationNotificationRoutingReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.operatorQueue.workspaceId ?? input.approvalChecklist.workspaceId ?? input.candidateComparison.workspaceId ?? "workspace";
  const preferencesByUserId = input.preferencesByUserId ?? new Map<string, WorkspaceNotificationDeliveryPreference[]>();
  const notifications = createNotifications(input);
  const routes = createRoutes({
    members: input.members,
    notifications,
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
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      notifications,
      routes,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-runtime-release-automation-notification-routing-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: filesFor({
      csvDataUri,
      csvFileName,
      jsonDataUri,
      jsonFileName,
    }),
    generatedAt,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    notifications,
    routes,
    summary,
    workspaceId,
  };
}
