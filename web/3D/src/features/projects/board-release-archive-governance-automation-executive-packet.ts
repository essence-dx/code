import { createHash } from "node:crypto";
import type { BoardReleaseArchiveGovernanceAutomationAuditTrailReport } from "@/features/projects/board-release-archive-governance-automation-audit-trail";
import type { BoardReleaseArchiveGovernanceAutomationFailureLedgerReport } from "@/features/projects/board-release-archive-governance-automation-failure-ledger";
import type { BoardReleaseArchiveGovernanceAutomationRunbookReport } from "@/features/projects/board-release-archive-governance-automation-runbook";
import type { BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport } from "@/features/projects/board-release-archive-governance-automation-trigger-register";

export type BoardReleaseArchiveGovernanceAutomationExecutivePacketKind =
  | "audit-trail"
  | "failure-ledger"
  | "release-recommendation"
  | "runbook"
  | "trigger-register";

export type BoardReleaseArchiveGovernanceAutomationExecutivePacketStatus = "approved" | "blocked" | "review";

export interface BoardReleaseArchiveGovernanceAutomationExecutivePacketRow {
  evidenceHash: string;
  id: string;
  kind: BoardReleaseArchiveGovernanceAutomationExecutivePacketKind;
  nextAction: string;
  ownerRole: string;
  packetHash: string;
  recommendation: string;
  sourceScore: number;
  status: BoardReleaseArchiveGovernanceAutomationExecutivePacketStatus;
  title: string;
}

export interface BoardReleaseArchiveGovernanceAutomationExecutivePacketReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveGovernanceAutomationExecutivePacketRow[];
  summary: {
    approvedCount: number;
    blockedCount: number;
    nextAction: string;
    packetHash: string;
    packetScore: number;
    reviewCount: number;
    rowCount: number;
    status: BoardReleaseArchiveGovernanceAutomationExecutivePacketStatus;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveGovernanceAutomationExecutivePacketInput {
  auditTrail: BoardReleaseArchiveGovernanceAutomationAuditTrailReport;
  failureLedger: BoardReleaseArchiveGovernanceAutomationFailureLedgerReport;
  generatedAt?: string;
  runbook: BoardReleaseArchiveGovernanceAutomationRunbookReport;
  triggerRegister: BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveGovernanceAutomationExecutivePacketKind, number> = {
  "trigger-register": 0,
  runbook: 1,
  "failure-ledger": 2,
  "audit-trail": 3,
  "release-recommendation": 4,
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

function csvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
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

function overallStatus(input: CreateBoardReleaseArchiveGovernanceAutomationExecutivePacketInput) {
  if (
    input.triggerRegister.summary.status === "blocked" ||
    input.runbook.summary.status === "blocked" ||
    input.failureLedger.summary.status === "blocking" ||
    input.auditTrail.summary.status === "blocked"
  ) {
    return "blocked" satisfies BoardReleaseArchiveGovernanceAutomationExecutivePacketStatus;
  }

  if (
    input.triggerRegister.summary.status === "due" ||
    input.runbook.summary.status === "watch" ||
    input.failureLedger.summary.status === "monitor" ||
    input.auditTrail.summary.status === "review"
  ) {
    return "review" satisfies BoardReleaseArchiveGovernanceAutomationExecutivePacketStatus;
  }

  return "approved" satisfies BoardReleaseArchiveGovernanceAutomationExecutivePacketStatus;
}

function recommendationFor(status: BoardReleaseArchiveGovernanceAutomationExecutivePacketStatus) {
  if (status === "blocked") {
    return "Hold release until archive governance automation blockers are repaired and re-attested.";
  }

  if (status === "review") {
    return "Route archive governance automation packet for operator review before release approval.";
  }

  return "Approve archive governance automation packet for release governance evidence.";
}

function nextActionFor(status: BoardReleaseArchiveGovernanceAutomationExecutivePacketStatus) {
  if (status === "blocked") {
    return "Block release until archive governance automation executive packet is repaired.";
  }

  if (status === "review") {
    return "Review archive governance automation executive packet before board release approval.";
  }

  return "Archive governance automation executive packet is approved.";
}

function createRow(input: {
  evidenceHash: string;
  kind: BoardReleaseArchiveGovernanceAutomationExecutivePacketKind;
  ownerRole: string;
  recommendation: string;
  sourceScore: number;
  status: BoardReleaseArchiveGovernanceAutomationExecutivePacketStatus;
  title: string;
  workspaceId: string;
}) {
  const nextAction = nextActionFor(input.status);
  const packetHash = sha256({
    evidenceHash: input.evidenceHash,
    kind: input.kind,
    nextAction,
    ownerRole: input.ownerRole,
    recommendation: input.recommendation,
    sourceScore: input.sourceScore,
    status: input.status,
  });

  return {
    evidenceHash: input.evidenceHash,
    id: `archive-governance-automation-packet:${slug(input.workspaceId)}:${input.kind}`,
    kind: input.kind,
    nextAction,
    ownerRole: input.ownerRole,
    packetHash,
    recommendation: input.recommendation,
    sourceScore: input.sourceScore,
    status: input.status,
    title: input.title,
  } satisfies BoardReleaseArchiveGovernanceAutomationExecutivePacketRow;
}

function createRows(input: CreateBoardReleaseArchiveGovernanceAutomationExecutivePacketInput & { workspaceId: string }) {
  const status = overallStatus(input);
  const recommendation = recommendationFor(status);
  const releaseEvidenceHash = sha256({
    auditTrail: input.auditTrail.summary.auditHash,
    failureLedger: input.failureLedger.summary.ledgerHash,
    runbook: input.runbook.summary.runbookHash,
    triggerRegister: input.triggerRegister.summary.registerHash,
  });
  const score = Math.round(
    (input.triggerRegister.summary.automationScore + input.runbook.summary.runbookScore + input.failureLedger.summary.ledgerScore + input.auditTrail.summary.auditScore) / 4,
  );

  return [
    createRow({
      evidenceHash: input.triggerRegister.summary.registerHash,
      kind: "trigger-register",
      ownerRole: "release governance lead",
      recommendation,
      sourceScore: input.triggerRegister.summary.automationScore,
      status,
      title: "Trigger register evidence",
      workspaceId: input.workspaceId,
    }),
    createRow({
      evidenceHash: input.runbook.summary.runbookHash,
      kind: "runbook",
      ownerRole: "automation operator",
      recommendation,
      sourceScore: input.runbook.summary.runbookScore,
      status,
      title: "Runbook evidence",
      workspaceId: input.workspaceId,
    }),
    createRow({
      evidenceHash: input.failureLedger.summary.ledgerHash,
      kind: "failure-ledger",
      ownerRole: "governance owner",
      recommendation,
      sourceScore: input.failureLedger.summary.ledgerScore,
      status,
      title: "Failure ledger evidence",
      workspaceId: input.workspaceId,
    }),
    createRow({
      evidenceHash: input.auditTrail.summary.auditHash,
      kind: "audit-trail",
      ownerRole: "board secretary",
      recommendation,
      sourceScore: input.auditTrail.summary.auditScore,
      status,
      title: "Audit trail evidence",
      workspaceId: input.workspaceId,
    }),
    createRow({
      evidenceHash: releaseEvidenceHash,
      kind: "release-recommendation",
      ownerRole: "board chair",
      recommendation,
      sourceScore: score,
      status,
      title: "Release recommendation",
      workspaceId: input.workspaceId,
    }),
  ].sort((first, second) => kindRank[first.kind] - kindRank[second.kind]);
}

function summarize(rows: BoardReleaseArchiveGovernanceAutomationExecutivePacketRow[]): BoardReleaseArchiveGovernanceAutomationExecutivePacketReport["summary"] {
  const approvedCount = rows.filter((row) => row.status === "approved").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const status: BoardReleaseArchiveGovernanceAutomationExecutivePacketStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "approved";
  const packetScore = Math.max(0, Math.round((approvedCount / Math.max(1, rows.length)) * 100 - reviewCount * 8 - blockedCount * 20));
  const nextRow = rows.find((row) => row.status === "blocked") ?? rows.find((row) => row.status === "review") ?? null;

  return {
    approvedCount,
    blockedCount,
    nextAction: nextRow?.nextAction ?? "Archive governance automation executive packet is approved.",
    packetHash: sha256(rows.map((row) => row.packetHash)),
    packetScore,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: BoardReleaseArchiveGovernanceAutomationExecutivePacketRow[]) {
  const header = ["packet_id", "kind", "title", "status", "owner_role", "evidence_hash", "packet_hash", "recommendation", "next_action"];
  const body = rows.map((row) =>
    [row.id, row.kind, row.title, row.status, row.ownerRole, row.evidenceHash, row.packetHash, row.recommendation, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveGovernanceAutomationExecutivePacketRow[];
  summary: BoardReleaseArchiveGovernanceAutomationExecutivePacketReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveGovernanceAutomationExecutivePacket(
  input: CreateBoardReleaseArchiveGovernanceAutomationExecutivePacketInput,
): BoardReleaseArchiveGovernanceAutomationExecutivePacketReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.triggerRegister.workspaceId;
  const rows = createRows({
    ...input,
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-governance-automation-executive-packet-${dateStamp(generatedAt)}`;

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
