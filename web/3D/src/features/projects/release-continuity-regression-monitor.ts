import { createHash } from "node:crypto";

import type {
  ReleaseContinuityEvidenceIndex,
  ReleaseContinuityEvidenceSource,
} from "@/features/projects/release-continuity-evidence-index";

export type ReleaseContinuityRegressionMonitorStatus =
  | "blocked"
  | "ready"
  | "review";
export type ReleaseContinuityRegressionMonitorFileFormat = "csv" | "json";

export interface ReleaseContinuityAcceptedBaselineRow {
  readonly evidenceHash: string;
  readonly score: number;
  readonly source: ReleaseContinuityEvidenceSource;
}

export interface ReleaseContinuityAcceptedBaseline {
  readonly acceptedAt: string;
  readonly releaseCandidateId: string;
  readonly rows: readonly ReleaseContinuityAcceptedBaselineRow[];
}

export interface ReleaseContinuityRegressionMonitorInput {
  readonly acceptedBaseline: ReleaseContinuityAcceptedBaseline;
  readonly currentIndex: ReleaseContinuityEvidenceIndex;
  readonly generatedAt?: string;
  readonly releaseCandidateId: string;
  readonly workspaceId?: string;
}

export interface ReleaseContinuityRegressionMonitorRow {
  readonly acceptedEvidenceHash: string;
  readonly acceptedScore: number;
  readonly currentEvidenceHash: string;
  readonly currentScore: number;
  readonly hashChanged: boolean;
  readonly missingEvidence: boolean;
  readonly monitorHash: string;
  readonly nextAction: string;
  readonly scoreDelta: number;
  readonly scoreDropped: boolean;
  readonly source: ReleaseContinuityEvidenceSource;
  readonly status: ReleaseContinuityRegressionMonitorStatus;
}

export interface ReleaseContinuityRegressionMonitorFile {
  readonly download: string;
  readonly format: ReleaseContinuityRegressionMonitorFileFormat;
  readonly href: string;
  readonly label: string;
}

export interface ReleaseContinuityRegressionMonitor {
  readonly acceptedAt: string;
  readonly acceptedReleaseCandidateId: string;
  readonly csvContent: string;
  readonly csvDataUri: string;
  readonly csvFileName: string;
  readonly files: ReleaseContinuityRegressionMonitorFile[];
  readonly generatedAt: string;
  readonly jsonContent: string;
  readonly jsonDataUri: string;
  readonly jsonFileName: string;
  readonly releaseCandidateId: string;
  readonly rows: ReleaseContinuityRegressionMonitorRow[];
  readonly summary: {
    readonly blockedCount: number;
    readonly hashChangeCount: number;
    readonly missingEvidenceCount: number;
    readonly monitorHash: string;
    readonly nextAction: string;
    readonly readyCount: number;
    readonly regressionScore: number;
    readonly reviewCount: number;
    readonly rowCount: number;
    readonly scoreDropCount: number;
    readonly status: ReleaseContinuityRegressionMonitorStatus;
  };
  readonly workspaceId: string;
}

const sourceRank: Record<ReleaseContinuityEvidenceSource, number> = {
  "custody-approval": 0,
  "attachment-approval": 1,
  "evidence-drill": 2,
  "external-runtime-reality": 3,
};

export function createReleaseContinuityRegressionMonitor(
  input: ReleaseContinuityRegressionMonitorInput,
): ReleaseContinuityRegressionMonitor {
  const generatedAt = input.generatedAt ?? new Date(0).toISOString();
  const workspaceId = input.workspaceId ?? input.currentIndex.workspaceId;
  const baselineBySource = new Map(
    input.acceptedBaseline.rows.map((row) => [row.source, row]),
  );
  const rows = input.currentIndex.rows
    .map((current) =>
      createRow({
        accepted: baselineBySource.get(current.source),
        current,
      }),
    )
    .sort((first, second) => sourceRank[first.source] - sourceRank[second.source]);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      acceptedAt: input.acceptedBaseline.acceptedAt,
      acceptedReleaseCandidateId: input.acceptedBaseline.releaseCandidateId,
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const baseFileName = `${slug(workspaceId)}-release-continuity-regression-monitor-${slug(
    input.releaseCandidateId,
  )}-${dateStamp(generatedAt)}`;
  const csvFileName = `${baseFileName}.csv`;
  const jsonFileName = `${baseFileName}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    acceptedAt: input.acceptedBaseline.acceptedAt,
    acceptedReleaseCandidateId: input.acceptedBaseline.releaseCandidateId,
    csvContent,
    csvDataUri,
    csvFileName,
    files: [
      {
        download: csvFileName,
        format: "csv",
        href: csvDataUri,
        label: "Release continuity regression monitor CSV",
      },
      {
        download: jsonFileName,
        format: "json",
        href: jsonDataUri,
        label: "Release continuity regression monitor JSON",
      },
    ],
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

function createRow(input: {
  readonly accepted?: ReleaseContinuityAcceptedBaselineRow;
  readonly current: ReleaseContinuityEvidenceIndex["rows"][number];
}): ReleaseContinuityRegressionMonitorRow {
  const acceptedEvidenceHash = input.accepted?.evidenceHash.trim() ?? "";
  const acceptedScore = normalizeScore(input.accepted?.score ?? 0);
  const currentEvidenceHash = input.current.evidenceHash.trim();
  const currentScore = normalizeScore(input.current.score);
  const missingEvidence =
    !input.current.evidenceLinked || !input.current.searchable || !hasSha256(currentEvidenceHash);
  const scoreDelta = currentScore - acceptedScore;
  const scoreDropped = !missingEvidence && scoreDelta < 0;
  const hashChanged =
    !hasSha256(acceptedEvidenceHash) ||
    !hasSha256(currentEvidenceHash) ||
    acceptedEvidenceHash !== currentEvidenceHash;
  const status: ReleaseContinuityRegressionMonitorStatus =
    missingEvidence || hashChanged
      ? "blocked"
      : scoreDropped
        ? "review"
        : "ready";
  const rowWithoutHash = {
    acceptedEvidenceHash: acceptedEvidenceHash || "missing",
    acceptedScore,
    currentEvidenceHash: currentEvidenceHash || "missing",
    currentScore,
    hashChanged,
    missingEvidence,
    nextAction:
      status === "ready"
        ? `Release continuity evidence is unchanged for ${input.current.source}.`
        : status === "review"
          ? `Review release continuity score drop for ${input.current.source}.`
          : `Resolve release continuity regression for ${input.current.source}.`,
    scoreDelta,
    scoreDropped,
    source: input.current.source,
    status,
  };

  return {
    ...rowWithoutHash,
    monitorHash: sha256(rowWithoutHash),
  };
}

function summarize(
  rows: readonly ReleaseContinuityRegressionMonitorRow[],
): ReleaseContinuityRegressionMonitor["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const missingEvidenceCount = rows.filter((row) => row.missingEvidence).length;
  const scoreDropCount = rows.filter((row) => row.scoreDropped).length;
  const hashChangeCount = rows.filter((row) => row.hashChanged).length;
  const averageScore = Math.round(
    rows.reduce((total, row) => total + row.currentScore, 0) / rows.length,
  );
  const status: ReleaseContinuityRegressionMonitorStatus =
    blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";

  return {
    blockedCount,
    hashChangeCount,
    missingEvidenceCount,
    monitorHash: sha256(rows.map((row) => row.monitorHash)),
    nextAction:
      status === "ready"
        ? "Release continuity regression monitor is ready for dashboard approval."
        : "Resolve blocked release continuity regression monitor before dashboard approval.",
    readyCount,
    regressionScore:
      status === "blocked" ? Math.min(averageScore, 60) : averageScore,
    reviewCount,
    rowCount: rows.length,
    scoreDropCount,
    status,
  };
}

function createCsv(rows: readonly ReleaseContinuityRegressionMonitorRow[]) {
  const header = [
    "source",
    "status",
    "current_score",
    "accepted_score",
    "score_delta",
    "missing_evidence",
    "score_dropped",
    "hash_changed",
    "monitor_hash",
    "next_action",
  ];
  const records = rows.map((row) => [
    row.source,
    row.status,
    String(row.currentScore),
    String(row.acceptedScore),
    String(row.scoreDelta),
    String(row.missingEvidence),
    String(row.scoreDropped),
    String(row.hashChanged),
    row.monitorHash,
    row.nextAction,
  ]);

  return [header, ...records].map(csvRow).join("\n");
}

function normalizeScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function csvRow(values: readonly string[]) {
  return values
    .map((value) => {
      const escaped = value.replaceAll('"', '""');

      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    })
    .join(",");
}

function hasSha256(value: string) {
  return value.startsWith("sha256:");
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

  return JSON.stringify(value) ?? "null";
}

function sha256(value: unknown) {
  return `sha256:${createHash("sha256")
    .update(typeof value === "string" ? value : stableJson(value))
    .digest("hex")}`;
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

  return Number.isNaN(date.getTime())
    ? "current"
    : date.toISOString().slice(0, 10).replaceAll("-", "");
}
