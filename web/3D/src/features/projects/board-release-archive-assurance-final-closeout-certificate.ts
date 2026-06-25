import { createHash } from "node:crypto";
import type { BoardReleaseArchiveAssuranceDistributionMatrixReport } from "@/features/projects/board-release-archive-assurance-distribution-matrix";
import type { BoardReleaseArchiveAssuranceNotarizationRegisterReport } from "@/features/projects/board-release-archive-assurance-notarization-register";
import type { BoardReleaseArchiveAssurancePostReleaseAuditChecklistReport } from "@/features/projects/board-release-archive-assurance-post-release-audit-checklist";
import type { BoardReleaseArchiveEvidenceReleaseHandoffDigestReport } from "@/features/projects/board-release-archive-evidence-release-handoff-digest";

export type BoardReleaseArchiveAssuranceFinalCloseoutKind = "distribution" | "handoff-digest" | "notarization" | "post-release-audit";
export type BoardReleaseArchiveAssuranceFinalCloseoutStatus = "blocked" | "certified" | "conditional";

export interface BoardReleaseArchiveAssuranceFinalCloseoutEvidence {
  evidenceHash: string;
  id: string;
  kind: BoardReleaseArchiveAssuranceFinalCloseoutKind;
  nextAction: string;
  recordCount: number;
  sourceStatus: string;
  status: BoardReleaseArchiveAssuranceFinalCloseoutStatus;
  title: string;
}

export interface BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport {
  certificateText: string;
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  evidence: BoardReleaseArchiveAssuranceFinalCloseoutEvidence[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  summary: {
    blockedCount: number;
    certificateHash: string;
    certificateScore: number;
    certifiedCount: number;
    conditionalCount: number;
    evidenceCount: number;
    nextAction: string;
    recommendation: string;
    status: BoardReleaseArchiveAssuranceFinalCloseoutStatus;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveAssuranceFinalCloseoutCertificateInput {
  distributionMatrix: BoardReleaseArchiveAssuranceDistributionMatrixReport;
  generatedAt?: string;
  handoffDigest: BoardReleaseArchiveEvidenceReleaseHandoffDigestReport;
  notarizationRegister: BoardReleaseArchiveAssuranceNotarizationRegisterReport;
  postReleaseAuditChecklist: BoardReleaseArchiveAssurancePostReleaseAuditChecklistReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveAssuranceFinalCloseoutKind, number> = {
  "handoff-digest": 0,
  notarization: 1,
  distribution: 2,
  "post-release-audit": 3,
};

const statusRank: Record<BoardReleaseArchiveAssuranceFinalCloseoutStatus, number> = {
  blocked: 0,
  conditional: 1,
  certified: 2,
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

function statusFrom(sourceStatus: string): BoardReleaseArchiveAssuranceFinalCloseoutStatus {
  if (sourceStatus === "blocked" || sourceStatus === "overdue") {
    return "blocked";
  }

  return sourceStatus === "ready" || sourceStatus === "notarized" || sourceStatus === "covered" || sourceStatus === "closed" ? "certified" : "conditional";
}

function nextActionFor(input: {
  status: BoardReleaseArchiveAssuranceFinalCloseoutStatus;
  title: string;
}) {
  if (input.status === "blocked") {
    return `Resolve blockers for ${input.title} before issuing the final archive closeout certificate.`;
  }

  if (input.status === "conditional") {
    return `Attach conditional assurance note for ${input.title} before certificate sign-off.`;
  }

  return `Keep ${input.title} sealed in the final archive closeout certificate.`;
}

function evidenceRow(input: {
  evidenceHash: string;
  generatedAt: string;
  kind: BoardReleaseArchiveAssuranceFinalCloseoutKind;
  recordCount: number;
  sourceStatus: string;
  title: string;
  workspaceId: string;
}) {
  const status = statusFrom(input.sourceStatus);

  return {
    evidenceHash: input.evidenceHash,
    id: `archive-assurance-final-closeout:${slug(input.workspaceId)}:${input.kind}:${dateStamp(input.generatedAt)}`,
    kind: input.kind,
    nextAction: nextActionFor({ status, title: input.title }),
    recordCount: input.recordCount,
    sourceStatus: input.sourceStatus,
    status,
    title: input.title,
  } satisfies BoardReleaseArchiveAssuranceFinalCloseoutEvidence;
}

function createEvidence(input: CreateBoardReleaseArchiveAssuranceFinalCloseoutCertificateInput & { generatedAt: string; workspaceId: string }) {
  return [
    evidenceRow({
      evidenceHash: input.handoffDigest.summary.digestHash,
      generatedAt: input.generatedAt,
      kind: "handoff-digest",
      recordCount: input.handoffDigest.summary.rowCount,
      sourceStatus: input.handoffDigest.summary.status,
      title: "Archive evidence handoff digest",
      workspaceId: input.workspaceId,
    }),
    evidenceRow({
      evidenceHash: input.notarizationRegister.summary.notarizationHash,
      generatedAt: input.generatedAt,
      kind: "notarization",
      recordCount: input.notarizationRegister.summary.rowCount,
      sourceStatus: input.notarizationRegister.summary.status,
      title: "Archive assurance notarization register",
      workspaceId: input.workspaceId,
    }),
    evidenceRow({
      evidenceHash: input.distributionMatrix.summary.distributionHash,
      generatedAt: input.generatedAt,
      kind: "distribution",
      recordCount: input.distributionMatrix.summary.recipientCount,
      sourceStatus: input.distributionMatrix.summary.status,
      title: "Archive assurance distribution matrix",
      workspaceId: input.workspaceId,
    }),
    evidenceRow({
      evidenceHash: input.postReleaseAuditChecklist.summary.auditHash,
      generatedAt: input.generatedAt,
      kind: "post-release-audit",
      recordCount: input.postReleaseAuditChecklist.summary.rowCount,
      sourceStatus: input.postReleaseAuditChecklist.summary.status,
      title: "Archive assurance post-release audit checklist",
      workspaceId: input.workspaceId,
    }),
  ].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      kindRank[first.kind] - kindRank[second.kind] ||
      first.title.localeCompare(second.title),
  );
}

function createCsv(evidence: BoardReleaseArchiveAssuranceFinalCloseoutEvidence[]) {
  const header = ["certificate_evidence_id", "kind", "title", "status", "source_status", "record_count", "evidence_hash", "next_action"];
  const body = evidence.map((row) => [row.id, row.kind, row.title, row.status, row.sourceStatus, row.recordCount, row.evidenceHash, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(evidence: BoardReleaseArchiveAssuranceFinalCloseoutEvidence[]): BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport["summary"] {
  const blockedCount = evidence.filter((row) => row.status === "blocked").length;
  const conditionalCount = evidence.filter((row) => row.status === "conditional").length;
  const certifiedCount = evidence.filter((row) => row.status === "certified").length;
  const status = evidence.reduce<BoardReleaseArchiveAssuranceFinalCloseoutStatus>(
    (worst, row) => (statusRank[row.status] < statusRank[worst] ? row.status : worst),
    "certified",
  );
  const nextRow = evidence.find((row) => row.status !== "certified") ?? evidence[0] ?? null;
  const recommendation =
    status === "certified"
      ? "Issue final archive closeout certificate."
      : status === "conditional"
        ? "Issue final archive closeout certificate with conditional assurance notes."
        : "Do not issue final archive closeout certificate until blocked evidence resolves.";

  return {
    blockedCount,
    certificateHash: sha256(evidence.map((row) => [row.kind, row.evidenceHash, row.status])),
    certificateScore: evidence.length > 0 ? Math.max(0, Math.round((certifiedCount / evidence.length) * 100 - blockedCount * 20 - conditionalCount * 6)) : 100,
    certifiedCount,
    conditionalCount,
    evidenceCount: evidence.length,
    nextAction: status === "certified" ? "Final archive closeout certificate is ready to issue." : (nextRow?.nextAction ?? "Review final archive closeout certificate."),
    recommendation,
    status,
  };
}

function certificateText(input: {
  generatedAt: string;
  summary: BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport["summary"];
  workspaceId: string;
}) {
  return `${input.summary.status.toUpperCase()} final archive closeout certificate for ${input.workspaceId}: ${input.summary.recommendation} ${input.summary.certifiedCount}/${input.summary.evidenceCount} evidence sources certified on ${input.generatedAt}. Certificate hash ${input.summary.certificateHash}.`;
}

function createJson(input: {
  certificateText: string;
  evidence: BoardReleaseArchiveAssuranceFinalCloseoutEvidence[];
  generatedAt: string;
  summary: BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveAssuranceFinalCloseoutCertificate(
  input: CreateBoardReleaseArchiveAssuranceFinalCloseoutCertificateInput,
): BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.handoffDigest.workspaceId;
  const evidence = createEvidence({
    ...input,
    generatedAt,
    workspaceId,
  });
  const summary = summarize(evidence);
  const text = certificateText({
    generatedAt,
    summary,
    workspaceId,
  });
  const csvContent = createCsv(evidence);
  const jsonContent = createJson({
    certificateText: text,
    evidence,
    generatedAt,
    summary,
    workspaceId,
  });
  const fileBase = `${slug(workspaceId)}-board-release-archive-assurance-final-closeout-certificate-${dateStamp(generatedAt)}`;

  return {
    certificateText: text,
    csvContent,
    csvDataUri: encodeCsvDataUri(csvContent),
    csvFileName: `${fileBase}.csv`,
    evidence,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeJsonDataUri(jsonContent),
    jsonFileName: `${fileBase}.json`,
    summary,
    workspaceId,
  };
}
