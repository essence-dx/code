import { createHash } from "node:crypto";
import type { RuntimeReleaseAutomationRunbook } from "@/features/projects/runtime-release-automation-runbook";

export type RuntimeReleaseAutomationCommandCenterStatus = "archived" | "blocked" | "ready" | "rollback-ready";
export type RuntimeReleaseAutomationPrimaryActionKind = "archive" | "promote" | "resolve-blockers" | "rollback";
export type RuntimeReleaseAutomationCommandCenterFileFormat = "csv" | "json";

export interface RuntimeReleaseAutomationCommandCenterCandidate {
  archivedAt?: string;
  lastRollbackDrillAt?: string;
  owner: string;
  runbook: RuntimeReleaseAutomationRunbook;
}

export interface RuntimeReleaseAutomationCommandCenterRow {
  evidenceHash: string;
  id: string;
  nextAction: string;
  owner: string;
  primaryActionKind: RuntimeReleaseAutomationPrimaryActionKind;
  productionAlias: string;
  releaseCandidateId: string;
  score: number;
  status: RuntimeReleaseAutomationCommandCenterStatus;
}

export interface RuntimeReleaseAutomationCommandCenterFile {
  download: string;
  format: RuntimeReleaseAutomationCommandCenterFileFormat;
  href: string;
  label: string;
}

export interface RuntimeReleaseAutomationCommandCenter {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: RuntimeReleaseAutomationCommandCenterFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  rows: RuntimeReleaseAutomationCommandCenterRow[];
  summary: {
    archivedCount: number;
    blockedCount: number;
    commandCenterHash: string;
    commandCenterScore: number;
    nextAction: string;
    readyCount: number;
    rollbackReadyCount: number;
    rowCount: number;
    status: "blocked" | "ready";
  };
  workspaceId: string;
}

export interface CreateRuntimeReleaseAutomationCommandCenterInput {
  candidates: RuntimeReleaseAutomationCommandCenterCandidate[];
  generatedAt?: string;
  workspaceId?: string;
}

const statusRank: Record<RuntimeReleaseAutomationCommandCenterStatus, number> = {
  blocked: 0,
  "rollback-ready": 1,
  ready: 2,
  archived: 3,
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

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
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

function statusFor(candidate: RuntimeReleaseAutomationCommandCenterCandidate): RuntimeReleaseAutomationCommandCenterStatus {
  if (candidate.archivedAt) {
    return "archived";
  }

  if (candidate.runbook.summary.status === "blocked") {
    return "blocked";
  }

  return candidate.lastRollbackDrillAt ? "rollback-ready" : "ready";
}

function actionFor(status: RuntimeReleaseAutomationCommandCenterStatus): RuntimeReleaseAutomationPrimaryActionKind {
  if (status === "blocked") {
    return "resolve-blockers";
  }

  if (status === "rollback-ready") {
    return "rollback";
  }

  if (status === "archived") {
    return "archive";
  }

  return "promote";
}

function nextActionFor(input: {
  action: RuntimeReleaseAutomationPrimaryActionKind;
  alias: string;
  releaseCandidateId: string;
}) {
  if (input.action === "resolve-blockers") {
    return `Resolve automation blockers before promoting ${input.releaseCandidateId}.`;
  }

  if (input.action === "rollback") {
    return `Keep rollback controls ready for ${input.alias} before promotion.`;
  }

  if (input.action === "archive") {
    return `Archive ${input.releaseCandidateId} command evidence with the release record.`;
  }

  return `Promote ${input.releaseCandidateId} to ${input.alias}.`;
}

function createRows(candidates: RuntimeReleaseAutomationCommandCenterCandidate[]): RuntimeReleaseAutomationCommandCenterRow[] {
  return candidates
    .map((candidate) => {
      const status = statusFor(candidate);
      const primaryActionKind = actionFor(status);
      const releaseCandidateId = candidate.runbook.summary.releaseCandidateId;
      const productionAlias = candidate.runbook.summary.productionAlias;
      const nextAction = nextActionFor({
        action: primaryActionKind,
        alias: productionAlias,
        releaseCandidateId,
      });

      return {
        evidenceHash: sha256({
          archivedAt: candidate.archivedAt ?? null,
          lastRollbackDrillAt: candidate.lastRollbackDrillAt ?? null,
          owner: candidate.owner,
          primaryActionKind,
          runbookHash: candidate.runbook.summary.runbookHash,
          status,
        }),
        id: `runtime-release-automation-command-center:${slug(releaseCandidateId)}`,
        nextAction,
        owner: candidate.owner,
        primaryActionKind,
        productionAlias,
        releaseCandidateId,
        score: candidate.runbook.summary.runbookScore,
        status,
      } satisfies RuntimeReleaseAutomationCommandCenterRow;
    })
    .sort((first, second) => statusRank[first.status] - statusRank[second.status] || second.score - first.score || first.releaseCandidateId.localeCompare(second.releaseCandidateId));
}

function summarize(rows: RuntimeReleaseAutomationCommandCenterRow[]): RuntimeReleaseAutomationCommandCenter["summary"] {
  const archivedCount = rows.filter((row) => row.status === "archived").length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const rollbackReadyCount = rows.filter((row) => row.status === "rollback-ready").length;
  const actionableRows = rows.filter((row) => row.status !== "archived");
  const commandCenterScore = Math.max(
    0,
    Math.min(100, Math.round(actionableRows.reduce((total, row) => total + row.score, 0) / Math.max(1, actionableRows.length)) - blockedCount * 12),
  );
  const status = blockedCount > 0 ? "blocked" : "ready";

  return {
    archivedCount,
    blockedCount,
    commandCenterHash: sha256(rows.map((row) => row.evidenceHash)),
    commandCenterScore,
    nextAction:
      status === "blocked"
        ? "Resolve blocked release automation candidates before promotion."
        : "Promote ready candidates and keep rollback-ready candidates guarded.",
    readyCount,
    rollbackReadyCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: RuntimeReleaseAutomationCommandCenterRow[]) {
  const header = ["candidate_id", "status", "score", "owner", "primary_action", "evidence_hash", "next_action"];
  const body = rows.map((row) => [row.releaseCandidateId, row.status, row.score, row.owner, row.primaryActionKind, row.evidenceHash, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: {
  csvDataUri: string;
  csvFileName: string;
  jsonDataUri: string;
  jsonFileName: string;
}): RuntimeReleaseAutomationCommandCenterFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV command center",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON command center",
    },
  ];
}

export function createRuntimeReleaseAutomationCommandCenter(input: CreateRuntimeReleaseAutomationCommandCenterInput): RuntimeReleaseAutomationCommandCenter {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? input.candidates[0]?.runbook.workspaceId ?? "workspace";
  const rows = createRows(input.candidates);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-runtime-release-automation-command-center-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: filesFor({
      csvDataUri,
      csvFileName,
      jsonDataUri,
      jsonFileName,
    }),
    generatedAt,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    rows,
    summary,
    workspaceId,
  };
}
