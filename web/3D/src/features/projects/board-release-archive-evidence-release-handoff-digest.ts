import { createHash } from "node:crypto";
import type { BoardReleaseArchiveEvidenceDiffSnapshotReport } from "@/features/projects/board-release-archive-evidence-diff-snapshots";
import type { BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport } from "@/features/projects/board-release-archive-evidence-exception-renewal-scheduler";
import type { BoardReleaseArchiveEvidenceRetentionVaultReport } from "@/features/projects/board-release-archive-evidence-retention-vault";
import type { BoardReleaseArchiveEvidenceReviewerPacketReport } from "@/features/projects/board-release-archive-evidence-reviewer-packets";

export type BoardReleaseArchiveEvidenceReleaseHandoffDigestStatus = "blocked" | "ready" | "watch";
export type BoardReleaseArchiveEvidenceReleaseHandoffDigestArea = "diffs" | "renewals" | "reviewers" | "vault";

export interface BoardReleaseArchiveEvidenceReleaseHandoffDigestRow {
  area: BoardReleaseArchiveEvidenceReleaseHandoffDigestArea;
  evidenceHash: string;
  id: string;
  metric: string;
  nextAction: string;
  score: number;
  status: BoardReleaseArchiveEvidenceReleaseHandoffDigestStatus;
  title: string;
  value: string;
}

export interface BoardReleaseArchiveEvidenceReleaseHandoffDigestReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  executiveMemo: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveEvidenceReleaseHandoffDigestRow[];
  summary: {
    blockedCount: number;
    digestHash: string;
    digestScore: number;
    nextAction: string;
    readyCount: number;
    rowCount: number;
    status: BoardReleaseArchiveEvidenceReleaseHandoffDigestStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveEvidenceReleaseHandoffDigestInput {
  diffSnapshots: BoardReleaseArchiveEvidenceDiffSnapshotReport;
  exceptionRenewals: BoardReleaseArchiveEvidenceExceptionRenewalSchedulerReport;
  generatedAt?: string;
  retentionVault: BoardReleaseArchiveEvidenceRetentionVaultReport;
  reviewerPackets: BoardReleaseArchiveEvidenceReviewerPacketReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseArchiveEvidenceReleaseHandoffDigestStatus, number> = {
  blocked: 0,
  watch: 1,
  ready: 2,
};

const areaRank: Record<BoardReleaseArchiveEvidenceReleaseHandoffDigestArea, number> = {
  vault: 0,
  diffs: 1,
  reviewers: 2,
  renewals: 3,
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

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeCsvDataUri(csvContent: string) {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
}

function encodeJsonDataUri(jsonContent: string) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(jsonContent)}`;
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

function statusFrom(value: string): BoardReleaseArchiveEvidenceReleaseHandoffDigestStatus {
  if (value === "blocked" || value === "overdue") {
    return "blocked";
  }

  if (value === "sealed" || value === "ready" || value === "scheduled") {
    return "ready";
  }

  return "watch";
}

function row(input: Omit<BoardReleaseArchiveEvidenceReleaseHandoffDigestRow, "id"> & { generatedAt: string; workspaceId: string }) {
  return {
    ...input,
    id: `archive-evidence-handoff:${slug(input.workspaceId)}:${input.area}:${slug(input.metric)}:${dateStamp(input.generatedAt)}`,
  } satisfies BoardReleaseArchiveEvidenceReleaseHandoffDigestRow;
}

function createRows(input: Required<Omit<CreateBoardReleaseArchiveEvidenceReleaseHandoffDigestInput, "workspaceId">> & { workspaceId: string }) {
  return [
    row({
      area: "vault",
      evidenceHash: input.retentionVault.summary.vaultHash,
      generatedAt: input.generatedAt,
      metric: "vault-integrity",
      nextAction: input.retentionVault.summary.nextAction,
      score: input.retentionVault.summary.vaultScore,
      status: statusFrom(input.retentionVault.summary.status),
      title: "Retention vault integrity",
      value: `${input.retentionVault.summary.sealedCount}/${input.retentionVault.summary.manifestCount} sealed`,
      workspaceId: input.workspaceId,
    }),
    row({
      area: "diffs",
      evidenceHash: input.diffSnapshots.summary.snapshotHash,
      generatedAt: input.generatedAt,
      metric: "diff-drift",
      nextAction: input.diffSnapshots.summary.nextAction,
      score: input.diffSnapshots.summary.snapshotScore,
      status: statusFrom(input.diffSnapshots.summary.status),
      title: "Vault baseline diff drift",
      value: `${input.diffSnapshots.summary.changedCount} changed, ${input.diffSnapshots.summary.addedCount} added, ${input.diffSnapshots.summary.missingCount} missing`,
      workspaceId: input.workspaceId,
    }),
    row({
      area: "reviewers",
      evidenceHash: input.reviewerPackets.summary.reviewerPacketHash,
      generatedAt: input.generatedAt,
      metric: "reviewer-packets",
      nextAction: input.reviewerPackets.summary.nextAction,
      score: input.reviewerPackets.summary.reviewerScore,
      status: statusFrom(input.reviewerPackets.summary.status),
      title: "Reviewer packet readiness",
      value: `${input.reviewerPackets.summary.readyCount}/${input.reviewerPackets.summary.packetCount} ready`,
      workspaceId: input.workspaceId,
    }),
    row({
      area: "renewals",
      evidenceHash: input.exceptionRenewals.summary.renewalHash,
      generatedAt: input.generatedAt,
      metric: "renewal-risk",
      nextAction: input.exceptionRenewals.summary.nextAction,
      score: input.exceptionRenewals.summary.renewalScore,
      status: statusFrom(input.exceptionRenewals.summary.status),
      title: "Exception renewal risk",
      value: `${input.exceptionRenewals.summary.overdueCount} overdue, ${input.exceptionRenewals.summary.blockedCount} blocked, ${input.exceptionRenewals.summary.dueSoonCount} due soon`,
      workspaceId: input.workspaceId,
    }),
  ].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      areaRank[first.area] - areaRank[second.area] ||
      first.title.localeCompare(second.title),
  );
}

function createCsv(rows: BoardReleaseArchiveEvidenceReleaseHandoffDigestRow[]) {
  const header = ["handoff_id", "area", "title", "status", "score", "metric", "value", "evidence_hash", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.area, entry.title, entry.status, entry.score, entry.metric, entry.value, entry.evidenceHash, entry.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveEvidenceReleaseHandoffDigestRow[]): BoardReleaseArchiveEvidenceReleaseHandoffDigestReport["summary"] {
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const readyCount = rows.filter((entry) => entry.status === "ready").length;
  const status = rows.reduce<BoardReleaseArchiveEvidenceReleaseHandoffDigestStatus>(
    (worst, entry) => (statusRank[entry.status] < statusRank[worst] ? entry.status : worst),
    "ready",
  );
  const nextRow = rows.find((entry) => entry.status !== "ready") ?? rows[0] ?? null;

  return {
    blockedCount,
    digestHash: sha256(rows.map((entry) => [entry.area, entry.evidenceHash, entry.status, entry.score])),
    digestScore: rows.length > 0 ? Math.max(0, Math.round(rows.reduce((sum, entry) => sum + entry.score, 0) / rows.length - blockedCount * 8 - watchCount * 3)) : 100,
    nextAction: status === "ready" ? "Archive evidence release handoff digest is ready for board closeout." : (nextRow?.nextAction ?? "Review archive evidence handoff digest."),
    readyCount,
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function executiveMemo(summary: BoardReleaseArchiveEvidenceReleaseHandoffDigestReport["summary"]) {
  return `${summary.status.toUpperCase()} archive evidence handoff: ${summary.readyCount}/${summary.rowCount} areas ready, ${summary.watchCount} watch, ${summary.blockedCount} blocked. ${summary.nextAction}`;
}

function createJson(input: {
  executiveMemo: string;
  generatedAt: string;
  rows: BoardReleaseArchiveEvidenceReleaseHandoffDigestRow[];
  summary: BoardReleaseArchiveEvidenceReleaseHandoffDigestReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveEvidenceReleaseHandoffDigest(
  input: CreateBoardReleaseArchiveEvidenceReleaseHandoffDigestInput,
): BoardReleaseArchiveEvidenceReleaseHandoffDigestReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.retentionVault.workspaceId;
  const rows = createRows({
    ...input,
    generatedAt,
    workspaceId,
  });
  const summary = summarize(rows);
  const memo = executiveMemo(summary);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    executiveMemo: memo,
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-evidence-handoff-digest-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    executiveMemo: memo,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}
