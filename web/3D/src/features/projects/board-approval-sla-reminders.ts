import type {
  BoardApprovalPostApprovalAction,
  BoardApprovalPostApprovalActionStatus,
  BoardApprovalPostApprovalTrackerReport,
} from "@/features/projects/board-approval-post-approval-tracker";
import type { BoardApprovalPacketSignOffRole } from "@/features/projects/board-approval-packet";
import type { WorkspaceNotificationTopic } from "@/features/workspaces/types";

export type BoardApprovalSlaReminderStatus = "due-soon" | "overdue" | "scheduled";
export type BoardApprovalSlaReminderSeverity = "critical" | "info" | "warning";

export interface BoardApprovalSlaReminderNotification {
  actionLabel: string;
  calendarSourceKey: string;
  dueAt: string;
  hoursUntilDue: number;
  id: string;
  message: string;
  ownerEmail: string | null;
  ownerName: string;
  role: BoardApprovalPacketSignOffRole;
  runbookSourceKey: string;
  severity: BoardApprovalSlaReminderSeverity;
  signOffStatus: BoardApprovalPostApprovalActionStatus;
  slaStatus: BoardApprovalSlaReminderStatus;
  sourceKey: string;
  title: string;
  topic: WorkspaceNotificationTopic;
  updatedAt: string;
}

export interface BoardApprovalSlaReminderReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  notifications: BoardApprovalSlaReminderNotification[];
  summary: {
    blockedCount: number;
    criticalCount: number;
    dueSoonCount: number;
    emailCandidateCount: number;
    nextAction: string;
    overdueCount: number;
    scheduledCount: number;
    status: BoardApprovalSlaReminderSeverity;
    totalCount: number;
    warningCount: number;
    watchCount: number;
  };
}

export interface CreateBoardApprovalSlaReminderReportInput {
  dueSoonHours?: number;
  now?: Date;
  tracker: BoardApprovalPostApprovalTrackerReport;
  workspaceId?: string;
}

const severityRank: Record<BoardApprovalSlaReminderSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const slaStatusRank: Record<BoardApprovalSlaReminderStatus, number> = {
  overdue: 0,
  "due-soon": 1,
  scheduled: 2,
};

function slug(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64) || "workspace"
  );
}

function csvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function sourceKey(action: BoardApprovalPostApprovalAction) {
  return action.runbookSourceKey || action.calendarSourceKey || action.id;
}

function hoursUntilDue(action: BoardApprovalPostApprovalAction, now: Date) {
  const due = new Date(action.dueAt).getTime();

  if (Number.isNaN(due)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.round(((due - now.getTime()) / (60 * 60 * 1000)) * 10) / 10;
}

function getSlaStatus(hoursUntil: number, dueSoonHours: number): BoardApprovalSlaReminderStatus {
  if (hoursUntil <= 0) {
    return "overdue";
  }

  return hoursUntil <= dueSoonHours ? "due-soon" : "scheduled";
}

function getSeverity(action: BoardApprovalPostApprovalAction, slaStatus: BoardApprovalSlaReminderStatus): BoardApprovalSlaReminderSeverity {
  if (slaStatus === "overdue") {
    return action.status === "blocked" ? "critical" : "warning";
  }

  if (slaStatus === "due-soon") {
    return action.status === "blocked" || action.status === "watch" ? "warning" : "info";
  }

  return action.status === "blocked" ? "warning" : "info";
}

function titleFor(action: BoardApprovalPostApprovalAction, slaStatus: BoardApprovalSlaReminderStatus) {
  const label = action.role.charAt(0).toUpperCase() + action.role.slice(1);

  if (slaStatus === "overdue") {
    return `${label} board sign-off overdue`;
  }

  if (slaStatus === "due-soon") {
    return `${label} board sign-off due soon`;
  }

  return `${label} board sign-off scheduled`;
}

function messageFor(action: BoardApprovalPostApprovalAction, slaStatus: BoardApprovalSlaReminderStatus, hoursUntil: number) {
  if (slaStatus === "overdue") {
    return `${action.ownerName} missed the board SLA for ${action.title}; escalate ${action.action}`;
  }

  if (slaStatus === "due-soon") {
    return `${action.ownerName} has ${Math.max(hoursUntil, 0)} hour${Math.max(hoursUntil, 0) === 1 ? "" : "s"} before the board SLA on ${action.title}.`;
  }

  return `${action.ownerName} owns ${action.title}; keep the reminder visible until the sign-off closes.`;
}

function createNotification(input: {
  action: BoardApprovalPostApprovalAction;
  dueSoonHours: number;
  now: Date;
}): BoardApprovalSlaReminderNotification {
  const hoursUntil = hoursUntilDue(input.action, input.now);
  const slaStatus = getSlaStatus(hoursUntil, input.dueSoonHours);
  const severity = getSeverity(input.action, slaStatus);
  const key = sourceKey(input.action);

  return {
    actionLabel: input.action.action,
    calendarSourceKey: input.action.calendarSourceKey,
    dueAt: input.action.dueAt,
    hoursUntilDue: hoursUntil,
    id: `board-sla:${key}`,
    message: messageFor(input.action, slaStatus, hoursUntil),
    ownerEmail: input.action.ownerEmail,
    ownerName: input.action.ownerName,
    role: input.action.role,
    runbookSourceKey: input.action.runbookSourceKey,
    severity,
    signOffStatus: input.action.status,
    slaStatus,
    sourceKey: key,
    title: titleFor(input.action, slaStatus),
    topic: "review",
    updatedAt: input.now.toISOString(),
  };
}

function compareNotifications(first: BoardApprovalSlaReminderNotification, second: BoardApprovalSlaReminderNotification) {
  return (
    severityRank[first.severity] - severityRank[second.severity] ||
    slaStatusRank[first.slaStatus] - slaStatusRank[second.slaStatus] ||
    new Date(first.dueAt).getTime() - new Date(second.dueAt).getTime() ||
    first.sourceKey.localeCompare(second.sourceKey)
  );
}

function createCsv(notifications: BoardApprovalSlaReminderNotification[]) {
  const header = ["source_key", "role", "sla_status", "severity", "owner", "due_at", "next_action"];
  const rows = notifications.map((notification) =>
    [
      notification.sourceKey,
      notification.role,
      notification.slaStatus,
      notification.severity,
      notification.ownerName,
      notification.dueAt,
      notification.actionLabel,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...rows].join("\n")}\n`;
}

function summarize(input: {
  notifications: BoardApprovalSlaReminderNotification[];
  tracker: BoardApprovalPostApprovalTrackerReport;
}) {
  const topReminder = input.notifications[0] ?? null;
  const criticalCount = input.notifications.filter((notification) => notification.severity === "critical").length;
  const warningCount = input.notifications.filter((notification) => notification.severity === "warning").length;

  return {
    blockedCount: input.notifications.filter((notification) => notification.signOffStatus === "blocked").length,
    criticalCount,
    dueSoonCount: input.notifications.filter((notification) => notification.slaStatus === "due-soon").length,
    emailCandidateCount: input.notifications.filter((notification) => Boolean(notification.ownerEmail)).length,
    nextAction: topReminder?.actionLabel ?? input.tracker.summary.nextAction,
    overdueCount: input.notifications.filter((notification) => notification.slaStatus === "overdue").length,
    scheduledCount: input.notifications.filter((notification) => notification.slaStatus === "scheduled").length,
    status: criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "info",
    totalCount: input.notifications.length,
    warningCount,
    watchCount: input.notifications.filter((notification) => notification.signOffStatus === "watch").length,
  } satisfies BoardApprovalSlaReminderReport["summary"];
}

export function createBoardApprovalSlaReminderReport(input: CreateBoardApprovalSlaReminderReportInput): BoardApprovalSlaReminderReport {
  const now = input.now ?? new Date();
  const dueSoonHours = input.dueSoonHours ?? 12;
  const workspaceId = input.workspaceId ?? "workspace";
  const notifications = input.tracker.actions
    .filter((action) => action.status !== "ready")
    .map((action) =>
      createNotification({
        action,
        dueSoonHours,
        now,
      }),
    )
    .sort(compareNotifications);
  const csvContent = createCsv(notifications);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-approval-sla-reminders.csv`,
    generatedAt: now.toISOString(),
    notifications,
    summary: summarize({
      notifications,
      tracker: input.tracker,
    }),
  };
}
