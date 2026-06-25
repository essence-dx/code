import { createHash } from "node:crypto";
import type { BoardReleaseArchiveCertificationExecutiveAttestationDigestReport } from "@/features/projects/board-release-archive-certification-executive-attestation-digest";
import type { BoardReleaseArchiveCertificationExternalAuditorPacketReport } from "@/features/projects/board-release-archive-certification-external-auditor-packet";
import type { BoardReleaseArchiveCertificationHistoryLedgerReport } from "@/features/projects/board-release-archive-certification-history-ledger";
import type { BoardReleaseArchiveCertificationRevocationWorkflowReport } from "@/features/projects/board-release-archive-certification-revocation-workflow";

export type BoardReleaseArchiveVerificationSignatureChainKind = "attestation-root" | "auditor-packet" | "certificate-history" | "revocation-state";
export type BoardReleaseArchiveVerificationSignatureChainStatus = "missing" | "mismatch" | "valid";

export interface BoardReleaseArchiveVerificationSignatureChainRow {
  actualHash: string | null;
  expectedHash: string;
  id: string;
  kind: BoardReleaseArchiveVerificationSignatureChainKind;
  linkHash: string;
  nextAction: string;
  source: string;
  status: BoardReleaseArchiveVerificationSignatureChainStatus;
  title: string;
}

export interface BoardReleaseArchiveVerificationSignatureChainValidatorReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveVerificationSignatureChainRow[];
  summary: {
    chainHash: string;
    chainScore: number;
    missingCount: number;
    mismatchCount: number;
    nextAction: string;
    rowCount: number;
    status: BoardReleaseArchiveVerificationSignatureChainStatus;
    validCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveVerificationSignatureChainValidatorInput {
  auditorPacket: BoardReleaseArchiveCertificationExternalAuditorPacketReport;
  attestationDigest: BoardReleaseArchiveCertificationExecutiveAttestationDigestReport;
  generatedAt?: string;
  historyLedger: BoardReleaseArchiveCertificationHistoryLedgerReport;
  revocationWorkflow: BoardReleaseArchiveCertificationRevocationWorkflowReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveVerificationSignatureChainKind, number> = {
  "attestation-root": 0,
  "certificate-history": 1,
  "auditor-packet": 2,
  "revocation-state": 3,
};

const statusRank: Record<BoardReleaseArchiveVerificationSignatureChainStatus, number> = {
  missing: 0,
  mismatch: 1,
  valid: 2,
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

function statusFor(actualHash: string | null, expectedHash: string): BoardReleaseArchiveVerificationSignatureChainStatus {
  if (!actualHash) {
    return "missing";
  }

  return actualHash === expectedHash ? "valid" : "mismatch";
}

function nextActionFor(input: {
  actualHash: string | null;
  expectedHash: string;
  source: string;
  status: BoardReleaseArchiveVerificationSignatureChainStatus;
}) {
  if (input.status === "missing") {
    return `Attach ${input.source} hash evidence before archive verification can close.`;
  }

  if (input.status === "mismatch") {
    return `Reconcile ${input.source} hash drift between ${input.expectedHash} and ${input.actualHash}.`;
  }

  return `Keep ${input.source} linked in the archive verification signature chain.`;
}

function row(input: {
  actualHash: string | null;
  expectedHash: string;
  kind: BoardReleaseArchiveVerificationSignatureChainKind;
  source: string;
  title: string;
}) {
  const status = statusFor(input.actualHash, input.expectedHash);
  const nextAction = nextActionFor({
    actualHash: input.actualHash,
    expectedHash: input.expectedHash,
    source: input.source,
    status,
  });
  const linkHash = sha256({
    actualHash: input.actualHash,
    expectedHash: input.expectedHash,
    kind: input.kind,
    source: input.source,
    status,
  });

  return {
    actualHash: input.actualHash,
    expectedHash: input.expectedHash,
    id: `archive-verification-signature-chain:${input.kind}`,
    kind: input.kind,
    linkHash,
    nextAction,
    source: input.source,
    status,
    title: input.title,
  } satisfies BoardReleaseArchiveVerificationSignatureChainRow;
}

function findAttestationEvidenceHash(
  input: CreateBoardReleaseArchiveVerificationSignatureChainValidatorInput,
  kind: "auditor-packet" | "certificate-history" | "revocation-state",
) {
  return input.attestationDigest.rows.find((entry) => entry.kind === kind)?.evidenceHash ?? null;
}

function createRows(input: CreateBoardReleaseArchiveVerificationSignatureChainValidatorInput) {
  const attestationRoot = sha256(input.attestationDigest.rows.map((entry) => entry.attestationHash));

  return [
    row({
      actualHash: attestationRoot,
      expectedHash: input.attestationDigest.summary.attestationHash,
      kind: "attestation-root",
      source: "executive attestation digest",
      title: "Attestation digest root",
    }),
    row({
      actualHash: findAttestationEvidenceHash(input, "certificate-history"),
      expectedHash: input.historyLedger.summary.ledgerHash,
      kind: "certificate-history",
      source: "certificate history ledger",
      title: "Certificate history link",
    }),
    row({
      actualHash: findAttestationEvidenceHash(input, "auditor-packet"),
      expectedHash: input.auditorPacket.summary.externalPacketHash,
      kind: "auditor-packet",
      source: "external auditor packet",
      title: "Auditor packet link",
    }),
    row({
      actualHash: findAttestationEvidenceHash(input, "revocation-state"),
      expectedHash: input.revocationWorkflow.summary.revocationHash,
      kind: "revocation-state",
      source: "revocation workflow",
      title: "Revocation state link",
    }),
  ].sort((first, second) => statusRank[first.status] - statusRank[second.status] || kindRank[first.kind] - kindRank[second.kind]);
}

function createCsv(rows: BoardReleaseArchiveVerificationSignatureChainRow[]) {
  const header = ["chain_id", "kind", "title", "status", "source", "expected_hash", "actual_hash", "link_hash", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.kind, entry.title, entry.status, entry.source, entry.expectedHash, entry.actualHash, entry.linkHash, entry.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveVerificationSignatureChainRow[]): BoardReleaseArchiveVerificationSignatureChainValidatorReport["summary"] {
  const missingCount = rows.filter((entry) => entry.status === "missing").length;
  const mismatchCount = rows.filter((entry) => entry.status === "mismatch").length;
  const validCount = rows.filter((entry) => entry.status === "valid").length;
  const status = rows.reduce<BoardReleaseArchiveVerificationSignatureChainStatus>((worst, entry) => (statusRank[entry.status] < statusRank[worst] ? entry.status : worst), "valid");
  const nextRow = rows.find((entry) => entry.status !== "valid") ?? rows[0] ?? null;

  return {
    chainHash: sha256(rows.map((entry) => entry.linkHash)),
    chainScore: rows.length > 0 ? Math.max(0, Math.round((validCount / rows.length) * 100 - missingCount * 25 - mismatchCount * 15)) : 100,
    missingCount,
    mismatchCount,
    nextAction: status === "valid" ? "Archive verification signature chain is valid." : (nextRow?.nextAction ?? "Review archive verification signature chain."),
    rowCount: rows.length,
    status,
    validCount,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveVerificationSignatureChainRow[];
  summary: BoardReleaseArchiveVerificationSignatureChainValidatorReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveVerificationSignatureChainValidator(
  input: CreateBoardReleaseArchiveVerificationSignatureChainValidatorInput,
): BoardReleaseArchiveVerificationSignatureChainValidatorReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.attestationDigest.workspaceId;
  const rows = createRows(input);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-verification-signature-chain-validator-${dateStamp(generatedAt)}`;

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
