import type { BoardDecisionReplayAuditReport, BoardDecisionReplayAuditRow, BoardDecisionReplayAuditStatus } from "@/features/projects/board-decision-replay-audit";
import type { WorkspaceReleaseCalendarMilestone, WorkspaceReleaseCalendarReport } from "@/features/workspaces/workspace-release-calendar";

export type BoardAssuranceExceptionApproverSignoff = "approved" | "changes-requested" | "pending";
export type BoardAssuranceExceptionStatus = "approved" | "expired" | "pending" | "rejected" | "release-gate-blocked" | "request-needed";
export type BoardAssuranceReleaseGateStatus = "blocked" | "clear" | "missing";

export interface BoardAssuranceExceptionRequest {
  approverNote: string | null;
  approverSignoff: BoardAssuranceExceptionApproverSignoff;
  expiresAt: string;
  id: string;
  ownerNote: string;
  releaseGateSourceKeys: string[];
  requestedAt: string;
  requestedBy: string;
  scopeId: string;
  signedOffAt: string | null;
  signedOffBy: string | null;
}

export interface BoardAssuranceExceptionWorkflowRow {
  approverNote: string | null;
  approverSignoff: BoardAssuranceExceptionApproverSignoff | null;
  blockedReleaseGateCount: number;
  checkedReleaseGateCount: number;
  dueReleaseGateCount: number;
  evidence: string;
  exceptionId: string | null;
  expiresAt: string | null;
  expiresInDays: number | null;
  id: string;
  nextAction: string;
  ownerNote: string;
  releaseGateLabels: string[];
  releaseGateSourceKeys: string[];
  releaseGateStatus: BoardAssuranceReleaseGateStatus;
  replayKind: BoardDecisionReplayAuditRow["kind"];
  replayStatus: BoardDecisionReplayAuditStatus;
  requestedAt: string | null;
  requestedBy: string | null;
  scopeId: string;
  signedOffAt: string | null;
  signedOffBy: string | null;
  status: BoardAssuranceExceptionStatus;
  title: string;
}

export interface BoardAssuranceExceptionWorkflowReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: BoardAssuranceExceptionWorkflowRow[];
  summary: {
    approvedCount: number;
    expiredCount: number;
    expiringSoonCount: number;
    pendingCount: number;
    rejectedCount: number;
    releaseGateBlockedCount: number;
    requestNeededCount: number;
    status: BoardAssuranceExceptionStatus;
    totalCount: number;
    workflowScore: number;
    nextAction: string;
  };
  workspaceId: string;
}

export interface CreateBoardAssuranceExceptionWorkflowInput {
  exceptionRequests?: BoardAssuranceExceptionRequest[];
  generatedAt?: string;
  releaseCalendar: WorkspaceReleaseCalendarReport;
  replayAudit: BoardDecisionReplayAuditReport;
}

const statusRank: Record<BoardAssuranceExceptionStatus, number> = {
  "release-gate-blocked": 0,
  expired: 1,
  rejected: 2,
  "request-needed": 3,
  pending: 4,
  approved: 5,
};

const statusScore: Record<BoardAssuranceExceptionStatus, number> = {
  approved: 100,
  expired: 0,
  pending: 50,
  rejected: 0,
  "release-gate-blocked": 50,
  "request-needed": 35,
};

function toTime(value: string | null | undefined) {
  const time = value ? new Date(value).getTime() : Number.NaN;

  return Number.isNaN(time) ? 0 : time;
}

function daysUntil(value: string | null, generatedAt: string) {
  const targetTime = toTime(value);
  const generatedTime = toTime(generatedAt);

  if (!targetTime || !generatedTime) {
    return null;
  }

  return Math.ceil((targetTime - generatedTime) / (24 * 60 * 60 * 1000));
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
      .slice(0, 64) || "workspace"
  );
}

function activeReplayRows(report: BoardDecisionReplayAuditReport) {
  return report.rows.filter((row) => row.status !== "ready");
}

function isOpenReleaseGate(milestone: WorkspaceReleaseCalendarMilestone) {
  return milestone.status === "blocked" || milestone.status === "due";
}

function suggestedGateKeys(row: BoardDecisionReplayAuditRow, releaseCalendar: WorkspaceReleaseCalendarReport) {
  if (row.kind === "incident") {
    const postDeployKeys = releaseCalendar.milestones.filter((milestone) => milestone.kind === "post-deploy").map((milestone) => milestone.sourceKey);

    if (postDeployKeys.length > 0) {
      return postDeployKeys;
    }
  }

  return releaseCalendar.milestones.filter(isOpenReleaseGate).map((milestone) => milestone.sourceKey);
}

function releaseGateMatches(row: BoardDecisionReplayAuditRow, request: BoardAssuranceExceptionRequest | null, releaseCalendar: WorkspaceReleaseCalendarReport) {
  const keys = request?.releaseGateSourceKeys.length ? request.releaseGateSourceKeys : suggestedGateKeys(row, releaseCalendar);
  const keySet = new Set(keys);
  const milestones = releaseCalendar.milestones.filter((milestone) => keySet.has(milestone.sourceKey));

  return {
    keys,
    labels: milestones.map((milestone) => milestone.title),
    milestones,
  };
}

function releaseGateStatus(input: { keys: string[]; milestones: WorkspaceReleaseCalendarMilestone[] }): BoardAssuranceReleaseGateStatus {
  if (input.keys.length > 0 && input.milestones.length === 0) {
    return "missing";
  }

  if (input.milestones.some((milestone) => milestone.status === "blocked")) {
    return "blocked";
  }

  return "clear";
}

function statusFromRequest(input: {
  generatedAt: string;
  gateStatus: BoardAssuranceReleaseGateStatus;
  request: BoardAssuranceExceptionRequest | null;
}): BoardAssuranceExceptionStatus {
  if (!input.request) {
    return "request-needed";
  }

  const expiresAtTime = toTime(input.request.expiresAt);
  const generatedAtTime = toTime(input.generatedAt);

  if (expiresAtTime > 0 && generatedAtTime > 0 && expiresAtTime < generatedAtTime) {
    return "expired";
  }

  if (input.request.approverSignoff === "changes-requested") {
    return "rejected";
  }

  if (input.request.approverSignoff !== "approved" || !input.request.signedOffAt || !input.request.signedOffBy) {
    return "pending";
  }

  if (input.gateStatus !== "clear") {
    return "release-gate-blocked";
  }

  return "approved";
}

function nextActionForStatus(status: BoardAssuranceExceptionStatus) {
  if (status === "approved") {
    return "Keep the signed exception, expiry, and release-gate evidence with the board assurance packet.";
  }

  if (status === "release-gate-blocked") {
    return "Clear blocked release gates before relying on this board assurance exception.";
  }

  if (status === "expired") {
    return "Renew or close this expired board assurance exception before release.";
  }

  if (status === "rejected") {
    return "Resolve approver feedback before requesting another board assurance exception.";
  }

  if (status === "pending") {
    return "Collect approver sign-off and keep the expiry date attached before release.";
  }

  return "Create a scoped board assurance exception with owner note, expiry date, approver sign-off, and release-gate checks.";
}

function rowFromReplay(input: {
  generatedAt: string;
  releaseCalendar: WorkspaceReleaseCalendarReport;
  request: BoardAssuranceExceptionRequest | null;
  replayRow: BoardDecisionReplayAuditRow;
}): BoardAssuranceExceptionWorkflowRow {
  const gateMatches = releaseGateMatches(input.replayRow, input.request, input.releaseCalendar);
  const gateStatus = releaseGateStatus(gateMatches);
  const status = statusFromRequest({
    generatedAt: input.generatedAt,
    gateStatus,
    request: input.request,
  });
  const blockedReleaseGateCount = gateMatches.milestones.filter((milestone) => milestone.status === "blocked").length;
  const dueReleaseGateCount = gateMatches.milestones.filter((milestone) => milestone.status === "due").length;

  return {
    approverNote: input.request?.approverNote ?? null,
    approverSignoff: input.request?.approverSignoff ?? null,
    blockedReleaseGateCount,
    checkedReleaseGateCount: gateMatches.milestones.length,
    dueReleaseGateCount,
    evidence: input.replayRow.detail,
    exceptionId: input.request?.id ?? null,
    expiresAt: input.request?.expiresAt ?? null,
    expiresInDays: daysUntil(input.request?.expiresAt ?? null, input.generatedAt),
    id: input.request ? `exception:${input.request.scopeId}` : `suggested:${input.replayRow.id}`,
    nextAction: nextActionForStatus(status),
    ownerNote: input.request?.ownerNote ?? input.replayRow.nextAction,
    releaseGateLabels: gateMatches.labels,
    releaseGateSourceKeys: gateMatches.keys,
    releaseGateStatus: gateStatus,
    replayKind: input.replayRow.kind,
    replayStatus: input.replayRow.status,
    requestedAt: input.request?.requestedAt ?? null,
    requestedBy: input.request?.requestedBy ?? null,
    scopeId: input.replayRow.id,
    signedOffAt: input.request?.signedOffAt ?? null,
    signedOffBy: input.request?.signedOffBy ?? null,
    status,
    title: input.replayRow.title,
  };
}

function createCsv(rows: BoardAssuranceExceptionWorkflowRow[]) {
  const header = [
    "scope_id",
    "replay_status",
    "exception_status",
    "expires_at",
    "release_gate_status",
    "blocked_release_gates",
    "approver",
    "owner_note",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.scopeId,
      row.replayStatus,
      row.status,
      row.expiresAt,
      row.releaseGateStatus,
      row.blockedReleaseGateCount,
      row.signedOffBy,
      row.ownerNote,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarizeRows(rows: BoardAssuranceExceptionWorkflowRow[]): BoardAssuranceExceptionWorkflowReport["summary"] {
  const status = rows.reduce<BoardAssuranceExceptionStatus>((worst, row) => (statusRank[row.status] < statusRank[worst] ? row.status : worst), "approved");

  return {
    approvedCount: rows.filter((row) => row.status === "approved").length,
    expiredCount: rows.filter((row) => row.status === "expired").length,
    expiringSoonCount: rows.filter((row) => row.status === "approved" && row.expiresInDays !== null && row.expiresInDays <= 7).length,
    nextAction:
      rows.length === 0
        ? "No board assurance exceptions are needed for the current replay audit."
        : nextActionForStatus(status),
    pendingCount: rows.filter((row) => row.status === "pending").length,
    rejectedCount: rows.filter((row) => row.status === "rejected").length,
    releaseGateBlockedCount: rows.filter((row) => row.status === "release-gate-blocked").length,
    requestNeededCount: rows.filter((row) => row.status === "request-needed").length,
    status,
    totalCount: rows.length,
    workflowScore: rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + statusScore[row.status], 0) / rows.length) : 100,
  };
}

function sortRows(rows: BoardAssuranceExceptionWorkflowRow[]) {
  return [...rows].sort((first, second) => {
    const firstDays = first.expiresInDays ?? Number.POSITIVE_INFINITY;
    const secondDays = second.expiresInDays ?? Number.POSITIVE_INFINITY;

    return statusRank[first.status] - statusRank[second.status] || firstDays - secondDays || first.title.localeCompare(second.title);
  });
}

export function createBoardAssuranceExceptionWorkflow(input: CreateBoardAssuranceExceptionWorkflowInput): BoardAssuranceExceptionWorkflowReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const requestsByScopeId = new Map((input.exceptionRequests ?? []).map((request) => [request.scopeId, request]));
  const rows = sortRows(
    activeReplayRows(input.replayAudit).map((replayRow) =>
      rowFromReplay({
        generatedAt,
        releaseCalendar: input.releaseCalendar,
        replayRow,
        request: requestsByScopeId.get(replayRow.id) ?? null,
      }),
    ),
  );
  const csvContent = createCsv(rows);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(input.replayAudit.workspaceId)}-board-assurance-exceptions.csv`,
    generatedAt,
    rows,
    summary: summarizeRows(rows),
    workspaceId: input.replayAudit.workspaceId,
  };
}
