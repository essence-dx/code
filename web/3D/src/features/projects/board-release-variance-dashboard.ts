import type { BoardAssuranceEvidenceBundleReport } from "@/features/projects/board-assurance-evidence-bundle";
import type { BoardApprovalPacketHistoryRecord, BoardApprovalPacketHistoryReport } from "@/features/projects/board-approval-packet-history";
import type { BoardDecisionReplayAuditReport } from "@/features/projects/board-decision-replay-audit";
import type { BoardDecisionReplaySnapshotHistoryReport, BoardDecisionReplaySnapshotRecord } from "@/features/projects/board-decision-replay-snapshots";
import type { ProjectIncidentPostmortemReport } from "@/features/projects/project-incident-postmortem";
import type { WorkspaceReleaseRunbookReport } from "@/features/workspaces/release-runbook";

export type BoardReleaseVarianceStatus = "blocked" | "ready" | "watch";
export type BoardReleaseVarianceDirection = "declining" | "flat" | "improving";
export type BoardReleaseVarianceMetricId = "approval-score" | "blocker-drift" | "incident-recurrence" | "runbook-follow-through";

export interface BoardReleaseVarianceRow {
  currentValue: number;
  delta: number;
  detail: string;
  direction: BoardReleaseVarianceDirection;
  id: BoardReleaseVarianceMetricId;
  label: string;
  nextAction: string;
  previousValue: number;
  status: BoardReleaseVarianceStatus;
  unit: "count" | "percent" | "score";
}

export interface BoardReleaseVarianceTrendPoint {
  at: string;
  blockedRows: number;
  laterIncidents: number;
  replayScore: number;
  runbookBlocked: number;
  runbookIncomplete: number;
  snapshotId: string;
}

export interface BoardReleaseVarianceDashboard {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: BoardReleaseVarianceRow[];
  summary: {
    approvalScoreDelta: number;
    blockedCount: number;
    blockerDrift: number;
    incidentRecurrenceDelta: number;
    readyCount: number;
    rowCount: number;
    runbookFollowThroughDelta: number;
    status: BoardReleaseVarianceStatus;
    trendPointCount: number;
    varianceScore: number;
    watchCount: number;
    nextAction: string;
  };
  trendPoints: BoardReleaseVarianceTrendPoint[];
  workspaceId: string;
}

export interface CreateBoardReleaseVarianceDashboardInput {
  approvalHistory?: BoardApprovalPacketHistoryReport | null;
  evidenceBundle?: BoardAssuranceEvidenceBundleReport | null;
  generatedAt?: string;
  incidentPostmortemReport: ProjectIncidentPostmortemReport;
  replayAudit: BoardDecisionReplayAuditReport;
  replaySnapshotHistory?: BoardDecisionReplaySnapshotHistoryReport | null;
  runbookReport: WorkspaceReleaseRunbookReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseVarianceStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const statusScore: Record<BoardReleaseVarianceStatus, number> = {
  blocked: 35,
  ready: 100,
  watch: 70,
};

const metricPriority: Record<BoardReleaseVarianceMetricId, number> = {
  "blocker-drift": 0,
  "incident-recurrence": 1,
  "runbook-follow-through": 2,
  "approval-score": 3,
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

function trendForDelta(delta: number, inverse = false): BoardReleaseVarianceDirection {
  if (delta === 0) {
    return "flat";
  }

  const improving = inverse ? delta < 0 : delta > 0;

  return improving ? "improving" : "declining";
}

function latestActiveApproval(history: BoardApprovalPacketHistoryReport | null | undefined): BoardApprovalPacketHistoryRecord | null {
  return (
    history?.records
      .filter((record) => record.status === "active")
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt) || first.packetId.localeCompare(second.packetId))[0] ?? null
  );
}

function completionPercent(report: WorkspaceReleaseRunbookReport) {
  if (report.summary.totalCount === 0) {
    return 100;
  }

  return Math.round((report.summary.completeCount / report.summary.totalCount) * 100);
}

function statusForApprovalDelta(delta: number): BoardReleaseVarianceStatus {
  if (delta <= -20) {
    return "blocked";
  }

  return delta < 0 ? "watch" : "ready";
}

function statusForBlockerDelta(delta: number): BoardReleaseVarianceStatus {
  if (delta > 0) {
    return "blocked";
  }

  return delta === 0 ? "ready" : "watch";
}

function statusForIncidentRecurrence(currentValue: number, blockedPostmortems: number): BoardReleaseVarianceStatus {
  if (currentValue > 1 || blockedPostmortems > 0) {
    return "blocked";
  }

  return currentValue === 1 ? "watch" : "ready";
}

function statusForRunbookFollowThrough(currentValue: number, report: WorkspaceReleaseRunbookReport): BoardReleaseVarianceStatus {
  if (report.summary.blockedCount > 0 || currentValue < 75) {
    return "blocked";
  }

  return currentValue < 100 ? "watch" : "ready";
}

function createRows(input: CreateBoardReleaseVarianceDashboardInput): BoardReleaseVarianceRow[] {
  const latestApproval = latestActiveApproval(input.approvalHistory);
  const previousApprovalScore = latestApproval?.approvalScore ?? 0;
  const approvalScoreDelta = input.replayAudit.summary.replayScore - previousApprovalScore;
  const previousBlockers = latestApproval?.blockedSignOffCount ?? 0;
  const currentBlockers = input.replayAudit.summary.blockedRowCount + (input.evidenceBundle?.summary.blockedEvidenceCount ?? 0);
  const blockerDelta = currentBlockers - previousBlockers;
  const currentIncidentRecurrence = Math.max(input.replayAudit.summary.laterIncidentCount, input.incidentPostmortemReport.summary.criticalTemplateCount);
  const runbookCurrent = completionPercent(input.runbookReport);
  const runbookDelta = runbookCurrent - 100;

  return [
    {
      currentValue: input.replayAudit.summary.replayScore,
      delta: approvalScoreDelta,
      detail: latestApproval
        ? `Replay score compared with ${latestApproval.recipientPurpose} saved at ${latestApproval.createdAt}.`
        : "No active approval baseline is saved for score variance.",
      direction: trendForDelta(approvalScoreDelta),
      id: "approval-score",
      label: "Approval score variance",
      nextAction:
        approvalScoreDelta < 0
          ? "Explain the approval-score decline in the board variance packet before release."
          : "Keep the approval-score improvement with the board assurance archive.",
      previousValue: previousApprovalScore,
      status: latestApproval ? statusForApprovalDelta(approvalScoreDelta) : "blocked",
      unit: "score",
    },
    {
      currentValue: currentBlockers,
      delta: blockerDelta,
      detail: `${input.replayAudit.summary.blockedRowCount} replay blocker${input.replayAudit.summary.blockedRowCount === 1 ? "" : "s"} and ${input.evidenceBundle?.summary.blockedEvidenceCount ?? 0} evidence blocker${(input.evidenceBundle?.summary.blockedEvidenceCount ?? 0) === 1 ? "" : "s"} are active.`,
      direction: trendForDelta(blockerDelta, true),
      id: "blocker-drift",
      label: "Blocker drift",
      nextAction:
        blockerDelta > 0
          ? "Resolve blocker drift before release, or attach a signed board assurance exception."
          : "Keep blocker drift evidence with the board assurance archive.",
      previousValue: previousBlockers,
      status: statusForBlockerDelta(blockerDelta),
      unit: "count",
    },
    {
      currentValue: currentIncidentRecurrence,
      delta: currentIncidentRecurrence,
      detail: `${input.replayAudit.summary.laterIncidentCount} later incident${input.replayAudit.summary.laterIncidentCount === 1 ? "" : "s"} and ${input.incidentPostmortemReport.summary.criticalTemplateCount} critical postmortem${input.incidentPostmortemReport.summary.criticalTemplateCount === 1 ? "" : "s"} are linked.`,
      direction: trendForDelta(currentIncidentRecurrence, true),
      id: "incident-recurrence",
      label: "Incident recurrence",
      nextAction:
        currentIncidentRecurrence > 0
          ? "Attach recurring incident remediation and postmortem proof before board closure."
          : "Keep monitoring incidents until release closure.",
      previousValue: 0,
      status: statusForIncidentRecurrence(currentIncidentRecurrence, input.incidentPostmortemReport.summary.blockedCount),
      unit: "count",
    },
    {
      currentValue: runbookCurrent,
      delta: runbookDelta,
      detail: `${input.runbookReport.summary.completeCount}/${input.runbookReport.summary.totalCount} runbook rows are complete with ${input.runbookReport.summary.blockedCount} blocked.`,
      direction: trendForDelta(runbookDelta),
      id: "runbook-follow-through",
      label: "Runbook follow-through",
      nextAction:
        runbookCurrent < 100
          ? "Complete or exception open runbook rows before board assurance closure."
          : "Archive completed runbook follow-through proof.",
      previousValue: 100,
      status: statusForRunbookFollowThrough(runbookCurrent, input.runbookReport),
      unit: "percent",
    },
  ];
}

function createTrendPointFromSnapshot(record: BoardDecisionReplaySnapshotRecord): BoardReleaseVarianceTrendPoint {
  return {
    at: record.createdAt,
    blockedRows: record.blockedRowCount,
    laterIncidents: record.laterIncidentCount,
    replayScore: record.replayScore,
    runbookBlocked: record.runbookBlockedCount,
    runbookIncomplete: record.runbookIncompleteCount,
    snapshotId: record.snapshotId,
  };
}

function createTrendPoints(input: CreateBoardReleaseVarianceDashboardInput): BoardReleaseVarianceTrendPoint[] {
  const snapshots = input.replaySnapshotHistory?.records ?? [];

  if (snapshots.length > 0) {
    return [...snapshots]
      .sort((first, second) => first.createdAt.localeCompare(second.createdAt) || first.snapshotId.localeCompare(second.snapshotId))
      .map(createTrendPointFromSnapshot);
  }

  return [
    {
      at: input.replayAudit.generatedAt,
      blockedRows: input.replayAudit.summary.blockedRowCount,
      laterIncidents: input.replayAudit.summary.laterIncidentCount,
      replayScore: input.replayAudit.summary.replayScore,
      runbookBlocked: input.replayAudit.summary.runbookBlockedCount,
      runbookIncomplete: input.replayAudit.summary.runbookIncompleteCount,
      snapshotId: "current-replay-audit",
    },
  ];
}

function createSummary(rows: BoardReleaseVarianceRow[], trendPoints: BoardReleaseVarianceTrendPoint[]): BoardReleaseVarianceDashboard["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const status: BoardReleaseVarianceStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";
  const nextRow =
    [...rows].sort(
      (first, second) =>
        statusRank[first.status] - statusRank[second.status] || metricPriority[first.id] - metricPriority[second.id] || Math.abs(second.delta) - Math.abs(first.delta),
    )[0] ?? null;

  return {
    approvalScoreDelta: rows.find((row) => row.id === "approval-score")?.delta ?? 0,
    blockedCount,
    blockerDrift: rows.find((row) => row.id === "blocker-drift")?.delta ?? 0,
    incidentRecurrenceDelta: rows.find((row) => row.id === "incident-recurrence")?.delta ?? 0,
    nextAction:
      status === "ready"
        ? "Archive the stable board release variance dashboard with the assurance bundle."
        : (nextRow?.nextAction ?? "Review release variance before board assurance closure."),
    readyCount,
    rowCount: rows.length,
    runbookFollowThroughDelta: rows.find((row) => row.id === "runbook-follow-through")?.delta ?? 0,
    status,
    trendPointCount: trendPoints.length,
    varianceScore: rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + statusScore[row.status], 0) / rows.length) : 100,
    watchCount,
  };
}

function createCsv(rows: BoardReleaseVarianceRow[]) {
  const header = ["metric", "status", "current", "previous", "delta", "direction", "next_action"];
  const body = rows.map((row) => [row.id, row.status, row.currentValue, row.previousValue, row.delta, row.direction, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createBoardReleaseVarianceDashboard(input: CreateBoardReleaseVarianceDashboardInput): BoardReleaseVarianceDashboard {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.replayAudit.workspaceId;
  const rows = createRows(input);
  const trendPoints = createTrendPoints(input);
  const summary = createSummary(rows, trendPoints);
  const csvContent = createCsv(rows);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(workspaceId)}-board-release-variance-${dateStamp(generatedAt)}.csv`,
    generatedAt,
    rows,
    summary,
    trendPoints,
    workspaceId,
  };
}
