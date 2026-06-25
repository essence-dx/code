import type { PersistedBoardAuditFollowUpTask, PersistedBoardAuditFollowUpTasksReport } from "@/features/projects/board-audit-follow-up-tasks";
import { canWorkspaceRoleReceiveNotificationTopic } from "@/features/workspaces/notification-email-delivery";
import {
  isWorkspaceNotificationTopicEnabled,
  normalizeWorkspaceNotificationDeliveryPreferences,
} from "@/features/workspaces/notification-delivery-preferences";
import type { WorkspaceMemberRow, WorkspaceNotificationDeliveryPreference, WorkspaceNotificationTopic, WorkspaceRole } from "@/features/workspaces/types";

export type BoardAuditReminderChannel = "email" | "in-app";
export type BoardAuditReminderSeverity = "critical" | "warning";
export type BoardAuditReminderRouteStatus = "eligible" | "suppressed-by-preference" | "suppressed-by-role";

export interface BoardAuditReminderCandidate {
  detail: string;
  dueAt: string;
  id: string;
  nextAction: string;
  ownerEmail: string | null;
  ownerName: string;
  severity: BoardAuditReminderSeverity;
  taskId: string;
  title: string;
  topic: WorkspaceNotificationTopic;
}

export interface BoardAuditReminderRoute {
  channel: BoardAuditReminderChannel;
  dedupeKey: string;
  reason: string;
  recipientEmail: string;
  recipientName: string;
  recipientRole: WorkspaceRole;
  reminderId: string;
  status: BoardAuditReminderRouteStatus;
  topic: WorkspaceNotificationTopic;
  userId: string;
}

export interface BoardAuditReminderRoutingReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  reminders: BoardAuditReminderCandidate[];
  routes: BoardAuditReminderRoute[];
  summary: {
    criticalCount: number;
    eligibleRouteCount: number;
    emailEligibleCount: number;
    inAppEligibleCount: number;
    overdueTaskCount: number;
    reminderCount: number;
    routeCount: number;
    routingScore: number;
    status: "critical" | "ready" | "warning";
    suppressedByPreferenceCount: number;
    suppressedByRoleCount: number;
    warningCount: number;
    nextAction: string;
  };
  workspaceId: string;
}

export interface CreateBoardAuditReminderRoutingReportInput {
  generatedAt?: string;
  members: WorkspaceMemberRow[];
  preferencesByUserId?: Map<string, WorkspaceNotificationDeliveryPreference[]>;
  report: PersistedBoardAuditFollowUpTasksReport;
  workspaceId?: string;
}

const channels: BoardAuditReminderChannel[] = ["in-app", "email"];

const severityRank: Record<BoardAuditReminderSeverity, number> = {
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

function daysOverdue(task: PersistedBoardAuditFollowUpTask, generatedAt: string) {
  const due = new Date(task.closeout.dueAt).getTime();
  const now = new Date(generatedAt).getTime();

  if (!Number.isFinite(due) || !Number.isFinite(now) || due >= now) {
    return 0;
  }

  return Math.max(1, Math.ceil((now - due) / 86_400_000));
}

function severityFor(task: PersistedBoardAuditFollowUpTask, generatedAt: string): BoardAuditReminderSeverity {
  return task.severity === "critical" || daysOverdue(task, generatedAt) >= 2 ? "critical" : "warning";
}

function reminderFor(task: PersistedBoardAuditFollowUpTask, generatedAt: string): BoardAuditReminderCandidate {
  const overdueDays = daysOverdue(task, generatedAt);
  const severity = severityFor(task, generatedAt);

  return {
    detail: `${task.title} is ${overdueDays} day${overdueDays === 1 ? "" : "s"} overdue for ${task.ownerName}.`,
    dueAt: task.closeout.dueAt,
    id: `board-audit-reminder:${task.id}`,
    nextAction: task.nextAction,
    ownerEmail: task.closeout.ownerEmail,
    ownerName: task.closeout.ownerName,
    severity,
    taskId: task.id,
    title: `${task.title} overdue`,
    topic: "review",
  };
}

function createReminders(report: PersistedBoardAuditFollowUpTasksReport, generatedAt: string) {
  return report.tasks
    .filter((task) => task.overdue && task.closeout.status !== "closed")
    .map((task) => reminderFor(task, generatedAt))
    .sort((first, second) => severityRank[first.severity] - severityRank[second.severity] || first.dueAt.localeCompare(second.dueAt) || first.title.localeCompare(second.title));
}

function routeReason(input: {
  channel: BoardAuditReminderChannel;
  member: WorkspaceMemberRow;
  reminder: BoardAuditReminderCandidate;
  status: BoardAuditReminderRouteStatus;
}) {
  if (input.status === "eligible") {
    return `${input.member.role} receives overdue board audit ${input.channel} reminders for ${input.reminder.taskId}.`;
  }

  if (input.status === "suppressed-by-role") {
    return `${input.member.role} cannot receive review-topic board audit reminders.`;
  }

  return `${input.channel} is disabled for review notifications.`;
}

function createRoutes(input: {
  members: WorkspaceMemberRow[];
  preferencesByUserId: Map<string, WorkspaceNotificationDeliveryPreference[]>;
  reminders: BoardAuditReminderCandidate[];
  workspaceId: string;
}) {
  const routes: BoardAuditReminderRoute[] = [];

  for (const reminder of input.reminders) {
    for (const member of input.members) {
      const preferences = normalizeWorkspaceNotificationDeliveryPreferences(input.preferencesByUserId.get(member.userId) ?? []);

      for (const channel of channels) {
        const roleEligible = canWorkspaceRoleReceiveNotificationTopic(member.role, reminder.topic);
        const status: BoardAuditReminderRouteStatus = !roleEligible
          ? "suppressed-by-role"
          : isWorkspaceNotificationTopicEnabled(preferences, reminder.topic, channel === "email" ? "email" : "inApp")
            ? "eligible"
            : "suppressed-by-preference";

        routes.push({
          channel,
          dedupeKey: `${input.workspaceId}:${member.userId}:board-audit-reminder:${reminder.taskId}:${channel}`,
          reason: routeReason({
            channel,
            member,
            reminder,
            status,
          }),
          recipientEmail: member.email,
          recipientName: member.name,
          recipientRole: member.role,
          reminderId: reminder.id,
          status,
          topic: reminder.topic,
          userId: member.userId,
        });
      }
    }
  }

  return routes;
}

function createCsv(input: {
  reminders: BoardAuditReminderCandidate[];
  routes: BoardAuditReminderRoute[];
}) {
  const header = ["reminder_id", "task_id", "severity", "topic", "title", "eligible_routes", "next_action"];
  const rows = input.reminders.map((reminder) => [
    reminder.id,
    reminder.taskId,
    reminder.severity,
    reminder.topic,
    reminder.title,
    input.routes.filter((route) => route.reminderId === reminder.id && route.status === "eligible").length,
    reminder.nextAction,
  ]);

  return `${[header.join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\n")}\n`;
}

function summarize(input: {
  reminders: BoardAuditReminderCandidate[];
  routes: BoardAuditReminderRoute[];
}): BoardAuditReminderRoutingReport["summary"] {
  const criticalCount = input.reminders.filter((reminder) => reminder.severity === "critical").length;
  const warningCount = input.reminders.filter((reminder) => reminder.severity === "warning").length;
  const eligibleRoutes = input.routes.filter((route) => route.status === "eligible");

  return {
    criticalCount,
    eligibleRouteCount: eligibleRoutes.length,
    emailEligibleCount: eligibleRoutes.filter((route) => route.channel === "email").length,
    inAppEligibleCount: eligibleRoutes.filter((route) => route.channel === "in-app").length,
    nextAction:
      criticalCount > 0
        ? "Route critical overdue board audit reminders before the next closeout review."
        : warningCount > 0
          ? "Route warning-level board audit reminders before closeout drift grows."
          : "No overdue board audit reminders need routing.",
    overdueTaskCount: input.reminders.length,
    reminderCount: input.reminders.length,
    routeCount: input.routes.length,
    routingScore: input.routes.length > 0 ? Math.round((eligibleRoutes.length / input.routes.length) * 100) : 100,
    status: criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "ready",
    suppressedByPreferenceCount: input.routes.filter((route) => route.status === "suppressed-by-preference").length,
    suppressedByRoleCount: input.routes.filter((route) => route.status === "suppressed-by-role").length,
    warningCount,
  };
}

export function createBoardAuditReminderRoutingReport(input: CreateBoardAuditReminderRoutingReportInput): BoardAuditReminderRoutingReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.report.workspaceId;
  const reminders = createReminders(input.report, generatedAt);
  const routes = createRoutes({
    members: input.members,
    preferencesByUserId: input.preferencesByUserId ?? new Map<string, WorkspaceNotificationDeliveryPreference[]>(),
    reminders,
    workspaceId,
  });
  const csvContent = createCsv({
    reminders,
    routes,
  });

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-audit-reminder-routing-${dateStamp(generatedAt)}.csv`,
    generatedAt,
    reminders,
    routes,
    summary: summarize({
      reminders,
      routes,
    }),
    workspaceId,
  };
}
