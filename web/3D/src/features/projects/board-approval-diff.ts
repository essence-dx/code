import type { BoardApprovalPacketReport, BoardApprovalPacketSignOffRole, BoardApprovalPacketStatus } from "@/features/projects/board-approval-packet";
import type { BoardApprovalPacketHistoryRecord, BoardApprovalPacketHistoryReport } from "@/features/projects/board-approval-packet-history";
import type { ExecutiveReleaseSnapshotHistoryReport, ExecutiveReleaseSnapshotRecord } from "@/features/projects/executive-release-snapshots";

export type BoardApprovalPacketDiffStatus = "blocked" | "ready" | "watch";
export type BoardApprovalPacketDiffSeverity = "critical" | "info" | "warning";
export type BoardApprovalPacketDiffDirection = "improvement" | "neutral" | "regression";
export type BoardApprovalPacketDiffKind =
  | "approval-score"
  | "approval-status"
  | "critical-path"
  | "executive-snapshot"
  | "packet-checksum"
  | "sign-off"
  | "source-checksum";

export interface BoardApprovalPacketDiffRow {
  currentValue: number | string | null;
  delta: number | null;
  direction: BoardApprovalPacketDiffDirection;
  kind: BoardApprovalPacketDiffKind;
  metric: string;
  nextAction: string;
  previousValue: number | string | null;
  severity: BoardApprovalPacketDiffSeverity;
  sourceLabel: string;
}

export interface BoardApprovalPacketDiffReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  rows: BoardApprovalPacketDiffRow[];
  summary: {
    baselinePacketId: string | null;
    baselineSavedAt: string | null;
    blockerDelta: number;
    changeCount: number;
    checksumChanged: boolean;
    criticalChangeCount: number;
    currentPacketId: string;
    improvementCount: number;
    latestSnapshotId: string | null;
    nextAction: string;
    regressionCount: number;
    scoreDelta: number;
    status: BoardApprovalPacketDiffStatus;
    warningChangeCount: number;
  };
}

export interface CreateBoardApprovalPacketDiffReportInput {
  currentPacket: BoardApprovalPacketReport;
  executiveSnapshotHistory?: ExecutiveReleaseSnapshotHistoryReport | null;
  generatedAt?: string;
  packetHistory?: BoardApprovalPacketHistoryReport | null;
  workspaceId?: string;
}

const statusRank: Record<BoardApprovalPacketStatus, number> = {
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

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function csvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);

  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function latestPacketRecord(history: BoardApprovalPacketHistoryReport | null | undefined): BoardApprovalPacketHistoryRecord | null {
  if (!history?.records.length) {
    return null;
  }

  const sorted = [...history.records].sort((first, second) => second.createdAt.localeCompare(first.createdAt) || second.updatedAt.localeCompare(first.updatedAt));

  return sorted.find((record) => record.status === "active") ?? sorted[0] ?? null;
}

function latestSnapshot(history: ExecutiveReleaseSnapshotHistoryReport | null | undefined): ExecutiveReleaseSnapshotRecord | null {
  if (!history?.snapshots.length) {
    return null;
  }

  return [...history.snapshots].sort((first, second) => second.createdAt.localeCompare(first.createdAt))[0] ?? null;
}

function directionForDelta(delta: number, inverse = false): BoardApprovalPacketDiffDirection {
  if (delta === 0) {
    return "neutral";
  }

  const improving = inverse ? delta < 0 : delta > 0;

  return improving ? "improvement" : "regression";
}

function severityForDirection(direction: BoardApprovalPacketDiffDirection, status: BoardApprovalPacketStatus | null = null): BoardApprovalPacketDiffSeverity {
  if (direction === "regression") {
    return status === "watch" ? "warning" : "critical";
  }

  if (direction === "neutral") {
    return "info";
  }

  return "info";
}

function statusDirection(previous: BoardApprovalPacketStatus, current: BoardApprovalPacketStatus): BoardApprovalPacketDiffDirection {
  return directionForDelta(statusRank[current] - statusRank[previous]);
}

function metricRow(input: {
  currentValue: number | string | null;
  delta: number | null;
  direction: BoardApprovalPacketDiffDirection;
  kind: BoardApprovalPacketDiffKind;
  metric: string;
  nextAction: string;
  previousValue: number | string | null;
  severity?: BoardApprovalPacketDiffSeverity;
  sourceLabel: string;
}): BoardApprovalPacketDiffRow {
  return {
    currentValue: input.currentValue,
    delta: input.delta,
    direction: input.direction,
    kind: input.kind,
    metric: input.metric,
    nextAction: input.nextAction,
    previousValue: input.previousValue,
    severity: input.severity ?? severityForDirection(input.direction),
    sourceLabel: input.sourceLabel,
  };
}

function scoreRows(current: BoardApprovalPacketReport, baseline: BoardApprovalPacketReport | null): BoardApprovalPacketDiffRow[] {
  if (!baseline) {
    return [
      metricRow({
        currentValue: current.summary.approvalScore,
        delta: null,
        direction: "neutral",
        kind: "approval-score",
        metric: "Approval score",
        nextAction: "Save a board approval packet before the next release review to establish a diff baseline.",
        previousValue: null,
        severity: "warning",
        sourceLabel: "Saved board packet",
      }),
    ];
  }

  const approvalScoreDelta = current.summary.approvalScore - baseline.summary.approvalScore;
  const blockerDelta = current.summary.blockedSignOffCount - baseline.summary.blockedSignOffCount;
  const rows: BoardApprovalPacketDiffRow[] = [];

  if (approvalScoreDelta !== 0) {
    rows.push(
      metricRow({
        currentValue: current.summary.approvalScore,
        delta: approvalScoreDelta,
        direction: directionForDelta(approvalScoreDelta),
        kind: "approval-score",
        metric: "Approval score",
        nextAction: approvalScoreDelta < 0 ? current.summary.nextAction : "Keep the improved board approval score attached to the packet history.",
        previousValue: baseline.summary.approvalScore,
        sourceLabel: "Saved board packet",
      }),
    );
  }

  if (blockerDelta !== 0) {
    rows.push(
      metricRow({
        currentValue: current.summary.blockedSignOffCount,
        delta: blockerDelta,
        direction: directionForDelta(blockerDelta, true),
        kind: "approval-score",
        metric: "Blocked sign-offs",
        nextAction: blockerDelta > 0 ? current.summary.nextAction : "Record the blocker reduction in the board approval packet history.",
        previousValue: baseline.summary.blockedSignOffCount,
        sourceLabel: "Saved board packet",
      }),
    );
  }

  if (baseline.summary.status !== current.summary.status) {
    const direction = statusDirection(baseline.summary.status, current.summary.status);

    rows.push(
      metricRow({
        currentValue: current.summary.status,
        delta: statusRank[current.summary.status] - statusRank[baseline.summary.status],
        direction,
        kind: "approval-status",
        metric: "Approval status",
        nextAction: direction === "regression" ? current.summary.nextAction : "Record the improved approval status before board circulation.",
        previousValue: baseline.summary.status,
        severity: severityForDirection(direction, current.summary.status),
        sourceLabel: "Saved board packet",
      }),
    );
  }

  return rows;
}

function signOffRows(current: BoardApprovalPacketReport, baseline: BoardApprovalPacketReport | null): BoardApprovalPacketDiffRow[] {
  if (!baseline) {
    return [];
  }

  const previousByRole = new Map<BoardApprovalPacketSignOffRole, (typeof baseline.signOffs)[number]>(baseline.signOffs.map((row) => [row.role, row]));
  const currentByRole = new Map<BoardApprovalPacketSignOffRole, (typeof current.signOffs)[number]>(current.signOffs.map((row) => [row.role, row]));
  const roles = new Set<BoardApprovalPacketSignOffRole>([...previousByRole.keys(), ...currentByRole.keys()]);
  const rows: BoardApprovalPacketDiffRow[] = [];

  for (const role of roles) {
    const previous = previousByRole.get(role);
    const next = currentByRole.get(role);

    if (!previous && next) {
      rows.push(
        metricRow({
          currentValue: next.status,
          delta: null,
          direction: next.status === "ready" ? "neutral" : "regression",
          kind: "sign-off",
          metric: `${role} sign-off`,
          nextAction: next.action,
          previousValue: null,
          severity: next.status === "blocked" ? "critical" : next.status === "watch" ? "warning" : "info",
          sourceLabel: "Board packet sign-off",
        }),
      );
      continue;
    }

    if (previous && !next) {
      rows.push(
        metricRow({
          currentValue: null,
          delta: null,
          direction: previous.status === "ready" ? "neutral" : "improvement",
          kind: "sign-off",
          metric: `${role} sign-off`,
          nextAction: "Confirm whether the removed sign-off is intentionally no longer required.",
          previousValue: previous.status,
          sourceLabel: "Board packet sign-off",
        }),
      );
      continue;
    }

    if (previous && next && previous.status !== next.status) {
      const delta = statusRank[next.status] - statusRank[previous.status];
      const direction = directionForDelta(delta);

      rows.push(
        metricRow({
          currentValue: next.status,
          delta,
          direction,
          kind: "sign-off",
          metric: `${role} sign-off`,
          nextAction: direction === "regression" ? next.action : "Keep the improved sign-off state in the saved board packet.",
          previousValue: previous.status,
          severity: severityForDirection(direction, next.status),
          sourceLabel: "Board packet sign-off",
        }),
      );
    }
  }

  return rows;
}

function criticalPathRows(current: BoardApprovalPacketReport, baseline: BoardApprovalPacketReport | null): BoardApprovalPacketDiffRow[] {
  if (!baseline) {
    return [];
  }

  const previousLabels = new Set(baseline.criticalPath.map((row) => row.label.toLowerCase()));
  const currentLabels = new Set(current.criticalPath.map((row) => row.label.toLowerCase()));
  const added = current.criticalPath.filter((row) => !previousLabels.has(row.label.toLowerCase()));
  const removed = baseline.criticalPath.filter((row) => !currentLabels.has(row.label.toLowerCase()));

  return [
    ...added.map((row) =>
      metricRow({
        currentValue: row.status,
        delta: null,
        direction: row.status === "ready" ? "neutral" : "regression",
        kind: "critical-path" as const,
        metric: `Added critical path: ${row.label}`,
        nextAction: row.action,
        previousValue: null,
        severity: row.status === "blocked" ? "critical" : "warning",
        sourceLabel: `Current ${row.source}`,
      }),
    ),
    ...removed.map((row) =>
      metricRow({
        currentValue: null,
        delta: null,
        direction: row.status === "ready" ? "neutral" : "improvement",
        kind: "critical-path" as const,
        metric: `Removed critical path: ${row.label}`,
        nextAction: "Confirm this critical path was intentionally resolved before board sign-off.",
        previousValue: row.status,
        sourceLabel: `Saved ${row.source}`,
      }),
    ),
  ];
}

function checksumRows(current: BoardApprovalPacketReport, baseline: BoardApprovalPacketReport | null): BoardApprovalPacketDiffRow[] {
  if (!baseline) {
    return [];
  }

  const rows: BoardApprovalPacketDiffRow[] = [];

  if (current.checksums.packetHash !== baseline.checksums.packetHash) {
    rows.push(
      metricRow({
        currentValue: current.checksums.packetHash,
        delta: null,
        direction: "neutral",
        kind: "packet-checksum",
        metric: "Packet checksum",
        nextAction: "Review the changed packet checksum before circulating a new board packet.",
        previousValue: baseline.checksums.packetHash,
        severity: "warning",
        sourceLabel: "Packet hash",
      }),
    );
  }

  const previousSources = new Map(baseline.checksums.sources.map((source) => [source.id, source]));

  for (const source of current.checksums.sources) {
    const previous = previousSources.get(source.id);

    if (previous && previous.contentHash !== source.contentHash) {
      rows.push(
        metricRow({
          currentValue: source.contentHash,
          delta: null,
          direction: "neutral",
          kind: "source-checksum",
          metric: `${source.label} checksum`,
          nextAction: "Review changed source evidence before approving the new packet.",
          previousValue: previous.contentHash,
          severity: "warning",
          sourceLabel: source.label,
        }),
      );
    }
  }

  return rows;
}

function executiveSnapshotRows(current: BoardApprovalPacketReport, snapshot: ExecutiveReleaseSnapshotRecord | null): BoardApprovalPacketDiffRow[] {
  if (!snapshot) {
    return [
      metricRow({
        currentValue: current.summary.approvalScore,
        delta: null,
        direction: "neutral",
        kind: "executive-snapshot",
        metric: "Executive snapshot score",
        nextAction: "Save an executive release snapshot so board packet drift can be compared against an executive checkpoint.",
        previousValue: null,
        severity: "warning",
        sourceLabel: "Executive snapshot",
      }),
    ];
  }

  const scoreDelta = current.summary.approvalScore - snapshot.executiveScore;
  const blockerDelta = current.summary.blockedSignOffCount - snapshot.blockedCount;
  const rows: BoardApprovalPacketDiffRow[] = [];

  if (scoreDelta !== 0) {
    rows.push(
      metricRow({
        currentValue: current.summary.approvalScore,
        delta: scoreDelta,
        direction: directionForDelta(scoreDelta),
        kind: "executive-snapshot",
        metric: "Executive snapshot score",
        nextAction: scoreDelta < 0 ? current.summary.nextAction : "Attach the improved board packet to the executive release record.",
        previousValue: snapshot.executiveScore,
        sourceLabel: "Executive snapshot",
      }),
    );
  }

  if (blockerDelta !== 0) {
    rows.push(
      metricRow({
        currentValue: current.summary.blockedSignOffCount,
        delta: blockerDelta,
        direction: directionForDelta(blockerDelta, true),
        kind: "executive-snapshot",
        metric: "Executive snapshot blockers",
        nextAction: blockerDelta > 0 ? current.summary.nextAction : "Record blocker reduction against the latest executive snapshot.",
        previousValue: snapshot.blockedCount,
        sourceLabel: "Executive snapshot",
      }),
    );
  }

  if (snapshot.status !== current.summary.status) {
    const direction = statusDirection(snapshot.status, current.summary.status);

    rows.push(
      metricRow({
        currentValue: current.summary.status,
        delta: statusRank[current.summary.status] - statusRank[snapshot.status],
        direction,
        kind: "executive-snapshot",
        metric: "Executive snapshot status",
        nextAction: direction === "regression" ? current.summary.nextAction : "Record the improved approval state against the executive snapshot.",
        previousValue: snapshot.status,
        severity: severityForDirection(direction, current.summary.status),
        sourceLabel: "Executive snapshot",
      }),
    );
  }

  return rows;
}

function sortRows(first: BoardApprovalPacketDiffRow, second: BoardApprovalPacketDiffRow) {
  const severityRank: Record<BoardApprovalPacketDiffSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  return severityRank[first.severity] - severityRank[second.severity] || first.kind.localeCompare(second.kind) || first.metric.localeCompare(second.metric);
}

function createCsv(rows: BoardApprovalPacketDiffRow[]) {
  const header = ["kind", "severity", "metric", "previous", "current", "delta", "next_action"];
  const body = rows.map((row) => [row.kind, row.severity, row.metric, row.previousValue, row.currentValue, row.delta, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createSummary(input: {
  baseline: BoardApprovalPacketHistoryRecord | null;
  currentPacket: BoardApprovalPacketReport;
  rows: BoardApprovalPacketDiffRow[];
  snapshot: ExecutiveReleaseSnapshotRecord | null;
}): BoardApprovalPacketDiffReport["summary"] {
  const criticalChangeCount = input.rows.filter((row) => row.severity === "critical").length;
  const warningChangeCount = input.rows.filter((row) => row.severity === "warning").length;
  const regressionCount = input.rows.filter((row) => row.direction === "regression").length;
  const improvementCount = input.rows.filter((row) => row.direction === "improvement").length;
  const status: BoardApprovalPacketDiffStatus = criticalChangeCount > 0 ? "blocked" : warningChangeCount > 0 ? "watch" : "ready";
  const baselinePacket = input.baseline?.packet ?? null;
  const topRow = input.rows.find((row) => row.severity === "critical") ?? input.rows.find((row) => row.severity === "warning") ?? input.rows[0] ?? null;

  return {
    baselinePacketId: baselinePacket?.packetId ?? null,
    baselineSavedAt: input.baseline?.createdAt ?? null,
    blockerDelta: baselinePacket ? input.currentPacket.summary.blockedSignOffCount - baselinePacket.summary.blockedSignOffCount : 0,
    changeCount: input.rows.length,
    checksumChanged: Boolean(baselinePacket && input.currentPacket.checksums.packetHash !== baselinePacket.checksums.packetHash),
    criticalChangeCount,
    currentPacketId: input.currentPacket.packetId,
    improvementCount,
    latestSnapshotId: input.snapshot?.snapshotId ?? null,
    nextAction: topRow?.nextAction ?? "No board packet drift is active against saved packet or executive snapshot baselines.",
    regressionCount,
    scoreDelta: baselinePacket ? input.currentPacket.summary.approvalScore - baselinePacket.summary.approvalScore : 0,
    status,
    warningChangeCount,
  };
}

export function createBoardApprovalPacketDiffReport(input: CreateBoardApprovalPacketDiffReportInput): BoardApprovalPacketDiffReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const baseline = latestPacketRecord(input.packetHistory);
  const baselinePacket = baseline?.packet ?? null;
  const snapshot = latestSnapshot(input.executiveSnapshotHistory);
  const rows = [
    ...scoreRows(input.currentPacket, baselinePacket),
    ...signOffRows(input.currentPacket, baselinePacket),
    ...criticalPathRows(input.currentPacket, baselinePacket),
    ...checksumRows(input.currentPacket, baselinePacket),
    ...executiveSnapshotRows(input.currentPacket, snapshot),
  ].sort(sortRows);
  const csvContent = createCsv(rows);

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${slug(input.workspaceId ?? "workspace")}-board-approval-diff.csv`,
    generatedAt,
    rows,
    summary: createSummary({
      baseline,
      currentPacket: input.currentPacket,
      rows,
      snapshot,
    }),
  };
}
