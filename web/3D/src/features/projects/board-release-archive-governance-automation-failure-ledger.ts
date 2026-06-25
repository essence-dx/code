import { createHash } from "node:crypto";
import type { BoardReleaseArchiveGovernanceAutomationRunbookReport } from "@/features/projects/board-release-archive-governance-automation-runbook";
import type {
  BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport,
  BoardReleaseArchiveGovernanceAutomationTriggerRow,
} from "@/features/projects/board-release-archive-governance-automation-trigger-register";

export type BoardReleaseArchiveGovernanceAutomationFailureLedgerKind =
  | "blocked-owner"
  | "missed-trigger"
  | "remediation-approval"
  | "stale-recommendation";

export type BoardReleaseArchiveGovernanceAutomationFailureLedgerSeverity = "high" | "low" | "medium";

export type BoardReleaseArchiveGovernanceAutomationFailureLedgerStatus = "blocking" | "clear" | "monitor";

export interface BoardReleaseArchiveGovernanceAutomationFailureLedgerRow {
  evidenceHash: string;
  id: string;
  kind: BoardReleaseArchiveGovernanceAutomationFailureLedgerKind;
  nextAction: string;
  ownerRole: string;
  remediationHash: string;
  severity: BoardReleaseArchiveGovernanceAutomationFailureLedgerSeverity;
  sourceCount: number;
  status: BoardReleaseArchiveGovernanceAutomationFailureLedgerStatus;
  title: string;
}

export interface BoardReleaseArchiveGovernanceAutomationFailureLedgerReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveGovernanceAutomationFailureLedgerRow[];
  summary: {
    blockingCount: number;
    clearCount: number;
    ledgerHash: string;
    ledgerScore: number;
    monitorCount: number;
    nextAction: string;
    rowCount: number;
    status: BoardReleaseArchiveGovernanceAutomationFailureLedgerStatus;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveGovernanceAutomationFailureLedgerInput {
  generatedAt?: string;
  runbook: BoardReleaseArchiveGovernanceAutomationRunbookReport;
  triggerRegister: BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveGovernanceAutomationFailureLedgerKind, number> = {
  "missed-trigger": 0,
  "stale-recommendation": 1,
  "blocked-owner": 2,
  "remediation-approval": 3,
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

function statusFor(input: {
  runbook: BoardReleaseArchiveGovernanceAutomationRunbookReport;
  sourceRows: BoardReleaseArchiveGovernanceAutomationTriggerRow[];
  triggerRegister: BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport;
}) {
  if (input.triggerRegister.summary.status === "blocked" || input.runbook.summary.status === "blocked" || input.sourceRows.some((row) => row.status === "blocked")) {
    return "blocking" satisfies BoardReleaseArchiveGovernanceAutomationFailureLedgerStatus;
  }

  if (input.triggerRegister.summary.status === "due" || input.runbook.summary.status === "watch" || input.sourceRows.some((row) => row.status === "due")) {
    return "monitor" satisfies BoardReleaseArchiveGovernanceAutomationFailureLedgerStatus;
  }

  return "clear" satisfies BoardReleaseArchiveGovernanceAutomationFailureLedgerStatus;
}

function severityFor(status: BoardReleaseArchiveGovernanceAutomationFailureLedgerStatus) {
  if (status === "blocking") {
    return "high" satisfies BoardReleaseArchiveGovernanceAutomationFailureLedgerSeverity;
  }

  return status === "monitor" ? "medium" : "low";
}

function nextActionFor(input: {
  kind: BoardReleaseArchiveGovernanceAutomationFailureLedgerKind;
  sourceRows: BoardReleaseArchiveGovernanceAutomationTriggerRow[];
  status: BoardReleaseArchiveGovernanceAutomationFailureLedgerStatus;
}) {
  const sourceTitle = input.sourceRows.find((row) => row.status === "blocked")?.title ?? input.sourceRows.find((row) => row.status === "due")?.title ?? input.sourceRows[0]?.title ?? input.kind;

  if (input.status === "blocking") {
    return `Approve remediation for blocked archive governance automation failures in ${sourceTitle}.`;
  }

  if (input.status === "monitor") {
    return `Review archive governance automation failure ledger for ${sourceTitle}.`;
  }

  return `Archive governance automation failure ledger is clear for ${input.kind}.`;
}

function createRow(input: {
  kind: BoardReleaseArchiveGovernanceAutomationFailureLedgerKind;
  ownerRole: string;
  runbook: BoardReleaseArchiveGovernanceAutomationRunbookReport;
  sourceRows: BoardReleaseArchiveGovernanceAutomationTriggerRow[];
  title: string;
  triggerRegister: BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport;
  workspaceId: string;
}) {
  const status = statusFor({
    runbook: input.runbook,
    sourceRows: input.sourceRows,
    triggerRegister: input.triggerRegister,
  });
  const severity = severityFor(status);
  const evidenceHash = sha256({
    registerHash: input.triggerRegister.summary.registerHash,
    runbookHash: input.runbook.summary.runbookHash,
    triggers: input.sourceRows.map((row) => row.triggerHash),
  });
  const nextAction = nextActionFor({
    kind: input.kind,
    sourceRows: input.sourceRows,
    status,
  });
  const remediationHash = sha256({
    evidenceHash,
    kind: input.kind,
    nextAction,
    ownerRole: input.ownerRole,
    severity,
    status,
  });

  return {
    evidenceHash,
    id: `archive-governance-automation-failure:${slug(input.workspaceId)}:${input.kind}`,
    kind: input.kind,
    nextAction,
    ownerRole: input.ownerRole,
    remediationHash,
    severity,
    sourceCount: input.sourceRows.length,
    status,
    title: input.title,
  } satisfies BoardReleaseArchiveGovernanceAutomationFailureLedgerRow;
}

function rowsByStatus(
  triggerRegister: BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport,
  status: BoardReleaseArchiveGovernanceAutomationTriggerRow["status"],
) {
  return triggerRegister.rows.filter((row) => row.status === status);
}

function createRows(input: {
  runbook: BoardReleaseArchiveGovernanceAutomationRunbookReport;
  triggerRegister: BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport;
  workspaceId: string;
}) {
  const blockedRows = rowsByStatus(input.triggerRegister, "blocked");
  const dueRows = rowsByStatus(input.triggerRegister, "due");
  const issueRows = [...blockedRows, ...dueRows];
  const fallbackRows = issueRows.length > 0 ? issueRows : input.triggerRegister.rows;

  return [
    createRow({
      kind: "missed-trigger",
      ownerRole: "automation operator",
      runbook: input.runbook,
      sourceRows: dueRows.length > 0 ? dueRows : fallbackRows,
      title: "Missed trigger review",
      triggerRegister: input.triggerRegister,
      workspaceId: input.workspaceId,
    }),
    createRow({
      kind: "stale-recommendation",
      ownerRole: "release governance lead",
      runbook: input.runbook,
      sourceRows: issueRows.length > 0 ? issueRows : input.triggerRegister.rows,
      title: "Stale recommendation review",
      triggerRegister: input.triggerRegister,
      workspaceId: input.workspaceId,
    }),
    createRow({
      kind: "blocked-owner",
      ownerRole: "governance owner",
      runbook: input.runbook,
      sourceRows: blockedRows.length > 0 ? blockedRows : fallbackRows,
      title: "Blocked owner review",
      triggerRegister: input.triggerRegister,
      workspaceId: input.workspaceId,
    }),
    createRow({
      kind: "remediation-approval",
      ownerRole: "board secretary",
      runbook: input.runbook,
      sourceRows: issueRows.length > 0 ? issueRows : input.triggerRegister.rows,
      title: "Remediation approval",
      triggerRegister: input.triggerRegister,
      workspaceId: input.workspaceId,
    }),
  ].sort((first, second) => kindRank[first.kind] - kindRank[second.kind]);
}

function summarize(rows: BoardReleaseArchiveGovernanceAutomationFailureLedgerRow[]): BoardReleaseArchiveGovernanceAutomationFailureLedgerReport["summary"] {
  const blockingCount = rows.filter((row) => row.status === "blocking").length;
  const monitorCount = rows.filter((row) => row.status === "monitor").length;
  const clearCount = rows.filter((row) => row.status === "clear").length;
  const status: BoardReleaseArchiveGovernanceAutomationFailureLedgerStatus = blockingCount > 0 ? "blocking" : monitorCount > 0 ? "monitor" : "clear";
  const ledgerScore = Math.max(0, Math.round((clearCount / Math.max(1, rows.length)) * 100 - monitorCount * 8 - blockingCount * 20));
  const nextRow = rows.find((row) => row.status === "blocking") ?? rows.find((row) => row.status === "monitor") ?? null;

  return {
    blockingCount,
    clearCount,
    ledgerHash: sha256(rows.map((row) => row.remediationHash)),
    ledgerScore,
    monitorCount,
    nextAction: nextRow?.nextAction ?? "Archive governance automation failure ledger is clear.",
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: BoardReleaseArchiveGovernanceAutomationFailureLedgerRow[]) {
  const header = ["failure_id", "kind", "title", "status", "owner_role", "severity", "evidence_hash", "remediation_hash", "next_action"];
  const body = rows.map((row) =>
    [row.id, row.kind, row.title, row.status, row.ownerRole, row.severity, row.evidenceHash, row.remediationHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveGovernanceAutomationFailureLedgerRow[];
  summary: BoardReleaseArchiveGovernanceAutomationFailureLedgerReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveGovernanceAutomationFailureLedger(
  input: CreateBoardReleaseArchiveGovernanceAutomationFailureLedgerInput,
): BoardReleaseArchiveGovernanceAutomationFailureLedgerReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.triggerRegister.workspaceId;
  const rows = createRows({
    runbook: input.runbook,
    triggerRegister: input.triggerRegister,
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-governance-automation-failure-ledger-${dateStamp(generatedAt)}`;

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
