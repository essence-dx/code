import { createHash } from "node:crypto";
import { nanoid } from "nanoid";

export type BoardAuditFollowUpTaskKind = "control" | "decision" | "evidence" | "workload";
export type BoardAuditFollowUpTaskSeverity = "critical" | "high" | "medium";
export type BoardAuditFollowUpTaskStatus = "blocked" | "open" | "watch";
export type BoardAuditTaskCloseoutStatus = "assigned" | "blocked" | "closed" | "in_progress" | "open";
export type BoardAuditTaskPersistenceFormat = "csv" | "json";

export interface BoardAuditFollowUpTask {
  dueAt: string;
  id: string;
  kind: BoardAuditFollowUpTaskKind;
  nextAction: string;
  ownerEmail: string | null;
  ownerName: string;
  severity: BoardAuditFollowUpTaskSeverity;
  sourceId: string;
  sourceLabel: string;
  status: BoardAuditFollowUpTaskStatus;
  title: string;
}

export interface BoardAuditFollowUpTasksReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  summary: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    nextAction: string;
    status: "blocked" | "ready" | "watch";
    taskCount: number;
    taskScore: number;
    unassignedCount: number;
  };
  tasks: BoardAuditFollowUpTask[];
  workspaceId: string;
}

export interface BoardAuditTaskCloseoutState {
  closedAt: string | null;
  closeoutNote: string | null;
  dueAt: string;
  ownerEmail: string | null;
  ownerName: string;
  ownerUserId: string | null;
  status: BoardAuditTaskCloseoutStatus;
  taskId: string;
  updatedAt: string;
}

export interface PersistedBoardAuditFollowUpTask extends BoardAuditFollowUpTask {
  closeout: BoardAuditTaskCloseoutState;
  overdue: boolean;
}

export interface PersistedBoardAuditFollowUpTasksReport extends Omit<BoardAuditFollowUpTasksReport, "csvContent" | "csvDataUri" | "tasks"> {
  csvContent: string;
  csvDataUri: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  summary: BoardAuditFollowUpTasksReport["summary"] & {
    assignedCount: number;
    closedCount: number;
    closureScore: number;
    overdueCount: number;
    persistedCount: number;
  };
  tasks: PersistedBoardAuditFollowUpTask[];
}

export interface BoardAuditTaskPersistenceActor {
  email: string | null;
  name: string | null;
  userId: string | null;
}

export interface BoardAuditTaskPersistenceRecord {
  actor: BoardAuditTaskPersistenceActor;
  assignedCount: number;
  closedCount: number;
  closureScore: number;
  contentHash: string;
  createdAt: string;
  csvByteSize: number;
  csvFileName: string;
  id: string;
  jsonByteSize: number;
  jsonFileName: string;
  overdueCount: number;
  persisted: PersistedBoardAuditFollowUpTasksReport;
  recordId: string;
  taskCount: number;
  workspaceId: string;
}

export interface CreateBoardAuditTaskPersistenceRecordInput {
  actor: BoardAuditTaskPersistenceActor;
  createdAt?: string;
  id?: string;
  persisted: PersistedBoardAuditFollowUpTasksReport;
  workspaceId: string;
}

interface ExecutiveDigestInput {
  rows: Array<{
    id: string;
    kind: string;
    metric: string;
    nextAction: string;
    score: number;
    status: "blocked" | "ready" | "watch";
    title: string;
  }>;
  summary: {
    blockedDecisionCount?: number;
    digestScore?: number;
    overloadedReviewerCount?: number;
    riskCount?: number;
    staleEvidenceCount?: number;
    unassignedTaskCount?: number;
    watchCount?: number;
    nextAction: string;
    status: "blocked" | "ready" | "watch";
  };
}

interface DecisionLedgerInput {
  decisions: Array<{
    id: string;
    nextAction: string;
    owner: string;
    score: number;
    source: string;
    sourceHash?: string | null;
    sourceId: string;
    status: "blocked" | "ready" | "watch";
    title: string;
  }>;
  summary?: unknown;
}

interface FreshnessMonitorInput {
  rows: Array<{
    ageDays: number;
    id: string;
    kind: string;
    nextAction: string;
    owner: string;
    score: number;
    sourceHash?: string | null;
    sourceId: string;
    status: "expired" | "fresh" | "stale" | "watch";
    title: string;
  }>;
  summary?: unknown;
}

interface ReviewerWorkloadInput {
  rows: Array<{
    agendaItemCount?: number;
    exceptionSignoffCount?: number;
    nextAction: string;
    packetReviewCount?: number;
    pendingAcknowledgementCount?: number;
    reviewerEmail: string | null;
    reviewerName: string;
    status: "balanced" | "blocked" | "overloaded" | "watch";
    tasks?: unknown[];
    workloadPoints: number;
  }>;
  summary?: unknown;
}

export interface CreateBoardAuditFollowUpTasksInput {
  decisionLedger: DecisionLedgerInput | null;
  executiveDigest: ExecutiveDigestInput | null;
  freshnessMonitor: FreshnessMonitorInput | null;
  generatedAt?: string;
  reviewerWorkload: ReviewerWorkloadInput | null;
  workspaceId?: string;
}

const severityRank: Record<BoardAuditFollowUpTaskSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

const kindRank: Record<BoardAuditFollowUpTaskKind, number> = {
  control: 0,
  decision: 1,
  evidence: 2,
  workload: 3,
};

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
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

function addDays(value: string, days: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString();
}

function dueAt(generatedAt: string, severity: BoardAuditFollowUpTaskSeverity) {
  if (severity === "critical") {
    return addDays(generatedAt, 2);
  }

  return severity === "high" ? addDays(generatedAt, 3) : addDays(generatedAt, 5);
}

function taskStatus(severity: BoardAuditFollowUpTaskSeverity): BoardAuditFollowUpTaskStatus {
  return severity === "critical" ? "blocked" : severity === "high" ? "open" : "watch";
}

function controlTasks(input: CreateBoardAuditFollowUpTasksInput, generatedAt: string): BoardAuditFollowUpTask[] {
  return (
    input.executiveDigest?.rows
      .filter((row) => row.kind === "control-score" && row.status !== "ready")
      .map((row) => {
        const severity: BoardAuditFollowUpTaskSeverity = row.status === "blocked" ? "critical" : "medium";

        return {
          dueAt: dueAt(generatedAt, severity),
          id: `control:${row.id}`,
          kind: "control" as const,
          nextAction: row.nextAction,
          ownerEmail: null,
          ownerName: "Board operations",
          severity,
          sourceId: row.id,
          sourceLabel: row.title,
          status: taskStatus(severity),
          title: row.title,
        };
      }) ?? []
  );
}

function decisionTasks(input: CreateBoardAuditFollowUpTasksInput, generatedAt: string): BoardAuditFollowUpTask[] {
  return (
    input.decisionLedger?.decisions
      .filter((decision) => decision.status === "blocked")
      .map((decision) => {
        const severity: BoardAuditFollowUpTaskSeverity = decision.status === "blocked" ? "critical" : "medium";

        return {
          dueAt: dueAt(generatedAt, severity),
          id: `decision:${decision.id}`,
          kind: "decision" as const,
          nextAction: decision.nextAction,
          ownerEmail: null,
          ownerName: decision.owner,
          severity,
          sourceId: decision.sourceId,
          sourceLabel: decision.source,
          status: taskStatus(severity),
          title: decision.title,
        };
      }) ?? []
  );
}

function evidenceTasks(input: CreateBoardAuditFollowUpTasksInput, generatedAt: string): BoardAuditFollowUpTask[] {
  return (
    input.freshnessMonitor?.rows
      .filter((row) => row.status === "expired" || row.status === "stale")
      .map((row) => {
        const severity: BoardAuditFollowUpTaskSeverity = "critical";

        return {
          dueAt: dueAt(generatedAt, severity),
          id: `evidence:${row.id}`,
          kind: "evidence" as const,
          nextAction: row.nextAction,
          ownerEmail: null,
          ownerName: row.owner,
          severity,
          sourceId: row.sourceId,
          sourceLabel: row.kind,
          status: taskStatus(severity),
          title: row.title,
        };
      }) ?? []
  );
}

function workloadTasks(input: CreateBoardAuditFollowUpTasksInput, generatedAt: string): BoardAuditFollowUpTask[] {
  return (
    input.reviewerWorkload?.rows
      .filter((row) => row.status === "blocked" || row.status === "overloaded")
      .map((row) => {
        const unassigned = row.reviewerEmail === null && row.reviewerName === "Unassigned";
        const severity: BoardAuditFollowUpTaskSeverity = unassigned ? "high" : "critical";

        return {
          dueAt: dueAt(generatedAt, severity),
          id: unassigned ? "workload:unassigned" : `workload:${row.reviewerEmail ?? row.reviewerName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          kind: "workload" as const,
          nextAction: row.nextAction,
          ownerEmail: row.reviewerEmail,
          ownerName: row.reviewerName,
          severity,
          sourceId: row.reviewerEmail ?? "unassigned",
          sourceLabel: "reviewer-workload",
          status: taskStatus(severity),
          title: unassigned ? "Assign unowned board audit work" : `${row.reviewerName} workload redistribution`,
        };
      }) ?? []
  );
}

function createTasks(input: CreateBoardAuditFollowUpTasksInput, generatedAt: string) {
  return [...controlTasks(input, generatedAt), ...decisionTasks(input, generatedAt), ...evidenceTasks(input, generatedAt), ...workloadTasks(input, generatedAt)].sort(
    (first, second) =>
      severityRank[first.severity] - severityRank[second.severity] ||
      kindRank[first.kind] - kindRank[second.kind] ||
      first.dueAt.localeCompare(second.dueAt) ||
      first.title.localeCompare(second.title),
  );
}

function createSummary(tasks: BoardAuditFollowUpTask[]): BoardAuditFollowUpTasksReport["summary"] {
  const criticalCount = tasks.filter((task) => task.severity === "critical").length;
  const highCount = tasks.filter((task) => task.severity === "high").length;
  const mediumCount = tasks.filter((task) => task.severity === "medium").length;
  const unassignedCount = tasks.filter((task) => task.ownerEmail === null && task.ownerName === "Unassigned").length;
  const nextTask = tasks[0] ?? null;

  return {
    criticalCount,
    highCount,
    mediumCount,
    nextAction: nextTask?.nextAction ?? "No board audit follow-up tasks are needed.",
    status: criticalCount > 0 || unassignedCount > 0 ? "blocked" : highCount > 0 || mediumCount > 0 ? "watch" : "ready",
    taskCount: tasks.length,
    taskScore: Math.max(0, Math.min(100, 100 - criticalCount * 15 - highCount * 7 - mediumCount * 4)),
    unassignedCount,
  };
}

function createCsv(tasks: BoardAuditFollowUpTask[]) {
  const header = ["task_id", "kind", "severity", "status", "owner", "due_at", "source", "next_action"];
  const body = tasks.map((task) =>
    [task.id, task.kind, task.severity, task.status, task.ownerEmail ?? task.ownerName, task.dueAt, task.sourceLabel, task.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

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

  return JSON.stringify(value);
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function byteSize(value: string) {
  return new TextEncoder().encode(value).byteLength;
}

export function createBoardAuditFollowUpTasksReport(input: CreateBoardAuditFollowUpTasksInput): BoardAuditFollowUpTasksReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const tasks = createTasks(input, generatedAt);
  const summary = createSummary(tasks);
  const csvContent = createCsv(tasks);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-audit-follow-up-tasks-${dateStamp(generatedAt)}.csv`,
    generatedAt,
    summary,
    tasks,
    workspaceId,
  };
}

function defaultCloseout(task: BoardAuditFollowUpTask, updatedAt: string): BoardAuditTaskCloseoutState {
  return {
    closedAt: null,
    closeoutNote: null,
    dueAt: task.dueAt,
    ownerEmail: task.ownerEmail,
    ownerName: task.ownerName,
    ownerUserId: null,
    status: task.ownerEmail || task.ownerName !== "Unassigned" ? "assigned" : "open",
    taskId: task.id,
    updatedAt,
  };
}

function isOverdue(task: PersistedBoardAuditFollowUpTask, asOf: string) {
  if (task.closeout.status === "closed") {
    return false;
  }

  const due = new Date(task.closeout.dueAt).getTime();
  const now = new Date(asOf).getTime();

  return Number.isFinite(due) && Number.isFinite(now) && due < now;
}

function createPersistentSummary(
  tasks: PersistedBoardAuditFollowUpTask[],
  base: BoardAuditFollowUpTasksReport["summary"],
  persistedTaskIds: Set<string>,
): PersistedBoardAuditFollowUpTasksReport["summary"] {
  const assignedCount = tasks.filter((task) => persistedTaskIds.has(task.id) && (task.closeout.ownerEmail || task.closeout.ownerUserId)).length;
  const closedCount = tasks.filter((task) => task.closeout.status === "closed").length;
  const overdueCount = tasks.filter((task) => task.overdue).length;
  const persistedCount = tasks.filter((task) => persistedTaskIds.has(task.id)).length;

  return {
    ...base,
    assignedCount,
    closedCount,
    closureScore: tasks.length === 0 ? 100 : Math.round((closedCount / tasks.length) * 100),
    overdueCount,
    persistedCount,
  };
}

function createPersistedCsv(tasks: PersistedBoardAuditFollowUpTask[]) {
  const header = [
    "task_id",
    "kind",
    "severity",
    "task_status",
    "closeout_status",
    "owner",
    "owner_email",
    "due_at",
    "overdue",
    "source",
    "next_action",
    "closeout_note",
    "closed_at",
  ];
  const body = tasks.map((task) =>
    [
      task.id,
      task.kind,
      task.severity,
      task.status,
      task.closeout.status,
      task.closeout.ownerName,
      task.closeout.ownerEmail,
      task.closeout.dueAt,
      task.overdue ? "yes" : "no",
      task.sourceLabel,
      task.nextAction,
      task.closeout.closeoutNote,
      task.closeout.closedAt,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createPersistedJson(report: Omit<PersistedBoardAuditFollowUpTasksReport, "csvDataUri" | "jsonContent" | "jsonDataUri">) {
  return JSON.stringify(
    {
      generatedAt: report.generatedAt,
      summary: report.summary,
      tasks: report.tasks,
      workspaceId: report.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardAuditTaskPersistenceFileName(report: BoardAuditFollowUpTasksReport, format: BoardAuditTaskPersistenceFormat) {
  return `${slug(report.workspaceId)}-board-audit-follow-up-tasks-${dateStamp(report.generatedAt)}.${format}`;
}

export function applyBoardAuditTaskPersistence(
  report: BoardAuditFollowUpTasksReport,
  states: BoardAuditTaskCloseoutState[] = [],
): PersistedBoardAuditFollowUpTasksReport {
  const updatedAt = report.generatedAt;
  const statesByTaskId = new Map(states.map((state) => [state.taskId, state]));
  const asOf = states.reduce((latest, state) => (state.updatedAt > latest ? state.updatedAt : latest), report.generatedAt);
  const tasks = report.tasks.map((task) => {
    const closeout = statesByTaskId.get(task.id) ?? defaultCloseout(task, updatedAt);
    const persistedTask: PersistedBoardAuditFollowUpTask = {
      ...task,
      closeout,
      dueAt: closeout.dueAt,
      ownerEmail: closeout.ownerEmail,
      ownerName: closeout.ownerName,
      overdue: false,
    };

    return {
      ...persistedTask,
      overdue: isOverdue(persistedTask, asOf),
    };
  });
  const summary = createPersistentSummary(tasks, report.summary, new Set(statesByTaskId.keys()));
  const csvContent = createPersistedCsv(tasks);
  const jsonFileName = createBoardAuditTaskPersistenceFileName(report, "json");
  const base = {
    ...report,
    csvContent,
    csvFileName: createBoardAuditTaskPersistenceFileName(report, "csv"),
    jsonFileName,
    summary,
    tasks,
  };
  const jsonContent = createPersistedJson(base);

  return {
    ...base,
    csvDataUri: encodeCsvDataUri(csvContent),
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
  };
}

function createRecordId(workspaceId: string, generatedAt: string) {
  return `board-audit-follow-up-tasks-${slug(workspaceId)}-${dateStamp(generatedAt)}`;
}

export function createBoardAuditTaskPersistenceRecord(input: CreateBoardAuditTaskPersistenceRecordInput): BoardAuditTaskPersistenceRecord {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const baseRecord = {
    actor: input.actor,
    assignedCount: input.persisted.summary.assignedCount,
    closedCount: input.persisted.summary.closedCount,
    closureScore: input.persisted.summary.closureScore,
    createdAt,
    csvFileName: input.persisted.csvFileName,
    id: input.id ?? nanoid(),
    jsonFileName: input.persisted.jsonFileName,
    overdueCount: input.persisted.summary.overdueCount,
    persisted: input.persisted,
    recordId: createRecordId(input.workspaceId, input.persisted.generatedAt),
    taskCount: input.persisted.summary.taskCount,
    workspaceId: input.workspaceId,
  };

  return {
    ...baseRecord,
    contentHash: sha256({
      actor: baseRecord.actor,
      persisted: baseRecord.persisted,
      recordId: baseRecord.recordId,
      workspaceId: baseRecord.workspaceId,
    }),
    csvByteSize: byteSize(input.persisted.csvContent),
    jsonByteSize: byteSize(input.persisted.jsonContent),
  };
}

export function getBoardAuditTaskPersistenceDownload(record: BoardAuditTaskPersistenceRecord, format: BoardAuditTaskPersistenceFormat) {
  if (format === "json") {
    return {
      body: record.persisted.jsonContent,
      fileName: record.jsonFileName,
      mimeType: "application/json;charset=utf-8",
    };
  }

  return {
    body: record.persisted.csvContent,
    fileName: record.csvFileName,
    mimeType: "text/csv;charset=utf-8",
  };
}

export function isBoardAuditTaskCloseoutStatus(value: unknown): value is BoardAuditTaskCloseoutStatus {
  return value === "assigned" || value === "blocked" || value === "closed" || value === "in_progress" || value === "open";
}

function isPersistedTask(value: unknown): value is PersistedBoardAuditFollowUpTask {
  if (!value || typeof value !== "object") {
    return false;
  }

  const task = value as Partial<PersistedBoardAuditFollowUpTask>;

  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    typeof task.dueAt === "string" &&
    !!task.closeout &&
    typeof task.closeout === "object" &&
    typeof task.closeout.taskId === "string" &&
    typeof task.closeout.dueAt === "string" &&
    isBoardAuditTaskCloseoutStatus(task.closeout.status)
  );
}

export function isPersistedBoardAuditFollowUpTasksReport(value: unknown): value is PersistedBoardAuditFollowUpTasksReport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const report = value as Partial<PersistedBoardAuditFollowUpTasksReport>;

  return (
    typeof report.generatedAt === "string" &&
    typeof report.workspaceId === "string" &&
    typeof report.csvContent === "string" &&
    typeof report.jsonContent === "string" &&
    typeof report.csvFileName === "string" &&
    typeof report.jsonFileName === "string" &&
    Array.isArray(report.tasks) &&
    report.tasks.every(isPersistedTask) &&
    !!report.summary &&
    typeof report.summary.taskCount === "number" &&
    typeof report.summary.closureScore === "number"
  );
}
