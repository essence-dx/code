import { createHash } from "node:crypto";
import type { BoardReleaseArchiveCustodyChainOfControlLedgerReport } from "@/features/projects/board-release-archive-custody-chain-of-control-ledger";
import type {
  BoardReleaseArchiveVerificationFinalAcceptancePacketReport,
  BoardReleaseArchiveVerificationFinalAcceptancePacketRow,
} from "@/features/projects/board-release-archive-verification-final-acceptance-packet";

export type BoardReleaseArchiveCustodyRetentionLockStatus = "blocked" | "locked" | "pending";

export interface BoardReleaseArchiveCustodyRetentionLockRow {
  artifact: string;
  evidenceHash: string;
  id: string;
  lockHash: string;
  lockedAt: string | null;
  nextAction: string;
  retentionOwner: string;
  retentionUntil: string;
  status: BoardReleaseArchiveCustodyRetentionLockStatus;
}

export interface BoardReleaseArchiveCustodyRetentionLockWorkflowReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveCustodyRetentionLockRow[];
  summary: {
    blockedCount: number;
    lockedCount: number;
    nextAction: string;
    pendingCount: number;
    retentionLockHash: string;
    retentionScore: number;
    rowCount: number;
    status: BoardReleaseArchiveCustodyRetentionLockStatus;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveCustodyRetentionLockWorkflowInput {
  chainOfControlLedger: BoardReleaseArchiveCustodyChainOfControlLedgerReport;
  finalAcceptancePacket: BoardReleaseArchiveVerificationFinalAcceptancePacketReport;
  generatedAt?: string;
  retentionYears?: number;
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseArchiveCustodyRetentionLockStatus, number> = {
  blocked: 0,
  pending: 1,
  locked: 2,
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

function addYears(value: string, years: number) {
  const date = new Date(value);
  const base = Number.isNaN(date.getTime()) ? new Date() : date;

  base.setUTCFullYear(base.getUTCFullYear() + years);

  return base.toISOString();
}

function findAcceptanceRow(input: {
  finalAcceptancePacket: BoardReleaseArchiveVerificationFinalAcceptancePacketReport;
  kind: BoardReleaseArchiveVerificationFinalAcceptancePacketRow["kind"];
}) {
  return input.finalAcceptancePacket.rows?.find((entry) => entry.kind === input.kind) ?? null;
}

function evidenceHashFor(input: {
  artifact: string;
  finalAcceptancePacket: BoardReleaseArchiveVerificationFinalAcceptancePacketReport;
  kind: BoardReleaseArchiveVerificationFinalAcceptancePacketRow["kind"] | "final-acceptance";
}) {
  if (input.kind === "final-acceptance") {
    return input.finalAcceptancePacket.summary.finalAcceptanceHash;
  }

  const row = findAcceptanceRow({
    finalAcceptancePacket: input.finalAcceptancePacket,
    kind: input.kind,
  });

  return row?.evidenceHash ?? row?.acceptanceHash ?? sha256({
    artifact: input.artifact,
    finalAcceptanceHash: input.finalAcceptancePacket.summary.finalAcceptanceHash,
  });
}

function lockStatusFor(input: {
  chainStatus: BoardReleaseArchiveCustodyChainOfControlLedgerReport["summary"]["status"];
  evidenceHash: string;
  finalAcceptanceStatus: BoardReleaseArchiveVerificationFinalAcceptancePacketReport["summary"]["status"];
}) {
  if (input.chainStatus === "broken" || input.finalAcceptanceStatus === "blocked" || !input.evidenceHash.startsWith("sha256:")) {
    return "blocked" satisfies BoardReleaseArchiveCustodyRetentionLockStatus;
  }

  if (input.chainStatus === "pending" || input.finalAcceptanceStatus === "watch") {
    return "pending" satisfies BoardReleaseArchiveCustodyRetentionLockStatus;
  }

  return "locked" satisfies BoardReleaseArchiveCustodyRetentionLockStatus;
}

function nextActionFor(input: {
  artifact: string;
  chainStatus: BoardReleaseArchiveCustodyChainOfControlLedgerReport["summary"]["status"];
  status: BoardReleaseArchiveCustodyRetentionLockStatus;
}) {
  if (input.chainStatus === "broken") {
    return `Repair custody chain before locking ${input.artifact}.`;
  }

  if (input.status === "blocked") {
    return `Resolve acceptance evidence before locking ${input.artifact}.`;
  }

  if (input.status === "pending") {
    return `Finish custody handoff before freezing ${input.artifact}.`;
  }

  return `Keep ${input.artifact} frozen under archive custody retention lock.`;
}

function row(input: {
  artifact: string;
  evidenceHash: string;
  generatedAt: string;
  retentionOwner: string;
  retentionYears: number;
  status: BoardReleaseArchiveCustodyRetentionLockStatus;
  workspaceId: string;
  nextAction: string;
}) {
  const lockedAt = input.status === "locked" ? input.generatedAt : null;
  const retentionUntil = addYears(input.generatedAt, input.retentionYears);
  const lockHash = sha256({
    artifact: input.artifact,
    evidenceHash: input.evidenceHash,
    lockedAt,
    retentionOwner: input.retentionOwner,
    retentionUntil,
    status: input.status,
  });

  return {
    artifact: input.artifact,
    evidenceHash: input.evidenceHash,
    id: `archive-custody-retention-lock:${slug(input.workspaceId)}:${slug(input.artifact)}`,
    lockHash,
    lockedAt,
    nextAction: input.nextAction,
    retentionOwner: input.retentionOwner,
    retentionUntil,
    status: input.status,
  } satisfies BoardReleaseArchiveCustodyRetentionLockRow;
}

function createRows(input: CreateBoardReleaseArchiveCustodyRetentionLockWorkflowInput & { generatedAt: string; retentionYears: number; workspaceId: string }) {
  const artifacts = [
    {
      artifact: "final acceptance packet",
      kind: "final-acceptance" as const,
      retentionOwner: "records retention owner",
    },
    {
      artifact: "distribution proof bundle",
      kind: "distribution-proof" as const,
      retentionOwner: "release archive owner",
    },
    {
      artifact: "readiness timeline export",
      kind: "readiness-timeline" as const,
      retentionOwner: "audit evidence owner",
    },
    {
      artifact: "executive recommendation",
      kind: "executive-recommendation" as const,
      retentionOwner: "board secretary",
    },
  ];

  return artifacts.map((artifact) => {
    const evidenceHash = evidenceHashFor({
      artifact: artifact.artifact,
      finalAcceptancePacket: input.finalAcceptancePacket,
      kind: artifact.kind,
    });
    const status = lockStatusFor({
      chainStatus: input.chainOfControlLedger.summary.status,
      evidenceHash,
      finalAcceptanceStatus: input.finalAcceptancePacket.summary.status,
    });

    return row({
      artifact: artifact.artifact,
      evidenceHash,
      generatedAt: input.generatedAt,
      nextAction: nextActionFor({
        artifact: artifact.artifact,
        chainStatus: input.chainOfControlLedger.summary.status,
        status,
      }),
      retentionOwner: artifact.retentionOwner,
      retentionYears: input.retentionYears,
      status,
      workspaceId: input.workspaceId,
    });
  });
}

function createCsv(rows: BoardReleaseArchiveCustodyRetentionLockRow[]) {
  const header = ["retention_lock_id", "artifact", "status", "retention_until", "evidence_hash", "lock_hash", "locked_at", "retention_owner", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.artifact, entry.status, entry.retentionUntil, entry.evidenceHash, entry.lockHash, entry.lockedAt, entry.retentionOwner, entry.nextAction]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveCustodyRetentionLockRow[]): BoardReleaseArchiveCustodyRetentionLockWorkflowReport["summary"] {
  const lockedCount = rows.filter((entry) => entry.status === "locked").length;
  const pendingCount = rows.filter((entry) => entry.status === "pending").length;
  const blockedCount = rows.filter((entry) => entry.status === "blocked").length;
  const status = rows.reduce<BoardReleaseArchiveCustodyRetentionLockStatus>((worst, entry) => (statusRank[entry.status] < statusRank[worst] ? entry.status : worst), "locked");
  const nextRow = rows.find((entry) => entry.status === "blocked") ?? rows.find((entry) => entry.status === "pending") ?? rows[0] ?? null;

  return {
    blockedCount,
    lockedCount,
    nextAction: status === "locked" ? "Archive custody retention lock workflow is frozen." : (nextRow?.nextAction ?? "Review archive custody retention locks."),
    pendingCount,
    retentionLockHash: sha256(rows.map((entry) => entry.lockHash)),
    retentionScore: rows.length > 0 ? Math.max(0, Math.round((lockedCount / rows.length) * 100 - pendingCount * 12 - blockedCount * 30)) : 100,
    rowCount: rows.length,
    status,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveCustodyRetentionLockRow[];
  summary: BoardReleaseArchiveCustodyRetentionLockWorkflowReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveCustodyRetentionLockWorkflow(
  input: CreateBoardReleaseArchiveCustodyRetentionLockWorkflowInput,
): BoardReleaseArchiveCustodyRetentionLockWorkflowReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.finalAcceptancePacket.workspaceId;
  const rows = createRows({
    ...input,
    generatedAt,
    retentionYears: input.retentionYears ?? 7,
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-custody-retention-lock-workflow-${dateStamp(generatedAt)}`;

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
