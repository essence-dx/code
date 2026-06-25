import { createHash } from "node:crypto";
import type { BoardReleaseArchiveCertificationExternalAuditorPacketReport } from "@/features/projects/board-release-archive-certification-external-auditor-packet";
import type { BoardReleaseArchiveCertificationEvidenceReplayVerifierReport } from "@/features/projects/board-release-archive-certification-evidence-replay-verifier";
import type { BoardReleaseArchiveCertificationHistoryLedgerReport } from "@/features/projects/board-release-archive-certification-history-ledger";

export type BoardReleaseArchiveCertificationRevocationKind = "auditor-block" | "failed-replay" | "stale-certificate" | "superseded-evidence";
export type BoardReleaseArchiveCertificationRevocationStatus = "open" | "queued" | "resolved";

export interface BoardReleaseArchiveCertificationRevocationRow {
  certificateHash: string;
  id: string;
  kind: BoardReleaseArchiveCertificationRevocationKind;
  nextAction: string;
  owner: string;
  revocationHash: string;
  revocationReason: string;
  sourceStatus: string;
  status: BoardReleaseArchiveCertificationRevocationStatus;
  title: string;
}

export interface BoardReleaseArchiveCertificationRevocationWorkflowReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveCertificationRevocationRow[];
  summary: {
    nextAction: string;
    openCount: number;
    queuedCount: number;
    resolvedCount: number;
    revocationHash: string;
    revocationScore: number;
    rowCount: number;
    status: BoardReleaseArchiveCertificationRevocationStatus;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveCertificationRevocationWorkflowInput {
  auditorPacket: BoardReleaseArchiveCertificationExternalAuditorPacketReport;
  generatedAt?: string;
  historyLedger: BoardReleaseArchiveCertificationHistoryLedgerReport;
  replayVerifier: BoardReleaseArchiveCertificationEvidenceReplayVerifierReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveCertificationRevocationKind, number> = {
  "failed-replay": 0,
  "auditor-block": 1,
  "stale-certificate": 2,
  "superseded-evidence": 3,
};

const statusRank: Record<BoardReleaseArchiveCertificationRevocationStatus, number> = {
  open: 0,
  queued: 1,
  resolved: 2,
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
  kind: BoardReleaseArchiveCertificationRevocationKind;
  status: BoardReleaseArchiveCertificationRevocationStatus;
  title: string;
}) {
  if (input.status === "open") {
    return `Open revocation review for ${input.title} before executive attestation.`;
  }

  if (input.status === "queued") {
    return `Queue revocation notice for ${input.title} and attach replacement evidence.`;
  }

  return input.kind === "superseded-evidence"
    ? `Retain ${input.title} as superseded certificate evidence.`
    : `Keep ${input.title} cleared in the revocation workflow.`;
}

function row(input: {
  certificateHash: string;
  generatedAt: string;
  kind: BoardReleaseArchiveCertificationRevocationKind;
  owner: string;
  revocationReason: string;
  sourceStatus: string;
  status: BoardReleaseArchiveCertificationRevocationStatus;
  title: string;
  workspaceId: string;
}) {
  const revocationHash = sha256({
    certificateHash: input.certificateHash,
    kind: input.kind,
    reason: input.revocationReason,
    sourceStatus: input.sourceStatus,
    status: input.status,
  });

  return {
    certificateHash: input.certificateHash,
    id: `archive-certification-revocation:${slug(input.workspaceId)}:${input.kind}:${slug(input.title)}:${dateStamp(input.generatedAt)}`,
    kind: input.kind,
    nextAction: nextActionFor({
      kind: input.kind,
      status: input.status,
      title: input.title,
    }),
    owner: input.owner,
    revocationHash,
    revocationReason: input.revocationReason,
    sourceStatus: input.sourceStatus,
    status: input.status,
    title: input.title,
  } satisfies BoardReleaseArchiveCertificationRevocationRow;
}

function createRows(input: CreateBoardReleaseArchiveCertificationRevocationWorkflowInput & { generatedAt: string; workspaceId: string }) {
  const rows: BoardReleaseArchiveCertificationRevocationRow[] = [];

  for (const replay of input.replayVerifier.rows.filter((entry) => entry.status !== "matched")) {
    rows.push(
      row({
        certificateHash: replay.actualHash ?? replay.expectedHash,
        generatedAt: input.generatedAt,
        kind: "failed-replay",
        owner: "archive certification owner",
        revocationReason: replay.nextAction,
        sourceStatus: replay.status,
        status: replay.status === "missing" ? "open" : "queued",
        title: replay.title,
        workspaceId: input.workspaceId,
      }),
    );
  }

  for (const packet of input.auditorPacket.rows.filter((entry) => entry.status === "blocked")) {
    rows.push(
      row({
        certificateHash: packet.sourceHash,
        generatedAt: input.generatedAt,
        kind: "auditor-block",
        owner: packet.auditorAudience,
        revocationReason: packet.nextAction,
        sourceStatus: packet.status,
        status: "open",
        title: packet.title,
        workspaceId: input.workspaceId,
      }),
    );
  }

  const activeHistory = input.historyLedger.rows.find((entry) => entry.status === "current" || entry.status === "blocked") ?? null;

  if (activeHistory?.revocationState === "revocation-hold" || input.historyLedger.summary.status === "blocked") {
    rows.push(
      row({
        certificateHash: activeHistory?.certificateHash ?? input.historyLedger.summary.ledgerHash,
        generatedAt: input.generatedAt,
        kind: "stale-certificate",
        owner: activeHistory?.issuer ?? "archive certification service",
        revocationReason: activeHistory?.revocationReason ?? input.historyLedger.summary.nextAction,
        sourceStatus: input.historyLedger.summary.status,
        status: "open",
        title: activeHistory?.version ?? input.historyLedger.summary.currentVersion,
        workspaceId: input.workspaceId,
      }),
    );
  }

  for (const historical of input.historyLedger.rows.filter((entry) => entry.revocationState === "superseded").slice(0, 3)) {
    rows.push(
      row({
        certificateHash: historical.certificateHash,
        generatedAt: input.generatedAt,
        kind: "superseded-evidence",
        owner: historical.issuer,
        revocationReason: "Historical certificate version superseded by the active closeout certificate.",
        sourceStatus: historical.sourceStatus,
        status: "resolved",
        title: historical.version,
        workspaceId: input.workspaceId,
      }),
    );
  }

  if (rows.length === 0) {
    rows.push(
      row({
        certificateHash: input.historyLedger.summary.ledgerHash,
        generatedAt: input.generatedAt,
        kind: "superseded-evidence",
        owner: "archive certification service",
        revocationReason: "No stale certificates, failed audits, or superseded evidence bundles require active revocation.",
        sourceStatus: input.historyLedger.summary.status,
        status: "resolved",
        title: "Archive certification revocation baseline",
        workspaceId: input.workspaceId,
      }),
    );
  }

  return rows.sort(
    (first, second) =>
      statusRank[first.status] - statusRank[second.status] ||
      kindRank[first.kind] - kindRank[second.kind] ||
      first.title.localeCompare(second.title),
  );
}

function createCsv(rows: BoardReleaseArchiveCertificationRevocationRow[]) {
  const header = ["revocation_id", "kind", "title", "status", "source_status", "owner", "certificate_hash", "revocation_reason", "revocation_hash", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.kind, entry.title, entry.status, entry.sourceStatus, entry.owner, entry.certificateHash, entry.revocationReason, entry.revocationHash, entry.nextAction]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveCertificationRevocationRow[]): BoardReleaseArchiveCertificationRevocationWorkflowReport["summary"] {
  const openCount = rows.filter((entry) => entry.status === "open").length;
  const queuedCount = rows.filter((entry) => entry.status === "queued").length;
  const resolvedCount = rows.filter((entry) => entry.status === "resolved").length;
  const status = rows.reduce<BoardReleaseArchiveCertificationRevocationStatus>((worst, entry) => (statusRank[entry.status] < statusRank[worst] ? entry.status : worst), "resolved");
  const nextRow = rows.find((entry) => entry.status !== "resolved") ?? rows[0] ?? null;

  return {
    nextAction: status === "resolved" ? "Archive certification revocation workflow is clear." : (nextRow?.nextAction ?? "Review archive certification revocation workflow."),
    openCount,
    queuedCount,
    resolvedCount,
    revocationHash: sha256(rows.map((entry) => entry.revocationHash)),
    revocationScore: rows.length > 0 ? Math.max(0, Math.round((resolvedCount / rows.length) * 100 - openCount * 22 - queuedCount * 12)) : 100,
    rowCount: rows.length,
    status,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveCertificationRevocationRow[];
  summary: BoardReleaseArchiveCertificationRevocationWorkflowReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveCertificationRevocationWorkflow(
  input: CreateBoardReleaseArchiveCertificationRevocationWorkflowInput,
): BoardReleaseArchiveCertificationRevocationWorkflowReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.historyLedger.workspaceId;
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-certification-revocation-workflow-${dateStamp(generatedAt)}`;

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
