import type { WorkspaceMemberRow } from "@/features/workspaces/types";
import type { WorkspaceReleaseCalendarMilestone, WorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";

export type WorkspaceReleaseRunbookRecordStatus = "blocked" | "complete" | "in-progress" | "scheduled";

export interface WorkspaceReleaseRunbookComment {
  authorName: string;
  authorUserId: string | null;
  body: string;
  createdAt: string;
  id: string;
}

export interface WorkspaceReleaseRunbookAttachment {
  createdAt: string;
  id: string;
  label: string;
  url: string;
}

export interface WorkspaceReleaseRunbookTransition {
  actorName: string;
  actorUserId: string | null;
  at: string;
  fromOwnerUserId: string | null;
  fromStatus: WorkspaceReleaseRunbookRecordStatus;
  id: string;
  note: string | null;
  toOwnerUserId: string | null;
  toStatus: WorkspaceReleaseRunbookRecordStatus;
}

export interface WorkspaceReleaseRunbookRecord {
  auditLogHref: string;
  batchId: string;
  blockerCount: number;
  checklistEvidence: string[];
  comments: WorkspaceReleaseRunbookComment[];
  completedAt: string | null;
  detail: string;
  dueAt: string;
  id?: string;
  milestoneId: string;
  ownerEmail: string | null;
  ownerName: string;
  ownerUserId: string | null;
  projectId: string | null;
  projectName: string | null;
  sourceKey: string;
  status: WorkspaceReleaseRunbookRecordStatus;
  title: string;
  attachments: WorkspaceReleaseRunbookAttachment[];
  transitionHistory: WorkspaceReleaseRunbookTransition[];
  workspaceId: string;
}

export interface WorkspaceReleaseRunbookReport {
  generatedAt: string;
  history: {
    batchCount: number;
    recordCount: number;
  };
  records: WorkspaceReleaseRunbookRecord[];
  summary: {
    blockedCount: number;
    completeCount: number;
    inProgressCount: number;
    nextDueAt: string | null;
    ownerCount: number;
    scheduledCount: number;
    totalCount: number;
  };
}

export interface CreateWorkspaceReleaseRunbookReportInput {
  batchId?: string;
  generatedAt?: string;
  historyRecords?: WorkspaceReleaseRunbookRecord[];
  members: WorkspaceMemberRow[];
  releaseCalendar: WorkspaceReleaseCalendarReport;
  workspaceId: string;
}

export interface ApplyWorkspaceReleaseRunbookTransitionInput {
  actorName: string;
  actorUserId: string | null;
  attachment?: {
    id: string;
    label: string;
    url: string;
  } | null;
  comment?: {
    body: string;
    id: string;
  } | null;
  nextOwner?: {
    email: string | null;
    name: string;
    userId: string | null;
  } | null;
  nextStatus?: WorkspaceReleaseRunbookRecordStatus;
  note?: string | null;
  now?: string;
  transitionId: string;
}

const statusRank: Record<WorkspaceReleaseRunbookRecordStatus, number> = {
  blocked: 0,
  "in-progress": 1,
  scheduled: 2,
  complete: 3,
};

function recordStatusFromMilestone(milestone: WorkspaceReleaseCalendarMilestone): WorkspaceReleaseRunbookRecordStatus {
  if (milestone.status === "blocked") {
    return "blocked";
  }

  if (milestone.status === "done") {
    return "complete";
  }

  return milestone.status === "due" ? "in-progress" : "scheduled";
}

function preferredOwner(milestone: WorkspaceReleaseCalendarMilestone, members: WorkspaceMemberRow[]) {
  const owners = members.filter((member) => member.role === "owner");
  const admins = members.filter((member) => member.role === "admin");
  const editors = members.filter((member) => member.role === "editor");
  const viewers = members.filter((member) => member.role === "viewer");

  if (milestone.kind === "review-gate" || milestone.kind === "app-package") {
    return editors[0] ?? admins[0] ?? owners[0] ?? viewers[0] ?? null;
  }

  return admins[0] ?? owners[0] ?? editors[0] ?? viewers[0] ?? null;
}

function auditHref(workspaceId: string, milestone: WorkspaceReleaseCalendarMilestone) {
  const params = new URLSearchParams({ workspaceId });

  if (milestone.projectId) {
    params.set("projectId", milestone.projectId);
  }

  params.set("auditSource", milestone.sourceKey);

  return `/projects?${params.toString()}#audit`;
}

function createEvidence(milestone: WorkspaceReleaseCalendarMilestone) {
  const evidence = [
    milestone.detail,
    `Action: ${milestone.actionLabel}.`,
    `Source: ${milestone.source}.`,
    `Blockers: ${milestone.blockerCount}.`,
  ];

  if (milestone.completedAt) {
    evidence.push(`Completed at ${milestone.completedAt}.`);
  }

  return evidence;
}

function compareRecords(first: WorkspaceReleaseRunbookRecord, second: WorkspaceReleaseRunbookRecord) {
  return (
    statusRank[first.status] - statusRank[second.status] ||
    new Date(first.dueAt).getTime() - new Date(second.dueAt).getTime() ||
    first.title.localeCompare(second.title)
  );
}

function summarizeRecords(records: WorkspaceReleaseRunbookRecord[]): WorkspaceReleaseRunbookReport["summary"] {
  const activeRecords = records.filter((record) => record.status !== "complete").sort(compareRecords);

  return {
    blockedCount: records.filter((record) => record.status === "blocked").length,
    completeCount: records.filter((record) => record.status === "complete").length,
    inProgressCount: records.filter((record) => record.status === "in-progress").length,
    nextDueAt: activeRecords[0]?.dueAt ?? null,
    ownerCount: new Set(records.flatMap((record) => (record.ownerUserId ? [record.ownerUserId] : []))).size,
    scheduledCount: records.filter((record) => record.status === "scheduled").length,
    totalCount: records.length,
  };
}

function createHistory(records: WorkspaceReleaseRunbookRecord[]) {
  return {
    batchCount: new Set(records.map((record) => record.batchId)).size,
    recordCount: records.length,
  };
}

export function createWorkspaceReleaseRunbookRecords(input: {
  batchId: string;
  members: WorkspaceMemberRow[];
  releaseCalendar: WorkspaceReleaseCalendarReport;
  workspaceId: string;
}): WorkspaceReleaseRunbookRecord[] {
  return input.releaseCalendar.milestones
    .map<WorkspaceReleaseRunbookRecord>((milestone) => {
      const owner = preferredOwner(milestone, input.members);

      return {
        auditLogHref: auditHref(input.workspaceId, milestone),
        attachments: [],
        batchId: input.batchId,
        blockerCount: milestone.blockerCount,
        checklistEvidence: createEvidence(milestone),
        comments: [],
        completedAt: milestone.completedAt,
        detail: milestone.detail,
        dueAt: milestone.dueAt,
        milestoneId: milestone.id,
        ownerEmail: owner?.email ?? null,
        ownerName: owner?.name ?? "Unassigned",
        ownerUserId: owner?.userId ?? null,
        projectId: milestone.projectId,
        projectName: milestone.projectName,
        sourceKey: milestone.sourceKey,
        status: recordStatusFromMilestone(milestone),
        title: milestone.title,
        transitionHistory: [],
        workspaceId: input.workspaceId,
      };
    })
    .sort(compareRecords);
}

export function createWorkspaceReleaseRunbookReportFromRecords(
  records: WorkspaceReleaseRunbookRecord[],
  historyRecords: WorkspaceReleaseRunbookRecord[] = records,
  generatedAt = new Date().toISOString(),
): WorkspaceReleaseRunbookReport {
  return {
    generatedAt,
    history: createHistory(historyRecords),
    records: [...records].sort(compareRecords),
    summary: summarizeRecords(records),
  };
}

export function createWorkspaceReleaseRunbookReport(input: CreateWorkspaceReleaseRunbookReportInput): WorkspaceReleaseRunbookReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const batchId = input.batchId ?? "current";
  const records = createWorkspaceReleaseRunbookRecords({
    batchId,
    members: input.members,
    releaseCalendar: input.releaseCalendar,
    workspaceId: input.workspaceId,
  });

  return createWorkspaceReleaseRunbookReportFromRecords(records, input.historyRecords ?? records, generatedAt);
}

export function applyWorkspaceReleaseRunbookTransition(
  record: WorkspaceReleaseRunbookRecord,
  input: ApplyWorkspaceReleaseRunbookTransitionInput,
): WorkspaceReleaseRunbookRecord {
  const at = input.now ?? new Date().toISOString();
  const nextStatus = input.nextStatus ?? record.status;
  const nextOwner = input.nextOwner;
  const ownerChanged = Boolean(nextOwner && nextOwner.userId !== record.ownerUserId);
  const statusChanged = nextStatus !== record.status;
  const comments = input.comment
    ? [
        ...record.comments,
        {
          authorName: input.actorName,
          authorUserId: input.actorUserId,
          body: input.comment.body,
          createdAt: at,
          id: input.comment.id,
        },
      ]
    : record.comments;
  const attachments = input.attachment
    ? [
        ...record.attachments,
        {
          createdAt: at,
          id: input.attachment.id,
          label: input.attachment.label,
          url: input.attachment.url,
        },
      ]
    : record.attachments;
  const transitionHistory =
    statusChanged || ownerChanged || input.note
      ? [
          ...record.transitionHistory,
          {
            actorName: input.actorName,
            actorUserId: input.actorUserId,
            at,
            fromOwnerUserId: record.ownerUserId,
            fromStatus: record.status,
            id: input.transitionId,
            note: input.note ?? null,
            toOwnerUserId: nextOwner?.userId ?? record.ownerUserId,
            toStatus: nextStatus,
          },
        ]
      : record.transitionHistory;

  return {
    ...record,
    attachments,
    comments,
    completedAt: nextStatus === "complete" ? (record.completedAt ?? at) : nextStatus === record.status ? record.completedAt : null,
    ownerEmail: nextOwner?.email ?? record.ownerEmail,
    ownerName: nextOwner?.name ?? record.ownerName,
    ownerUserId: nextOwner?.userId ?? record.ownerUserId,
    status: nextStatus,
    transitionHistory,
  };
}
