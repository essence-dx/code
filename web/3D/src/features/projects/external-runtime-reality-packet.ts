import { createHash } from "node:crypto";

export type ExternalRuntimeRealityGate = "cad-process-evidence" | "evidence-freshness" | "signed-package-verification";
export type ExternalRuntimeRealityStatus = "blocked" | "ready" | "review";
export type ExternalRuntimeRealityFileFormat = "csv" | "json";

export interface ExternalRuntimeRealityGateInput {
  evidenceHash: string;
  evidenceUrl: string;
  gate: ExternalRuntimeRealityGate;
  operatorOwner: string;
  releaseApprovalReady: boolean;
  score: number;
  status: ExternalRuntimeRealityStatus;
}

export interface ExternalRuntimeRealityRow {
  evidenceHash: string;
  evidenceLinked: boolean;
  evidenceUrl: string;
  gate: ExternalRuntimeRealityGate;
  nextAction: string;
  operatorOwner: string;
  operatorReady: boolean;
  packetHash: string;
  releaseApprovalReady: boolean;
  score: number;
  status: ExternalRuntimeRealityStatus;
}

export interface ExternalRuntimeRealityFile {
  download: string;
  format: ExternalRuntimeRealityFileFormat;
  href: string;
  label: string;
}

export interface ExternalRuntimeRealityPacket {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: ExternalRuntimeRealityFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: ExternalRuntimeRealityRow[];
  summary: {
    blockedCount: number;
    nextAction: string;
    operatorReadyCount: number;
    packetHash: string;
    packetScore: number;
    readyCount: number;
    releaseApprovalBlocked: boolean;
    reviewCount: number;
    rowCount: number;
    status: ExternalRuntimeRealityStatus;
  };
  workspaceId: string;
}

export interface CreateExternalRuntimeRealityPacketInput {
  gates: ExternalRuntimeRealityGateInput[];
  generatedAt?: string;
  releaseCandidateId: string;
  requiredGates?: ExternalRuntimeRealityGate[];
  workspaceId?: string;
}

const defaultRequiredGates: ExternalRuntimeRealityGate[] = ["signed-package-verification", "cad-process-evidence", "evidence-freshness"];

const gateRank: Record<ExternalRuntimeRealityGate, number> = {
  "signed-package-verification": 0,
  "cad-process-evidence": 1,
  "evidence-freshness": 2,
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

function csvCell(value: boolean | number | string) {
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

function hasSha256(value: string) {
  return value.trim().startsWith("sha256:");
}

function urlReady(value: string) {
  return value.trim().startsWith("https://");
}

function missingGate(gate: ExternalRuntimeRealityGate): ExternalRuntimeRealityGateInput {
  return {
    evidenceHash: "",
    evidenceUrl: "",
    gate,
    operatorOwner: "",
    releaseApprovalReady: false,
    score: 0,
    status: "blocked",
  };
}

function normalizeScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function statusFor(input: {
  evidenceLinked: boolean;
  inputStatus: ExternalRuntimeRealityStatus;
  operatorReady: boolean;
  releaseApprovalReady: boolean;
  score: number;
}) {
  if (!input.evidenceLinked || !input.operatorReady || !input.releaseApprovalReady || input.inputStatus === "blocked" || input.score < 60) {
    return "blocked";
  }

  if (input.inputStatus === "review" || input.score < 90) {
    return "review";
  }

  return "ready";
}

function nextActionFor(row: Pick<ExternalRuntimeRealityRow, "evidenceLinked" | "gate" | "operatorReady" | "releaseApprovalReady" | "score" | "status">) {
  if (row.status === "blocked") {
    return `Resolve blocked external runtime reality packet for ${row.gate}.`;
  }

  if (!row.evidenceLinked) {
    return `Attach external runtime reality evidence for ${row.gate}.`;
  }

  if (!row.operatorReady) {
    return `Assign operator owner for ${row.gate}.`;
  }

  if (!row.releaseApprovalReady) {
    return `Hold release approval until ${row.gate} is ready.`;
  }

  if (row.score < 90) {
    return `Review external runtime reality score for ${row.gate}.`;
  }

  return `External runtime reality evidence is ready for ${row.gate}.`;
}

function createRow(input: ExternalRuntimeRealityGateInput): ExternalRuntimeRealityRow {
  const evidenceHash = input.evidenceHash.trim() || "missing";
  const evidenceUrl = input.evidenceUrl.trim();
  const operatorOwner = input.operatorOwner.trim();
  const evidenceLinked = hasSha256(evidenceHash) && urlReady(evidenceUrl);
  const operatorReady = operatorOwner.length > 0;
  const score = normalizeScore(input.score);
  const status = statusFor({
    evidenceLinked,
    inputStatus: input.status,
    operatorReady,
    releaseApprovalReady: input.releaseApprovalReady,
    score,
  });
  const rowWithoutHash = {
    evidenceHash,
    evidenceLinked,
    evidenceUrl,
    gate: input.gate,
    nextAction: "",
    operatorOwner,
    operatorReady,
    releaseApprovalReady: input.releaseApprovalReady,
    score,
    status,
  } satisfies Omit<ExternalRuntimeRealityRow, "packetHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    packetHash: sha256(row),
  };
}

function createRows(input: CreateExternalRuntimeRealityPacketInput) {
  const gateByName = new Map(input.gates.map((gate) => [gate.gate, gate]));
  const requiredGates = input.requiredGates ?? defaultRequiredGates;

  return requiredGates
    .map((gate) => createRow(gateByName.get(gate) ?? missingGate(gate)))
    .sort((first, second) => gateRank[first.gate] - gateRank[second.gate]);
}

function summarize(rows: ExternalRuntimeRealityRow[]): ExternalRuntimeRealityPacket["summary"] {
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const operatorReadyCount = rows.filter((row) => row.operatorReady).length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const status: ExternalRuntimeRealityStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const scoreTotal = rows.reduce((sum, row) => sum + row.score, 0);
  const linkedCount = rows.filter((row) => row.evidenceLinked).length;

  return {
    blockedCount,
    nextAction:
      status === "blocked"
        ? "Resolve blocked external runtime reality packet before release approval."
        : status === "review"
          ? "Review external runtime reality packet before release approval."
          : "External runtime reality packet is ready for release approval.",
    operatorReadyCount,
    packetHash: sha256(rows.map((row) => row.packetHash)),
    packetScore: Math.max(
      0,
      Math.min(100, Math.round(scoreTotal / Math.max(1, rows.length) + reviewCount * 5 - blockedCount * 18 - (rows.length - linkedCount) * 10)),
    ),
    readyCount,
    releaseApprovalBlocked: status === "blocked",
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: ExternalRuntimeRealityRow[]) {
  const header = ["gate", "status", "score", "evidence_linked", "operator_ready", "release_approval_ready", "packet_hash", "next_action"];
  const body = rows.map((row) =>
    [row.gate, row.status, row.score, row.evidenceLinked, row.operatorReady, row.releaseApprovalReady, row.packetHash, row.nextAction].map(csvCell).join(","),
  );

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: { csvDataUri: string; csvFileName: string; jsonDataUri: string; jsonFileName: string }): ExternalRuntimeRealityFile[] {
  return [
    {
      download: input.csvFileName,
      format: "csv",
      href: input.csvDataUri,
      label: "CSV packet",
    },
    {
      download: input.jsonFileName,
      format: "json",
      href: input.jsonDataUri,
      label: "JSON packet",
    },
  ];
}

export function createExternalRuntimeRealityPacket(input: CreateExternalRuntimeRealityPacketInput): ExternalRuntimeRealityPacket {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const workspaceId = input.workspaceId ?? "workspace";
  const rows = createRows(input);
  const summary = summarize(rows);
  const csvContent = createCsv(rows);
  const jsonContent = JSON.stringify(
    {
      generatedAt,
      releaseCandidateId: input.releaseCandidateId,
      rows,
      summary,
      workspaceId,
    },
    null,
    2,
  );
  const fileBase = `${slug(workspaceId)}-external-runtime-reality-packet-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
  const csvFileName = `${fileBase}.csv`;
  const jsonFileName = `${fileBase}.json`;
  const csvDataUri = encodeDataUri("text/csv", csvContent);
  const jsonDataUri = encodeDataUri("application/json", jsonContent);

  return {
    csvContent,
    csvDataUri,
    csvFileName,
    files: filesFor({ csvDataUri, csvFileName, jsonDataUri, jsonFileName }),
    generatedAt,
    jsonContent,
    jsonDataUri,
    jsonFileName,
    releaseCandidateId: input.releaseCandidateId,
    rows,
    summary,
    workspaceId,
  };
}
