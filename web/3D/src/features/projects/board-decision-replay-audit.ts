import type { BoardApprovalPacketDiffReport } from "@/features/projects/board-approval-diff";
import type { BoardApprovalPacketHistoryRecord, BoardApprovalPacketHistoryReport } from "@/features/projects/board-approval-packet-history";
import type { ProjectIncident, ProjectIncidentHistory } from "@/features/projects/project-incident-history";
import type { ReleaseEvidenceBundleSummary } from "@/features/projects/release-evidence-bundle";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";

export type BoardDecisionReplayAuditStatus = "blocked" | "ready" | "watch";
export type BoardDecisionReplayAuditKind = "approval" | "incident" | "release-evidence-drift" | "runbook-outcome";

export interface BoardDecisionReplayAuditRow {
  approvalId: string | null;
  approvedAt: string | null;
  baselineValue: string | null;
  currentValue: string | null;
  delta: number | null;
  detail: string;
  id: string;
  kind: BoardDecisionReplayAuditKind;
  nextAction: string;
  occurredAt: string | null;
  packetId: string | null;
  recipientPurpose: string | null;
  status: BoardDecisionReplayAuditStatus;
  title: string;
}

export interface BoardDecisionReplayAuditReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: BoardDecisionReplayAuditRow[];
  summary: {
    activeApprovalCount: number;
    blockedRowCount: number;
    latestApprovalAt: string | null;
    laterIncidentCount: number;
    readyApprovalCount: number;
    releaseEvidenceDriftCount: number;
    replayScore: number;
    rowCount: number;
    runbookBlockedCount: number;
    runbookIncompleteCount: number;
    status: BoardDecisionReplayAuditStatus;
    watchRowCount: number;
    nextAction: string;
  };
  workspaceId: string;
}

export interface CreateBoardDecisionReplayAuditReportInput {
  boardApprovalDiff?: BoardApprovalPacketDiffReport | null;
  generatedAt?: string;
  incidentHistory: ProjectIncidentHistory;
  packetHistory?: BoardApprovalPacketHistoryReport | null;
  releaseEvidenceSummary: ReleaseEvidenceBundleSummary;
  releaseRunbook: WorkspaceReleaseRunbookReport;
  workspaceId: string;
}

const statusRank: Record<BoardDecisionReplayAuditStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

function toTime(value: string | null | undefined) {
  const time = value ? new Date(value).getTime() : Number.NaN;

  return Number.isNaN(time) ? 0 : time;
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

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function activeApprovals(history: BoardApprovalPacketHistoryReport | null | undefined) {
  return (history?.records ?? [])
    .filter((record) => record.status === "active")
    .sort((first, second) => toTime(second.createdAt) - toTime(first.createdAt) || first.packetId.localeCompare(second.packetId))
    .slice(0, 4);
}

function laterIncidents(record: BoardApprovalPacketHistoryRecord, incidentHistory: ProjectIncidentHistory) {
  const approvedAt = toTime(record.createdAt);

  return incidentHistory.incidents
    .filter((incident) => toTime(incident.occurredAt) > approvedAt)
    .sort((first, second) => toTime(second.occurredAt) - toTime(first.occurredAt) || first.title.localeCompare(second.title))
    .slice(0, 6);
}

function approvalStatus(record: BoardApprovalPacketHistoryRecord): BoardDecisionReplayAuditStatus {
  return record.approvalStatus === "ready" ? "ready" : record.approvalStatus === "watch" ? "watch" : "blocked";
}

function createApprovalRow(record: BoardApprovalPacketHistoryRecord): BoardDecisionReplayAuditRow {
  return {
    approvalId: record.id,
    approvedAt: record.createdAt,
    baselineValue: `${record.approvalScore}/100 approval, ${record.blockedSignOffCount} blockers`,
    currentValue: record.approvalStatus,
    delta: 0,
    detail: `${record.recipientPurpose} was saved with ${record.readySignOffCount} ready sign-off${record.readySignOffCount === 1 ? "" : "s"} and ${record.watchSignOffCount} watch signal${record.watchSignOffCount === 1 ? "" : "s"}.`,
    id: `approval:${record.id}`,
    kind: "approval",
    nextAction: record.approvalStatus === "ready" ? "Use this signed packet as the replay baseline." : record.packet.summary.nextAction,
    occurredAt: record.createdAt,
    packetId: record.packetId,
    recipientPurpose: record.recipientPurpose,
    status: approvalStatus(record),
    title: "Signed board approval baseline",
  };
}

function createNoApprovalRow(generatedAt: string): BoardDecisionReplayAuditRow {
  return {
    approvalId: null,
    approvedAt: null,
    baselineValue: null,
    currentValue: null,
    delta: null,
    detail: "No active saved board approval packet is available for replay.",
    id: "approval:none",
    kind: "approval",
    nextAction: "Save an active board approval packet before replaying board decisions.",
    occurredAt: generatedAt,
    packetId: null,
    recipientPurpose: null,
    status: "blocked",
    title: "Missing signed approval",
  };
}

function createIncidentRow(record: BoardApprovalPacketHistoryRecord, incident: ProjectIncident): BoardDecisionReplayAuditRow {
  return {
    approvalId: record.id,
    approvedAt: record.createdAt,
    baselineValue: "No later incident at approval time",
    currentValue: `${incident.severity} ${incident.kind}`,
    delta: incident.severity === "critical" ? 1 : 0,
    detail: `${incident.projectName}: ${incident.message}`,
    id: `incident:${record.id}:${incident.id}`,
    kind: "incident",
    nextAction:
      incident.severity === "critical"
        ? "Re-open board approval and attach the incident remediation before release."
        : "Attach the incident note to the replay packet before final sign-off.",
    occurredAt: incident.occurredAt,
    packetId: record.packetId,
    recipientPurpose: record.recipientPurpose,
    status: incident.severity === "critical" ? "blocked" : "watch",
    title: incident.title,
  };
}

function createNoIncidentRow(record: BoardApprovalPacketHistoryRecord): BoardDecisionReplayAuditRow {
  return {
    approvalId: record.id,
    approvedAt: record.createdAt,
    baselineValue: "No later incident",
    currentValue: "No later incident",
    delta: 0,
    detail: "No project incident occurred after this board approval was saved.",
    id: `incident:none:${record.id}`,
    kind: "incident",
    nextAction: "Keep monitoring incidents until release closure.",
    occurredAt: null,
    packetId: record.packetId,
    recipientPurpose: record.recipientPurpose,
    status: "ready",
    title: "No later incidents",
  };
}

function createEvidenceDriftRow(input: {
  boardApprovalDiff: BoardApprovalPacketDiffReport | null | undefined;
  record: BoardApprovalPacketHistoryRecord;
  releaseEvidenceSummary: ReleaseEvidenceBundleSummary;
}): BoardDecisionReplayAuditRow {
  const blockerDelta = input.releaseEvidenceSummary.releaseBlockerCount - input.record.blockedSignOffCount;
  const scoreDelta = input.releaseEvidenceSummary.riskScore - input.record.approvalScore;
  const diff = input.boardApprovalDiff?.summary ?? null;
  const hasCriticalDiff = Boolean(diff && (diff.criticalChangeCount > 0 || diff.blockerDelta > 0));
  const hasWatchDiff = Boolean(diff && (diff.regressionCount > 0 || diff.checksumChanged || diff.scoreDelta < 0));
  const status: BoardDecisionReplayAuditStatus =
    blockerDelta > 0 || hasCriticalDiff ? "blocked" : blockerDelta < 0 && !hasWatchDiff && scoreDelta >= 0 ? "ready" : hasWatchDiff || scoreDelta < 0 ? "watch" : "ready";

  return {
    approvalId: input.record.id,
    approvedAt: input.record.createdAt,
    baselineValue: `${input.record.approvalScore}/100 approval, ${input.record.blockedSignOffCount} blockers`,
    currentValue: `${input.releaseEvidenceSummary.riskScore}/100 risk score, ${input.releaseEvidenceSummary.releaseBlockerCount} blockers`,
    delta: blockerDelta,
    detail:
      diff && (diff.changeCount > 0 || diff.checksumChanged)
        ? `${diff.changeCount} packet drift row${diff.changeCount === 1 ? "" : "s"}, ${diff.regressionCount} regression${diff.regressionCount === 1 ? "" : "s"}, checksum ${diff.checksumChanged ? "changed" : "stable"}.`
        : `Release evidence bundle currently carries ${input.releaseEvidenceSummary.releaseBlockerCount} release blocker${input.releaseEvidenceSummary.releaseBlockerCount === 1 ? "" : "s"}.`,
    id: `evidence-drift:${input.record.id}`,
    kind: "release-evidence-drift",
    nextAction:
      status === "blocked"
        ? (diff?.nextAction ?? "Re-open board approval before release because evidence drift introduced blockers.")
        : status === "watch"
          ? "Attach the drift explanation to the board replay packet before release."
          : "Archive the stable evidence comparison with the signed packet.",
    occurredAt: input.boardApprovalDiff?.generatedAt ?? null,
    packetId: input.record.packetId,
    recipientPurpose: input.record.recipientPurpose,
    status,
    title: "Release evidence drift",
  };
}

function createRunbookOutcomeRow(record: BoardApprovalPacketHistoryRecord, releaseRunbook: WorkspaceReleaseRunbookReport): BoardDecisionReplayAuditRow {
  const incompleteCount = Math.max(0, releaseRunbook.summary.totalCount - releaseRunbook.summary.completeCount);
  const status: BoardDecisionReplayAuditStatus = releaseRunbook.summary.blockedCount > 0 ? "blocked" : incompleteCount > 0 ? "watch" : "ready";

  return {
    approvalId: record.id,
    approvedAt: record.createdAt,
    baselineValue: `${record.readySignOffCount}/${record.readySignOffCount + record.watchSignOffCount + record.blockedSignOffCount} sign-offs ready`,
    currentValue: `${releaseRunbook.summary.completeCount}/${releaseRunbook.summary.totalCount} complete`,
    delta: releaseRunbook.summary.blockedCount,
    detail: `${releaseRunbook.summary.blockedCount} blocked, ${releaseRunbook.summary.inProgressCount} in progress, ${releaseRunbook.summary.scheduledCount} scheduled runbook row${releaseRunbook.summary.totalCount === 1 ? "" : "s"}.`,
    id: `runbook:${record.id}`,
    kind: "runbook-outcome",
    nextAction:
      status === "blocked"
        ? "Clear blocked runbook rows before honoring the signed decision."
        : status === "watch"
          ? "Finish or reschedule open runbook rows before release closure."
          : "Archive completed runbook evidence with the board replay audit.",
    occurredAt: releaseRunbook.generatedAt,
    packetId: record.packetId,
    recipientPurpose: record.recipientPurpose,
    status,
    title: "Release runbook outcome",
  };
}

function compareRows(first: BoardDecisionReplayAuditRow, second: BoardDecisionReplayAuditRow) {
  return statusRank[first.status] - statusRank[second.status] || toTime(second.occurredAt) - toTime(first.occurredAt) || first.title.localeCompare(second.title);
}

function createCsv(rows: BoardDecisionReplayAuditRow[]) {
  const header = [
    "approval_id",
    "packet_id",
    "recipient_purpose",
    "kind",
    "status",
    "title",
    "baseline",
    "current",
    "delta",
    "occurred_at",
    "next_action",
  ];

  return [
    header.join(","),
    ...rows.map((row) =>
      [
        row.approvalId,
        row.packetId,
        row.recipientPurpose,
        row.kind,
        row.status,
        row.title,
        row.baselineValue,
        row.currentValue,
        row.delta,
        row.occurredAt,
        row.nextAction,
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\n");
}

function summarize(input: {
  approvals: BoardApprovalPacketHistoryRecord[];
  boardApprovalDiff: BoardApprovalPacketDiffReport | null | undefined;
  laterIncidentCount: number;
  releaseRunbook: WorkspaceReleaseRunbookReport;
  rows: BoardDecisionReplayAuditRow[];
}): BoardDecisionReplayAuditReport["summary"] {
  const blockedRowCount = input.rows.filter((row) => row.status === "blocked").length;
  const watchRowCount = input.rows.filter((row) => row.status === "watch").length;
  const releaseEvidenceDriftCount = input.rows.filter((row) => row.kind === "release-evidence-drift" && row.status !== "ready").length;
  const runbookIncompleteCount = Math.max(0, input.releaseRunbook.summary.totalCount - input.releaseRunbook.summary.completeCount);
  const replayScore = clampScore(100 - blockedRowCount * 18 - watchRowCount * 7 - input.laterIncidentCount * 5 - releaseEvidenceDriftCount * 6);
  const status = input.rows.reduce<BoardDecisionReplayAuditStatus>((worst, row) => (statusRank[row.status] < statusRank[worst] ? row.status : worst), "ready");
  const latestApprovalAt = input.approvals.map((record) => record.createdAt).sort((first, second) => toTime(second) - toTime(first))[0] ?? null;

  return {
    activeApprovalCount: input.approvals.length,
    blockedRowCount,
    latestApprovalAt,
    laterIncidentCount: input.laterIncidentCount,
    nextAction:
      input.approvals.length === 0
        ? "Save an active board approval packet before replaying board decisions."
        : releaseEvidenceDriftCount > 0 && input.boardApprovalDiff?.summary.nextAction
          ? input.boardApprovalDiff.summary.nextAction
          : blockedRowCount > 0
            ? "Re-open board approval before release because replay found blocked outcomes."
            : watchRowCount > 0
              ? "Attach watch-level replay notes before final release closure."
              : "Archive this replay audit with the signed approval packet.",
    readyApprovalCount: input.approvals.filter((record) => record.approvalStatus === "ready").length,
    releaseEvidenceDriftCount,
    replayScore,
    rowCount: input.rows.length,
    runbookBlockedCount: input.releaseRunbook.summary.blockedCount,
    runbookIncompleteCount,
    status,
    watchRowCount,
  };
}

export function createBoardDecisionReplayAuditReport(input: CreateBoardDecisionReplayAuditReportInput): BoardDecisionReplayAuditReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const approvals = activeApprovals(input.packetHistory);
  const rows =
    approvals.length === 0
      ? [createNoApprovalRow(generatedAt)]
      : approvals.flatMap((record) => {
          const incidents = laterIncidents(record, input.incidentHistory);

          return [
            createApprovalRow(record),
            ...(incidents.length > 0 ? incidents.map((incident) => createIncidentRow(record, incident)) : [createNoIncidentRow(record)]),
            createEvidenceDriftRow({
              boardApprovalDiff: input.boardApprovalDiff,
              record,
              releaseEvidenceSummary: input.releaseEvidenceSummary,
            }),
            createRunbookOutcomeRow(record, input.releaseRunbook),
          ];
        });
  const sortedRows = rows.sort(compareRows);
  const csvContent = createCsv(sortedRows);
  const summary = summarize({
    approvals,
    boardApprovalDiff: input.boardApprovalDiff,
    laterIncidentCount: sortedRows.filter((row) => row.kind === "incident" && row.status !== "ready").length,
    releaseRunbook: input.releaseRunbook,
    rows: sortedRows,
  });

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(input.workspaceId)}-board-decision-replay-audit.csv`,
    generatedAt,
    rows: sortedRows,
    summary,
    workspaceId: input.workspaceId,
  };
}
