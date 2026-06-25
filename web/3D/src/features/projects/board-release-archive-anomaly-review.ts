import { createHash } from "node:crypto";
import type {
  BoardReleaseArchiveIntelligenceIndexReport,
  BoardReleaseArchiveIntelligenceIndexRow,
} from "@/features/projects/board-release-archive-intelligence-index";
import type { BoardReleaseCloseoutReadinessGateStatus } from "@/features/projects/board-release-closeout-readiness-gates";

export type BoardReleaseArchiveAnomalyKind = "archive-drift" | "repeated-decision" | "stale-remediation";
export type BoardReleaseArchiveAnomalySeverity = "critical" | "high" | "medium";

export interface BoardReleaseArchiveAnomalyFinding {
  archiveBundleHash: string;
  correlationHash: string;
  evidenceHash: string;
  findingHash: string;
  findingId: string;
  finalDecisionOutcome: string;
  indexId: string;
  kind: BoardReleaseArchiveAnomalyKind;
  nextAction: string;
  remediationHash: string;
  severity: BoardReleaseArchiveAnomalySeverity;
  sourceTitle: string;
  status: BoardReleaseCloseoutReadinessGateStatus;
  workspaceId: string;
}

export interface BoardReleaseArchiveAnomalyReviewReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  findings: BoardReleaseArchiveAnomalyFinding[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  summary: {
    archiveDriftCount: number;
    blockedCount: number;
    criticalCount: number;
    findingCount: number;
    intelligenceHash: string;
    nextAction: string;
    repeatedDecisionCount: number;
    reviewHash: string;
    staleRemediationCount: number;
    status: BoardReleaseCloseoutReadinessGateStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveAnomalyReviewReportInput {
  generatedAt?: string;
  index: BoardReleaseArchiveIntelligenceIndexReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseCloseoutReadinessGateStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const severityRank: Record<BoardReleaseArchiveAnomalySeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
};

const kindRank: Record<BoardReleaseArchiveAnomalyKind, number> = {
  "repeated-decision": 0,
  "stale-remediation": 1,
  "archive-drift": 2,
};

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

  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256").update(stableJson(value)).digest("hex")}`;
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

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
}

function statusForSeverity(severity: BoardReleaseArchiveAnomalySeverity): BoardReleaseCloseoutReadinessGateStatus {
  return severity === "critical" ? "blocked" : severity === "high" ? "watch" : "ready";
}

function findingId(input: {
  generatedAt: string;
  indexId: string;
  kind: BoardReleaseArchiveAnomalyKind;
  workspaceId: string;
}) {
  return `board-release-archive-anomaly:${slug(input.workspaceId)}:${input.kind}:${slug(input.indexId)}:${dateStamp(input.generatedAt)}`;
}

function createFinding(input: {
  generatedAt: string;
  kind: BoardReleaseArchiveAnomalyKind;
  nextAction: string;
  row: BoardReleaseArchiveIntelligenceIndexRow;
  severity: BoardReleaseArchiveAnomalySeverity;
  workspaceId: string;
}): BoardReleaseArchiveAnomalyFinding {
  const id = findingId({
    generatedAt: input.generatedAt,
    indexId: input.row.indexId,
    kind: input.kind,
    workspaceId: input.workspaceId,
  });
  const status = statusForSeverity(input.severity);
  const evidenceHash = sha256({
    archiveBundleHash: input.row.archiveBundleHash,
    correlationHash: input.row.correlationHash,
    finalDecisionOutcome: input.row.finalDecisionOutcome,
    remediationHash: input.row.remediationHash,
    sourceEvidenceHash: input.row.sourceEvidenceHash,
  });
  const findingHash = sha256({
    evidenceHash,
    id,
    kind: input.kind,
    severity: input.severity,
    status,
  });

  return {
    archiveBundleHash: input.row.archiveBundleHash,
    correlationHash: input.row.correlationHash,
    evidenceHash,
    findingHash,
    findingId: id,
    finalDecisionOutcome: input.row.finalDecisionOutcome,
    indexId: input.row.indexId,
    kind: input.kind,
    nextAction: input.nextAction,
    remediationHash: input.row.remediationHash,
    severity: input.severity,
    sourceTitle: input.row.title,
    status,
    workspaceId: input.workspaceId,
  };
}

function repeatedDecisionFinding(row: BoardReleaseArchiveIntelligenceIndexRow, generatedAt: string, workspaceId: string) {
  if (row.finalDecisionOutcome === "approved") {
    return null;
  }

  return createFinding({
    generatedAt,
    kind: "repeated-decision",
    nextAction:
      row.finalDecisionOutcome === "held"
        ? "Escalate held board release archive decision before the next closeout cycle."
        : "Review deferred board release archive decision before the next closeout cycle.",
    row,
    severity: row.finalDecisionOutcome === "held" ? "critical" : "high",
    workspaceId,
  });
}

function staleRemediationFinding(row: BoardReleaseArchiveIntelligenceIndexRow, generatedAt: string, workspaceId: string) {
  if (row.status === "ready") {
    return null;
  }

  return createFinding({
    generatedAt,
    kind: "stale-remediation",
    nextAction: "Refresh remediation evidence for this unresolved archive intelligence row.",
    row,
    severity: row.status === "blocked" ? "critical" : "high",
    workspaceId,
  });
}

function archiveDriftFinding(row: BoardReleaseArchiveIntelligenceIndexRow, generatedAt: string, workspaceId: string) {
  if (row.status === "ready" && row.score >= 90) {
    return null;
  }

  return createFinding({
    generatedAt,
    kind: "archive-drift",
    nextAction: "Compare archive bundle hash against the executive packet evidence before relying on this decision.",
    row,
    severity: row.status === "blocked" || row.score < 50 ? "critical" : "medium",
    workspaceId,
  });
}

function createFindings(input: {
  generatedAt: string;
  index: BoardReleaseArchiveIntelligenceIndexReport;
  workspaceId: string;
}) {
  return input.index.rows
    .flatMap((row) => [
      repeatedDecisionFinding(row, input.generatedAt, input.workspaceId),
      staleRemediationFinding(row, input.generatedAt, input.workspaceId),
      archiveDriftFinding(row, input.generatedAt, input.workspaceId),
    ])
    .filter((finding): finding is BoardReleaseArchiveAnomalyFinding => Boolean(finding))
    .sort(
      (first, second) =>
        statusRank[first.status] - statusRank[second.status] ||
        severityRank[first.severity] - severityRank[second.severity] ||
        kindRank[first.kind] - kindRank[second.kind] ||
        first.sourceTitle.localeCompare(second.sourceTitle),
    );
}

function summarize(
  findings: BoardReleaseArchiveAnomalyFinding[],
  index: BoardReleaseArchiveIntelligenceIndexReport,
): BoardReleaseArchiveAnomalyReviewReport["summary"] {
  const blockedCount = findings.filter((finding) => finding.status === "blocked").length;
  const watchCount = findings.filter((finding) => finding.status === "watch").length;
  const firstAttention = findings.find((finding) => finding.status === "blocked" || finding.status === "watch") ?? null;

  return {
    archiveDriftCount: findings.filter((finding) => finding.kind === "archive-drift").length,
    blockedCount,
    criticalCount: findings.filter((finding) => finding.severity === "critical").length,
    findingCount: findings.length,
    intelligenceHash: index.summary.intelligenceHash,
    nextAction: firstAttention?.nextAction ?? "Archive anomaly review is clean and ready for trend digest generation.",
    repeatedDecisionCount: findings.filter((finding) => finding.kind === "repeated-decision").length,
    reviewHash: sha256(findings.map((finding) => finding.findingHash)),
    staleRemediationCount: findings.filter((finding) => finding.kind === "stale-remediation").length,
    status: blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready",
    watchCount,
  };
}

function createCsv(findings: BoardReleaseArchiveAnomalyFinding[]) {
  const header = [
    "finding_id",
    "kind",
    "severity",
    "status",
    "source_title",
    "final_decision_outcome",
    "archive_bundle_hash",
    "remediation_hash",
    "correlation_hash",
    "evidence_hash",
    "finding_hash",
    "next_action",
  ];
  const body = findings.map((finding) =>
    [
      finding.findingId,
      finding.kind,
      finding.severity,
      finding.status,
      finding.sourceTitle,
      finding.finalDecisionOutcome,
      finding.archiveBundleHash,
      finding.remediationHash,
      finding.correlationHash,
      finding.evidenceHash,
      finding.findingHash,
      finding.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  findings: BoardReleaseArchiveAnomalyFinding[];
  generatedAt: string;
  summary: BoardReleaseArchiveAnomalyReviewReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      findings: input.findings,
      generatedAt: input.generatedAt,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseArchiveAnomalyReviewReport(
  input: CreateBoardReleaseArchiveAnomalyReviewReportInput,
): BoardReleaseArchiveAnomalyReviewReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.index.workspaceId;
  const findings = createFindings({
    generatedAt,
    index: input.index,
    workspaceId,
  });
  const summary = summarize(findings, input.index);
  const csvContent = createCsv(findings);
  const jsonContent = createJson({
    findings,
    generatedAt,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-anomaly-review-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    findings,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    summary,
    workspaceId,
  };
}
