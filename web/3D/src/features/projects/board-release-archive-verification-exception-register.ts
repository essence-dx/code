import { createHash } from "node:crypto";
import type {
  BoardReleaseArchiveCertificationExecutiveAttestationDigestReport,
  BoardReleaseArchiveCertificationExecutiveAttestationKind,
} from "@/features/projects/board-release-archive-certification-executive-attestation-digest";
import type {
  BoardReleaseArchiveVerificationSignatureChainKind,
  BoardReleaseArchiveVerificationSignatureChainValidatorReport,
} from "@/features/projects/board-release-archive-verification-signature-chain-validator";

export type BoardReleaseArchiveVerificationExceptionKind = BoardReleaseArchiveCertificationExecutiveAttestationKind | BoardReleaseArchiveVerificationSignatureChainKind;
export type BoardReleaseArchiveVerificationExceptionStatus = "cleared" | "open";
export type BoardReleaseArchiveVerificationExceptionApprovalStatus = "approved" | "expired" | "missing";

export interface BoardReleaseArchiveVerificationExceptionApprovalEvidence {
  approvedAt: string;
  approver: string;
  evidenceHash: string;
  scope: BoardReleaseArchiveVerificationExceptionKind;
}

export interface BoardReleaseArchiveVerificationExceptionRegisterRow {
  approvalEvidenceHash: string | null;
  approvalStatus: BoardReleaseArchiveVerificationExceptionApprovalStatus;
  approver: string | null;
  exceptionHash: string;
  expiresAt: string;
  id: string;
  kind: BoardReleaseArchiveVerificationExceptionKind;
  nextAction: string;
  owner: string;
  sourceHash: string;
  sourceStatus: string;
  status: BoardReleaseArchiveVerificationExceptionStatus;
  title: string;
}

export interface BoardReleaseArchiveVerificationExceptionRegisterReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveVerificationExceptionRegisterRow[];
  summary: {
    approvedCount: number;
    clearedCount: number;
    expiredCount: number;
    missingApprovalCount: number;
    nextAction: string;
    openCount: number;
    registerHash: string;
    registerScore: number;
    rowCount: number;
    status: BoardReleaseArchiveVerificationExceptionStatus;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveVerificationExceptionRegisterInput {
  attestationDigest: BoardReleaseArchiveCertificationExecutiveAttestationDigestReport;
  boardApprovals?: BoardReleaseArchiveVerificationExceptionApprovalEvidence[];
  exceptionWindowDays?: number;
  generatedAt?: string;
  signatureChainValidator: BoardReleaseArchiveVerificationSignatureChainValidatorReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveVerificationExceptionKind, number> = {
  "attestation-root": 0,
  "certificate-history": 1,
  "replay-verification": 2,
  "auditor-packet": 3,
  "revocation-state": 4,
};

const approvalRank: Record<BoardReleaseArchiveVerificationExceptionApprovalStatus, number> = {
  missing: 0,
  expired: 1,
  approved: 2,
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

function addDays(value: string, days: number) {
  const date = new Date(value);
  const base = Number.isNaN(date.getTime()) ? Date.now() : date.getTime();

  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
}

function approvalStatus(approval: BoardReleaseArchiveVerificationExceptionApprovalEvidence | null, generatedAt: string): BoardReleaseArchiveVerificationExceptionApprovalStatus {
  if (!approval) {
    return "missing";
  }

  const approvedAt = new Date(approval.approvedAt).getTime();
  const now = new Date(generatedAt).getTime();
  const ageDays = Number.isNaN(approvedAt) || Number.isNaN(now) ? 0 : (now - approvedAt) / (24 * 60 * 60 * 1000);

  return ageDays > 30 ? "expired" : "approved";
}

function ownerFor(kind: BoardReleaseArchiveVerificationExceptionKind) {
  if (kind === "auditor-packet") {
    return "external audit owner";
  }

  if (kind === "revocation-state") {
    return "archive certification owner";
  }

  if (kind === "certificate-history") {
    return "archive ledger owner";
  }

  return kind === "replay-verification" ? "evidence replay owner" : "board secretary";
}

function nextActionFor(input: {
  approvalStatus: BoardReleaseArchiveVerificationExceptionApprovalStatus;
  status: BoardReleaseArchiveVerificationExceptionStatus;
  title: string;
}) {
  if (input.status === "cleared") {
    return "Keep archive verification exception register clear for final acceptance.";
  }

  if (input.approvalStatus === "approved") {
    return `Track ${input.title} under board-approved exception until the source evidence is reconciled.`;
  }

  if (input.approvalStatus === "expired") {
    return `Renew board approval evidence for ${input.title} before archive verification can advance.`;
  }

  return `Attach board approval evidence for ${input.title} before archive verification can advance.`;
}

function createExceptionRow(input: {
  approval: BoardReleaseArchiveVerificationExceptionApprovalEvidence | null;
  generatedAt: string;
  kind: BoardReleaseArchiveVerificationExceptionKind;
  sourceHash: string;
  sourceStatus: string;
  title: string;
  windowDays: number;
}) {
  const status = "open" satisfies BoardReleaseArchiveVerificationExceptionStatus;
  const approvalState = approvalStatus(input.approval, input.generatedAt);
  const expiresAt = addDays(input.generatedAt, input.windowDays);
  const approvalEvidenceHash = input.approval?.evidenceHash ?? null;
  const exceptionHash = sha256({
    approvalEvidenceHash,
    approvalStatus: approvalState,
    kind: input.kind,
    sourceHash: input.sourceHash,
    sourceStatus: input.sourceStatus,
  });

  return {
    approvalEvidenceHash,
    approvalStatus: approvalState,
    approver: input.approval?.approver ?? null,
    exceptionHash,
    expiresAt,
    id: `archive-verification-exception:${input.kind}:${dateStamp(input.generatedAt)}`,
    kind: input.kind,
    nextAction: nextActionFor({
      approvalStatus: approvalState,
      status,
      title: input.title,
    }),
    owner: ownerFor(input.kind),
    sourceHash: input.sourceHash,
    sourceStatus: input.sourceStatus,
    status,
    title: input.title,
  } satisfies BoardReleaseArchiveVerificationExceptionRegisterRow;
}

function createRows(input: CreateBoardReleaseArchiveVerificationExceptionRegisterInput & { generatedAt: string; windowDays: number }) {
  const rows: BoardReleaseArchiveVerificationExceptionRegisterRow[] = [];

  for (const chainRow of input.signatureChainValidator.rows.filter((entry) => entry.status !== "valid")) {
    const approval = input.boardApprovals?.find((entry) => entry.scope === chainRow.kind) ?? null;

    rows.push(
      createExceptionRow({
        approval,
        generatedAt: input.generatedAt,
        kind: chainRow.kind,
        sourceHash: chainRow.linkHash,
        sourceStatus: chainRow.status,
        title: chainRow.title,
        windowDays: input.windowDays,
      }),
    );
  }

  for (const attestationRow of input.attestationDigest.rows.filter((entry) => entry.status !== "attested")) {
    const alreadyCovered = rows.some((entry) => entry.kind === attestationRow.kind);

    if (!alreadyCovered) {
      const approval = input.boardApprovals?.find((entry) => entry.scope === attestationRow.kind) ?? null;

      rows.push(
        createExceptionRow({
          approval,
          generatedAt: input.generatedAt,
          kind: attestationRow.kind,
          sourceHash: attestationRow.attestationHash,
          sourceStatus: attestationRow.status,
          title: attestationRow.title,
          windowDays: input.windowDays,
        }),
      );
    }
  }

  if (rows.length === 0) {
    const exceptionHash = sha256({
      sourceHash: input.attestationDigest.summary.attestationHash,
      status: "cleared",
    });

    rows.push({
      approvalEvidenceHash: null,
      approvalStatus: "missing",
      approver: null,
      exceptionHash,
      expiresAt: addDays(input.generatedAt, input.windowDays),
      id: `archive-verification-exception:baseline:${dateStamp(input.generatedAt)}`,
      kind: "attestation-root",
      nextAction: nextActionFor({
        approvalStatus: "missing",
        status: "cleared",
        title: "Archive verification baseline",
      }),
      owner: "board secretary",
      sourceHash: input.attestationDigest.summary.attestationHash,
      sourceStatus: input.attestationDigest.summary.status,
      status: "cleared",
      title: "Archive verification exception baseline",
    });
  }

  return rows.sort((first, second) => first.status.localeCompare(second.status) || approvalRank[first.approvalStatus] - approvalRank[second.approvalStatus] || kindRank[first.kind] - kindRank[second.kind]);
}

function createCsv(rows: BoardReleaseArchiveVerificationExceptionRegisterRow[]) {
  const header = ["exception_id", "kind", "title", "status", "owner", "expires_at", "approval_status", "approver", "approval_evidence_hash", "source_status", "source_hash", "exception_hash", "next_action"];
  const body = rows.map((entry) =>
    [
      entry.id,
      entry.kind,
      entry.title,
      entry.status,
      entry.owner,
      entry.expiresAt,
      entry.approvalStatus,
      entry.approver,
      entry.approvalEvidenceHash,
      entry.sourceStatus,
      entry.sourceHash,
      entry.exceptionHash,
      entry.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveVerificationExceptionRegisterRow[]): BoardReleaseArchiveVerificationExceptionRegisterReport["summary"] {
  const openRows = rows.filter((entry) => entry.status === "open");
  const openCount = openRows.length;
  const clearedCount = rows.filter((entry) => entry.status === "cleared").length;
  const approvedCount = openRows.filter((entry) => entry.approvalStatus === "approved").length;
  const expiredCount = openRows.filter((entry) => entry.approvalStatus === "expired").length;
  const missingApprovalCount = openRows.filter((entry) => entry.approvalStatus === "missing").length;
  const status: BoardReleaseArchiveVerificationExceptionStatus = openCount > 0 ? "open" : "cleared";
  const nextRow = openRows.find((entry) => entry.approvalStatus !== "approved") ?? openRows[0] ?? rows[0] ?? null;

  return {
    approvedCount,
    clearedCount,
    expiredCount,
    missingApprovalCount,
    nextAction: status === "cleared" ? "Archive verification exception register is clear." : (nextRow?.nextAction ?? "Review archive verification exceptions."),
    openCount,
    registerHash: sha256(rows.map((entry) => entry.exceptionHash)),
    registerScore: rows.length > 0 ? Math.max(0, Math.round((approvedCount / rows.length) * 100 - missingApprovalCount * 15 - expiredCount * 20)) : 100,
    rowCount: rows.length,
    status,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveVerificationExceptionRegisterRow[];
  summary: BoardReleaseArchiveVerificationExceptionRegisterReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveVerificationExceptionRegister(
  input: CreateBoardReleaseArchiveVerificationExceptionRegisterInput,
): BoardReleaseArchiveVerificationExceptionRegisterReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.signatureChainValidator.workspaceId;
  const rows = createRows({
    ...input,
    generatedAt,
    windowDays: input.exceptionWindowDays ?? 14,
  });
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = createJson({
    generatedAt,
    rows,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-verification-exception-register-${dateStamp(generatedAt)}`;

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
