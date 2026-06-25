import type {
  BoardApprovalPostApprovalAction,
  BoardApprovalPostApprovalActionStatus,
  BoardApprovalPostApprovalTrackerReport,
} from "@/features/projects/board-approval-post-approval-tracker";
import { createWorkspaceReleaseRunbookReportFromRecords, type WorkspaceReleaseRunbookRecord, type WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";
import type { WorkspaceReleaseCalendarMilestone } from "@/features/workspaces/workspace-release-calendar";

export interface BoardApprovalPostApprovalPromotionReport {
  calendarMilestones: WorkspaceReleaseCalendarMilestone[];
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  runbookRecords: WorkspaceReleaseRunbookRecord[];
  runbookReport: WorkspaceReleaseRunbookReport;
  sourceKeys: string[];
  summary: {
    blockedActionCount: number;
    calendarMilestoneCount: number;
    nextAction: string;
    readyActionCount: number;
    runbookRecordCount: number;
    status: BoardApprovalPostApprovalActionStatus;
    totalActionCount: number;
    uniqueSourceKeyCount: number;
    watchActionCount: number;
  };
}

export interface CreateBoardApprovalPostApprovalPromotionReportInput {
  promotedAt?: string;
  tracker: BoardApprovalPostApprovalTrackerReport;
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

function actionSourceKey(action: BoardApprovalPostApprovalAction) {
  return action.runbookSourceKey || action.calendarSourceKey || action.id;
}

function dedupeActions(actions: BoardApprovalPostApprovalAction[]) {
  const seen = new Set<string>();
  const deduped: BoardApprovalPostApprovalAction[] = [];

  for (const action of actions) {
    const key = actionSourceKey(action);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(action);
  }

  return deduped;
}

function runbookStatus(status: BoardApprovalPostApprovalActionStatus): WorkspaceReleaseRunbookRecord["status"] {
  return status === "blocked" ? "blocked" : status === "watch" ? "in-progress" : "scheduled";
}

function calendarStatus(status: BoardApprovalPostApprovalActionStatus): WorkspaceReleaseCalendarMilestone["status"] {
  return status === "blocked" ? "blocked" : status === "watch" ? "due" : "scheduled";
}

function fallbackRunbookRecord(input: {
  action: BoardApprovalPostApprovalAction;
  batchId: string;
  workspaceId: string;
}): WorkspaceReleaseRunbookRecord {
  return {
    auditLogHref: `/projects?${new URLSearchParams({ boardRole: input.action.role, workspaceId: input.workspaceId }).toString()}#board-approval`,
    attachments: [],
    batchId: input.batchId,
    blockerCount: input.action.status === "blocked" ? 1 : 0,
    checklistEvidence: input.action.evidence,
    comments: [],
    completedAt: null,
    detail: `${input.action.title}: ${input.action.action}`,
    dueAt: input.action.dueAt,
    milestoneId: input.action.calendarSourceKey,
    ownerEmail: input.action.ownerEmail,
    ownerName: input.action.ownerName,
    ownerUserId: null,
    projectId: null,
    projectName: null,
    sourceKey: input.action.runbookSourceKey,
    status: runbookStatus(input.action.status),
    title: input.action.title,
    transitionHistory: [],
    workspaceId: input.workspaceId,
  };
}

function fallbackCalendarMilestone(action: BoardApprovalPostApprovalAction): WorkspaceReleaseCalendarMilestone {
  return {
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
  };
}

function createCsv(actions: BoardApprovalPostApprovalAction[]) {
  const header = ["source_key", "role", "status", "runbook_source_key", "calendar_source_key", "due_at", "next_action"];
  const rows = actions.map((action) =>
    [actionSourceKey(action), action.role, action.status, action.runbookSourceKey, action.calendarSourceKey, action.dueAt, action.action].map(csvCell).join(","),
  );

  return `${[header.join(","), ...rows].join("\n")}\n`;
}

function worstStatus(actions: BoardApprovalPostApprovalAction[], fallback: BoardApprovalPostApprovalActionStatus) {
  return actions.reduce<BoardApprovalPostApprovalActionStatus>((worst, action) => (statusRank[action.status] < statusRank[worst] ? action.status : worst), fallback);
}

function summarize(input: {
  actions: BoardApprovalPostApprovalAction[];
  calendarMilestones: WorkspaceReleaseCalendarMilestone[];
  runbookRecords: WorkspaceReleaseRunbookRecord[];
  sourceKeys: string[];
  tracker: BoardApprovalPostApprovalTrackerReport;
}) {
  const blockedActionCount = input.actions.filter((action) => action.status === "blocked").length;
  const watchActionCount = input.actions.filter((action) => action.status === "watch").length;
  const readyActionCount = input.actions.filter((action) => action.status === "ready").length;
  const topAction = input.actions.find((action) => action.status === "blocked") ?? input.actions.find((action) => action.status === "watch") ?? input.actions[0] ?? null;

  return {
    blockedActionCount,
    calendarMilestoneCount: input.calendarMilestones.length,
    nextAction: topAction?.action ?? input.tracker.summary.nextAction,
    readyActionCount,
    runbookRecordCount: input.runbookRecords.length,
    status: worstStatus(input.actions, input.tracker.summary.status),
    totalActionCount: input.actions.length,
    uniqueSourceKeyCount: input.sourceKeys.length,
    watchActionCount,
  } satisfies BoardApprovalPostApprovalPromotionReport["summary"];
}

export function createBoardApprovalPostApprovalPromotionReport(
  input: CreateBoardApprovalPostApprovalPromotionReportInput,
): BoardApprovalPostApprovalPromotionReport {
  const generatedAt = input.promotedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.tracker.runbookRecords[0]?.workspaceId ?? "workspace";
  const actions = dedupeActions(input.tracker.actions);
  const sourceKeys = actions.map(actionSourceKey);
  const batchId = input.tracker.runbookRecords[0]?.batchId ?? `board-approval-post-${generatedAt.slice(0, 10).replaceAll("-", "")}`;
  const runbookRecords = actions.map((action) => {
    const existing = input.tracker.runbookRecords.find((record) => record.sourceKey === action.runbookSourceKey);

    return existing
      ? {
          ...existing,
          batchId,
          workspaceId,
        }
      : fallbackRunbookRecord({
          action,
          batchId,
          workspaceId,
        });
  });
  const calendarMilestones = actions.map((action) => {
    const existing = input.tracker.calendarMilestones.find((milestone) => milestone.sourceKey === action.calendarSourceKey);

    return existing ?? fallbackCalendarMilestone(action);
  });
  const csvContent = createCsv(actions);
  const runbookReport = createWorkspaceReleaseRunbookReportFromRecords(runbookRecords, runbookRecords, generatedAt);

  return {
    calendarMilestones,
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-post-approval-promotion.csv`,
    generatedAt,
    runbookRecords,
    runbookReport,
    sourceKeys,
    summary: summarize({
      actions,
      calendarMilestones,
      runbookRecords,
      sourceKeys,
      tracker: input.tracker,
    }),
  };
}
