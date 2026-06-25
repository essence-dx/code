import { createHash } from "node:crypto";
import type {
  BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport,
  BoardReleaseArchiveGovernanceAutomationTriggerRow,
} from "@/features/projects/board-release-archive-governance-automation-trigger-register";

export type BoardReleaseArchiveGovernanceAutomationRunbookKind =
  | "escalation-window"
  | "operator-handoff"
  | "retry-policy"
  | "scheduler-cadence";

export type BoardReleaseArchiveGovernanceAutomationRunbookStatus = "blocked" | "ready" | "watch";

export interface BoardReleaseArchiveGovernanceAutomationRunbookRow {
  evidenceHash: string;
  id: string;
  kind: BoardReleaseArchiveGovernanceAutomationRunbookKind;
  nextAction: string;
  ownerRole: string;
  runbookHash: string;
  sla: string;
  sourceTriggerCount: number;
  status: BoardReleaseArchiveGovernanceAutomationRunbookStatus;
  title: string;
}

export interface BoardReleaseArchiveGovernanceAutomationRunbookReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveGovernanceAutomationRunbookRow[];
  summary: {
    blockedCount: number;
    nextAction: string;
    readyCount: number;
    rowCount: number;
    runbookHash: string;
    runbookScore: number;
    status: BoardReleaseArchiveGovernanceAutomationRunbookStatus;
    watchCount: number;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveGovernanceAutomationRunbookInput {
  generatedAt?: string;
  triggerRegister: BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveGovernanceAutomationRunbookKind, number> = {
  "scheduler-cadence": 0,
  "escalation-window": 1,
  "retry-policy": 2,
  "operator-handoff": 3,
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

function rowStatus(
  triggerRegister: BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport,
  sourceRows: BoardReleaseArchiveGovernanceAutomationTriggerRow[],
): BoardReleaseArchiveGovernanceAutomationRunbookStatus {
  if (triggerRegister.summary.status === "blocked" || sourceRows.some((row) => row.status === "blocked")) {
    return "blocked";
  }

  if (triggerRegister.summary.status === "due" || sourceRows.some((row) => row.status === "due")) {
    return "watch";
  }

  return "ready";
}

function rowNextAction(input: {
  kind: BoardReleaseArchiveGovernanceAutomationRunbookKind;
  sourceRows: BoardReleaseArchiveGovernanceAutomationTriggerRow[];
  status: BoardReleaseArchiveGovernanceAutomationRunbookStatus;
}) {
  const blockedRow = input.sourceRows.find((row) => row.status === "blocked");
  const dueRow = input.sourceRows.find((row) => row.status === "due");
  const row = blockedRow ?? dueRow ?? input.sourceRows[0];

  if (input.status === "blocked") {
    return `Repair blocked archive governance automation runbook for ${row?.title ?? input.kind}.`;
  }

  if (input.status === "watch") {
    return `Tighten archive governance automation runbook for ${row?.title ?? input.kind}.`;
  }

  return `Archive governance automation runbook is ready for ${input.kind}.`;
}

function createRow(input: {
  kind: BoardReleaseArchiveGovernanceAutomationRunbookKind;
  ownerRole: string;
  sla: string;
  sourceRows: BoardReleaseArchiveGovernanceAutomationTriggerRow[];
  title: string;
  triggerRegister: BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport;
  workspaceId: string;
}) {
  const status = rowStatus(input.triggerRegister, input.sourceRows);
  const evidenceHash = sha256(input.sourceRows.map((row) => row.triggerHash));
  const nextAction = rowNextAction({
    kind: input.kind,
    sourceRows: input.sourceRows,
    status,
  });
  const runbookHash = sha256({
    evidenceHash,
    kind: input.kind,
    nextAction,
    ownerRole: input.ownerRole,
    sla: input.sla,
    status,
  });

  return {
    evidenceHash,
    id: `archive-governance-automation-runbook:${slug(input.workspaceId)}:${input.kind}`,
    kind: input.kind,
    nextAction,
    ownerRole: input.ownerRole,
    runbookHash,
    sla: input.sla,
    sourceTriggerCount: input.sourceRows.length,
    status,
    title: input.title,
  } satisfies BoardReleaseArchiveGovernanceAutomationRunbookRow;
}

function rowsByStatus(
  triggerRegister: BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport,
  status: BoardReleaseArchiveGovernanceAutomationTriggerRow["status"],
) {
  return triggerRegister.rows.filter((row) => row.status === status);
}

function createRows(input: {
  triggerRegister: BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport;
  workspaceId: string;
}) {
  const blockedRows = rowsByStatus(input.triggerRegister, "blocked");
  const dueRows = rowsByStatus(input.triggerRegister, "due");
  const rowsWithIssues = [...blockedRows, ...dueRows];
  const allRows = input.triggerRegister.rows;

  return [
    createRow({
      kind: "scheduler-cadence",
      ownerRole: "release governance lead",
      sla: `Run ${allRows.map((row) => row.cadence).join(", ")} archive governance automation cadences with evidence-preserving outputs.`,
      sourceRows: allRows,
      title: "Scheduler cadence",
      triggerRegister: input.triggerRegister,
      workspaceId: input.workspaceId,
    }),
    createRow({
      kind: "escalation-window",
      ownerRole: "board secretary",
      sla: "Escalate blocked triggers within 1 business day and due triggers within 2 business days.",
      sourceRows: rowsWithIssues.length > 0 ? rowsWithIssues : allRows,
      title: "Escalation windows",
      triggerRegister: input.triggerRegister,
      workspaceId: input.workspaceId,
    }),
    createRow({
      kind: "retry-policy",
      ownerRole: "automation operator",
      sla: "Retry failed trigger jobs up to 3 times with bounded backoff and unchanged evidence hashes.",
      sourceRows: rowsWithIssues.length > 0 ? rowsWithIssues : allRows,
      title: "Retry policy",
      triggerRegister: input.triggerRegister,
      workspaceId: input.workspaceId,
    }),
    createRow({
      kind: "operator-handoff",
      ownerRole: "governance owner",
      sla: "Attach trigger register evidence, owner notes, and handoff acknowledgement before packet regeneration.",
      sourceRows: allRows,
      title: "Operator handoff evidence",
      triggerRegister: input.triggerRegister,
      workspaceId: input.workspaceId,
    }),
  ].sort((first, second) => kindRank[first.kind] - kindRank[second.kind]);
}

function summarize(rows: BoardReleaseArchiveGovernanceAutomationRunbookRow[]): BoardReleaseArchiveGovernanceAutomationRunbookReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const status: BoardReleaseArchiveGovernanceAutomationRunbookStatus = blockedCount > 0 ? "blocked" : watchCount > 0 ? "watch" : "ready";
  const runbookScore = Math.max(0, Math.round((readyCount / Math.max(1, rows.length)) * 100 - watchCount * 8 - blockedCount * 20));
  const nextRow = rows.find((row) => row.status === "blocked") ?? rows.find((row) => row.status === "watch") ?? null;

  return {
    blockedCount,
    nextAction: nextRow?.nextAction ?? "Archive governance automation runbook is ready.",
    readyCount,
    rowCount: rows.length,
    runbookHash: sha256(rows.map((row) => row.runbookHash)),
    runbookScore,
    status,
    watchCount,
  };
}

function createCsv(rows: BoardReleaseArchiveGovernanceAutomationRunbookRow[]) {
  const header = ["runbook_id", "kind", "title", "status", "owner_role", "sla", "evidence_hash", "runbook_hash", "next_action"];
  const body = rows.map((row) =>
    [row.id, row.kind, row.title, row.status, row.ownerRole, row.sla, row.evidenceHash, row.runbookHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveGovernanceAutomationRunbookRow[];
  summary: BoardReleaseArchiveGovernanceAutomationRunbookReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveGovernanceAutomationRunbook(
  input: CreateBoardReleaseArchiveGovernanceAutomationRunbookInput,
): BoardReleaseArchiveGovernanceAutomationRunbookReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.triggerRegister.workspaceId;
  const rows = createRows({
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-governance-automation-runbook-${dateStamp(generatedAt)}`;

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
