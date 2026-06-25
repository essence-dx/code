import type {
  BoardAuditTaskPersistenceRecord,
  PersistedBoardAuditFollowUpTask,
  PersistedBoardAuditFollowUpTasksReport,
} from "@/features/projects/board-audit-follow-up-tasks";
import type { BoardAuditReminderRoutingReport } from "@/features/projects/board-audit-reminder-routing";

export type BoardAuditCompletionDigestStatus = "blocked" | "ready" | "watch";
export type BoardAuditCompletionTrendDirection = "declining" | "flat" | "improving";

export interface BoardAuditCompletionTrendRow {
  current: number;
  delta: number;
  direction: BoardAuditCompletionTrendDirection;
  metric: string;
  previous: number;
}

export interface BoardAuditCarryForwardRisk {
  dueAt: string;
  ownerName: string;
  reason: string;
  severity: PersistedBoardAuditFollowUpTask["severity"];
  taskId: string;
  title: string;
}

export interface BoardAuditCompletionDigest {
  carryForward: BoardAuditCarryForwardRisk[];
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  summary: {
    carryForwardCount: number;
    closedCount: number;
    closureScore: number;
    closureScoreDelta: number;
    completionScore: number;
    reminderRouteCount: number;
    status: BoardAuditCompletionDigestStatus;
    taskCount: number;
    trendCount: number;
    unresolvedRiskCount: number;
    nextAction: string;
  };
  trends: BoardAuditCompletionTrendRow[];
  workspaceId: string;
}

export interface CreateBoardAuditCompletionDigestInput {
  generatedAt?: string;
  records?: BoardAuditTaskPersistenceRecord[];
  reminderRouting: BoardAuditReminderRoutingReport | null;
  report: PersistedBoardAuditFollowUpTasksReport;
  workspaceId?: string;
}

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

function directionForDelta(delta: number, inverse = false): BoardAuditCompletionTrendDirection {
  if (delta === 0) {
    return "flat";
  }

  const improving = inverse ? delta < 0 : delta > 0;

  return improving ? "improving" : "declining";
}

function trendRow(input: {
  current: number;
  inverse?: boolean;
  metric: string;
  previous: number;
}): BoardAuditCompletionTrendRow {
  const delta = input.current - input.previous;

  return {
    current: input.current,
    delta,
    direction: directionForDelta(delta, input.inverse),
    metric: input.metric,
    previous: input.previous,
  };
}

function sortedRecords(records: BoardAuditTaskPersistenceRecord[]) {
  return [...records].sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

function createTrendRows(input: {
  currentRecord: BoardAuditTaskPersistenceRecord | null;
  previousRecord: BoardAuditTaskPersistenceRecord | null;
  report: PersistedBoardAuditFollowUpTasksReport;
}): BoardAuditCompletionTrendRow[] {
  const current = input.currentRecord;
  const previous = input.previousRecord;

  if (!current || !previous) {
    return [
      trendRow({
        current: input.report.summary.closureScore,
        metric: "Closure score",
        previous: input.report.summary.closureScore,
      }),
    ];
  }

  return [
    trendRow({ current: current.closureScore, metric: "Closure score", previous: previous.closureScore }),
    trendRow({ current: current.closedCount, metric: "Closed tasks", previous: previous.closedCount }),
    trendRow({ current: current.overdueCount, inverse: true, metric: "Overdue tasks", previous: previous.overdueCount }),
    trendRow({ current: current.assignedCount, metric: "Assigned tasks", previous: previous.assignedCount }),
  ];
}

function unresolvedTasks(report: PersistedBoardAuditFollowUpTasksReport) {
  return report.tasks.filter((task) => task.closeout.status !== "closed" && (task.overdue || task.closeout.status === "blocked" || task.severity === "critical"));
}

function createCarryForward(report: PersistedBoardAuditFollowUpTasksReport): BoardAuditCarryForwardRisk[] {
  return unresolvedTasks(report)
    .map((task) => ({
      dueAt: task.closeout.dueAt,
      ownerName: task.closeout.ownerName,
      reason: task.overdue ? "Overdue task remains open." : task.closeout.status === "blocked" ? "Blocked closeout state remains unresolved." : "Critical task remains unresolved.",
      severity: task.severity,
      taskId: task.id,
      title: task.title,
    }))
    .sort((first, second) => first.dueAt.localeCompare(second.dueAt) || first.title.localeCompare(second.title));
}

function createCompletionScore(input: {
  closureScore: number;
  overdueCount: number;
  reminderCriticalCount: number;
  unresolvedRiskCount: number;
}) {
  return Math.max(0, Math.min(100, input.closureScore - input.unresolvedRiskCount * 8 - input.overdueCount * 5 - input.reminderCriticalCount * 4));
}

function createStatus(input: {
  completionScore: number;
  reminderCriticalCount: number;
  unresolvedRiskCount: number;
}): BoardAuditCompletionDigestStatus {
  if (input.unresolvedRiskCount > 0 || input.reminderCriticalCount > 0 || input.completionScore < 60) {
    return "blocked";
  }

  return input.completionScore < 90 ? "watch" : "ready";
}

function createNextAction(input: {
  carryForward: BoardAuditCarryForwardRisk[];
  reminderRouting: BoardAuditReminderRoutingReport | null;
  status: BoardAuditCompletionDigestStatus;
}) {
  if (input.reminderRouting && input.reminderRouting.summary.criticalCount > 0) {
    return input.reminderRouting.summary.nextAction;
  }

  if (input.carryForward[0]) {
    return `Close carry-forward risk for ${input.carryForward[0].title}.`;
  }

  return input.status === "ready" ? "Board audit closeout is ready for completion." : "Review board audit trend movement before completion.";
}

function createCsv(input: {
  carryForward: BoardAuditCarryForwardRisk[];
  trends: BoardAuditCompletionTrendRow[];
}) {
  const trendHeader = ["metric", "current", "previous", "delta", "direction"];
  const riskHeader = ["task_id", "severity", "owner", "due_at", "title", "reason"];
  const trendRows = input.trends.map((row) => [row.metric, row.current, row.previous, row.delta, row.direction].map(csvCell).join(","));
  const riskRows = input.carryForward.map((risk) => [risk.taskId, risk.severity, risk.ownerName, risk.dueAt, risk.title, risk.reason].map(csvCell).join(","));

  return `${[trendHeader.join(","), ...trendRows, "", riskHeader.join(","), ...riskRows].join("\n")}\n`;
}

export function createBoardAuditCompletionDigest(input: CreateBoardAuditCompletionDigestInput): BoardAuditCompletionDigest {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.report.workspaceId;
  const records = sortedRecords(input.records ?? []);
  const currentRecord = records[0] ?? null;
  const previousRecord = records[1] ?? null;
  const trends = createTrendRows({
    currentRecord,
    previousRecord,
    report: input.report,
  });
  const carryForward = createCarryForward(input.report);
  const unresolvedRiskCount = carryForward.length;
  const reminderCriticalCount = input.reminderRouting?.summary.criticalCount ?? 0;
  const completionScore = createCompletionScore({
    closureScore: input.report.summary.closureScore,
    overdueCount: input.report.summary.overdueCount,
    reminderCriticalCount,
    unresolvedRiskCount,
  });
  const status = createStatus({
    completionScore,
    reminderCriticalCount,
    unresolvedRiskCount,
  });
  const csvContent = createCsv({
    carryForward,
    trends,
  });

  return {
    carryForward,
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-audit-completion-digest-${dateStamp(generatedAt)}.csv`,
    generatedAt,
    summary: {
      carryForwardCount: carryForward.length,
      closedCount: input.report.summary.closedCount,
      closureScore: input.report.summary.closureScore,
      closureScoreDelta: trends.find((row) => row.metric === "Closure score")?.delta ?? 0,
      completionScore,
      reminderRouteCount: input.reminderRouting?.summary.eligibleRouteCount ?? 0,
      status,
      taskCount: input.report.summary.taskCount,
      trendCount: trends.length,
      unresolvedRiskCount,
      nextAction: createNextAction({
        carryForward,
        reminderRouting: input.reminderRouting,
        status,
      }),
    },
    trends,
    workspaceId,
  };
}
