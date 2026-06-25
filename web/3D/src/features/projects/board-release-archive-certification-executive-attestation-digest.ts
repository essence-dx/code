import { createHash } from "node:crypto";
import type { BoardReleaseArchiveCertificationExternalAuditorPacketReport } from "@/features/projects/board-release-archive-certification-external-auditor-packet";
import type { BoardReleaseArchiveCertificationEvidenceReplayVerifierReport } from "@/features/projects/board-release-archive-certification-evidence-replay-verifier";
import type { BoardReleaseArchiveCertificationHistoryLedgerReport } from "@/features/projects/board-release-archive-certification-history-ledger";
import type { BoardReleaseArchiveCertificationRevocationWorkflowReport } from "@/features/projects/board-release-archive-certification-revocation-workflow";

export type BoardReleaseArchiveCertificationExecutiveAttestationKind = "auditor-packet" | "certificate-history" | "replay-verification" | "revocation-state";
export type BoardReleaseArchiveCertificationExecutiveAttestationStatus = "attested" | "blocked" | "watch";

export interface BoardReleaseArchiveCertificationExecutiveAttestationRow {
  attestationHash: string;
  detail: string;
  evidenceHash: string;
  id: string;
  kind: BoardReleaseArchiveCertificationExecutiveAttestationKind;
  metric: string;
  nextAction: string;
  score: number;
  status: BoardReleaseArchiveCertificationExecutiveAttestationStatus;
  title: string;
}

export interface BoardReleaseArchiveCertificationExecutiveAttestationDigestReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  executiveMemo: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveCertificationExecutiveAttestationRow[];
  summary: {
    attestationHash: string;
    attestationScore: number;
    attestedCount: number;
    blockedCount: number;
    nextAction: string;
    rowCount: number;
    status: BoardReleaseArchiveCertificationExecutiveAttestationStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveCertificationExecutiveAttestationDigestInput {
  auditorPacket: BoardReleaseArchiveCertificationExternalAuditorPacketReport;
  generatedAt?: string;
  historyLedger: BoardReleaseArchiveCertificationHistoryLedgerReport;
  replayVerifier: BoardReleaseArchiveCertificationEvidenceReplayVerifierReport;
  revocationWorkflow: BoardReleaseArchiveCertificationRevocationWorkflowReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveCertificationExecutiveAttestationKind, number> = {
  "certificate-history": 0,
  "replay-verification": 1,
  "auditor-packet": 2,
  "revocation-state": 3,
};

const statusRank: Record<BoardReleaseArchiveCertificationExecutiveAttestationStatus, number> = {
  blocked: 0,
  watch: 1,
  attested: 2,
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

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function row(input: Omit<BoardReleaseArchiveCertificationExecutiveAttestationRow, "attestationHash">) {
  return {
    ...input,
    attestationHash: sha256(input),
  } satisfies BoardReleaseArchiveCertificationExecutiveAttestationRow;
}

function statusFromHistory(status: BoardReleaseArchiveCertificationHistoryLedgerReport["summary"]["status"]): BoardReleaseArchiveCertificationExecutiveAttestationStatus {
  return status === "blocked" ? "blocked" : status === "historical" ? "watch" : "attested";
}

function statusFromReplay(status: BoardReleaseArchiveCertificationEvidenceReplayVerifierReport["summary"]["status"]): BoardReleaseArchiveCertificationExecutiveAttestationStatus {
  return status === "missing" ? "blocked" : status === "drift" ? "watch" : "attested";
}

function statusFromAuditor(status: BoardReleaseArchiveCertificationExternalAuditorPacketReport["summary"]["status"]): BoardReleaseArchiveCertificationExecutiveAttestationStatus {
  return status === "blocked" ? "blocked" : status === "watch" ? "watch" : "attested";
}

function statusFromRevocation(status: BoardReleaseArchiveCertificationRevocationWorkflowReport["summary"]["status"]): BoardReleaseArchiveCertificationExecutiveAttestationStatus {
  return status === "open" ? "blocked" : status === "queued" ? "watch" : "attested";
}

function createRows(input: CreateBoardReleaseArchiveCertificationExecutiveAttestationDigestInput) {
  const history = input.historyLedger.summary;
  const replay = input.replayVerifier.summary;
  const auditor = input.auditorPacket.summary;
  const revocation = input.revocationWorkflow.summary;

  return [
    row({
      detail: `${history.rowCount} certificate versions, ${history.revocationHoldCount} revocation holds, ${history.supersededCount} superseded records.`,
      evidenceHash: history.ledgerHash,
      id: "archive-certification-attestation:certificate-history",
      kind: "certificate-history",
      metric: `${history.ledgerScore}/100 ledger`,
      nextAction: history.nextAction,
      score: history.ledgerScore,
      status: statusFromHistory(history.status),
      title: "Certificate history ledger",
    }),
    row({
      detail: `${replay.matchedCount}/${replay.rowCount} replay checks matched with ${replay.driftCount} drift and ${replay.missingCount} missing sources.`,
      evidenceHash: replay.replayHash,
      id: "archive-certification-attestation:replay-verification",
      kind: "replay-verification",
      metric: `${replay.replayScore}/100 replay`,
      nextAction: replay.nextAction,
      score: replay.replayScore,
      status: statusFromReplay(replay.status),
      title: "Evidence replay verification",
    }),
    row({
      detail: `${auditor.readyCount}/${auditor.packetCount} auditor packets ready with ${auditor.blockedCount} blocked and ${auditor.redactionCount} redactions.`,
      evidenceHash: auditor.externalPacketHash,
      id: "archive-certification-attestation:auditor-packet",
      kind: "auditor-packet",
      metric: `${auditor.packetScore}/100 auditor`,
      nextAction: auditor.nextAction,
      score: auditor.packetScore,
      status: statusFromAuditor(auditor.status),
      title: "External auditor packet",
    }),
    row({
      detail: `${revocation.resolvedCount}/${revocation.rowCount} revocation rows resolved with ${revocation.openCount} open and ${revocation.queuedCount} queued.`,
      evidenceHash: revocation.revocationHash,
      id: "archive-certification-attestation:revocation-state",
      kind: "revocation-state",
      metric: `${revocation.revocationScore}/100 revocation`,
      nextAction: revocation.nextAction,
      score: revocation.revocationScore,
      status: statusFromRevocation(revocation.status),
      title: "Revocation workflow state",
    }),
  ].sort((first, second) => statusRank[first.status] - statusRank[second.status] || kindRank[first.kind] - kindRank[second.kind]);
}

function createCsv(rows: BoardReleaseArchiveCertificationExecutiveAttestationRow[]) {
  const header = ["attestation_id", "kind", "title", "status", "score", "metric", "evidence_hash", "attestation_hash", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.kind, entry.title, entry.status, entry.score, entry.metric, entry.evidenceHash, entry.attestationHash, entry.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveCertificationExecutiveAttestationRow[]): BoardReleaseArchiveCertificationExecutiveAttestationDigestReport["summary"] {
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const attestedCount = rows.filter((entry) => entry.status === "attested").length;
  const status = rows.reduce<BoardReleaseArchiveCertificationExecutiveAttestationStatus>(
    (worst, entry) => (statusRank[entry.status] < statusRank[worst] ? entry.status : worst),
    "attested",
  );
  const nextRow = rows.find((entry) => entry.status !== "attested") ?? rows[0] ?? null;
  const averageScore = rows.length > 0 ? rows.reduce((total, entry) => total + entry.score, 0) / rows.length : 100;

  return {
    attestationHash: sha256(rows.map((entry) => entry.attestationHash)),
    attestationScore: clamp(averageScore - blockedCount * 18 - watchCount * 8),
    attestedCount,
    blockedCount,
    nextAction: status === "attested" ? "Executive archive certification attestation is ready to sign." : (nextRow?.nextAction ?? "Review executive attestation evidence."),
    rowCount: rows.length,
    status,
    watchCount,
  };
}

function executiveMemo(input: {
  summary: BoardReleaseArchiveCertificationExecutiveAttestationDigestReport["summary"];
  workspaceId: string;
}) {
  return `${input.summary.status.toUpperCase()} archive certification executive attestation for ${input.workspaceId}: ${input.summary.attestationScore}/100 score, ${input.summary.attestedCount}/${input.summary.rowCount} sections attested, ${input.summary.blockedCount} blocked, ${input.summary.watchCount} watch. ${input.summary.nextAction}`;
}

function createJson(input: {
  executiveMemo: string;
  generatedAt: string;
  rows: BoardReleaseArchiveCertificationExecutiveAttestationRow[];
  summary: BoardReleaseArchiveCertificationExecutiveAttestationDigestReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveCertificationExecutiveAttestationDigest(
  input: CreateBoardReleaseArchiveCertificationExecutiveAttestationDigestInput,
): BoardReleaseArchiveCertificationExecutiveAttestationDigestReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.historyLedger.workspaceId;
  const rows = createRows(input);
  const summary = summarize(rows);
  const memo = executiveMemo({
    summary,
    workspaceId,
  });
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    executiveMemo: memo,
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-certification-executive-attestation-digest-${dateStamp(generatedAt)}`;

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
