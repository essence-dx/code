import { createHash } from "node:crypto";
import type { RuntimeQaPacket } from "@/features/projects/runtime-qa-packet";

export type RuntimeDeployVerificationStatus = "blocked" | "ready";

export interface RuntimeDeployVerificationRecord {
  alias: string;
  checkedAt: string;
  commitHash: string;
  deploymentUrl: string;
  packetHash: string;
  smokeStatus: RuntimeDeployVerificationStatus;
}

export interface RuntimeDeployVerificationHistoryRecord extends RuntimeDeployVerificationRecord {
  driftSummary: string;
  recordHash: string;
}

export interface RuntimeDeployVerificationHistory {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  records: RuntimeDeployVerificationHistoryRecord[];
  summary: {
    aliasDriftCount: number;
    blockedCount: number;
    commitDriftCount: number;
    currentCommitHash: string | null;
    currentDeploymentUrl: string | null;
    currentPacketHash: string | null;
    historyHash: string;
    nextAction: string;
    packetDriftCount: number;
    readyCount: number;
    recordCount: number;
    status: RuntimeDeployVerificationStatus;
  };
  workspaceId: string;
}

export interface CreateRuntimeDeployVerificationHistoryInput {
  generatedAt?: string;
  productionAlias: string;
  records: RuntimeDeployVerificationRecord[];
  runtimeQaPacket: RuntimeQaPacket;
  workspaceId?: string;
}

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

function csvCell(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function encodeDataUri(mimeType: string, content: string) {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
}

function normalizeAlias(value: string) {
  return value.trim().toLowerCase();
}

function createDriftSummary(input: {
  current: RuntimeDeployVerificationRecord;
  expectedPacketHash: string;
  previous?: RuntimeDeployVerificationRecord;
  productionAlias: string;
}) {
  const issues: string[] = [];

  if (normalizeAlias(input.current.alias) !== normalizeAlias(input.productionAlias)) {
    issues.push("alias drift");
  }

  if (input.previous && input.current.commitHash !== input.previous.commitHash) {
    issues.push("commit drift");
  }

  if (input.current.packetHash !== input.expectedPacketHash) {
    issues.push("packet drift");
  } else if (input.previous && input.current.packetHash !== input.previous.packetHash) {
    issues.push("packet updated");
  }

  if (input.current.smokeStatus === "blocked") {
    issues.push("smoke blocked");
  }

  return issues.length ? issues.join(", ") : "no drift";
}

function createHistoryRecord(input: {
  current: RuntimeDeployVerificationRecord;
  expectedPacketHash: string;
  previous?: RuntimeDeployVerificationRecord;
  productionAlias: string;
}): RuntimeDeployVerificationHistoryRecord {
  const driftSummary = createDriftSummary(input);
  const base = {
    ...input.current,
    driftSummary,
  };

  return {
    ...base,
    recordHash: sha256(base),
  };
}

function sortRecords(records: RuntimeDeployVerificationRecord[]) {
  return [...records].sort((first, second) => first.checkedAt.localeCompare(second.checkedAt) || first.deploymentUrl.localeCompare(second.deploymentUrl));
}

function summarize(input: {
  expectedPacketHash: string;
  productionAlias: string;
  records: RuntimeDeployVerificationHistoryRecord[];
}): RuntimeDeployVerificationHistory["summary"] {
  const current = input.records.at(-1) ?? null;
  const aliasDriftCount = input.records.filter((record) => normalizeAlias(record.alias) !== normalizeAlias(input.productionAlias)).length;
  const blockedCount = input.records.filter((record) => record.smokeStatus === "blocked").length;
  const commitDriftCount = input.records.filter((record, index) => index > 0 && record.commitHash !== input.records[index - 1]?.commitHash).length;
  const packetDriftCount = input.records.filter((record) => record.packetHash !== input.expectedPacketHash).length;
  const readyCount = input.records.length - blockedCount;
  const currentAliasDrift = current ? normalizeAlias(current.alias) !== normalizeAlias(input.productionAlias) : true;
  const currentPacketDrift = current ? current.packetHash !== input.expectedPacketHash : true;
  const currentSmokeBlocked = current ? current.smokeStatus === "blocked" : true;
  const status: RuntimeDeployVerificationStatus = currentAliasDrift || currentPacketDrift || currentSmokeBlocked ? "blocked" : "ready";

  return {
    aliasDriftCount,
    blockedCount,
    commitDriftCount,
    currentCommitHash: current?.commitHash ?? null,
    currentDeploymentUrl: current?.deploymentUrl ?? null,
    currentPacketHash: current?.packetHash ?? null,
    historyHash: sha256(input.records.map((record) => record.recordHash)),
    nextAction:
      status === "ready"
        ? "Runtime deploy verification history is ready for the current production alias."
        : "Repair blocked runtime deploy verification, alias drift, or packet drift before release approval.",
    packetDriftCount,
    readyCount,
    recordCount: input.records.length,
    status,
  };
}

function createCsv(records: RuntimeDeployVerificationHistoryRecord[]) {
  const header = ["checked_at", "alias", "deployment_url", "commit_hash", "packet_hash", "smoke_status", "drift_summary"];
  const body = records.map((record) =>
    [record.checkedAt, record.alias, record.deploymentUrl, record.commitHash, record.packetHash, record.smokeStatus, record.driftSummary].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

export function createRuntimeDeployVerificationHistory(input: CreateRuntimeDeployVerificationHistoryInput): RuntimeDeployVerificationHistory {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const expectedPacketHash = input.runtimeQaPacket.summary.packetHash;
  const sortedRecords = sortRecords(input.records);
  const records = sortedRecords.map((record, index) =>
    createHistoryRecord({
      current: record,
      expectedPacketHash,
      previous: sortedRecords[index - 1],
      productionAlias: input.productionAlias,
    }),
  );
  const summary = summarize({
    expectedPacketHash,
    productionAlias: input.productionAlias,
    records,
  });
  const csvContent = createCsv(records);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      records,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-runtime-deploy-verification-history-${dateStamp(generatedAt)}`;

  return {
    csvContent,
    csvDataUri: encodeDataUri("text/csv", csvContent),
    csvFileName: `${fileBase}.csv`,
    generatedAt,
    jsonContent,
    jsonDataUri: encodeDataUri("application/json", jsonContent),
    jsonFileName: `${fileBase}.json`,
    records,
    summary,
    workspaceId,
  };
}
