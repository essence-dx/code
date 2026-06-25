import { createHash } from "node:crypto";
import type { BoardReleaseArchiveAnomalyKind, BoardReleaseArchiveAnomalyReviewReport } from "@/features/projects/board-release-archive-anomaly-review";
import type { BoardReleaseArchiveIntelligenceIndexReport } from "@/features/projects/board-release-archive-intelligence-index";
import type { BoardReleaseCloseoutReadinessGateStatus } from "@/features/projects/board-release-closeout-readiness-gates";

export type BoardReleaseArchiveTrendDigestKind = "blocker-category" | "closeout-score" | "owner-follow-through";

export interface BoardReleaseArchiveTrendDigestRow {
  detail: string;
  digestHash: string;
  digestId: string;
  kind: BoardReleaseArchiveTrendDigestKind;
  metric: string;
  nextAction: string;
  score: number;
  status: BoardReleaseCloseoutReadinessGateStatus;
  title: string;
  workspaceId: string;
}

export interface BoardReleaseArchiveTrendDigestReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveTrendDigestRow[];
  summary: {
    blockedCount: number;
    closeoutScoreMovement: number;
    digestHash: string;
    nextAction: string;
    recurringBlockerCategoryCount: number;
    rowCount: number;
    status: BoardReleaseCloseoutReadinessGateStatus;
    trendScore: number;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveTrendDigestReportInput {
  anomalyReview: BoardReleaseArchiveAnomalyReviewReport;
  generatedAt?: string;
  index: BoardReleaseArchiveIntelligenceIndexReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseCloseoutReadinessGateStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const kindRank: Record<BoardReleaseArchiveTrendDigestKind, number> = {
  "closeout-score": 0,
  "blocker-category": 1,
  "owner-follow-through": 2,
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

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function digestId(input: {
  generatedAt: string;
  kind: BoardReleaseArchiveTrendDigestKind;
  title: string;
  workspaceId: string;
}) {
  return `board-release-archive-trend:${slug(input.workspaceId)}:${input.kind}:${slug(input.title)}:${dateStamp(input.generatedAt)}`;
}

function createRow(input: Omit<BoardReleaseArchiveTrendDigestRow, "digestHash" | "digestId"> & { generatedAt: string }) {
  const id = digestId({
    generatedAt: input.generatedAt,
    kind: input.kind,
    title: input.title,
    workspaceId: input.workspaceId,
  });
  const digestHash = sha256({
    detail: input.detail,
    id,
    kind: input.kind,
    metric: input.metric,
    score: input.score,
    status: input.status,
    title: input.title,
  });

  return {
    detail: input.detail,
    digestHash,
    digestId: id,
    kind: input.kind,
    metric: input.metric,
    nextAction: input.nextAction,
    score: input.score,
    status: input.status,
    title: input.title,
    workspaceId: input.workspaceId,
  };
}

function closeoutScoreRow(input: {
  anomalyReview: BoardReleaseArchiveAnomalyReviewReport;
  generatedAt: string;
  index: BoardReleaseArchiveIntelligenceIndexReport;
  workspaceId: string;
}) {
  const averageScore =
    input.index.rows.length > 0 ? Math.round(input.index.rows.reduce((sum, row) => sum + row.score, 0) / input.index.rows.length) : 100;
  const closeoutScoreMovement = averageScore - 100;
  const score = clampScore(averageScore - input.anomalyReview.summary.criticalCount * 4 - input.anomalyReview.summary.watchCount * 2);

  return createRow({
    detail: `${averageScore}/100 indexed closeout score with ${closeoutScoreMovement} movement from a clean archive baseline.`,
    generatedAt: input.generatedAt,
    kind: "closeout-score",
    metric: `${closeoutScoreMovement} movement`,
    nextAction:
      closeoutScoreMovement < 0
        ? "Investigate closeout score decline before relying on archived release intelligence."
        : "Archive closeout score is stable for replay simulation.",
    score,
    status: closeoutScoreMovement <= -40 ? "blocked" : closeoutScoreMovement < 0 ? "watch" : "ready",
    title: "Closeout score movement",
    workspaceId: input.workspaceId,
  });
}

function blockerCategoryRows(input: {
  anomalyReview: BoardReleaseArchiveAnomalyReviewReport;
  generatedAt: string;
  workspaceId: string;
}) {
  const categoryCounts = input.anomalyReview.findings.reduce<Record<BoardReleaseArchiveAnomalyKind, number>>(
    (counts, finding) => {
      counts[finding.kind] += 1;
      return counts;
    },
    {
      "archive-drift": 0,
      "repeated-decision": 0,
      "stale-remediation": 0,
    },
  );

  return (Object.entries(categoryCounts) as Array<[BoardReleaseArchiveAnomalyKind, number]>)
    .filter(([, count]) => count > 0)
    .map(([kind, count]) =>
      createRow({
        detail: `${count} ${kind.replaceAll("-", " ")} finding${count === 1 ? "" : "s"} detected in the archive anomaly review.`,
        generatedAt: input.generatedAt,
        kind: "blocker-category",
        metric: `${count} findings`,
        nextAction: count >= 3 ? `Assign a focused remediation owner for recurring ${kind.replaceAll("-", " ")} findings.` : `Monitor ${kind.replaceAll("-", " ")} in the next replay cycle.`,
        score: clampScore(100 - count * 14),
        status: count >= 3 ? "blocked" : "watch",
        title: kind.replaceAll("-", " "),
        workspaceId: input.workspaceId,
      }),
    );
}

function ownerFollowThroughRow(input: {
  anomalyReview: BoardReleaseArchiveAnomalyReviewReport;
  generatedAt: string;
  index: BoardReleaseArchiveIntelligenceIndexReport;
  workspaceId: string;
}) {
  const readyRows = input.index.summary.readyCount;
  const unresolvedFindings = input.anomalyReview.summary.blockedCount + input.anomalyReview.summary.watchCount;
  const followThroughScore = clampScore((readyRows / Math.max(input.index.summary.indexCount, 1)) * 100 - unresolvedFindings * 6);

  return createRow({
    detail: `${readyRows}/${input.index.summary.indexCount} indexed archive rows are ready while ${unresolvedFindings} anomaly findings still need follow-through.`,
    generatedAt: input.generatedAt,
    kind: "owner-follow-through",
    metric: `${followThroughScore}/100 follow-through`,
    nextAction:
      unresolvedFindings > 0
        ? "Close or refresh unresolved anomaly findings before declaring owner follow-through complete."
        : "Owner follow-through is complete for the current archive intelligence cycle.",
    score: followThroughScore,
    status: unresolvedFindings >= 5 ? "blocked" : unresolvedFindings > 0 ? "watch" : "ready",
    title: "Owner follow-through",
    workspaceId: input.workspaceId,
  });
}

function createRows(input: CreateBoardReleaseArchiveTrendDigestReportInput & { generatedAt: string; workspaceId: string }) {
  return [
    closeoutScoreRow(input),
    ...blockerCategoryRows(input),
    ownerFollowThroughRow(input),
  ].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      kindRank[first.kind] - kindRank[second.kind] ||
      first.title.localeCompare(second.title),
  );
}

function summarize(rows: BoardReleaseArchiveTrendDigestRow[]): BoardReleaseArchiveTrendDigestReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const firstAttention = rows.find((row) => row.status === "blocked" || row.status === "watch") ?? null;
  const closeoutScoreRow = rows.find((row) => row.kind === "closeout-score");
  const closeoutScoreMovement = Number.parseInt(closeoutScoreRow?.metric ?? "0", 10) || 0;

  return {
    blockedCount,
    closeoutScoreMovement,
    digestHash: sha256(rows.map((row) => row.digestHash)),
    nextAction: firstAttention?.nextAction ?? "Archive trend digest is ready for replay simulation.",
    recurringBlockerCategoryCount: rows.filter((row) => row.kind === "blocker-category" && row.status === "blocked").length,
    rowCount: rows.length,
    status: blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready",
    trendScore: rows.length > 0 ? Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length) : 100,
    watchCount,
  };
}

function createCsv(rows: BoardReleaseArchiveTrendDigestRow[]) {
  const header = ["digest_id", "kind", "title", "status", "score", "metric", "detail", "digest_hash", "next_action"];
  const body = rows.map((row) =>
    [row.digestId, row.kind, row.title, row.status, row.score, row.metric, row.detail, row.digestHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveTrendDigestRow[];
  summary: BoardReleaseArchiveTrendDigestReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(
    {
      generatedAt: input.generatedAt,
      rows: input.rows,
      summary: input.summary,
      workspaceId: input.workspaceId,
    },
    null,
    2,
  );
}

export function createBoardReleaseArchiveTrendDigestReport(
  input: CreateBoardReleaseArchiveTrendDigestReportInput,
): BoardReleaseArchiveTrendDigestReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.index.workspaceId;
  const rows = createRows({
    ...input,
    generatedAt,
    workspaceId,
  });
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-trend-digest-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}
