import { createHash } from "node:crypto";
import type { BoardReleaseArchiveGovernanceAutomationFailureLedgerReport } from "@/features/projects/board-release-archive-governance-automation-failure-ledger";
import type { BoardReleaseArchiveGovernanceAutomationRunbookReport } from "@/features/projects/board-release-archive-governance-automation-runbook";
import type { BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport } from "@/features/projects/board-release-archive-governance-automation-trigger-register";

export type BoardReleaseArchiveGovernanceAutomationAuditTrailKind =
  | "board-acknowledgement"
  | "operator-action"
  | "packet-generation"
  | "trigger-evidence-link";

export type BoardReleaseArchiveGovernanceAutomationAuditTrailStatus = "blocked" | "review" | "verified";

export interface BoardReleaseArchiveGovernanceAutomationAuditTrailRow {
  acknowledgementHash: string;
  actionHash: string;
  actorRole: string;
  evidenceHash: string;
  id: string;
  kind: BoardReleaseArchiveGovernanceAutomationAuditTrailKind;
  nextAction: string;
  sourceCount: number;
  status: BoardReleaseArchiveGovernanceAutomationAuditTrailStatus;
  title: string;
}

export interface BoardReleaseArchiveGovernanceAutomationAuditTrailReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveGovernanceAutomationAuditTrailRow[];
  summary: {
    auditHash: string;
    auditScore: number;
    blockedCount: number;
    nextAction: string;
    reviewCount: number;
    rowCount: number;
    status: BoardReleaseArchiveGovernanceAutomationAuditTrailStatus;
    verifiedCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveGovernanceAutomationAuditTrailInput {
  failureLedger: BoardReleaseArchiveGovernanceAutomationFailureLedgerReport;
  generatedAt?: string;
  runbook: BoardReleaseArchiveGovernanceAutomationRunbookReport;
  triggerRegister: BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveGovernanceAutomationAuditTrailKind, number> = {
  "packet-generation": 0,
  "trigger-evidence-link": 1,
  "operator-action": 2,
  "board-acknowledgement": 3,
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

function statusFor(input: CreateBoardReleaseArchiveGovernanceAutomationAuditTrailInput) {
  if (input.triggerRegister.summary.status === "blocked" || input.runbook.summary.status === "blocked" || input.failureLedger.summary.status === "blocking") {
    return "blocked" satisfies BoardReleaseArchiveGovernanceAutomationAuditTrailStatus;
  }

  if (input.triggerRegister.summary.status === "due" || input.runbook.summary.status === "watch" || input.failureLedger.summary.status === "monitor") {
    return "review" satisfies BoardReleaseArchiveGovernanceAutomationAuditTrailStatus;
  }

  return "verified" satisfies BoardReleaseArchiveGovernanceAutomationAuditTrailStatus;
}

function nextActionFor(input: {
  kind: BoardReleaseArchiveGovernanceAutomationAuditTrailKind;
  status: BoardReleaseArchiveGovernanceAutomationAuditTrailStatus;
}) {
  if (input.status === "blocked") {
    return `Repair blocked archive governance automation audit trail for ${input.kind}.`;
  }

  if (input.status === "review") {
    return `Review archive governance automation audit trail for ${input.kind}.`;
  }

  return `Archive governance automation audit trail is verified for ${input.kind}.`;
}

function createRow(input: CreateBoardReleaseArchiveGovernanceAutomationAuditTrailInput & {
  actorRole: string;
  kind: BoardReleaseArchiveGovernanceAutomationAuditTrailKind;
  sourceCount: number;
  title: string;
  workspaceId: string;
}) {
  const status = statusFor(input);
  const evidenceHash = sha256({
    failureLedger: input.failureLedger.summary.ledgerHash,
    runbook: input.runbook.summary.runbookHash,
    triggerRegister: input.triggerRegister.summary.registerHash,
  });
  const nextAction = nextActionFor({
    kind: input.kind,
    status,
  });
  const actionHash = sha256({
    actorRole: input.actorRole,
    evidenceHash,
    kind: input.kind,
    nextAction,
    status,
  });
  const acknowledgementHash = sha256({
    actionHash,
    boardStatus: input.failureLedger.summary.status,
    generatedAt: input.generatedAt,
    sourceCount: input.sourceCount,
  });

  return {
    acknowledgementHash,
    actionHash,
    actorRole: input.actorRole,
    evidenceHash,
    id: `archive-governance-automation-audit:${slug(input.workspaceId)}:${input.kind}`,
    kind: input.kind,
    nextAction,
    sourceCount: input.sourceCount,
    status,
    title: input.title,
  } satisfies BoardReleaseArchiveGovernanceAutomationAuditTrailRow;
}

function createRows(input: CreateBoardReleaseArchiveGovernanceAutomationAuditTrailInput & { generatedAt: string; workspaceId: string }) {
  return [
    createRow({
      ...input,
      actorRole: "release governance lead",
      kind: "packet-generation",
      sourceCount: input.runbook.rows.length,
      title: "Generated packet linkage",
    }),
    createRow({
      ...input,
      actorRole: "automation operator",
      kind: "trigger-evidence-link",
      sourceCount: input.triggerRegister.rows.length,
      title: "Trigger evidence linkage",
    }),
    createRow({
      ...input,
      actorRole: "governance owner",
      kind: "operator-action",
      sourceCount: input.failureLedger.rows.length,
      title: "Operator action record",
    }),
    createRow({
      ...input,
      actorRole: "board secretary",
      kind: "board-acknowledgement",
      sourceCount: input.failureLedger.rows.length + input.runbook.rows.length,
      title: "Board acknowledgement record",
    }),
  ].sort((first, second) => kindRank[first.kind] - kindRank[second.kind]);
}

function summarize(rows: BoardReleaseArchiveGovernanceAutomationAuditTrailRow[]): BoardReleaseArchiveGovernanceAutomationAuditTrailReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const verifiedCount = rows.filter((row) => row.status === "verified").length;
  const status: BoardReleaseArchiveGovernanceAutomationAuditTrailStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "verified";
  const auditScore = Math.max(0, Math.round((verifiedCount / Math.max(1, rows.length)) * 100 - reviewCount * 8 - blockedCount * 20));
  const nextRow = rows.find((row) => row.status === "blocked") ?? rows.find((row) => row.status === "review") ?? null;

  return {
    auditHash: sha256(rows.map((row) => row.acknowledgementHash)),
    auditScore,
    blockedCount,
    nextAction: nextRow?.nextAction ?? "Archive governance automation audit trail is verified.",
    reviewCount,
    rowCount: rows.length,
    status,
    verifiedCount,
  };
}

function createCsv(rows: BoardReleaseArchiveGovernanceAutomationAuditTrailRow[]) {
  const header = ["audit_id", "kind", "title", "status", "actor_role", "evidence_hash", "action_hash", "acknowledgement_hash", "next_action"];
  const body = rows.map((row) =>
    [row.id, row.kind, row.title, row.status, row.actorRole, row.evidenceHash, row.actionHash, row.acknowledgementHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveGovernanceAutomationAuditTrailRow[];
  summary: BoardReleaseArchiveGovernanceAutomationAuditTrailReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveGovernanceAutomationAuditTrail(
  input: CreateBoardReleaseArchiveGovernanceAutomationAuditTrailInput,
): BoardReleaseArchiveGovernanceAutomationAuditTrailReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.triggerRegister.workspaceId;
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-governance-automation-audit-trail-${dateStamp(generatedAt)}`;

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
