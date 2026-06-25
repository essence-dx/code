import { createHash } from "node:crypto";
import type { BoardReleaseArchiveVerificationDistributionProofBundleReport } from "@/features/projects/board-release-archive-verification-distribution-proof-bundle";
import type { BoardReleaseArchiveVerificationExceptionRegisterReport } from "@/features/projects/board-release-archive-verification-exception-register";
import type { BoardReleaseArchiveVerificationReadinessTimelineReport } from "@/features/projects/board-release-archive-verification-readiness-timeline";
import type { BoardReleaseArchiveVerificationSignatureChainValidatorReport } from "@/features/projects/board-release-archive-verification-signature-chain-validator";

export type BoardReleaseArchiveVerificationFinalAcceptancePacketKind = "distribution-proof" | "exception-register" | "executive-recommendation" | "readiness-timeline" | "signature-chain";
export type BoardReleaseArchiveVerificationFinalAcceptancePacketStatus = "accepted" | "blocked" | "watch";

export interface BoardReleaseArchiveVerificationFinalAcceptancePacketRow {
  acceptanceHash: string;
  detail: string;
  evidenceHash: string;
  id: string;
  kind: BoardReleaseArchiveVerificationFinalAcceptancePacketKind;
  nextAction: string;
  score: number;
  status: BoardReleaseArchiveVerificationFinalAcceptancePacketStatus;
  title: string;
}

export interface BoardReleaseArchiveVerificationFinalAcceptancePacketReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  executiveRecommendation: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveVerificationFinalAcceptancePacketRow[];
  summary: {
    acceptedCount: number;
    blockedCount: number;
    finalAcceptanceHash: string;
    finalAcceptanceScore: number;
    nextAction: string;
    rowCount: number;
    status: BoardReleaseArchiveVerificationFinalAcceptancePacketStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveVerificationFinalAcceptancePacketInput {
  distributionProofBundle: BoardReleaseArchiveVerificationDistributionProofBundleReport;
  exceptionRegister: BoardReleaseArchiveVerificationExceptionRegisterReport;
  generatedAt?: string;
  readinessTimeline: BoardReleaseArchiveVerificationReadinessTimelineReport;
  signatureChainValidator: BoardReleaseArchiveVerificationSignatureChainValidatorReport;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseArchiveVerificationFinalAcceptancePacketStatus, number> = {
  blocked: 0,
  watch: 1,
  accepted: 2,
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

function fromSignatureStatus(status: BoardReleaseArchiveVerificationSignatureChainValidatorReport["summary"]["status"]): BoardReleaseArchiveVerificationFinalAcceptancePacketStatus {
  return status === "valid" ? "accepted" : "blocked";
}

function fromExceptionStatus(status: BoardReleaseArchiveVerificationExceptionRegisterReport["summary"]["status"]): BoardReleaseArchiveVerificationFinalAcceptancePacketStatus {
  return status === "cleared" ? "accepted" : "blocked";
}

function fromDistributionStatus(status: BoardReleaseArchiveVerificationDistributionProofBundleReport["summary"]["status"]): BoardReleaseArchiveVerificationFinalAcceptancePacketStatus {
  return status === "ready" ? "accepted" : status === "watch" ? "watch" : "blocked";
}

function fromTimelineStatus(status: BoardReleaseArchiveVerificationReadinessTimelineReport["summary"]["status"]): BoardReleaseArchiveVerificationFinalAcceptancePacketStatus {
  return status === "ready" ? "accepted" : status === "watch" ? "watch" : "blocked";
}

function row(input: Omit<BoardReleaseArchiveVerificationFinalAcceptancePacketRow, "acceptanceHash" | "id"> & { workspaceId: string }) {
  const acceptanceHash = sha256({
    detail: input.detail,
    evidenceHash: input.evidenceHash,
    kind: input.kind,
    score: input.score,
    status: input.status,
  });

  return {
    acceptanceHash,
    detail: input.detail,
    evidenceHash: input.evidenceHash,
    id: `archive-verification-final-acceptance:${slug(input.workspaceId)}:${input.kind}`,
    kind: input.kind,
    nextAction: input.nextAction,
    score: input.score,
    status: input.status,
    title: input.title,
  } satisfies BoardReleaseArchiveVerificationFinalAcceptancePacketRow;
}

function recommendationFor(input: {
  blockedCount: number;
  finalAcceptanceScore: number;
  watchCount: number;
}) {
  if (input.blockedCount > 0) {
    return "BLOCK archive verification acceptance until blocked signature-chain, exception, distribution, or readiness evidence is resolved.";
  }

  if (input.watchCount > 0 || input.finalAcceptanceScore < 90) {
    return "WATCH archive verification acceptance and require board secretary confirmation before release archive closeout.";
  }

  return "APPROVE archive verification acceptance for board release archive closeout.";
}

function recommendationNextAction(status: BoardReleaseArchiveVerificationFinalAcceptancePacketStatus) {
  if (status === "blocked") {
    return "Resolve blocked acceptance evidence and regenerate the archive verification final acceptance packet.";
  }

  if (status === "watch") {
    return "Collect board secretary confirmation for watched acceptance evidence before closeout.";
  }

  return "Attach final acceptance packet to the release archive closeout record.";
}

function createRows(input: CreateBoardReleaseArchiveVerificationFinalAcceptancePacketInput & { workspaceId: string }) {
  const signature = input.signatureChainValidator.summary;
  const exception = input.exceptionRegister.summary;
  const distribution = input.distributionProofBundle.summary;
  const timeline = input.readinessTimeline.summary;
  const evidenceRows = [
    row({
      detail: `${signature.validCount}/${signature.rowCount} signature-chain links valid, ${signature.missingCount} missing, ${signature.mismatchCount} mismatch.`,
      evidenceHash: signature.chainHash,
      kind: "signature-chain",
      nextAction: signature.nextAction,
      score: signature.chainScore,
      status: fromSignatureStatus(signature.status),
      title: "Validator output",
      workspaceId: input.workspaceId,
    }),
    row({
      detail: `${exception.openCount} open exceptions, ${exception.approvedCount} approved, ${exception.missingApprovalCount} missing board approvals.`,
      evidenceHash: exception.registerHash,
      kind: "exception-register",
      nextAction: exception.nextAction,
      score: exception.registerScore,
      status: fromExceptionStatus(exception.status),
      title: "Exception register",
      workspaceId: input.workspaceId,
    }),
    row({
      detail: `${distribution.acknowledgedCount}/${distribution.rowCount} recipients acknowledged, ${distribution.expiredCount} expired links, ${distribution.pendingCount} pending.`,
      evidenceHash: distribution.bundleHash,
      kind: "distribution-proof",
      nextAction: distribution.nextAction,
      score: distribution.proofScore,
      status: fromDistributionStatus(distribution.status),
      title: "Distribution proof",
      workspaceId: input.workspaceId,
    }),
    row({
      detail: `${timeline.readyCount}/${timeline.rowCount} timeline events ready, ${timeline.blockedCount} blocked, ${timeline.watchCount} watch.`,
      evidenceHash: timeline.timelineHash,
      kind: "readiness-timeline",
      nextAction: timeline.nextAction,
      score: timeline.timelineScore,
      status: fromTimelineStatus(timeline.status),
      title: "Readiness timeline",
      workspaceId: input.workspaceId,
    }),
  ];
  const acceptedCount = evidenceRows.filter((entry) => entry.status === "accepted").length;
  const blockedCount = evidenceRows.filter((entry) => entry.status === "blocked").length;
  const watchCount = evidenceRows.filter((entry) => entry.status === "watch").length;
  const averageScore = evidenceRows.length > 0 ? evidenceRows.reduce((total, entry) => total + entry.score, 0) / evidenceRows.length : 100;
  const finalAcceptanceScore = Math.max(0, Math.round(averageScore - blockedCount * 18 - watchCount * 8));
  const executiveRecommendation = recommendationFor({
    blockedCount,
    finalAcceptanceScore,
    watchCount,
  });
  const status: BoardReleaseArchiveVerificationFinalAcceptancePacketStatus = blockedCount > 0 ? "blocked" : watchCount > 0 || finalAcceptanceScore < 90 ? "watch" : "accepted";

  return [
    ...evidenceRows,
    row({
      detail: executiveRecommendation,
      evidenceHash: sha256(evidenceRows.map((entry) => entry.acceptanceHash)),
      kind: "executive-recommendation",
      nextAction: recommendationNextAction(status),
      score: finalAcceptanceScore,
      status,
      title: "Executive recommendation",
      workspaceId: input.workspaceId,
    }),
  ];
}

function createCsv(rows: BoardReleaseArchiveVerificationFinalAcceptancePacketRow[]) {
  const header = ["acceptance_id", "kind", "title", "status", "score", "evidence_hash", "acceptance_hash", "detail", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.kind, entry.title, entry.status, entry.score, entry.evidenceHash, entry.acceptanceHash, entry.detail, entry.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveVerificationFinalAcceptancePacketRow[]): BoardReleaseArchiveVerificationFinalAcceptancePacketReport["summary"] {
  const acceptedCount = rows.filter((entry) => entry.status === "accepted").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const status = rows.reduce<BoardReleaseArchiveVerificationFinalAcceptancePacketStatus>((worst, entry) => (statusRank[entry.status] < statusRank[worst] ? entry.status : worst), "accepted");
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "watch") ?? rows.find((entry) => entry.kind === "executive-recommendation") ?? null;
  const averageScore = rows.length > 0 ? rows.reduce((total, entry) => total + entry.score, 0) / rows.length : 100;

  return {
    acceptedCount,
    blockedCount,
    finalAcceptanceHash: sha256(rows.map((entry) => entry.acceptanceHash)),
    finalAcceptanceScore: Math.max(0, Math.round(averageScore - blockedCount * 16 - watchCount * 8)),
    nextAction: status === "accepted" ? "Archive verification final acceptance packet is ready for board closeout." : (nextRow?.nextAction ?? "Review archive verification final acceptance packet."),
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function createJson(input: {
  executiveRecommendation: string;
  generatedAt: string;
  rows: BoardReleaseArchiveVerificationFinalAcceptancePacketRow[];
  summary: BoardReleaseArchiveVerificationFinalAcceptancePacketReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveVerificationFinalAcceptancePacket(
  input: CreateBoardReleaseArchiveVerificationFinalAcceptancePacketInput,
): BoardReleaseArchiveVerificationFinalAcceptancePacketReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.readinessTimeline.workspaceId;
  const rows = createRows({
    ...input,
    workspaceId,
  });
  const summary = summarize(rows);
  const executiveRecommendation = rows.find((entry) => entry.kind === "executive-recommendation")?.detail ?? summary.nextAction;
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    executiveRecommendation,
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-verification-final-acceptance-packet-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    executiveRecommendation,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    rows,
    summary,
    workspaceId,
  };
}
