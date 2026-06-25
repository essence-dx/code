import { createHash } from "node:crypto";
import type { BoardReleaseArchiveGovernanceExecutivePacketReport, BoardReleaseArchiveGovernanceExecutivePacketRow } from "@/features/projects/board-release-archive-governance-executive-packet";

export type BoardReleaseArchiveGovernanceAutomationTriggerKind =
  | "drift-review"
  | "executive-packet-regeneration"
  | "ownership-renewal"
  | "quorum-refresh";

export type BoardReleaseArchiveGovernanceAutomationTriggerStatus = "blocked" | "due" | "scheduled";

export interface BoardReleaseArchiveGovernanceAutomationTriggerRow {
  cadence: string;
  evidenceHash: string;
  id: string;
  kind: BoardReleaseArchiveGovernanceAutomationTriggerKind;
  nextAction: string;
  nextRunAt: string;
  ownerRole: string;
  status: BoardReleaseArchiveGovernanceAutomationTriggerStatus;
  title: string;
  triggerHash: string;
}

export interface BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: BoardReleaseArchiveGovernanceAutomationTriggerRow[];
  summary: {
    automationScore: number;
    blockedCount: number;
    dueCount: number;
    nextAction: string;
    registerHash: string;
    rowCount: number;
    scheduledCount: number;
    status: BoardReleaseArchiveGovernanceAutomationTriggerStatus;
  };
  workspaceId: string;
}

export interface CreateBoardReleaseArchiveGovernanceAutomationTriggerRegisterInput {
  executivePacket: BoardReleaseArchiveGovernanceExecutivePacketReport;
  generatedAt?: string;
  workspaceId?: string;
}

const kindRank: Record<BoardReleaseArchiveGovernanceAutomationTriggerKind, number> = {
  "ownership-renewal": 0,
  "quorum-refresh": 1,
  "drift-review": 2,
  "executive-packet-regeneration": 3,
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

function addDays(value: string, days: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString();
}

function rowStatus(sourceRow: BoardReleaseArchiveGovernanceExecutivePacketRow | undefined, executivePacket: BoardReleaseArchiveGovernanceExecutivePacketReport) {
  if (sourceRow?.status === "blocked" || executivePacket.summary.status === "blocked") {
    return "blocked" satisfies BoardReleaseArchiveGovernanceAutomationTriggerStatus;
  }

  return sourceRow?.status === "watch" || executivePacket.summary.status === "watch" ? "due" : "scheduled";
}

function nextActionFor(input: {
  sourceTitle: string;
  status: BoardReleaseArchiveGovernanceAutomationTriggerStatus;
  title: string;
}) {
  if (input.status === "blocked") {
    return `Repair blocked archive governance automation trigger for ${input.title} before regenerating packets.`;
  }

  if (input.status === "due") {
    return `Refresh due archive governance automation trigger for ${input.title} using ${input.sourceTitle}.`;
  }

  return `Keep ${input.title} scheduled and ready for archive governance automation.`;
}

function createRow(input: {
  cadence: string;
  generatedAt: string;
  kind: BoardReleaseArchiveGovernanceAutomationTriggerKind;
  nextRunDays: number;
  ownerRole: string;
  sourceRow: BoardReleaseArchiveGovernanceExecutivePacketRow | undefined;
  sourceTitle: string;
  status: BoardReleaseArchiveGovernanceAutomationTriggerStatus;
  title: string;
  workspaceId: string;
}) {
  const evidenceHash = input.sourceRow?.packetHash ?? sha256(`${input.kind}:${input.workspaceId}`);
  const nextRunAt = addDays(input.generatedAt, input.status === "blocked" ? 1 : input.nextRunDays);
  const nextAction = nextActionFor({
    sourceTitle: input.sourceTitle,
    status: input.status,
    title: input.title,
  });
  const triggerHash = sha256({
    cadence: input.cadence,
    evidenceHash,
    kind: input.kind,
    nextRunAt,
    ownerRole: input.ownerRole,
    status: input.status,
  });

  return {
    cadence: input.cadence,
    evidenceHash,
    id: `archive-governance-automation-trigger:${slug(input.workspaceId)}:${input.kind}`,
    kind: input.kind,
    nextAction,
    nextRunAt,
    ownerRole: input.ownerRole,
    status: input.status,
    title: input.title,
    triggerHash,
  } satisfies BoardReleaseArchiveGovernanceAutomationTriggerRow;
}

function findRow(executivePacket: BoardReleaseArchiveGovernanceExecutivePacketReport, kind: BoardReleaseArchiveGovernanceExecutivePacketRow["kind"]) {
  return executivePacket.rows.find((row) => row.kind === kind);
}

function createRows(input: {
  executivePacket: BoardReleaseArchiveGovernanceExecutivePacketReport;
  generatedAt: string;
  workspaceId: string;
}) {
  const ownerMatrix = findRow(input.executivePacket, "control-owner-matrix");
  const quorum = findRow(input.executivePacket, "exception-quorum");
  const drift = findRow(input.executivePacket, "policy-drift");
  const recommendation = findRow(input.executivePacket, "release-recommendation");

  return [
    createRow({
      cadence: "monthly",
      generatedAt: input.generatedAt,
      kind: "ownership-renewal",
      nextRunDays: 30,
      ownerRole: "governance owner",
      sourceRow: ownerMatrix,
      sourceTitle: ownerMatrix?.title ?? "control owner matrix",
      status: rowStatus(ownerMatrix, input.executivePacket),
      title: "Ownership renewal trigger",
      workspaceId: input.workspaceId,
    }),
    createRow({
      cadence: "biweekly",
      generatedAt: input.generatedAt,
      kind: "quorum-refresh",
      nextRunDays: 14,
      ownerRole: "board secretary",
      sourceRow: quorum,
      sourceTitle: quorum?.title ?? "exception quorum tracker",
      status: rowStatus(quorum, input.executivePacket),
      title: "Quorum refresh trigger",
      workspaceId: input.workspaceId,
    }),
    createRow({
      cadence: "weekly",
      generatedAt: input.generatedAt,
      kind: "drift-review",
      nextRunDays: 7,
      ownerRole: "policy reviewer",
      sourceRow: drift,
      sourceTitle: drift?.title ?? "policy drift monitor",
      status: rowStatus(drift, input.executivePacket),
      title: "Policy drift review trigger",
      workspaceId: input.workspaceId,
    }),
    createRow({
      cadence: "after-trigger-change",
      generatedAt: input.generatedAt,
      kind: "executive-packet-regeneration",
      nextRunDays: 2,
      ownerRole: "release governance lead",
      sourceRow: recommendation,
      sourceTitle: recommendation?.title ?? "release recommendation",
      status: rowStatus(recommendation, input.executivePacket),
      title: "Executive packet regeneration trigger",
      workspaceId: input.workspaceId,
    }),
  ].sort((first, second) => kindRank[first.kind] - kindRank[second.kind]);
}

function summarize(rows: BoardReleaseArchiveGovernanceAutomationTriggerRow[]): BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const dueCount = rows.filter((row) => row.status === "due").length;
  const scheduledCount = rows.filter((row) => row.status === "scheduled").length;
  const status: BoardReleaseArchiveGovernanceAutomationTriggerStatus = blockedCount > 0 ? "blocked" : dueCount > 0 ? "due" : "scheduled";
  const automationScore = Math.max(0, Math.round((scheduledCount / Math.max(1, rows.length)) * 100 - dueCount * 8 - blockedCount * 20));
  const nextRow = rows.find((row) => row.status === "blocked") ?? rows.find((row) => row.status === "due") ?? null;

  return {
    automationScore,
    blockedCount,
    dueCount,
    nextAction: nextRow?.nextAction ?? "Archive governance automation triggers are scheduled.",
    registerHash: sha256(rows.map((row) => row.triggerHash)),
    rowCount: rows.length,
    scheduledCount,
    status,
  };
}

function createCsv(rows: BoardReleaseArchiveGovernanceAutomationTriggerRow[]) {
  const header = ["trigger_id", "kind", "title", "status", "cadence", "owner_role", "evidence_hash", "next_run_at", "next_action"];
  const body = rows.map((row) =>
    [row.id, row.kind, row.title, row.status, row.cadence, row.ownerRole, row.evidenceHash, row.nextRunAt, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function createJson(input: {
  generatedAt: string;
  rows: BoardReleaseArchiveGovernanceAutomationTriggerRow[];
  summary: BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport["summary"];
  workspaceId: string;
}) {
  return JSON.stringify(input, null, 2);
}

export function createBoardReleaseArchiveGovernanceAutomationTriggerRegister(
  input: CreateBoardReleaseArchiveGovernanceAutomationTriggerRegisterInput,
): BoardReleaseArchiveGovernanceAutomationTriggerRegisterReport {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.executivePacket.workspaceId;
  const rows = createRows({
    executivePacket: input.executivePacket,
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
  const fileBase = `${slug(workspaceId)}-board-release-archive-governance-automation-trigger-register-${dateStamp(generatedAt)}`;

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
