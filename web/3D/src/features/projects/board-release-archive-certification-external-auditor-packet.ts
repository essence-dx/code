import { createHash } from "node:crypto";
import type { BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport } from "@/features/projects/board-release-archive-assurance-final-closeout-certificate";
import type { BoardReleaseArchiveCertificationEvidenceReplayVerifierReport } from "@/features/projects/board-release-archive-certification-evidence-replay-verifier";
import type { BoardReleaseArchiveCertificationHistoryLedgerReport } from "@/features/projects/board-release-archive-certification-history-ledger";

export type BoardReleaseArchiveCertificationAuditorPacketKind = "certificate-history" | "closeout-certificate" | "replay-verification";
export type BoardReleaseArchiveCertificationAuditorPacketStatus = "blocked" | "ready" | "watch";

export interface BoardReleaseArchiveCertificationAuditorPacketRow {
  accessExpiresAt: string;
  acknowledgementProofHash: string;
  auditorAudience: string;
  id: string;
  kind: BoardReleaseArchiveCertificationAuditorPacketKind;
  nextAction: string;
  packetHash: string;
  redactedFields: string[];
  redactionScope: string;
  sourceHash: string;
  sourceStatus: string;
  status: BoardReleaseArchiveCertificationAuditorPacketStatus;
  title: string;
}

export interface BoardReleaseArchiveCertificationExternalAuditorPacketReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveCertificationAuditorPacketRow[];
  summary: {
    acknowledgementProofHash: string;
    blockedCount: number;
    externalPacketHash: string;
    packetCount: number;
    packetScore: number;
    readyCount: number;
    nextAction: string;
    redactionCount: number;
    status: BoardReleaseArchiveCertificationAuditorPacketStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveCertificationExternalAuditorPacketInput {
  auditorAudience?: string;
  accessWindowHours?: number;
  finalCloseoutCertificate: BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport;
  generatedAt?: string;
  historyLedger: BoardReleaseArchiveCertificationHistoryLedgerReport;
  replayVerifier: BoardReleaseArchiveCertificationEvidenceReplayVerifierReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveCertificationAuditorPacketKind, number> = {
  "closeout-certificate": 0,
  "certificate-history": 1,
  "replay-verification": 2,
};

const statusRank: Record<BoardReleaseArchiveCertificationAuditorPacketStatus, number> = {
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

function addHours(value: string, hours: number) {
  const date = new Date(value);
  const base = Number.isNaN(date.getTime()) ? Date.now() : date.getTime();

  return new Date(base + hours * 60 * 60 * 1000).toISOString();
}

function statusFrom(sourceStatus: string): BoardReleaseArchiveCertificationAuditorPacketStatus {
  if (sourceStatus === "blocked" || sourceStatus === "missing") {
    return "blocked";
  }

  return sourceStatus === "certified" || sourceStatus === "current" || sourceStatus === "matched" ? "ready" : "watch";
}

function nextActionFor(input: {
  status: BoardReleaseArchiveCertificationAuditorPacketStatus;
  title: string;
}) {
  if (input.status === "blocked") {
    return `Resolve source blockers before sharing ${input.title} with external auditors.`;
  }

  if (input.status === "watch") {
    return `Share ${input.title} with auditor caveats and retain acknowledgement before access expiry.`;
  }

  return `Share ${input.title} with external auditors and retain acknowledgement proof.`;
}

function row(input: {
  accessExpiresAt: string;
  auditorAudience: string;
  generatedAt: string;
  kind: BoardReleaseArchiveCertificationAuditorPacketKind;
  redactedFields: string[];
  redactionScope: string;
  sourceHash: string;
  sourceStatus: string;
  title: string;
  workspaceId: string;
}) {
  const status = statusFrom(input.sourceStatus);
  const acknowledgementProofHash = sha256({
    accessExpiresAt: input.accessExpiresAt,
    auditorAudience: input.auditorAudience,
    kind: input.kind,
    sourceHash: input.sourceHash,
    status,
  });
  const packetHash = sha256({
    acknowledgementProofHash,
    redactedFields: input.redactedFields,
    redactionScope: input.redactionScope,
    sourceHash: input.sourceHash,
  });

  return {
    accessExpiresAt: input.accessExpiresAt,
    acknowledgementProofHash,
    auditorAudience: input.auditorAudience,
    id: `archive-certification-auditor-packet:${slug(input.workspaceId)}:${input.kind}:${dateStamp(input.generatedAt)}`,
    kind: input.kind,
    nextAction: nextActionFor({ status, title: input.title }),
    packetHash,
    redactedFields: input.redactedFields,
    redactionScope: input.redactionScope,
    sourceHash: input.sourceHash,
    sourceStatus: input.sourceStatus,
    status,
    title: input.title,
  } satisfies BoardReleaseArchiveCertificationAuditorPacketRow;
}

function createRows(input: CreateBoardReleaseArchiveCertificationExternalAuditorPacketInput & { accessExpiresAt: string; auditorAudience: string; generatedAt: string; workspaceId: string }) {
  return [
    row({
      accessExpiresAt: input.accessExpiresAt,
      auditorAudience: input.auditorAudience,
      generatedAt: input.generatedAt,
      kind: "closeout-certificate",
      redactedFields: ["internal owner notes", "raw workspace member emails"],
      redactionScope: "certificate summary, recommendation, evidence counts, and certificate hash",
      sourceHash: input.finalCloseoutCertificate.summary.certificateHash,
      sourceStatus: input.finalCloseoutCertificate.summary.status,
      title: "External auditor final closeout certificate packet",
      workspaceId: input.workspaceId,
    }),
    row({
      accessExpiresAt: input.accessExpiresAt,
      auditorAudience: input.auditorAudience,
      generatedAt: input.generatedAt,
      kind: "certificate-history",
      redactedFields: ["issuer personal routing", "revocation internal notes"],
      redactionScope: "version hashes, parent certificate hashes, issuer note summary, and revocation state",
      sourceHash: input.historyLedger.summary.ledgerHash,
      sourceStatus: input.historyLedger.summary.status,
      title: "External auditor certificate history packet",
      workspaceId: input.workspaceId,
    }),
    row({
      accessExpiresAt: input.accessExpiresAt,
      auditorAudience: input.auditorAudience,
      generatedAt: input.generatedAt,
      kind: "replay-verification",
      redactedFields: ["raw source payloads", "internal remediation comments"],
      redactionScope: "replay status, expected hashes, actual hash presence, drift counts, and replay hash",
      sourceHash: input.replayVerifier.summary.replayHash,
      sourceStatus: input.replayVerifier.summary.status,
      title: "External auditor replay verification packet",
      workspaceId: input.workspaceId,
    }),
  ].sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      kindRank[first.kind] - kindRank[second.kind] ||
      first.title.localeCompare(second.title),
  );
}

function createCsv(rows: BoardReleaseArchiveCertificationAuditorPacketRow[]) {
  const header = [
    "packet_id",
    "kind",
    "title",
    "status",
    "source_status",
    "auditor_audience",
    "access_expires_at",
    "redaction_scope",
    "redacted_fields",
    "source_hash",
    "acknowledgement_proof_hash",
    "packet_hash",
    "next_action",
  ];
  const body = rows.map((entry) =>
    [
      entry.id,
      entry.kind,
      entry.title,
      entry.status,
      entry.sourceStatus,
      entry.auditorAudience,
      entry.accessExpiresAt,
      entry.redactionScope,
      entry.redactedFields.join("; "),
      entry.sourceHash,
      entry.acknowledgementProofHash,
      entry.packetHash,
      entry.nextAction,
    ]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveCertificationAuditorPacketRow[]): BoardReleaseArchiveCertificationExternalAuditorPacketReport["summary"] {
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const readyCount = rows.filter((entry) => entry.status === "ready").length;
  const watchCount = rows.filter((entry) => entry.status === "watch").length;
  const status = rows.reduce<BoardReleaseArchiveCertificationAuditorPacketStatus>((worst, entry) => (statusRank[entry.status] < statusRank[worst] ? entry.status : worst), "ready");
  const nextRow = rows.find((entry) => entry.status !== "ready") ?? rows[0] ?? null;

  return {
    acknowledgementProofHash: sha256(rows.map((entry) => entry.acknowledgementProofHash)),
    blockedCount,
    externalPacketHash: sha256(rows.map((entry) => entry.packetHash)),
    packetCount: rows.length,
    packetScore: rows.length > 0 ? Math.max(0, Math.round((readyCount / rows.length) * 100 - blockedCount * 20 - watchCount * 6)) : 100,
    readyCount,
    nextAction: status === "ready" ? "External auditor packet is ready to share with acknowledgement tracking." : (nextRow?.nextAction ?? "Create external auditor packet."),
    redactionCount: rows.reduce((sum, entry) => sum + entry.redactedFields.length, 0),
    status,
    watchCount,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveCertificationAuditorPacketRow[];
  summary: BoardReleaseArchiveCertificationExternalAuditorPacketReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveCertificationExternalAuditorPacket(
  input: CreateBoardReleaseArchiveCertificationExternalAuditorPacketInput,
): BoardReleaseArchiveCertificationExternalAuditorPacketReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.finalCloseoutCertificate.workspaceId;
  const accessExpiresAt = addHours(generatedAt, input.accessWindowHours ?? 168);
  const auditorAudience = input.auditorAudience ?? "external archive auditor";
  const rows = createRows({
    ...input,
    accessExpiresAt,
    auditorAudience,
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-certification-external-auditor-packet-${dateStamp(generatedAt)}`;

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
