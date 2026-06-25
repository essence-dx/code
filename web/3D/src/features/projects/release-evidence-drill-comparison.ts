import { createHash } from "node:crypto";
import type { CadConversionFixtureDrillRunnerReport, CadConversionFixtureDrillStatus } from "@/features/projects/cad-conversion-fixture-drill-runner";
import type { SignedArtifactFixtureDrillRunnerReport, SignedArtifactFixtureDrillStatus } from "@/features/projects/signed-artifact-fixture-drill-runner";

export type ReleaseEvidenceDrillComparisonStatus = "blocked" | "ready" | "review";
export type ReleaseEvidenceDrillComparisonSeverity = "critical" | "info" | "warning";
export type ReleaseEvidenceDrillComparisonFileFormat = "csv" | "json";

export interface ReleaseEvidenceDrillAcceptedBaseline {
  acceptedAt: string;
  cadFixtureDrillHash: string;
  cadFixtureDrillScore: number;
  cadFixtureDrillStatus: CadConversionFixtureDrillStatus;
  signedArtifactDrillHash: string;
  signedArtifactDrillScore: number;
  signedArtifactDrillStatus: SignedArtifactFixtureDrillStatus;
}

export interface ReleaseEvidenceDrillComparisonRow {
  acceptedValue: string;
  currentHash: string;
  currentValue: string;
  delta: number | null;
  id: string;
  metric: string;
  nextAction: string;
  severity: ReleaseEvidenceDrillComparisonSeverity;
  status: ReleaseEvidenceDrillComparisonStatus;
}

export interface ReleaseEvidenceDrillComparisonFile {
  download: string;
  format: ReleaseEvidenceDrillComparisonFileFormat;
  href: string;
  label: string;
}

export interface ReleaseEvidenceDrillComparisonReport {
  acceptedBaseline: ReleaseEvidenceDrillAcceptedBaseline;
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: ReleaseEvidenceDrillComparisonFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: ReleaseEvidenceDrillComparisonRow[];
  summary: {
    blockedCount: number;
    changedCount: number;
    comparisonHash: string;
    comparisonScore: number;
    nextAction: string;
    readyCount: number;
    regressionCount: number;
    reviewCount: number;
    rowCount: number;
    status: ReleaseEvidenceDrillComparisonStatus;
  };
  workspaceId: string;
}

export interface CreateReleaseEvidenceDrillComparisonReportInput {
  acceptedBaseline: ReleaseEvidenceDrillAcceptedBaseline;
  cadFixtureDrill: CadConversionFixtureDrillRunnerReport;
  generatedAt?: string;
  releaseCandidateId: string;
  signedArtifactDrill: SignedArtifactFixtureDrillRunnerReport;
  workspaceId?: string;
}

const statusRank: Record<ReleaseEvidenceDrillComparisonStatus | CadConversionFixtureDrillStatus | SignedArtifactFixtureDrillStatus, number> = {
  blocked: 0,
  review: 1,
  ready: 2,
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
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : stableJson(value)).digest("hex")}`;
}

function csvCell(value: boolean | number | string | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
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

function statusRow(input: {
  acceptedHash: string;
  acceptedStatus: CadConversionFixtureDrillStatus | SignedArtifactFixtureDrillStatus;
  currentHash: string;
  currentStatus: CadConversionFixtureDrillStatus | SignedArtifactFixtureDrillStatus;
  id: string;
  metric: string;
}) {
  const changed = input.acceptedHash !== input.currentHash || input.acceptedStatus !== input.currentStatus;
  const regressed = statusRank[input.currentStatus] < statusRank[input.acceptedStatus];
  const status: ReleaseEvidenceDrillComparisonStatus = input.currentStatus === "blocked" || regressed ? "blocked" : changed ? "review" : "ready";
  const severity: ReleaseEvidenceDrillComparisonSeverity = status === "blocked" ? "critical" : status === "review" ? "warning" : "info";

  return {
    acceptedValue: input.acceptedStatus,
    currentHash: input.currentHash,
    currentValue: input.currentStatus,
    delta: null,
    id: input.id,
    metric: input.metric,
    nextAction:
      status === "blocked"
        ? `Resolve ${input.metric} regression before native release evidence approval.`
        : status === "review"
          ? `Review changed ${input.metric} evidence before approval.`
          : `${input.metric} matches the accepted release evidence drill baseline.`,
    severity,
    status,
  } satisfies ReleaseEvidenceDrillComparisonRow;
}

function scoreRow(input: {
  acceptedHash: string;
  acceptedScore: number;
  currentHash: string;
  currentScore: number;
  id: string;
  metric: string;
}) {
  const delta = input.currentScore - input.acceptedScore;
  const changed = input.acceptedHash !== input.currentHash || delta !== 0;
  const status: ReleaseEvidenceDrillComparisonStatus = delta < 0 ? "blocked" : changed ? "review" : "ready";
  const severity: ReleaseEvidenceDrillComparisonSeverity = delta <= -15 ? "critical" : status === "blocked" || status === "review" ? "warning" : "info";

  return {
    acceptedValue: String(input.acceptedScore),
    currentHash: input.currentHash,
    currentValue: String(input.currentScore),
    delta,
    id: input.id,
    metric: input.metric,
    nextAction:
      status === "blocked"
        ? `Restore ${input.metric} to the accepted release evidence drill score.`
        : status === "review"
          ? `Review changed ${input.metric} score before approval.`
          : `${input.metric} score matches the accepted release evidence drill baseline.`,
    severity,
    status,
  } satisfies ReleaseEvidenceDrillComparisonRow;
}

function rowsFor(input: CreateReleaseEvidenceDrillComparisonReportInput): ReleaseEvidenceDrillComparisonRow[] {
  return [
    statusRow({
      acceptedHash: input.acceptedBaseline.signedArtifactDrillHash,
      acceptedStatus: input.acceptedBaseline.signedArtifactDrillStatus,
      currentHash: input.signedArtifactDrill.summary.drillHash,
      currentStatus: input.signedArtifactDrill.summary.status,
      id: "signed-artifact-status",
      metric: "Signed artifact drill status",
    }),
    scoreRow({
      acceptedHash: input.acceptedBaseline.signedArtifactDrillHash,
      acceptedScore: input.acceptedBaseline.signedArtifactDrillScore,
      currentHash: input.signedArtifactDrill.summary.drillHash,
      currentScore: input.signedArtifactDrill.summary.drillScore,
      id: "signed-artifact-score",
      metric: "Signed artifact drill score",
    }),
    statusRow({
      acceptedHash: input.acceptedBaseline.cadFixtureDrillHash,
      acceptedStatus: input.acceptedBaseline.cadFixtureDrillStatus,
      currentHash: input.cadFixtureDrill.summary.drillHash,
      currentStatus: input.cadFixtureDrill.summary.status,
      id: "cad-fixture-status",
      metric: "CAD fixture drill status",
    }),
    scoreRow({
      acceptedHash: input.acceptedBaseline.cadFixtureDrillHash,
      acceptedScore: input.acceptedBaseline.cadFixtureDrillScore,
      currentHash: input.cadFixtureDrill.summary.drillHash,
      currentScore: input.cadFixtureDrill.summary.drillScore,
      id: "cad-fixture-score",
      metric: "CAD fixture drill score",
    }),
  ];
}

function summarize(rows: ReleaseEvidenceDrillComparisonRow[]): ReleaseEvidenceDrillComparisonReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const changedCount = rows.filter((row) => row.status !== "ready").length;
  const regressionCount = rows.filter((row) => row.status === "blocked").length;
  const status: ReleaseEvidenceDrillComparisonStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    changedCount,
    comparisonHash: sha256(rows.map((row) => `${row.id}:${row.currentHash}:${row.currentValue}:${row.status}`)),
    comparisonScore: Math.max(0, Math.min(100, Math.round((readyCount / Math.max(1, rows.length)) * 100 + reviewCount * 18 - blockedCount * 22))),
    nextAction:
      status === "blocked"
        ? "Resolve release evidence drill regressions before native release evidence approval."
        : status === "review"
          ? "Review changed release evidence drill rows before native release evidence approval."
          : "Release evidence drill comparison is stable against the accepted baseline.",
    readyCount,
    regressionCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: ReleaseEvidenceDrillComparisonRow[]) {
  const header = ["comparison_id", "status", "severity", "metric", "accepted_value", "current_value", "delta", "current_hash", "next_action"];
  const body = rows.map((row) =>
    [row.id, row.status, row.severity, row.metric, row.acceptedValue, row.currentValue, row.delta, row.currentHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: {
  csvDataUri: string;
  csvFileName: string;
  jsonDataUri: string;
  jsonFileName: string;
}): ReleaseEvidenceDrillComparisonFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV comparison",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON comparison",
    },
  ];
}

export function createReleaseEvidenceDrillComparisonReport(input: CreateReleaseEvidenceDrillComparisonReportInput): ReleaseEvidenceDrillComparisonReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.signedArtifactDrill.workspaceId ?? input.cadFixtureDrill.workspaceId;
  const rows = rowsFor(input);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = `${JSON.stringify(
    {
      acceptedBaseline: input.acceptedBaseline,
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  )}\n`;
  const fileBase = `${slug(workspaceId)}-release-evidence-drill-comparison-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    acceptedBaseline: input.acceptedBaseline,
    csvContent,
    csvDataUri,
    csvFileName,
    files: filesFor({
      csvDataUri,
      csvFileName,
      jsonDataUri,
      jsonFileName,
    }),
    generatedAt,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    releaseCandidateId: input.releaseCandidateId,
    rows,
    summary,
    workspaceId,
  };
}
