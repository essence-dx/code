import { createHash } from "node:crypto";
import { nanoid } from "nanoid";
import type {
  BoardApprovalPostApprovalAction,
  BoardApprovalPostApprovalActionStatus,
  BoardApprovalPostApprovalTrackerReport,
} from "@/features/projects/board-approval-post-approval-tracker";
import type { BoardApprovalPacketSignOffRole } from "@/features/projects/board-approval-packet";

export type BoardApprovalPostApprovalActionAuditAction = "created" | "refreshed";

export interface BoardApprovalPostApprovalActionActor {
  email: string | null;
  name: string | null;
  userId: string | null;
}

export interface BoardApprovalPostApprovalActionAuditEvent {
  action: BoardApprovalPostApprovalActionAuditAction;
  actor: BoardApprovalPostApprovalActionActor;
  at: string;
  note: string;
}

export interface BoardApprovalPostApprovalActionRecord {
  action: string;
  auditTrail: BoardApprovalPostApprovalActionAuditEvent[];
  calendarSourceKey: string;
  contentHash: string;
  createdAt: string;
  createdBy: BoardApprovalPostApprovalActionActor;
  dueAt: string;
  generatedAction: BoardApprovalPostApprovalAction;
  id: string;
  ownerEmail: string | null;
  ownerName: string;
  refreshCount: number;
  role: BoardApprovalPacketSignOffRole;
  runbookSourceKey: string;
  sourceKey: string;
  status: BoardApprovalPostApprovalActionStatus;
  title: string;
  trackerGeneratedAt: string;
  updatedAt: string;
  updatedBy: BoardApprovalPostApprovalActionActor;
  workspaceId: string;
}

export interface BoardApprovalPostApprovalActionHistoryReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  records: BoardApprovalPostApprovalActionRecord[];
  summary: {
    actorCount: number;
    blockedActionCount: number;
    dedupedSourceKeyCount: number;
    latestSavedAt: string | null;
    readyActionCount: number;
    refreshCount: number;
    totalCount: number;
    watchActionCount: number;
  };
}

export interface CreateBoardApprovalPostApprovalActionRecordsInput {
  actor: BoardApprovalPostApprovalActionActor;
  existingRecords?: BoardApprovalPostApprovalActionRecord[];
  savedAt?: string;
  tracker: BoardApprovalPostApprovalTrackerReport;
  workspaceId: string;
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

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function dateStamp(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "current" : date.toISOString().slice(0, 10).replaceAll("-", "");
}

function actionContentHash(action: BoardApprovalPostApprovalAction, workspaceId: string) {
  return sha256({
    action,
    workspaceId,
  });
}

function createAuditEvent(input: {
  action: BoardApprovalPostApprovalActionAuditAction;
  actor: BoardApprovalPostApprovalActionActor;
  at: string;
  sourceKey: string;
}) {
  return {
    action: input.action,
    actor: input.actor,
    at: input.at,
    note:
      input.action === "created"
        ? `Created board post-approval action ${input.sourceKey}.`
        : `Refreshed board post-approval action ${input.sourceKey} from the latest tracker.`,
  } satisfies BoardApprovalPostApprovalActionAuditEvent;
}

function createRecord(input: {
  action: BoardApprovalPostApprovalAction;
  actor: BoardApprovalPostApprovalActionActor;
  savedAt: string;
  trackerGeneratedAt: string;
  workspaceId: string;
}): BoardApprovalPostApprovalActionRecord {
  const sourceKey = input.action.runbookSourceKey || input.action.calendarSourceKey || input.action.id;

  return {
    action: input.action.action,
    auditTrail: [
      createAuditEvent({
        action: "created",
        actor: input.actor,
        at: input.savedAt,
        sourceKey,
      }),
    ],
    calendarSourceKey: input.action.calendarSourceKey,
    contentHash: actionContentHash(input.action, input.workspaceId),
    createdAt: input.savedAt,
    createdBy: input.actor,
    dueAt: input.action.dueAt,
    generatedAction: input.action,
    id: nanoid(),
    ownerEmail: input.action.ownerEmail,
    ownerName: input.action.ownerName,
    refreshCount: 0,
    role: input.action.role,
    runbookSourceKey: input.action.runbookSourceKey,
    sourceKey,
    status: input.action.status,
    title: input.action.title,
    trackerGeneratedAt: input.trackerGeneratedAt,
    updatedAt: input.savedAt,
    updatedBy: input.actor,
    workspaceId: input.workspaceId,
  };
}

function refreshRecord(input: {
  action: BoardApprovalPostApprovalAction;
  actor: BoardApprovalPostApprovalActionActor;
  existing: BoardApprovalPostApprovalActionRecord;
  savedAt: string;
  trackerGeneratedAt: string;
  workspaceId: string;
}): BoardApprovalPostApprovalActionRecord {
  return {
    ...input.existing,
    action: input.action.action,
    auditTrail: [
      ...input.existing.auditTrail,
      createAuditEvent({
        action: "refreshed",
        actor: input.actor,
        at: input.savedAt,
        sourceKey: input.existing.sourceKey,
      }),
    ],
    calendarSourceKey: input.action.calendarSourceKey,
    contentHash: actionContentHash(input.action, input.workspaceId),
    dueAt: input.action.dueAt,
    generatedAction: input.action,
    ownerEmail: input.action.ownerEmail,
    ownerName: input.action.ownerName,
    refreshCount: input.existing.refreshCount + 1,
    role: input.action.role,
    runbookSourceKey: input.action.runbookSourceKey,
    status: input.action.status,
    title: input.action.title,
    trackerGeneratedAt: input.trackerGeneratedAt,
    updatedAt: input.savedAt,
    updatedBy: input.actor,
    workspaceId: input.workspaceId,
  };
}

function sortRecords(first: BoardApprovalPostApprovalActionRecord, second: BoardApprovalPostApprovalActionRecord) {
  const statusRank: Record<BoardApprovalPostApprovalActionStatus, number> = {
    blocked: 0,
    watch: 1,
    ready: 2,
  };

  return statusRank[first.status] - statusRank[second.status] || first.dueAt.localeCompare(second.dueAt) || first.sourceKey.localeCompare(second.sourceKey);
}

export function createBoardApprovalPostApprovalActionRecords(input: CreateBoardApprovalPostApprovalActionRecordsInput): BoardApprovalPostApprovalActionRecord[] {
  const savedAt = input.savedAt ?? new Date().toISOString();
  const existingBySourceKey = new Map(input.existingRecords?.map((record) => [record.sourceKey, record]) ?? []);

  return input.tracker.actions
    .map((action) => {
      const sourceKey = action.runbookSourceKey || action.calendarSourceKey || action.id;
      const existing = existingBySourceKey.get(sourceKey);

      return existing
        ? refreshRecord({
            action,
            actor: input.actor,
            existing,
            savedAt,
            trackerGeneratedAt: input.tracker.generatedAt,
            workspaceId: input.workspaceId,
          })
        : createRecord({
            action,
            actor: input.actor,
            savedAt,
            trackerGeneratedAt: input.tracker.generatedAt,
            workspaceId: input.workspaceId,
          });
    })
    .sort(sortRecords);
}

function createCsv(records: BoardApprovalPostApprovalActionRecord[]) {
  const header = ["source_key", "role", "status", "owner", "due_at", "refresh_count", "updated_at", "next_action"];
  const rows = records.map((record) =>
    [record.sourceKey, record.role, record.status, record.ownerName, record.dueAt, record.refreshCount, record.updatedAt, record.action].map(csvCell).join(","),
  );

  return `${[header.join(","), ...rows].join("\n")}\n`;
}

export function createBoardApprovalPostApprovalActionHistoryReport(
  records: BoardApprovalPostApprovalActionRecord[],
): BoardApprovalPostApprovalActionHistoryReport {
  const sorted = [...records].sort(sortRecords);
  const actors = new Set(sorted.flatMap((record) => record.auditTrail.map((event) => event.actor.userId ?? event.actor.email ?? event.actor.name ?? "unknown")));
  const csvContent = createCsv(sorted);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `essence-spline-board-post-approval-actions-${dateStamp(sorted[0]?.updatedAt ?? new Date().toISOString())}.csv`,
    records: sorted,
    summary: {
      actorCount: actors.size,
      blockedActionCount: sorted.filter((record) => record.status === "blocked").length,
      dedupedSourceKeyCount: new Set(sorted.map((record) => record.sourceKey)).size,
      latestSavedAt: sorted.reduce<string | null>((latest, record) => (latest && latest > record.updatedAt ? latest : record.updatedAt), null),
      readyActionCount: sorted.filter((record) => record.status === "ready").length,
      refreshCount: sorted.reduce((sum, record) => sum + record.refreshCount, 0),
      totalCount: sorted.length,
      watchActionCount: sorted.filter((record) => record.status === "watch").length,
    },
  };
}
