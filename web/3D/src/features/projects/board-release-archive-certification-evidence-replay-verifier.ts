import { createHash } from "node:crypto";
import type {
  BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport,
  BoardReleaseArchiveAssuranceFinalCloseoutKind,
} from "@/features/projects/board-release-archive-assurance-final-closeout-certificate";
import type { BoardReleaseArchiveAssuranceDistributionMatrixReport } from "@/features/projects/board-release-archive-assurance-distribution-matrix";
import type { BoardReleaseArchiveAssuranceNotarizationRegisterReport } from "@/features/projects/board-release-archive-assurance-notarization-register";
import type { BoardReleaseArchiveAssurancePostReleaseAuditChecklistReport } from "@/features/projects/board-release-archive-assurance-post-release-audit-checklist";
import type { BoardReleaseArchiveCertificationHistoryLedgerReport } from "@/features/projects/board-release-archive-certification-history-ledger";
import type { BoardReleaseArchiveEvidenceReleaseHandoffDigestReport } from "@/features/projects/board-release-archive-evidence-release-handoff-digest";

export type BoardReleaseArchiveCertificationReplayKind = BoardReleaseArchiveAssuranceFinalCloseoutKind | "history-ledger";
export type BoardReleaseArchiveCertificationReplayStatus = "drift" | "matched" | "missing";

export interface BoardReleaseArchiveCertificationReplayRow {
  actualHash: string | null;
  expectedHash: string;
  id: string;
  kind: BoardReleaseArchiveCertificationReplayKind;
  nextAction: string;
  recordCount: number;
  replayHash: string;
  sourceStatus: string;
  status: BoardReleaseArchiveCertificationReplayStatus;
  title: string;
}

export interface BoardReleaseArchiveCertificationEvidenceReplayVerifierReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveCertificationReplayRow[];
  summary: {
    driftCount: number;
    matchedCount: number;
    missingCount: number;
    nextAction: string;
    replayHash: string;
    replayScore: number;
    rowCount: number;
    status: BoardReleaseArchiveCertificationReplayStatus;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveCertificationEvidenceReplayVerifierInput {
  distributionMatrix: BoardReleaseArchiveAssuranceDistributionMatrixReport;
  finalCloseoutCertificate: BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport;
  generatedAt?: string;
  handoffDigest: BoardReleaseArchiveEvidenceReleaseHandoffDigestReport;
  historyLedger: BoardReleaseArchiveCertificationHistoryLedgerReport;
  notarizationRegister: BoardReleaseArchiveAssuranceNotarizationRegisterReport;
  postReleaseAuditChecklist: BoardReleaseArchiveAssurancePostReleaseAuditChecklistReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveCertificationReplayKind, number> = {
  "handoff-digest": 0,
  notarization: 1,
  distribution: 2,
  "post-release-audit": 3,
  "history-ledger": 4,
};

const statusRank: Record<BoardReleaseArchiveCertificationReplayStatus, number> = {
  missing: 0,
  drift: 1,
  matched: 2,
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

function nextActionFor(input: {
  kind: BoardReleaseArchiveCertificationReplayKind;
  status: BoardReleaseArchiveCertificationReplayStatus;
}) {
  if (input.status === "missing") {
    return `Attach missing ${input.kind} evidence before archive certification attestation.`;
  }

  if (input.status === "drift") {
    return `Review ${input.kind} replay drift and decide whether to supersede or revoke the certificate.`;
  }

  return `Keep ${input.kind} replay evidence matched with the certificate source hash.`;
}

function sourceHash(input: {
  finalCloseoutCertificate: BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport;
  kind: BoardReleaseArchiveAssuranceFinalCloseoutKind;
}) {
  return input.finalCloseoutCertificate.evidence.find((row) => row.kind === input.kind)?.evidenceHash ?? null;
}

function replayRow(input: {
  actualHash: string | null;
  expectedHash: string;
  generatedAt: string;
  kind: BoardReleaseArchiveCertificationReplayKind;
  recordCount: number;
  sourceStatus: string;
  title: string;
  workspaceId: string;
}) {
  const status: BoardReleaseArchiveCertificationReplayStatus = input.actualHash ? (input.actualHash === input.expectedHash ? "matched" : "drift") : "missing";

  return {
    actualHash: input.actualHash,
    expectedHash: input.expectedHash,
    id: `archive-certification-replay:${slug(input.workspaceId)}:${input.kind}:${dateStamp(input.generatedAt)}`,
    kind: input.kind,
    nextAction: nextActionFor({ kind: input.kind, status }),
    recordCount: input.recordCount,
    replayHash: sha256({
      actualHash: input.actualHash,
      expectedHash: input.expectedHash,
      kind: input.kind,
      status,
    }),
    sourceStatus: input.sourceStatus,
    status,
    title: input.title,
  } satisfies BoardReleaseArchiveCertificationReplayRow;
}

function createRows(input: CreateBoardReleaseArchiveCertificationEvidenceReplayVerifierInput & { generatedAt: string; workspaceId: string }) {
  const currentHistory = input.historyLedger.rows.find((row) => row.version === input.historyLedger.summary.currentVersion) ?? null;

  return [
    replayRow({
      actualHash: sourceHash({
        finalCloseoutCertificate: input.finalCloseoutCertificate,
        kind: "handoff-digest",
      }),
      expectedHash: input.handoffDigest.summary.digestHash,
      generatedAt: input.generatedAt,
      kind: "handoff-digest",
      recordCount: input.handoffDigest.summary.rowCount,
      sourceStatus: input.handoffDigest.summary.status,
      title: "Archive evidence handoff digest replay",
      workspaceId: input.workspaceId,
    }),
    replayRow({
      actualHash: sourceHash({
        finalCloseoutCertificate: input.finalCloseoutCertificate,
        kind: "notarization",
      }),
      expectedHash: input.notarizationRegister.summary.notarizationHash,
      generatedAt: input.generatedAt,
      kind: "notarization",
      recordCount: input.notarizationRegister.summary.rowCount,
      sourceStatus: input.notarizationRegister.summary.status,
      title: "Archive notarization register replay",
      workspaceId: input.workspaceId,
    }),
    replayRow({
      actualHash: sourceHash({
        finalCloseoutCertificate: input.finalCloseoutCertificate,
        kind: "distribution",
      }),
      expectedHash: input.distributionMatrix.summary.distributionHash,
      generatedAt: input.generatedAt,
      kind: "distribution",
      recordCount: input.distributionMatrix.summary.recipientCount,
      sourceStatus: input.distributionMatrix.summary.status,
      title: "Archive distribution matrix replay",
      workspaceId: input.workspaceId,
    }),
    replayRow({
      actualHash: sourceHash({
        finalCloseoutCertificate: input.finalCloseoutCertificate,
        kind: "post-release-audit",
      }),
      expectedHash: input.postReleaseAuditChecklist.summary.auditHash,
      generatedAt: input.generatedAt,
      kind: "post-release-audit",
      recordCount: input.postReleaseAuditChecklist.summary.rowCount,
      sourceStatus: input.postReleaseAuditChecklist.summary.status,
      title: "Archive post-release audit replay",
      workspaceId: input.workspaceId,
    }),
    replayRow({
      actualHash: currentHistory?.certificateHash ?? null,
      expectedHash: input.finalCloseoutCertificate.summary.certificateHash,
      generatedAt: input.generatedAt,
      kind: "history-ledger",
      recordCount: input.historyLedger.summary.rowCount,
      sourceStatus: input.historyLedger.summary.status,
      title: "Archive certificate history ledger replay",
      workspaceId: input.workspaceId,
    }),
  ].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      kindRank[first.kind] - kindRank[second.kind] ||
      first.title.localeCompare(second.title),
  );
}

function createCsv(rows: BoardReleaseArchiveCertificationReplayRow[]) {
  const header = ["replay_id", "kind", "title", "status", "source_status", "record_count", "actual_hash", "expected_hash", "replay_hash", "next_action"];
  const body = rows.map((row) =>
    [row.id, row.kind, row.title, row.status, row.sourceStatus, row.recordCount, row.actualHash, row.expectedHash, row.replayHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveCertificationReplayRow[]): BoardReleaseArchiveCertificationEvidenceReplayVerifierReport["summary"] {
  const driftCount = rows.filter((row) => row.status === "drift").length;
  const matchedCount = rows.filter((row) => row.status === "matched").length;
  const missingCount = rows.filter((row) => row.status === "missing").length;
  const status = rows.reduce<BoardReleaseArchiveCertificationReplayStatus>((worst, row) => (statusRank[row.status] < statusRank[worst] ? row.status : worst), "matched");
  const nextRow = rows.find((row) => row.status !== "matched") ?? rows[0] ?? null;

  return {
    driftCount,
    matchedCount,
    missingCount,
    nextAction: status === "matched" ? "Archive certification replay verifier is clean." : (nextRow?.nextAction ?? "Run archive certification replay verifier."),
    replayHash: sha256(rows.map((row) => row.replayHash)),
    replayScore: rows.length > 0 ? Math.max(0, Math.round((matchedCount / rows.length) * 100 - driftCount * 18 - missingCount * 24)) : 100,
    rowCount: rows.length,
    status,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveCertificationReplayRow[];
  summary: BoardReleaseArchiveCertificationEvidenceReplayVerifierReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveCertificationEvidenceReplayVerifier(
  input: CreateBoardReleaseArchiveCertificationEvidenceReplayVerifierInput,
): BoardReleaseArchiveCertificationEvidenceReplayVerifierReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.finalCloseoutCertificate.workspaceId;
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-certification-evidence-replay-verifier-${dateStamp(generatedAt)}`;

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
