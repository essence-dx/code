import type { BoardApprovalMeetingAgendaReport } from "@/features/projects/board-approval-agenda";
import type {
  BoardApprovalPacketReport,
  BoardApprovalPacketSignOffRole,
  BoardApprovalPacketSignOffRow,
  BoardApprovalPacketStatus,
} from "@/features/projects/board-approval-packet";
import type { WorkspaceReleaseRunbookRecord, WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";
import type { WorkspaceReleaseCalendarMilestone, WorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";

export type BoardApprovalPostApprovalActionStatus = BoardApprovalPacketStatus;
export type BoardApprovalPostApprovalActionSource = "board-sign-off";

export interface BoardApprovalPostApprovalAction {
  action: string;
  agendaItemId: string | null;
  calendarSourceKey: string;
  dueAt: string;
  evidence: string[];
  id: string;
  ownerEmail: string | null;
  ownerName: string;
  role: BoardApprovalPacketSignOffRole;
  runbookSourceKey: string;
  source: BoardApprovalPostApprovalActionSource;
  status: BoardApprovalPostApprovalActionStatus;
  title: string;
}

export interface BoardApprovalPostApprovalTrackerReport {
  actions: BoardApprovalPostApprovalAction[];
  calendarMilestones: WorkspaceReleaseCalendarMilestone[];
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  runbookRecords: WorkspaceReleaseRunbookRecord[];
  summary: {
    blockedActionCount: number;
    calendarMilestoneCount: number;
    existingCalendarMilestoneCount: number;
    existingRunbookRecordCount: number;
    nextAction: string;
    readyActionCount: number;
    runbookRecordCount: number;
    status: BoardApprovalPostApprovalActionStatus;
    totalActionCount: number;
    watchActionCount: number;
  };
}

export interface CreateBoardApprovalPostApprovalTrackerInput {
  boardApprovalAgenda?: BoardApprovalMeetingAgendaReport | null;
  boardApprovalPacket: BoardApprovalPacketReport;
  generatedAt?: string;
  releaseCalendar?: WorkspaceReleaseCalendarReport | null;
  releaseRunbook?: WorkspaceReleaseRunbookReport | null;
  workspaceId?: string;
}

const statusRank: Record<BoardApprovalPostApprovalActionStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
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

function addHours(value: string, hours: number) {
  const date = new Date(value);
  const time = Number.isNaN(date.getTime()) ? Date.now() : date.getTime();

  return new Date(time + hours * 60 * 60 * 1000).toISOString();
}

function dueAt(signOff: BoardApprovalPacketSignOffRow, generatedAt: string, index: number) {
  return signOff.dueAt ?? addHours(generatedAt, signOff.status === "blocked" ? 4 + index : 24 + index);
}

function titleForSignOff(signOff: BoardApprovalPacketSignOffRow) {
  return `Close ${signOff.role} board sign-off`;
}

function sourceKey(signOff: BoardApprovalPacketSignOffRow) {
  return `board-approval-signoff:${signOff.role}`;
}

function agendaItemForRole(agenda: BoardApprovalMeetingAgendaReport | null | undefined, role: BoardApprovalPacketSignOffRole) {
  return agenda?.items.find((item) => item.sourceId === role || item.id === `sign-off:${role}`) ?? null;
}

function actionEvidence(input: {
  agendaItem: ReturnType<typeof agendaItemForRole>;
  packet: BoardApprovalPacketReport;
  signOff: BoardApprovalPacketSignOffRow;
}) {
  return [
    `Packet: ${input.packet.packetId}.`,
    `Sign-off evidence: ${input.signOff.evidenceHash}.`,
    `Current status: ${input.signOff.status}.`,
    ...input.signOff.evidenceLinks.map((link) => `Evidence link: ${link}.`),
    input.agendaItem ? `Agenda decision: ${input.agendaItem.decisionPrompt}` : null,
  ].filter((entry): entry is string => Boolean(entry));
}

function createActions(input: {
  agenda: BoardApprovalMeetingAgendaReport | null | undefined;
  generatedAt: string;
  packet: BoardApprovalPacketReport;
}) {
  return input.packet.signOffs
    .filter((signOff) => signOff.status !== "ready")
    .map<BoardApprovalPostApprovalAction>((signOff, index) => {
      const item = agendaItemForRole(input.agenda, signOff.role);
      const key = sourceKey(signOff);

      return {
        action: signOff.action,
        agendaItemId: item?.id ?? null,
        calendarSourceKey: key,
        dueAt: dueAt(signOff, input.generatedAt, index),
        evidence: actionEvidence({
          agendaItem: item,
          packet: input.packet,
          signOff,
        }),
        id: `board-post-approval:${signOff.role}`,
        ownerEmail: signOff.ownerEmail,
        ownerName: signOff.ownerName,
        role: signOff.role,
        runbookSourceKey: key,
        source: "board-sign-off",
        status: signOff.status,
        title: titleForSignOff(signOff),
      };
    })
    .sort(compareActions);
}

function compareActions(first: BoardApprovalPostApprovalAction, second: BoardApprovalPostApprovalAction) {
  return statusRank[first.status] - statusRank[second.status] || first.dueAt.localeCompare(second.dueAt) || first.role.localeCompare(second.role);
}

function runbookStatus(status: BoardApprovalPostApprovalActionStatus): WorkspaceReleaseRunbookRecord["status"] {
  return status === "blocked" ? "blocked" : status === "watch" ? "in-progress" : "scheduled";
}

function calendarStatus(status: BoardApprovalPostApprovalActionStatus): WorkspaceReleaseCalendarMilestone["status"] {
  return status === "blocked" ? "blocked" : status === "watch" ? "due" : "scheduled";
}

function auditHref(workspaceId: string, action: BoardApprovalPostApprovalAction) {
  const params = new URLSearchParams({ workspaceId, boardRole: action.role });

  return `/projects?${params.toString()}#board-approval`;
}

function createRunbookRecords(input: {
  actions: BoardApprovalPostApprovalAction[];
  batchId: string;
  workspaceId: string;
}) {
  return input.actions.map<WorkspaceReleaseRunbookRecord>((action) => ({
    auditLogHref: auditHref(input.workspaceId, action),
    attachments: [],
    batchId: input.batchId,
    blockerCount: action.status === "blocked" ? 1 : 0,
    checklistEvidence: action.evidence,
    comments: [],
    completedAt: null,
    detail: `${action.title}: ${action.action}`,
    dueAt: action.dueAt,
    milestoneId: action.calendarSourceKey,
    ownerEmail: action.ownerEmail,
    ownerName: action.ownerName,
    ownerUserId: null,
    projectId: null,
    projectName: null,
    sourceKey: action.runbookSourceKey,
    status: runbookStatus(action.status),
    title: action.title,
    transitionHistory: [],
    workspaceId: input.workspaceId,
  }));
}

function createCalendarMilestones(actions: BoardApprovalPostApprovalAction[]) {
  return actions.map<WorkspaceReleaseCalendarMilestone>((action) => ({
    actionLabel: action.action,
    blockerCount: action.status === "blocked" ? 1 : 0,
    completedAt: null,
    detail: `${action.title} before board approval can close.`,
    dueAt: action.dueAt,
    id: `review-workflow:${action.calendarSourceKey}`,
    kind: "review-gate",
    projectId: null,
    projectName: null,
    source: "review-workflow",
    sourceKey: action.calendarSourceKey,
    status: calendarStatus(action.status),
    title: action.title,
  }));
}

function createCsv(actions: BoardApprovalPostApprovalAction[]) {
  const header = ["role", "status", "owner", "due_at", "runbook_source_key", "calendar_source_key", "next_action"];
  const rows = actions.map((action) =>
    [action.role, action.status, action.ownerName, action.dueAt, action.runbookSourceKey, action.calendarSourceKey, action.action].map(csvCell).join(","),
  );

  return `${[header.join(","), ...rows].join("\n")}\n`;
}

function worstStatus(statuses: BoardApprovalPostApprovalActionStatus[]) {
  return statuses.reduce<BoardApprovalPostApprovalActionStatus>((worst, status) => (statusRank[status] < statusRank[worst] ? status : worst), "ready");
}

function summarize(input: {
  actions: BoardApprovalPostApprovalAction[];
  calendar: WorkspaceReleaseCalendarReport | null | undefined;
  packet: BoardApprovalPacketReport;
  runbook: WorkspaceReleaseRunbookReport | null | undefined;
}) {
  const blockedActionCount = input.actions.filter((action) => action.status === "blocked").length;
  const watchActionCount = input.actions.filter((action) => action.status === "watch").length;
  const readyActionCount = input.actions.filter((action) => action.status === "ready").length;
  const topAction = input.actions.find((action) => action.status === "blocked") ?? input.actions.find((action) => action.status === "watch") ?? input.actions[0] ?? null;
  const actionKeys = new Set(input.actions.map((action) => action.runbookSourceKey));

  return {
    blockedActionCount,
    calendarMilestoneCount: input.actions.length,
    existingCalendarMilestoneCount: input.calendar?.milestones.filter((milestone) => actionKeys.has(milestone.sourceKey)).length ?? 0,
    existingRunbookRecordCount: input.runbook?.records.filter((record) => actionKeys.has(record.sourceKey)).length ?? 0,
    nextAction: topAction?.action ?? input.packet.summary.nextAction,
    readyActionCount,
    runbookRecordCount: input.actions.length,
    status: worstStatus([input.packet.summary.status, ...input.actions.map((action) => action.status)]),
    totalActionCount: input.actions.length,
    watchActionCount,
  } satisfies BoardApprovalPostApprovalTrackerReport["summary"];
}

export function createBoardApprovalPostApprovalTracker(input: CreateBoardApprovalPostApprovalTrackerInput): BoardApprovalPostApprovalTrackerReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const actions = createActions({
    agenda: input.boardApprovalAgenda,
    generatedAt,
    packet: input.boardApprovalPacket,
  });
  const runbookRecords = createRunbookRecords({
    actions,
    batchId: `board-approval-post-${generatedAt.slice(0, 10).replaceAll("-", "")}`,
    workspaceId,
  });
  const calendarMilestones = createCalendarMilestones(actions);
  const csvContent = createCsv(actions);

  return {
    actions,
    calendarMilestones,
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-post-approval-actions.csv`,
    generatedAt,
    runbookRecords,
    summary: summarize({
      actions,
      calendar: input.releaseCalendar,
      packet: input.boardApprovalPacket,
      runbook: input.releaseRunbook,
    }),
  };
}

export function isBoardApprovalPostApprovalTrackerReport(value: unknown): value is BoardApprovalPostApprovalTrackerReport {
  if (!value || typeof value !== "object") {
    return false;
  }

  const report = value as Partial<BoardApprovalPostApprovalTrackerReport>;

  return (
    typeof report.generatedAt === "string" &&
    typeof report.csvContent === "string" &&
    typeof report.csvDataUri === "string" &&
    typeof report.csvFileName === "string" &&
    Array.isArray(report.actions) &&
    Array.isArray(report.runbookRecords) &&
    Array.isArray(report.calendarMilestones) &&
    report.actions.every(
      (action) =>
        action &&
        typeof action === "object" &&
        typeof (action as BoardApprovalPostApprovalAction).id === "string" &&
        typeof (action as BoardApprovalPostApprovalAction).action === "string" &&
        typeof (action as BoardApprovalPostApprovalAction).dueAt === "string" &&
        typeof (action as BoardApprovalPostApprovalAction).ownerName === "string" &&
        typeof (action as BoardApprovalPostApprovalAction).runbookSourceKey === "string" &&
        typeof (action as BoardApprovalPostApprovalAction).calendarSourceKey === "string" &&
        ((action as BoardApprovalPostApprovalAction).status === "blocked" ||
          (action as BoardApprovalPostApprovalAction).status === "ready" ||
          (action as BoardApprovalPostApprovalAction).status === "watch"),
    ) &&
    !!report.summary &&
    typeof report.summary.totalActionCount === "number" &&
    typeof report.summary.nextAction === "string" &&
    (report.summary.status === "blocked" || report.summary.status === "ready" || report.summary.status === "watch")
  );
}
