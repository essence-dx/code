import { createHash } from "node:crypto";
import type { BoardReleaseArchiveCertificationExternalAuditorPacketReport } from "@/features/projects/board-release-archive-certification-external-auditor-packet";
import type { BoardReleaseArchiveCertificationEvidenceReplayVerifierReport } from "@/features/projects/board-release-archive-certification-evidence-replay-verifier";
import type { BoardReleaseArchiveCertificationHistoryLedgerReport } from "@/features/projects/board-release-archive-certification-history-ledger";
import type { BoardReleaseArchiveCertificationRevocationWorkflowReport } from "@/features/projects/board-release-archive-certification-revocation-workflow";
import type { BoardReleaseArchiveVerificationDistributionProofBundleReport } from "@/features/projects/board-release-archive-verification-distribution-proof-bundle";
import type { BoardReleaseArchiveVerificationExceptionRegisterReport } from "@/features/projects/board-release-archive-verification-exception-register";

export type BoardReleaseArchiveVerificationReadinessTimelineKind = "auditor" | "certificate" | "distribution" | "exception" | "replay" | "revocation";
export type BoardReleaseArchiveVerificationReadinessTimelineStatus = "blocked" | "ready" | "watch";

export interface BoardReleaseArchiveVerificationReadinessTimelineRow {
  detail: string;
  evidenceHash: string;
  id: string;
  kind: BoardReleaseArchiveVerificationReadinessTimelineKind;
  nextAction: string;
  score: number;
  sequence: number;
  status: BoardReleaseArchiveVerificationReadinessTimelineStatus;
  timelineHash: string;
  title: string;
}

export interface BoardReleaseArchiveVerificationReadinessTimelineReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveVerificationReadinessTimelineRow[];
  summary: {
    blockedCount: number;
    nextAction: string;
    readyCount: number;
    rowCount: number;
    status: BoardReleaseArchiveVerificationReadinessTimelineStatus;
    timelineHash: string;
    timelineScore: number;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveVerificationReadinessTimelineInput {
  auditorPacket: BoardReleaseArchiveCertificationExternalAuditorPacketReport;
  distributionProofBundle: BoardReleaseArchiveVerificationDistributionProofBundleReport;
  exceptionRegister: BoardReleaseArchiveVerificationExceptionRegisterReport;
  generatedAt?: string;
  historyLedger: BoardReleaseArchiveCertificationHistoryLedgerReport;
  replayVerifier: BoardReleaseArchiveCertificationEvidenceReplayVerifierReport;
  revocationWorkflow: BoardReleaseArchiveCertificationRevocationWorkflowReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseArchiveVerificationReadinessTimelineStatus, number> = {
  blocked: 0,
  watch: 1,
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

function fromReplayStatus(status: BoardReleaseArchiveCertificationEvidenceReplayVerifierReport["summary"]["status"]): BoardReleaseArchiveVerificationReadinessTimelineStatus {
  return status === "missing" ? "blocked" : status === "drift" ? "watch" : "ready";
}

function fromAuditorStatus(status: BoardReleaseArchiveCertificationExternalAuditorPacketReport["summary"]["status"]): BoardReleaseArchiveVerificationReadinessTimelineStatus {
  return status === "blocked" ? "blocked" : status === "watch" ? "watch" : "ready";
}

function fromRevocationStatus(status: BoardReleaseArchiveCertificationRevocationWorkflowReport["summary"]["status"]): BoardReleaseArchiveVerificationReadinessTimelineStatus {
  return status === "open" ? "blocked" : status === "queued" ? "watch" : "ready";
}

function fromExceptionStatus(status: BoardReleaseArchiveVerificationExceptionRegisterReport["summary"]["status"]): BoardReleaseArchiveVerificationReadinessTimelineStatus {
  return status === "open" ? "blocked" : "ready";
}

function fromDistributionStatus(status: BoardReleaseArchiveVerificationDistributionProofBundleReport["summary"]["status"]): BoardReleaseArchiveVerificationReadinessTimelineStatus {
  return status === "blocked" ? "blocked" : status === "watch" ? "watch" : "ready";
}

function row(input: Omit<BoardReleaseArchiveVerificationReadinessTimelineRow, "id" | "timelineHash"> & { workspaceId: string }) {
  const timelineHash = sha256({
    detail: input.detail,
    evidenceHash: input.evidenceHash,
    kind: input.kind,
    score: input.score,
    sequence: input.sequence,
    status: input.status,
  });

  return {
    detail: input.detail,
    evidenceHash: input.evidenceHash,
    id: `archive-verification-readiness:${slug(input.workspaceId)}:${input.sequence}:${input.kind}`,
    kind: input.kind,
    nextAction: input.nextAction,
    score: input.score,
    sequence: input.sequence,
    status: input.status,
    timelineHash,
    title: input.title,
  } satisfies BoardReleaseArchiveVerificationReadinessTimelineRow;
}

function createRows(input: CreateBoardReleaseArchiveVerificationReadinessTimelineInput & { workspaceId: string }) {
  const history = input.historyLedger.summary;
  const replay = input.replayVerifier.summary;
  const auditor = input.auditorPacket.summary;
  const revocation = input.revocationWorkflow.summary;
  const exception = input.exceptionRegister.summary;
  const distribution = input.distributionProofBundle.summary;

  return [
    row({
      detail: `${history.rowCount} certificate records with ${history.status} ledger status.`,
      evidenceHash: history.ledgerHash,
      kind: "certificate",
      nextAction: history.nextAction,
      score: history.ledgerScore,
      sequence: 1,
      status: history.status === "blocked" ? "blocked" : "ready",
      title: "Certificate history readiness",
      workspaceId: input.workspaceId,
    }),
    row({
      detail: `${replay.matchedCount}/${replay.rowCount} replay checks matched, ${replay.driftCount} drift, ${replay.missingCount} missing.`,
      evidenceHash: replay.replayHash,
      kind: "replay",
      nextAction: replay.nextAction,
      score: replay.replayScore,
      sequence: 2,
      status: fromReplayStatus(replay.status),
      title: "Evidence replay readiness",
      workspaceId: input.workspaceId,
    }),
    row({
      detail: `${auditor.readyCount}/${auditor.packetCount} auditor packet rows ready.`,
      evidenceHash: auditor.externalPacketHash,
      kind: "auditor",
      nextAction: auditor.nextAction,
      score: auditor.packetScore,
      sequence: 3,
      status: fromAuditorStatus(auditor.status),
      title: "Auditor packet readiness",
      workspaceId: input.workspaceId,
    }),
    row({
      detail: `${revocation.resolvedCount}/${revocation.rowCount} revocation rows resolved, ${revocation.openCount} open, ${revocation.queuedCount} queued.`,
      evidenceHash: revocation.revocationHash,
      kind: "revocation",
      nextAction: revocation.nextAction,
      score: revocation.revocationScore,
      sequence: 4,
      status: fromRevocationStatus(revocation.status),
      title: "Revocation readiness",
      workspaceId: input.workspaceId,
    }),
    row({
      detail: `${exception.openCount} open exceptions, ${exception.approvedCount} approved, ${exception.missingApprovalCount} missing board approvals.`,
      evidenceHash: exception.registerHash,
      kind: "exception",
      nextAction: exception.nextAction,
      score: exception.registerScore,
      sequence: 5,
      status: fromExceptionStatus(exception.status),
      title: "Exception register readiness",
      workspaceId: input.workspaceId,
    }),
    row({
      detail: `${distribution.acknowledgedCount}/${distribution.rowCount} recipients acknowledged, ${distribution.expiredCount} expired links, ${distribution.pendingCount} pending.`,
      evidenceHash: distribution.bundleHash,
      kind: "distribution",
      nextAction: distribution.nextAction,
      score: distribution.proofScore,
      sequence: 6,
      status: fromDistributionStatus(distribution.status),
      title: "Distribution proof readiness",
      workspaceId: input.workspaceId,
    }),
  ];
}

function createCsv(rows: BoardReleaseArchiveVerificationReadinessTimelineRow[]) {
  const header = ["timeline_id", "sequence", "kind", "title", "status", "score", "evidence_hash", "timeline_hash", "detail", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.sequence, entry.kind, entry.title, entry.status, entry.score, entry.evidenceHash, entry.timelineHash, entry.detail, entry.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveVerificationReadinessTimelineRow[]): BoardReleaseArchiveVerificationReadinessTimelineReport["summary"] {
  const readyCount = rows.filter((entry) => entry.status === "ready").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const status = rows.reduce<BoardReleaseArchiveVerificationReadinessTimelineStatus>((worst, entry) => (statusRank[entry.status] < statusRank[worst] ? entry.status : worst), "ready");
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "watch") ?? rows[0] ?? null;
  const averageScore = rows.length > 0 ? rows.reduce((total, entry) => total + entry.score, 0) / rows.length : 100;

  return {
    blockedCount,
    nextAction: status === "ready" ? "Archive verification readiness timeline is ready for board review." : (nextRow?.nextAction ?? "Review archive verification readiness timeline."),
    readyCount,
    rowCount: rows.length,
    status,
    timelineHash: sha256(rows.map((entry) => entry.timelineHash)),
    timelineScore: Math.max(0, Math.round(averageScore - blockedCount * 16 - watchCount * 8)),
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveVerificationReadinessTimelineRow[];
  summary: BoardReleaseArchiveVerificationReadinessTimelineReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveVerificationReadinessTimeline(
  input: CreateBoardReleaseArchiveVerificationReadinessTimelineInput,
): BoardReleaseArchiveVerificationReadinessTimelineReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.distributionProofBundle.workspaceId;
  const rows = createRows({
    ...input,
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-verification-readiness-timeline-${dateStamp(generatedAt)}`;

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
