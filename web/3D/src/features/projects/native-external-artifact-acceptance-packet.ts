import { createHash } from "node:crypto";

export type NativeExternalArtifactAcceptanceGate =
  | "artifact-attachment-workflow"
  | "cad-runtime-bundle-verification"
  | "customer-download-readiness"
  | "signed-artifact-intake";
export type NativeExternalArtifactAcceptanceStatus = "blocked" | "ready" | "review";
export type NativeExternalArtifactAcceptanceFileFormat = "csv" | "json";

export interface NativeExternalArtifactAcceptanceGateInput {
  approvalOwner: string;
  evidenceHash: string;
  evidenceUrl: string;
  gate: NativeExternalArtifactAcceptanceGate;
  releaseApprovalReady: boolean;
  score: number;
  status: NativeExternalArtifactAcceptanceStatus;
}

export interface NativeExternalArtifactAcceptanceRow {
  acceptanceHash: string;
  approvalOwner: string;
  evidenceHash: string;
  evidenceLinked: boolean;
  evidenceUrl: string;
  gate: NativeExternalArtifactAcceptanceGate;
  nextAction: string;
  releaseApprovalReady: boolean;
  score: number;
  status: NativeExternalArtifactAcceptanceStatus;
}

export interface NativeExternalArtifactAcceptanceFile {
  download: string;
  format: NativeExternalArtifactAcceptanceFileFormat;
  href: string;
  label: string;
}

export interface NativeExternalArtifactAcceptancePacket {
  csvContent: string;
  csvDataUri: string;
  csvFileName: string;
  files: NativeExternalArtifactAcceptanceFile[];
  generatedAt: string;
  jsonContent: string;
  jsonDataUri: string;
  jsonFileName: string;
  releaseCandidateId: string;
  rows: NativeExternalArtifactAcceptanceRow[];
  summary: {
    acceptanceHash: string;
    acceptanceScore: number;
    approvalReadyCount: number;
    blockedCount: number;
    customerDownloadReady: boolean;
    nextAction: string;
    readyCount: number;
    reviewCount: number;
    rowCount: number;
    status: NativeExternalArtifactAcceptanceStatus;
  };
  workspaceId: string;
}

export interface CreateNativeExternalArtifactAcceptancePacketInput {
  gates: NativeExternalArtifactAcceptanceGateInput[];
  generatedAt?: string;
  releaseCandidateId: string;
  requiredGates?: NativeExternalArtifactAcceptanceGate[];
  workspaceId?: string;
}

const defaultRequiredGates: NativeExternalArtifactAcceptanceGate[] = [
  "signed-artifact-intake",
  "cad-runtime-bundle-verification",
  "artifact-attachment-workflow",
  "customer-download-readiness",
];

const gateRank: Record<NativeExternalArtifactAcceptanceGate, number> = {
  "signed-artifact-intake": 0,
  "cad-runtime-bundle-verification": 1,
  "artifact-attachment-workflow": 2,
  "customer-download-readiness": 3,
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

function missingGate(gate: NativeExternalArtifactAcceptanceGate): NativeExternalArtifactAcceptanceGateInput {
  return {
    approvalOwner: "",
    evidenceHash: "",
    evidenceUrl: "",
    gate,
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
  inputStatus: NativeExternalArtifactAcceptanceStatus;
  releaseApprovalReady: boolean;
  score: number;
}) {
  if (!input.evidenceLinked || !input.releaseApprovalReady || input.inputStatus === "blocked" || input.score < 60) {
    return "blocked";
  }

  if (input.inputStatus === "review" || input.score < 90) {
    return "review";
  }

  return "ready";
}

function nextActionFor(row: Pick<NativeExternalArtifactAcceptanceRow, "evidenceLinked" | "gate" | "releaseApprovalReady" | "score" | "status">) {
  if (row.status === "blocked") {
    return `Resolve blocked native external artifact acceptance packet for ${row.gate}.`;
  }

  if (!row.evidenceLinked) {
    return `Attach acceptance evidence packet for ${row.gate}.`;
  }

  if (!row.releaseApprovalReady) {
    return `Hold release approval until ${row.gate} is accepted.`;
  }

  if (row.score < 90) {
    return `Review ${row.gate} score before final fulfillment acceptance.`;
  }

  return `Keep native external artifact acceptance evidence current for ${row.gate}.`;
}

function createRow(input: NativeExternalArtifactAcceptanceGateInput): NativeExternalArtifactAcceptanceRow {
  const approvalOwner = input.approvalOwner.trim();
  const evidenceHash = input.evidenceHash.trim() || "missing";
  const evidenceUrl = input.evidenceUrl.trim();
  const evidenceLinked = hasSha256(evidenceHash) && urlReady(evidenceUrl) && approvalOwner.length > 0;
  const score = normalizeScore(input.score);
  const status = statusFor({
    evidenceLinked,
    inputStatus: input.status,
    releaseApprovalReady: input.releaseApprovalReady,
    score,
  });
  const rowWithoutHash = {
    approvalOwner,
    evidenceHash,
    evidenceLinked,
    evidenceUrl,
    gate: input.gate,
    nextAction: "",
    releaseApprovalReady: input.releaseApprovalReady,
    score,
    status,
  } satisfies Omit<NativeExternalArtifactAcceptanceRow, "acceptanceHash">;
  const row = {
    ...rowWithoutHash,
    nextAction: nextActionFor(rowWithoutHash),
  };

  return {
    ...row,
    acceptanceHash: sha256(row),
  };
}

function createRows(input: CreateNativeExternalArtifactAcceptancePacketInput) {
  const gateByName = new Map(input.gates.map((gate) => [gate.gate, gate]));
  const requiredGates = input.requiredGates ?? defaultRequiredGates;

  return requiredGates
    .map((gate) => createRow(gateByName.get(gate) ?? missingGate(gate)))
    .sort((first, second) => gateRank[first.gate] - gateRank[second.gate]);
}

function summarize(rows: NativeExternalArtifactAcceptanceRow[]): NativeExternalArtifactAcceptancePacket["summary"] {
  const approvalReadyCount = rows.filter((row) => row.releaseApprovalReady).length;
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const customerDownloadReady = rows.some((row) => row.gate === "customer-download-readiness" && row.status === "ready");
  const status: NativeExternalArtifactAcceptanceStatus = blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready";
  const scoreTotal = rows.reduce((sum, row) => sum + row.score, 0);
  const linkedCount = rows.filter((row) => row.evidenceLinked).length;

  return {
    acceptanceHash: sha256(rows.map((row) => row.acceptanceHash)),
    acceptanceScore: Math.max(
      0,
      Math.min(100, Math.round(scoreTotal / Math.max(1, rows.length) + reviewCount * 5 - blockedCount * 18 - (rows.length - linkedCount) * 10)),
    ),
    approvalReadyCount,
    blockedCount,
    customerDownloadReady,
    nextAction:
      status === "blocked"
        ? "Resolve blocked native external artifact acceptance packet before fulfillment release."
        : status === "review"
          ? "Review native external artifact acceptance packet before fulfillment release."
          : "Native external artifact acceptance packet is ready for fulfillment release.",
    readyCount,
    reviewCount,
    rowCount: rows.length,
    status,
  };
}

function createCsv(rows: NativeExternalArtifactAcceptanceRow[]) {
  const header = ["gate", "status", "score", "evidence_linked", "release_approval_ready", "acceptance_hash", "next_action"];
  const body = rows.map((row) => [row.gate, row.status, row.score, row.evidenceLinked, row.releaseApprovalReady, row.acceptanceHash, row.nextAction].map(csvCell).join(","));

  return `${[header.join(","), ...body].join("\n")}\n`;
}

function filesFor(input: { csvDataUri: string; csvFileName: string; jsonDataUri: string; jsonFileName: string }): NativeExternalArtifactAcceptanceFile[] {
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

export function createNativeExternalArtifactAcceptancePacket(input: CreateNativeExternalArtifactAcceptancePacketInput): NativeExternalArtifactAcceptancePacket {
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
  const fileBase = `${slug(workspaceId)}-native-external-artifact-acceptance-packet-${slug(input.releaseCandidateId)}-${dateStamp(generatedAt)}`;
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
