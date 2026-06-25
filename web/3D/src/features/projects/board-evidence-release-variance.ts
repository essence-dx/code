import { createHash } from "node:crypto";
import type { BoardAuditEvidenceReadinessDigest } from "@/features/projects/board-audit-evidence-readiness-digest";
import type { BoardEvidenceCloseoutReport } from "@/features/projects/board-evidence-closeout-report";
import type { BoardEvidenceReleaseArchiveRecordReport } from "@/features/projects/board-evidence-release-archive-records";

export type BoardEvidenceReleaseVarianceStatus = "changed" | "stable" | "watch";
export type BoardEvidenceReleaseVarianceSeverity = "critical" | "info" | "warning";
export type BoardEvidenceReleaseVarianceId = "closeout-hash" | "closeout-status" | "readiness-score" | "unresolved-risk";

export interface BoardEvidenceReleaseVarianceRow {
  archivedValue: string;
  currentValue: string;
  delta: number | null;
  id: BoardEvidenceReleaseVarianceId;
  nextAction: string;
  severity: BoardEvidenceReleaseVarianceSeverity;
  status: BoardEvidenceReleaseVarianceStatus;
  title: string;
}

export interface BoardEvidenceReleaseVarianceReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  summary: {
    blockerCount: number;
    currentReadinessScore: number;
    nextAction: string;
    status: BoardEvidenceReleaseVarianceStatus;
    varianceCount: number;
    watchCount: number;
  };
  variances: BoardEvidenceReleaseVarianceRow[];
  workspaceId: string;
}

export interface CreateBoardEvidenceReleaseVarianceReportInput {
  archive: BoardEvidenceReleaseArchiveRecordReport;
  closeout: BoardEvidenceCloseoutReport;
  generatedAt?: string;
  readiness: BoardAuditEvidenceReadinessDigest;
  workspaceId?: string;
}

const severityRank: Record<BoardEvidenceReleaseVarianceSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
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

function currentCloseoutHash(closeout: BoardEvidenceCloseoutReport) {
  return sha256({
    csvContent: closeout.csvContent,
    jsonContent: closeout.jsonContent,
    sections: closeout.sections,
    summary: closeout.summary,
  });
}

function severityForStatus(status: BoardEvidenceReleaseVarianceStatus, currentValue: string) {
  if (status === "stable") {
    return "info";
  }

  return currentValue === "blocked" || currentValue === "critical" ? "critical" : "warning";
}

function closeoutHashVariance(input: {
  archivedHash: string;
  currentHash: string;
}): BoardEvidenceReleaseVarianceRow {
  const changed = input.archivedHash !== input.currentHash;

  return {
    archivedValue: input.archivedHash,
    currentValue: input.currentHash,
    delta: null,
    id: "closeout-hash",
    nextAction: changed ? "Review closeout hash drift before relying on the archived release evidence." : "No closeout hash drift detected.",
    severity: changed ? "warning" : "info",
    status: changed ? "changed" : "stable",
    title: "Closeout hash",
  };
}

function closeoutStatusVariance(input: CreateBoardEvidenceReleaseVarianceReportInput): BoardEvidenceReleaseVarianceRow {
  const archivedStatus = input.archive.records[0]?.closeoutStatus ?? "missing";
  const currentStatus = input.closeout.summary.status;
  const changed = archivedStatus !== currentStatus;

  return {
    archivedValue: archivedStatus,
    currentValue: currentStatus,
    delta: null,
    id: "closeout-status",
    nextAction: changed ? input.closeout.summary.nextAction : "Closeout status still matches the archived release evidence.",
    severity: severityForStatus(changed ? "changed" : "stable", currentStatus),
    status: changed ? "changed" : "stable",
    title: "Closeout status",
  };
}

function readinessScoreVariance(readiness: BoardAuditEvidenceReadinessDigest): BoardEvidenceReleaseVarianceRow {
  const delta = readiness.summary.scoreDelta;
  const status: BoardEvidenceReleaseVarianceStatus = delta < -10 ? "changed" : delta !== 0 ? "watch" : "stable";

  return {
    archivedValue: `${readiness.summary.readinessScore - delta}`,
    currentValue: `${readiness.summary.readinessScore}`,
    delta,
    id: "readiness-score",
    nextAction: status === "stable" ? "Readiness score has not drifted." : readiness.summary.nextAction,
    severity: delta < -10 ? "critical" : status === "watch" ? "warning" : "info",
    status,
    title: "Readiness score",
  };
}

function unresolvedRiskVariance(readiness: BoardAuditEvidenceReadinessDigest): BoardEvidenceReleaseVarianceRow {
  const count = readiness.summary.unresolvedAttachmentRiskCount;
  const status: BoardEvidenceReleaseVarianceStatus = count > 0 ? "changed" : "stable";

  return {
    archivedValue: "0",
    currentValue: `${count}`,
    delta: count,
    id: "unresolved-risk",
    nextAction: count > 0 ? readiness.summary.nextAction : "No unresolved readiness risks are present.",
    severity: count > 0 ? "critical" : "info",
    status,
    title: "Unresolved readiness risk",
  };
}

function createVariances(input: CreateBoardEvidenceReleaseVarianceReportInput) {
  const archivedRecord = input.archive.records[0] ?? null;
  const variances = [
    closeoutHashVariance({
      archivedHash: archivedRecord?.closeoutHash ?? "missing",
      currentHash: currentCloseoutHash(input.closeout),
    }),
    closeoutStatusVariance(input),
    readinessScoreVariance(input.readiness),
    unresolvedRiskVariance(input.readiness),
  ];

  return variances.sort((first, second) => severityRank[first.severity] - severityRank[second.severity] || first.id.localeCompare(second.id));
}

function summarize(input: {
  readiness: BoardAuditEvidenceReadinessDigest;
  variances: BoardEvidenceReleaseVarianceRow[];
}): BoardEvidenceReleaseVarianceReport["summary"] {
  const blockerCount = input.variances.filter((variance) => variance.severity === "critical" && variance.status !== "stable").length;
  const watchCount = input.variances.filter((variance) => variance.severity === "warning" && variance.status !== "stable").length;
  const firstAction = input.variances.find((variance) => variance.status !== "stable") ?? null;

  return {
    blockerCount,
    currentReadinessScore: input.readiness.summary.readinessScore,
    nextAction: firstAction?.nextAction ?? "Archived closeout evidence still matches current readiness state.",
    status: blockerCount > 0 ? "changed" : watchCount > 0 ? "watch" : "stable",
    varianceCount: input.variances.filter((variance) => variance.status !== "stable").length,
    watchCount,
  };
}

function createCsv(variances: BoardEvidenceReleaseVarianceRow[]) {
  const header = ["variance_id", "severity", "status", "archived_value", "current_value", "delta", "next_action"];
  const body = variances.map((variance) =>
    [variance.id, variance.severity, variance.status, variance.archivedValue, variance.currentValue, variance.delta, variance.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  summary: BoardEvidenceReleaseVarianceReport["summary"];
  variances: BoardEvidenceReleaseVarianceRow[];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      summary: input.summary,
      variances: input.variances,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardEvidenceReleaseVarianceReport(input: CreateBoardEvidenceReleaseVarianceReportInput): BoardEvidenceReleaseVarianceReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.closeout.workspaceId;
  const variances = createVariances(input);
  const summary = summarize({
    readiness: input.readiness,
    variances,
  });
  const csvContent = createCsv(variances);
  const jsonContent = createJson({
    generatedAt,
    summary,
    variances,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-evidence-release-variance-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    summary,
    variances,
    workspaceId,
  };
}
