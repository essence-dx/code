import { createHash } from "node:crypto";
import type { BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport } from "@/features/projects/board-release-archive-assurance-final-closeout-certificate";

export type BoardReleaseArchiveCertificationHistoryLedgerState = "active" | "revocation-hold" | "superseded";
export type BoardReleaseArchiveCertificationHistoryLedgerStatus = "blocked" | "current" | "historical";

export interface BoardReleaseArchiveCertificationHistoryEntry {
  certificateHash: string;
  id: string;
  issuedAt: string;
  issuer: string;
  issuerNote: string;
  nextAction: string;
  parentCertificateHash: string | null;
  revocationReason: string | null;
  revocationState: BoardReleaseArchiveCertificationHistoryLedgerState;
  sourceStatus: string;
  status: BoardReleaseArchiveCertificationHistoryLedgerStatus;
  version: string;
}

export interface BoardReleaseArchiveCertificationHistoryLedgerReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveCertificationHistoryEntry[];
  summary: {
    activeCount: number;
    blockedCount: number;
    currentVersion: string;
    ledgerHash: string;
    ledgerScore: number;
    nextAction: string;
    revocationHoldCount: number;
    rowCount: number;
    status: BoardReleaseArchiveCertificationHistoryLedgerStatus;
    supersededCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveCertificationHistoryLedgerInput {
  finalCloseoutCertificate: BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport;
  generatedAt?: string;
  issuer?: string;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseArchiveCertificationHistoryLedgerStatus, number> = {
  blocked: 0,
  historical: 1,
  current: 2,
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

function addHours(value: string, hours: number) {
  const date = new Date(value);
  const base = Number.isNaN(date.getTime()) ? Date.now() : date.getTime();

  return new Date(base + hours * 60 * 60 * 1000).toISOString();
}

function nextActionFor(input: {
  revocationState: BoardReleaseArchiveCertificationHistoryLedgerState;
  status: BoardReleaseArchiveCertificationHistoryLedgerStatus;
  version: string;
}) {
  if (input.revocationState === "revocation-hold") {
    return `Resolve blocked certificate evidence before activating ${input.version}.`;
  }

  if (input.status === "current") {
    return `Keep ${input.version} active until replay verification or revocation workflow supersedes it.`;
  }

  return `Retain ${input.version} as immutable certificate history evidence.`;
}

function entry(input: {
  certificateHash: string;
  generatedAt: string;
  issuedAt: string;
  issuer: string;
  issuerNote: string;
  parentCertificateHash: string | null;
  revocationReason: string | null;
  revocationState: BoardReleaseArchiveCertificationHistoryLedgerState;
  sourceStatus: string;
  status: BoardReleaseArchiveCertificationHistoryLedgerStatus;
  version: string;
  workspaceId: string;
}) {
  return {
    certificateHash: input.certificateHash,
    id: `archive-certification-history:${slug(input.workspaceId)}:${slug(input.version)}:${dateStamp(input.generatedAt)}`,
    issuedAt: input.issuedAt,
    issuer: input.issuer,
    issuerNote: input.issuerNote,
    nextAction: nextActionFor({
      revocationState: input.revocationState,
      status: input.status,
      version: input.version,
    }),
    parentCertificateHash: input.parentCertificateHash,
    revocationReason: input.revocationReason,
    revocationState: input.revocationState,
    sourceStatus: input.sourceStatus,
    status: input.status,
    version: input.version,
  } satisfies BoardReleaseArchiveCertificationHistoryEntry;
}

function createRows(input: CreateBoardReleaseArchiveCertificationHistoryLedgerInput & { generatedAt: string; issuer: string; workspaceId: string }) {
  const certificate = input.finalCloseoutCertificate;
  const evidenceFreezeHash = sha256({
    evidence: certificate.evidence.map((row) => [row.kind, row.evidenceHash]),
    stage: "evidence-freeze",
  });
  const draftHash = sha256({
    certificateHash: certificate.summary.certificateHash,
    recommendation: certificate.summary.recommendation,
    stage: "closeout-review",
  });
  const currentState: BoardReleaseArchiveCertificationHistoryLedgerState = certificate.summary.status === "blocked" ? "revocation-hold" : "active";
  const currentStatus: BoardReleaseArchiveCertificationHistoryLedgerStatus = certificate.summary.status === "blocked" ? "blocked" : "current";

  return [
    entry({
      certificateHash: evidenceFreezeHash,
      generatedAt: input.generatedAt,
      issuedAt: addHours(input.generatedAt, -48),
      issuer: input.issuer,
      issuerNote: "Evidence freeze captured source hashes before final archive closeout certificate issue.",
      parentCertificateHash: null,
      revocationReason: null,
      revocationState: "superseded",
      sourceStatus: "evidence-freeze",
      status: "historical",
      version: "v1-evidence-freeze",
      workspaceId: input.workspaceId,
    }),
    entry({
      certificateHash: draftHash,
      generatedAt: input.generatedAt,
      issuedAt: addHours(input.generatedAt, -24),
      issuer: input.issuer,
      issuerNote: "Closeout review draft captured certificate recommendation and source evidence counts.",
      parentCertificateHash: evidenceFreezeHash,
      revocationReason: null,
      revocationState: "superseded",
      sourceStatus: "closeout-review",
      status: "historical",
      version: "v2-closeout-review",
      workspaceId: input.workspaceId,
    }),
    entry({
      certificateHash: certificate.summary.certificateHash,
      generatedAt: input.generatedAt,
      issuedAt: certificate.generatedAt,
      issuer: input.issuer,
      issuerNote: certificate.summary.recommendation,
      parentCertificateHash: draftHash,
      revocationReason: currentState === "revocation-hold" ? certificate.summary.nextAction : null,
      revocationState: currentState,
      sourceStatus: certificate.summary.status,
      status: currentStatus,
      version: "v3-final-closeout",
      workspaceId: input.workspaceId,
    }),
  ].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      first.issuedAt.localeCompare(second.issuedAt) ||
      first.version.localeCompare(second.version),
  );
}

function createCsv(rows: BoardReleaseArchiveCertificationHistoryEntry[]) {
  const header = [
    "history_id",
    "version",
    "status",
    "revocation_state",
    "issuer",
    "issued_at",
    "source_status",
    "certificate_hash",
    "parent_certificate_hash",
    "revocation_reason",
    "issuer_note",
    "next_action",
  ];
  const body = rows.map((row) =>
    [
      row.id,
      row.version,
      row.status,
      row.revocationState,
      row.issuer,
      row.issuedAt,
      row.sourceStatus,
      row.certificateHash,
      row.parentCertificateHash,
      row.revocationReason,
      row.issuerNote,
      row.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveCertificationHistoryEntry[]): BoardReleaseArchiveCertificationHistoryLedgerReport["summary"] {
  const activeCount = rows.filter((row) => row.revocationState === "active").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const revocationHoldCount = rows.filter((row) => row.revocationState === "revocation-hold").length;
  const supersededCount = rows.filter((row) => row.revocationState === "superseded").length;
  const current = rows.find((row) => row.status === "current" || row.status === "blocked") ?? rows[0] ?? null;
  const status: BoardReleaseArchiveCertificationHistoryLedgerStatus = blockedCount > 0 ? "blocked" : activeCount > 0 ? "current" : "historical";

  return {
    activeCount,
    blockedCount,
    currentVersion: current?.version ?? "none",
    ledgerHash: sha256(rows.map((row) => [row.version, row.certificateHash, row.revocationState])),
    ledgerScore: Math.max(0, Math.round((activeCount > 0 ? 100 : 72) - blockedCount * 28 - revocationHoldCount * 18)),
    nextAction: current?.nextAction ?? "Create archive certification history ledger.",
    revocationHoldCount,
    rowCount: rows.length,
    status,
    supersededCount,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveCertificationHistoryEntry[];
  summary: BoardReleaseArchiveCertificationHistoryLedgerReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveCertificationHistoryLedger(
  input: CreateBoardReleaseArchiveCertificationHistoryLedgerInput,
): BoardReleaseArchiveCertificationHistoryLedgerReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.finalCloseoutCertificate.workspaceId;
  const issuer = input.issuer ?? "Archive certification service";
  const rows = createRows({
    ...input,
    generatedAt,
    issuer,
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-certification-history-ledger-${dateStamp(generatedAt)}`;

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
