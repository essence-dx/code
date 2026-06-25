import { createHash } from "node:crypto";
import type { BoardReleaseArchiveVerificationFinalAcceptancePacketReport } from "@/features/projects/board-release-archive-verification-final-acceptance-packet";

export type BoardReleaseArchiveCustodyChainOfControlStatus = "broken" | "pending" | "sealed";

export interface BoardReleaseArchiveCustodyChainOfControlHandoff {
  artifact: string;
  evidenceHash: string;
  fromOwner: string;
  handedOffAt: string | null;
  owner: string;
  toOwner: string;
}

export interface BoardReleaseArchiveCustodyChainOfControlLedgerRow {
  artifact: string;
  custodyHash: string;
  evidenceHash: string;
  fromOwner: string;
  handedOffAt: string | null;
  id: string;
  nextAction: string;
  owner: string;
  sequence: number;
  status: BoardReleaseArchiveCustodyChainOfControlStatus;
  toOwner: string;
}

export interface BoardReleaseArchiveCustodyChainOfControlLedgerReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveCustodyChainOfControlLedgerRow[];
  summary: {
    brokenCount: number;
    custodyScore: number;
    ledgerHash: string;
    nextAction: string;
    pendingCount: number;
    rowCount: number;
    sealedCount: number;
    status: BoardReleaseArchiveCustodyChainOfControlStatus;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveCustodyChainOfControlLedgerInput {
  finalAcceptancePacket: BoardReleaseArchiveVerificationFinalAcceptancePacketReport;
  generatedAt?: string;
  handoffs?: BoardReleaseArchiveCustodyChainOfControlHandoff[];
  workspaceId?: string;
}

const statusRank: Record<BoardReleaseArchiveCustodyChainOfControlStatus, number> = {
  broken: 0,
  pending: 1,
  sealed: 2,
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

function evidenceHashFor(input: {
  artifact: string;
  finalAcceptancePacket: BoardReleaseArchiveVerificationFinalAcceptancePacketReport;
  kind: string;
}) {
  return (
    input.finalAcceptancePacket.rows?.find((entry) => entry.kind === input.kind)?.acceptanceHash ??
    sha256({
      artifact: input.artifact,
      finalAcceptanceHash: input.finalAcceptancePacket.summary.finalAcceptanceHash,
    })
  );
}

function defaultHandoffs(input: CreateBoardReleaseArchiveCustodyChainOfControlLedgerInput & { generatedAt: string }) {
  const packet = input.finalAcceptancePacket;

  return [
    {
      artifact: "final acceptance packet",
      evidenceHash: packet.summary.finalAcceptanceHash,
      fromOwner: "archive verification workflow",
      handedOffAt: input.generatedAt,
      owner: "board secretary",
      toOwner: "release archive owner",
    },
    {
      artifact: "validator output and exception register",
      evidenceHash: evidenceHashFor({
        artifact: "validator output and exception register",
        finalAcceptancePacket: packet,
        kind: "signature-chain",
      }),
      fromOwner: "board secretary",
      handedOffAt: input.generatedAt,
      owner: "release archive owner",
      toOwner: "audit evidence owner",
    },
    {
      artifact: "distribution proof and readiness timeline",
      evidenceHash: evidenceHashFor({
        artifact: "distribution proof and readiness timeline",
        finalAcceptancePacket: packet,
        kind: "readiness-timeline",
      }),
      fromOwner: "release archive owner",
      handedOffAt: input.generatedAt,
      owner: "audit evidence owner",
      toOwner: "records retention owner",
    },
    {
      artifact: "accepted archive custody record",
      evidenceHash: packet.summary.finalAcceptanceHash,
      fromOwner: "records retention owner",
      handedOffAt: input.generatedAt,
      owner: "records retention owner",
      toOwner: "archive vault",
    },
  ] satisfies BoardReleaseArchiveCustodyChainOfControlHandoff[];
}

function statusFor(input: {
  finalAcceptanceStatus: BoardReleaseArchiveVerificationFinalAcceptancePacketReport["summary"]["status"];
  handoff: BoardReleaseArchiveCustodyChainOfControlHandoff;
}) {
  if (input.finalAcceptanceStatus === "blocked" || !input.handoff.evidenceHash.startsWith("sha256:")) {
    return "broken" satisfies BoardReleaseArchiveCustodyChainOfControlStatus;
  }

  if (!input.handoff.handedOffAt || input.finalAcceptanceStatus === "watch" || !input.handoff.toOwner) {
    return "pending" satisfies BoardReleaseArchiveCustodyChainOfControlStatus;
  }

  return "sealed" satisfies BoardReleaseArchiveCustodyChainOfControlStatus;
}

function nextActionFor(input: {
  artifact: string;
  finalAcceptanceStatus: BoardReleaseArchiveVerificationFinalAcceptancePacketReport["summary"]["status"];
  status: BoardReleaseArchiveCustodyChainOfControlStatus;
  toOwner: string;
}) {
  if (input.finalAcceptanceStatus === "blocked") {
    return "Resolve final acceptance blockers before sealing archive custody.";
  }

  if (input.status === "broken") {
    return `Repair custody evidence hash for ${input.artifact} before archive handoff.`;
  }

  if (input.status === "pending") {
    return `Complete custody handoff for ${input.artifact} to ${input.toOwner || "the next owner"}.`;
  }

  return `Keep ${input.artifact} sealed in chain-of-control custody.`;
}

function createRows(input: CreateBoardReleaseArchiveCustodyChainOfControlLedgerInput & { generatedAt: string; workspaceId: string }) {
  const handoffs = input.handoffs && input.handoffs.length > 0 ? input.handoffs : defaultHandoffs(input);

  return handoffs.map((handoff, index) => {
    const status = statusFor({
      finalAcceptanceStatus: input.finalAcceptancePacket.summary.status,
      handoff,
    });
    const custodyHash = sha256({
      artifact: handoff.artifact,
      evidenceHash: handoff.evidenceHash,
      fromOwner: handoff.fromOwner,
      handedOffAt: handoff.handedOffAt,
      owner: handoff.owner,
      sequence: index + 1,
      status,
      toOwner: handoff.toOwner,
    });

    return {
      artifact: handoff.artifact,
      custodyHash,
      evidenceHash: handoff.evidenceHash,
      fromOwner: handoff.fromOwner,
      handedOffAt: handoff.handedOffAt,
      id: `archive-custody-chain-of-control:${slug(input.workspaceId)}:${index + 1}:${slug(handoff.artifact)}`,
      nextAction: nextActionFor({
        artifact: handoff.artifact,
        finalAcceptanceStatus: input.finalAcceptancePacket.summary.status,
        status,
        toOwner: handoff.toOwner,
      }),
      owner: handoff.owner,
      sequence: index + 1,
      status,
      toOwner: handoff.toOwner,
    } satisfies BoardReleaseArchiveCustodyChainOfControlLedgerRow;
  });
}

function createCsv(rows: BoardReleaseArchiveCustodyChainOfControlLedgerRow[]) {
  const header = ["custody_id", "sequence", "artifact", "owner", "from_owner", "to_owner", "status", "handed_off_at", "evidence_hash", "custody_hash", "next_action"];
  const body = rows.map((entry) =>
    [entry.id, entry.sequence, entry.artifact, entry.owner, entry.fromOwner, entry.toOwner, entry.status, entry.handedOffAt, entry.evidenceHash, entry.custodyHash, entry.nextAction]
      .map(csvCell)
      .join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function summarize(rows: BoardReleaseArchiveCustodyChainOfControlLedgerRow[]): BoardReleaseArchiveCustodyChainOfControlLedgerReport["summary"] {
  const sealedCount = rows.filter((entry) => entry.status === "sealed").length;
  const pendingCount = rows.filter((entry) => entry.status === "pending").length;
  const brokenCount = rows.filter((entry) => entry.status === "broken").length;
  const status = rows.reduce<BoardReleaseArchiveCustodyChainOfControlStatus>((worst, entry) => (statusRank[entry.status] < statusRank[worst] ? entry.status : worst), "sealed");
  const nextRow = rows.find((entry) => entry.status === "broken") ?? rows.find((entry) => entry.status === "pending") ?? rows[0] ?? null;

  return {
    brokenCount,
    custodyScore: rows.length > 0 ? Math.max(0, Math.round((sealedCount / rows.length) * 100 - pendingCount * 12 - brokenCount * 30)) : 100,
    ledgerHash: sha256(rows.map((entry) => entry.custodyHash)),
    nextAction: status === "sealed" ? "Archive custody chain-of-control ledger is sealed." : (nextRow?.nextAction ?? "Review archive custody chain-of-control ledger."),
    pendingCount,
    rowCount: rows.length,
    sealedCount,
    status,
  };
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveCustodyChainOfControlLedgerRow[];
  summary: BoardReleaseArchiveCustodyChainOfControlLedgerReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveCustodyChainOfControlLedger(
  input: CreateBoardReleaseArchiveCustodyChainOfControlLedgerInput,
): BoardReleaseArchiveCustodyChainOfControlLedgerReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.finalAcceptancePacket.workspaceId;
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-custody-chain-of-control-ledger-${dateStamp(generatedAt)}`;

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
